import type { AppStorage } from '@/lib/appStorage';
import {
  checkApiHealth,
  fetchRemoteData,
  fetchRemoteSyncToken,
  fromRemotePayload,
  pushRemoteData,
  toRemotePayload,
  type RemoteDataPayload,
} from '@/lib/sheetsApi';
import { enrichActualWorkRecord } from '@/lib/actualWork';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import { ACTUAL_WORK_CHANGED_EVENT } from '@/lib/actualWork';
import { PAYROLL_ADJUSTMENTS_CHANGED_EVENT } from '@/lib/payrollAdjustments';
import {
  SETTINGS_CHANGED_EVENT,
  applyThemeSettings,
  migrateAppSettings,
} from '@/lib/appSettings';
import { INVENTORY_CHANGED_EVENT } from '@/lib/inventory';
import { PURCHASE_ORDERS_CHANGED_EVENT } from '@/lib/purchaseOrders';
import { SALES_CHANGED_EVENT } from '@/lib/sales';
import { migrateShiftTypes } from '@/lib/scheduleShiftTypes';
import { normalizePurchaseCategoryId } from '@/lib/purchaseOrders';
import { normalizeInventoryCategoryId } from '@/lib/inventoryCategories';

import { APP_STORAGE_PREFIX, isDefaultStoreName } from '@/lib/appBrand';

export const DATA_SYNC_CHANGED_EVENT = 'data-sync-changed';
export const SCHEDULES_CHANGED_EVENT = 'schedules-changed';

/** Local backup — written on every change, read when Sheets is unavailable. */
export const LOCAL_BACKUP_KEY = `${APP_STORAGE_PREFIX}-data`;
const LOCAL_BACKUP_META_KEY = `${APP_STORAGE_PREFIX}-data-meta`;

const PUSH_DEBOUNCE_MS = 500;
const TOKEN_POLL_INTERVAL_MS = 90_000;
const MIN_FULL_PULL_INTERVAL_MS = 60_000;
const MAX_PUSH_RETRIES = 6;
const LOCAL_EDIT_GRACE_MS = 15_000;
const STORAGE_VERSION = 6;

export interface InitDataStoreOptions {
  /** Used when normalizing partial backups — never pushed to Sheets as-is. */
  fallback: AppStorage;
  /** Used only when remote sheet is empty and no local backup exists. */
  seed: AppStorage;
}

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export interface SyncState {
  status: SyncStatus;
  error: string | null;
  lastSyncAt: string | null;
  syncToken: string | null;
  isOnline: boolean;
  hasLocalBackup: boolean;
}

let cache: AppStorage | null = null;
let syncState: SyncState = {
  status: 'loading',
  error: null,
  lastSyncAt: null,
  syncToken: null,
  isOnline: false,
  hasLocalBackup: false,
};
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pushInFlight = false;
let hasPendingPush = false;
let lastLocalWriteAt = 0;
let lastFullPullAt = 0;
let lastTokenCheckAt = 0;
let initialized = false;
let initPromise: Promise<void> | null = null;

function notifySyncChanged(): void {
  window.dispatchEvent(new Event(DATA_SYNC_CHANGED_EVENT));
}

function syncSettingsDerivedFields(data: AppStorage): AppStorage {
  return {
    ...data,
    shiftTypes: data.appSettings.shiftTypes,
    schoolSchedules: data.appSettings.schedule.schoolSchedules,
  };
}

export function normalizeAppStorage(raw: Partial<AppStorage>, fallback: AppStorage): AppStorage {
  const rawShiftTypes =
    raw.appSettings?.shiftTypes ?? raw.shiftTypes ?? fallback.appSettings.shiftTypes;
  const schoolSchedules =
    raw.appSettings?.schedule?.schoolSchedules ??
    raw.schoolSchedules ??
    fallback.appSettings.schedule.schoolSchedules;
  const migratedShiftTypes = migrateShiftTypes(rawShiftTypes);
  const appSettings = migrateAppSettings(
    raw.appSettings
      ? { ...raw.appSettings, shiftTypes: migratedShiftTypes }
      : raw.appSettings,
    migratedShiftTypes,
    schoolSchedules
  );

  return syncSettingsDerivedFields({
    version: typeof raw.version === 'number' ? raw.version : STORAGE_VERSION,
    employees: Array.isArray(raw.employees) ? raw.employees : fallback.employees,
    scheduleShifts: Array.isArray(raw.scheduleShifts)
      ? raw.scheduleShifts
      : fallback.scheduleShifts,
    actualWorkRecords: Array.isArray(raw.actualWorkRecords)
      ? raw.actualWorkRecords
      : fallback.actualWorkRecords,
    payrollAdjustmentRecords: Array.isArray(raw.payrollAdjustmentRecords)
      ? raw.payrollAdjustmentRecords
      : fallback.payrollAdjustmentRecords,
    inventoryItems: Array.isArray(raw.inventoryItems)
      ? raw.inventoryItems.map((item) => ({
          ...item,
          categoryId: normalizeInventoryCategoryId(item.categoryId),
        }))
      : fallback.inventoryItems,
    purchaseOrders: Array.isArray(raw.purchaseOrders)
      ? raw.purchaseOrders.map((order) => ({
          ...order,
          categoryId: normalizePurchaseCategoryId(order.categoryId),
        }))
      : fallback.purchaseOrders,
    salesRecords: Array.isArray(raw.salesRecords) ? raw.salesRecords : fallback.salesRecords,
    notices: Array.isArray(raw.notices) ? raw.notices : (fallback.notices ?? []),
    shiftTypes: appSettings.shiftTypes,
    schoolSchedules: appSettings.schedule.schoolSchedules,
    appSettings,
  });
}

function enrichAttendance(data: AppStorage): AppStorage {
  const wageByEmployee = new Map(data.employees.map((e) => [e.id, e.hourlyWage]));
  const enriched: AppStorage = {
    ...data,
    inventoryItems: data.inventoryItems ?? [],
    purchaseOrders: data.purchaseOrders ?? [],
    salesRecords: data.salesRecords ?? [],
    actualWorkRecords: data.actualWorkRecords.map((record) =>
      enrichActualWorkRecord(record, wageByEmployee.get(record.employeeId) ?? 10400)
    ),
  };
  if (enriched.appSettings?.theme) {
    applyThemeSettings(enriched.appSettings.theme);
  }
  return enriched;
}

function setSyncState(patch: Partial<SyncState>): void {
  syncState = { ...syncState, ...patch };
  notifySyncChanged();
}

export function readLocalBackup(): AppStorage | null {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppStorage;
  } catch {
    return null;
  }
}

function readLocalBackupMeta(): { savedAt: number } | null {
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number };
    return typeof parsed.savedAt === 'number' ? { savedAt: parsed.savedAt } : null;
  } catch {
    return null;
  }
}

function writeLocalBackup(data: AppStorage): void {
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(data));
    localStorage.setItem(
      LOCAL_BACKUP_META_KEY,
      JSON.stringify({ savedAt: Date.now() })
    );
    setSyncState({ hasLocalBackup: true });
  } catch (error) {
    console.warn('Failed to write local backup:', error);
  }
}

function applySettingsMigrations(data: AppStorage): { data: AppStorage; changed: boolean } {
  const migrated = migrateShiftTypes(data.appSettings.shiftTypes);
  if (JSON.stringify(migrated) === JSON.stringify(data.appSettings.shiftTypes)) {
    return { data, changed: false };
  }
  const next = syncSettingsDerivedFields({
    ...data,
    appSettings: { ...data.appSettings, shiftTypes: migrated },
  });
  return { data: enrichAttendance(next), changed: true };
}

function finalizeCache(data: AppStorage, options: { persistMigration?: boolean } = {}): void {
  const { data: migrated, changed } = applySettingsMigrations(data);
  cache = migrated;
  writeLocalBackup(cache);
  if (changed && options.persistMigration) {
    hasPendingPush = true;
    queuePush();
  }
}

function hasMeaningfulAppData(data: AppStorage): boolean {
  return (
    data.employees.length > 0 ||
    data.scheduleShifts.length > 0 ||
    data.actualWorkRecords.length > 0 ||
    data.payrollAdjustmentRecords.length > 0 ||
    data.inventoryItems.length > 0 ||
    data.purchaseOrders.length > 0 ||
    data.salesRecords.length > 0 ||
    (data.notices?.length ?? 0) > 0
  );
}

function countPayloadRecords(payload: RemoteDataPayload | Omit<RemoteDataPayload, 'syncToken'>) {
  return {
    employees: payload.employees.length,
    scheduleShifts: payload.scheduleShifts.length,
    actualWorkRecords: payload.actualWorkRecords.length,
    payrollAdjustmentRecords: payload.payrollAdjustmentRecords.length,
    inventoryItems: payload.inventoryItems?.length ?? 0,
  };
}

function wouldWipeRemote(
  local: Omit<RemoteDataPayload, 'syncToken'>,
  remote: RemoteDataPayload
): boolean {
  const localCounts = countPayloadRecords(local);
  const remoteCounts = countPayloadRecords(remote);

  const pairs: Array<[number, number]> = [
    [localCounts.employees, remoteCounts.employees],
    [localCounts.scheduleShifts, remoteCounts.scheduleShifts],
    [localCounts.actualWorkRecords, remoteCounts.actualWorkRecords],
    [localCounts.payrollAdjustmentRecords, remoteCounts.payrollAdjustmentRecords],
    [localCounts.inventoryItems, remoteCounts.inventoryItems],
  ];

  return pairs.some(([localCount, remoteCount]) => remoteCount >= 3 && localCount < remoteCount * 0.5);
}

function isRemoteEmpty(remote: RemoteDataPayload): boolean {
  return (
    remote.employees.length === 0 &&
    remote.scheduleShifts.length === 0 &&
    remote.actualWorkRecords.length === 0 &&
    remote.payrollAdjustmentRecords.length === 0 &&
    (remote.inventoryItems ?? []).length === 0 &&
    (remote.purchaseOrders ?? []).length === 0 &&
    (remote.salesRecords ?? []).length === 0 &&
    !hasMeaningfulSettings(remote.appSettings)
  );
}

function hasMeaningfulSettings(settings: AppStorage['appSettings'] | undefined): boolean {
  if (!settings || typeof settings !== 'object') return false;
  return Boolean(
    settings.security?.passwordHash ||
      (settings.store?.name && !isDefaultStoreName(settings.store.name)) ||
      (settings.positions?.length ?? 0) > 0 ||
      (settings.shiftTypes?.length ?? 0) > 0
  );
}

function loadFromLocalBackup(fallback: AppStorage): AppStorage | null {
  const backup = readLocalBackup();
  if (!backup) return null;
  return enrichAttendance(normalizeAppStorage(backup, fallback));
}

function dispatchDataEvents(previous: AppStorage | null, next: AppStorage): void {
  if (!previous) {
    window.dispatchEvent(new Event(EMPLOYEES_CHANGED_EVENT));
    window.dispatchEvent(new Event(SCHEDULES_CHANGED_EVENT));
    window.dispatchEvent(new Event(ACTUAL_WORK_CHANGED_EVENT));
    window.dispatchEvent(new Event(PAYROLL_ADJUSTMENTS_CHANGED_EVENT));
    window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
    window.dispatchEvent(new Event(PURCHASE_ORDERS_CHANGED_EVENT));
    window.dispatchEvent(new Event(SALES_CHANGED_EVENT));
    return;
  }

  if (JSON.stringify(previous.employees) !== JSON.stringify(next.employees)) {
    window.dispatchEvent(new Event(EMPLOYEES_CHANGED_EVENT));
  }
  if (JSON.stringify(previous.scheduleShifts) !== JSON.stringify(next.scheduleShifts)) {
    window.dispatchEvent(new Event(SCHEDULES_CHANGED_EVENT));
  }
  if (JSON.stringify(previous.actualWorkRecords) !== JSON.stringify(next.actualWorkRecords)) {
    window.dispatchEvent(new Event(ACTUAL_WORK_CHANGED_EVENT));
  }
  if (
    JSON.stringify(previous.payrollAdjustmentRecords) !==
    JSON.stringify(next.payrollAdjustmentRecords)
  ) {
    window.dispatchEvent(new Event(PAYROLL_ADJUSTMENTS_CHANGED_EVENT));
  }
  if (JSON.stringify(previous.appSettings) !== JSON.stringify(next.appSettings)) {
    window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
    applyThemeSettings(next.appSettings.theme);
  }
  if (JSON.stringify(previous.inventoryItems) !== JSON.stringify(next.inventoryItems)) {
    window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
  }
  if (JSON.stringify(previous.purchaseOrders) !== JSON.stringify(next.purchaseOrders)) {
    window.dispatchEvent(new Event(PURCHASE_ORDERS_CHANGED_EVENT));
  }
  if (JSON.stringify(previous.salesRecords) !== JSON.stringify(next.salesRecords)) {
    window.dispatchEvent(new Event(SALES_CHANGED_EVENT));
  }
}

export function getSyncState(): SyncState {
  return syncState;
}

export function isDataStoreReady(): boolean {
  return initialized && cache !== null;
}

export function readCache(): AppStorage {
  if (!cache) {
    throw new Error('Data store is not initialized');
  }
  return cache;
}

export function writeCache(data: AppStorage): void {
  const previous = cache;
  cache = enrichAttendance(data);
  lastLocalWriteAt = Date.now();
  writeLocalBackup(cache);
  hasPendingPush = true;
  queuePush();
  dispatchDataEvents(previous, cache);
}

function scheduleRetry(attempt: number): void {
  if (retryTimer) clearTimeout(retryTimer);
  const delayMs = Math.min(15_000, 2_000 * (attempt + 1));
  retryTimer = setTimeout(() => {
    pushNow(attempt + 1).catch(console.error);
  }, delayMs);
}

async function pushNow(attempt = 0): Promise<void> {
  if (!cache || pushInFlight) return;

  const online = attempt > 0 ? await checkApiHealth(true) : syncState.isOnline || (await checkApiHealth());
  if (!online) {
    setSyncState({
      status: 'error',
      error: '오프라인 — 변경 사항은 로컬에 저장되었습니다. 연결되면 자동 동기화됩니다.',
      isOnline: false,
      hasLocalBackup: Boolean(readLocalBackup()),
    });
    if (attempt < MAX_PUSH_RETRIES) {
      scheduleRetry(attempt);
    }
    return;
  }

  pushInFlight = true;
  setSyncState({ status: 'syncing', error: null });
  try {
    const remote = await fetchRemoteData();
    const localPayload = toRemotePayload(cache);
    if (wouldWipeRemote(localPayload, remote)) {
      const previous = cache;
      cache = enrichAttendance(fromRemotePayload(remote, cache));
      writeLocalBackup(cache);
      hasPendingPush = false;
      setSyncState({
        status: 'error',
        error:
          '데이터 손실 방지: 서버에 더 많은 데이터가 있어 로컬 변경을 취소하고 서버 데이터를 불러왔습니다. 새로고침 후 확인해 주세요.',
        syncToken: remote.syncToken,
        lastSyncAt: new Date().toISOString(),
        isOnline: true,
        hasLocalBackup: true,
      });
      dispatchDataEvents(previous, cache);
      return;
    }

    const syncToken = await pushRemoteData(localPayload);
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    hasPendingPush = false;
    setSyncState({
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      syncToken,
      isOnline: true,
      error: null,
      hasLocalBackup: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Sheets 저장 실패';
    setSyncState({
      status: 'error',
      error: `${message} (로컬 백업은 유지됩니다)`,
      isOnline: false,
      hasLocalBackup: Boolean(readLocalBackup()),
    });
    if (attempt < MAX_PUSH_RETRIES) {
      scheduleRetry(attempt);
    }
  } finally {
    pushInFlight = false;
  }
}

function queuePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushNow().catch(console.error);
  }, PUSH_DEBOUNCE_MS);
}

export async function flushPush(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await pushNow();
}

async function pullRemoteFull(): Promise<void> {
  if (!cache) return;

  const remote = await fetchRemoteData();
  lastFullPullAt = Date.now();

  if (remote.syncToken === syncState.syncToken) {
    setSyncState({ isOnline: true, error: null });
    return;
  }

  const previous = cache;
  const next = enrichAttendance(fromRemotePayload(remote, cache));
  cache = next;
  writeLocalBackup(cache);
  setSyncState({
    status: 'idle',
    syncToken: remote.syncToken,
    lastSyncAt: new Date().toISOString(),
    isOnline: true,
    error: null,
    hasLocalBackup: true,
  });
  dispatchDataEvents(previous, next);
}

async function pullRemoteToken(): Promise<void> {
  if (pushInFlight || pushTimer || hasPendingPush || !cache) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

  const recentlyEdited = Date.now() - lastLocalWriteAt < LOCAL_EDIT_GRACE_MS;
  const meta = readLocalBackupMeta();
  const recentBackup =
    meta !== null && Date.now() - meta.savedAt < LOCAL_EDIT_GRACE_MS;
  if (recentlyEdited || recentBackup) return;

  if (Date.now() - lastTokenCheckAt < TOKEN_POLL_INTERVAL_MS - 1_000) return;

  try {
    lastTokenCheckAt = Date.now();
    const remoteToken = await fetchRemoteSyncToken();
    if (!remoteToken || remoteToken === syncState.syncToken) {
      setSyncState({ isOnline: true, error: null });
      return;
    }

    if (Date.now() - lastFullPullAt < MIN_FULL_PULL_INTERVAL_MS) return;

    await pullRemoteFull();
  } catch (error) {
    setSyncState({
      isOnline: false,
      error: error instanceof Error ? error.message : 'Google Sheets 불러오기 실패',
      hasLocalBackup: Boolean(readLocalBackup()),
    });
  }
}

function startPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    pullRemoteToken().catch(console.error);
  }, TOKEN_POLL_INTERVAL_MS);
}

async function doInitDataStore({ fallback, seed }: InitDataStoreOptions): Promise<void> {
  setSyncState({
    status: 'loading',
    error: null,
    hasLocalBackup: Boolean(readLocalBackup()),
  });

  const online = await checkApiHealth();
  if (!online) {
    const fromLocal = loadFromLocalBackup(fallback);
    initialized = true;
    if (fromLocal) {
      finalizeCache(fromLocal, { persistMigration: true });
      setSyncState({
        status: 'error',
        error:
          'Google Sheets에 연결할 수 없습니다. 마지막 로컬 백업을 불러왔습니다. 연결되면 자동 동기화됩니다.',
        isOnline: false,
        hasLocalBackup: true,
      });
      startPolling();
      return;
    }

    finalizeCache(enrichAttendance(seed));
    setSyncState({
      status: 'error',
      error:
        'Google Sheets에 연결할 수 없습니다. Vercel 환경변수(GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON)를 확인하세요.',
      isOnline: false,
      hasLocalBackup: true,
    });
    return;
  }

  try {
    let remote = await fetchRemoteData();

    if (isRemoteEmpty(remote)) {
      const localBackup = readLocalBackup();
      if (localBackup && hasMeaningfulAppData(localBackup)) {
        const normalized = normalizeAppStorage(localBackup, fallback);
        const syncToken = await pushRemoteData(toRemotePayload(normalized));
        remote = { ...toRemotePayload(normalized), syncToken };
      } else {
        initialized = true;
        const localSeed = enrichAttendance(normalizeAppStorage(seed, fallback));
        finalizeCache(localSeed);
        setSyncState({
          status: 'idle',
          syncToken: remote.syncToken,
          lastSyncAt: new Date().toISOString(),
          isOnline: true,
          error: null,
          hasLocalBackup: true,
        });
        startPolling();
        return;
      }
    }

    initialized = true;
    finalizeCache(fromRemotePayload(remote, fallback), { persistMigration: true });
    setSyncState({
      status: 'idle',
      syncToken: remote.syncToken,
      lastSyncAt: new Date().toISOString(),
      isOnline: true,
      error: null,
      hasLocalBackup: true,
    });
    startPolling();
  } catch (error) {
    const fromLocal = loadFromLocalBackup(fallback);
    initialized = true;
    if (fromLocal) {
      finalizeCache(fromLocal, { persistMigration: true });
      setSyncState({
        status: 'error',
        error:
          (error instanceof Error ? error.message : 'Google Sheets 초기화 실패') +
          ' — 마지막 로컬 백업을 불러왔습니다.',
        isOnline: false,
        hasLocalBackup: true,
      });
      startPolling();
      return;
    }

    finalizeCache(enrichAttendance(seed));
    setSyncState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Google Sheets 초기화 실패',
      isOnline: false,
      hasLocalBackup: true,
    });
  }
}

export async function initDataStore(options: InitDataStoreOptions): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = doInitDataStore(options).finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

export function stopDataStorePolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export async function forceSyncNow(options?: { pull?: boolean }): Promise<void> {
  await flushPush();
  if (options?.pull) {
    await pullRemoteFull();
  } else {
    try {
      const remoteToken = await fetchRemoteSyncToken();
      if (remoteToken) {
        setSyncState({
          syncToken: remoteToken,
          isOnline: true,
          error: null,
          lastSyncAt: new Date().toISOString(),
        });
      }
    } catch {
      // Push already completed; token check is best-effort.
    }
  }
}

export function registerPersistenceLifecycle(): () => void {
  const flushOnHide = () => {
    if (document.visibilityState === 'hidden') {
      flushPush().catch(console.error);
    }
  };

  const flushOnUnload = () => {
    if (!cache) return;
    try {
      writeLocalBackup(cache);
      const payload = JSON.stringify(toRemotePayload(cache));
      const base = import.meta.env.VITE_API_URL ?? '';
      const apiKey = import.meta.env.VITE_API_KEY ?? '';
      fetch(`${base}/api/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Best-effort flush on tab close.
    }
  };

  document.addEventListener('visibilitychange', flushOnHide);
  window.addEventListener('pagehide', flushOnUnload);

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      pullRemoteToken().catch(console.error);
    }
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    document.removeEventListener('visibilitychange', flushOnHide);
    window.removeEventListener('pagehide', flushOnUnload);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
