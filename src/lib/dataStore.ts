import type { AppStorage } from '@/lib/appStorage';
import {
  checkApiHealth,
  fetchRemoteData,
  fromRemotePayload,
  pushRemoteData,
  toRemotePayload,
} from '@/lib/supabaseApi';
import { enrichActualWorkRecord } from '@/lib/actualWork';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import { ACTUAL_WORK_CHANGED_EVENT } from '@/lib/actualWork';
import { PAYROLL_ADJUSTMENTS_CHANGED_EVENT } from '@/lib/payrollAdjustments';
import { SETTINGS_CHANGED_EVENT, applyThemeSettings } from '@/lib/appSettings';

export const DATA_SYNC_CHANGED_EVENT = 'data-sync-changed';
export const SCHEDULES_CHANGED_EVENT = 'schedules-changed';

const LEGACY_STORAGE_KEY = '1pc-cafe-manager-data';
const PUSH_DEBOUNCE_MS = 700;
const POLL_INTERVAL_MS = 10_000;

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export interface SyncState {
  status: SyncStatus;
  error: string | null;
  lastSyncAt: string | null;
  syncToken: string | null;
  isOnline: boolean;
}

let cache: AppStorage | null = null;
let syncState: SyncState = {
  status: 'loading',
  error: null,
  lastSyncAt: null,
  syncToken: null,
  isOnline: false,
};
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pushInFlight = false;
let initialized = false;

function notifySyncChanged(): void {
  window.dispatchEvent(new Event(DATA_SYNC_CHANGED_EVENT));
}

function enrichAttendance(data: AppStorage): AppStorage {
  const wageByEmployee = new Map(data.employees.map((e) => [e.id, e.hourlyWage]));
  const enriched = {
    ...data,
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

function readLegacyStorage(): AppStorage | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppStorage;
  } catch {
    return null;
  }
}

function clearLegacyStorage(): void {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function dispatchDataEvents(previous: AppStorage | null, next: AppStorage): void {
  if (!previous) {
    window.dispatchEvent(new Event(EMPLOYEES_CHANGED_EVENT));
    window.dispatchEvent(new Event(SCHEDULES_CHANGED_EVENT));
    window.dispatchEvent(new Event(ACTUAL_WORK_CHANGED_EVENT));
    window.dispatchEvent(new Event(PAYROLL_ADJUSTMENTS_CHANGED_EVENT));
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
  queuePush();
  dispatchDataEvents(previous, cache);
}

async function pushNow(): Promise<void> {
  if (!cache || pushInFlight) return;
  pushInFlight = true;
  setSyncState({ status: 'syncing', error: null });
  try {
    const syncToken = await pushRemoteData(toRemotePayload(cache));
    setSyncState({
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      syncToken,
      isOnline: true,
      error: null,
    });
  } catch (error) {
    setSyncState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to sync with Supabase',
      isOnline: false,
    });
  } finally {
    pushInFlight = false;
  }
}

function queuePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushNow().catch(console.error);
  }, PUSH_DEBOUNCE_MS);
}

async function pullRemote(): Promise<void> {
  if (pushInFlight || !cache) return;
  try {
    const remote = await fetchRemoteData();
    if (remote.syncToken === syncState.syncToken) {
      setSyncState({ isOnline: true, error: null });
      return;
    }

    const previous = cache;
    const next = enrichAttendance(fromRemotePayload(remote, cache));
    cache = next;
    setSyncState({
      status: 'idle',
      syncToken: remote.syncToken,
      lastSyncAt: new Date().toISOString(),
      isOnline: true,
      error: null,
    });
    dispatchDataEvents(previous, next);
  } catch (error) {
    setSyncState({
      isOnline: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Supabase data',
    });
  }
}

function startPolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    pullRemote().catch(console.error);
  }, POLL_INTERVAL_MS);
}

export async function initDataStore(defaultData: AppStorage): Promise<void> {
  if (initialized) return;
  setSyncState({ status: 'loading', error: null });

  const online = await checkApiHealth();
  if (!online) {
    const legacy = readLegacyStorage();
    cache = enrichAttendance(legacy ?? defaultData);
    initialized = true;
    setSyncState({
      status: 'error',
      error: 'Supabase에 연결할 수 없습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인하세요.',
      isOnline: false,
    });
    return;
  }

  try {
    let remote = await fetchRemoteData();
    const isEmpty =
      remote.employees.length === 0 &&
      remote.scheduleShifts.length === 0 &&
      remote.actualWorkRecords.length === 0 &&
      remote.payrollAdjustmentRecords.length === 0;

    if (isEmpty) {
      const legacy = readLegacyStorage();
      const seed = legacy ?? defaultData;
      const syncToken = await pushRemoteData(toRemotePayload(seed));
      remote = { ...toRemotePayload(seed), syncToken };
      clearLegacyStorage();
    }

    cache = enrichAttendance(fromRemotePayload(remote, defaultData));
    initialized = true;
    setSyncState({
      status: 'idle',
      syncToken: remote.syncToken,
      lastSyncAt: new Date().toISOString(),
      isOnline: true,
      error: null,
    });
    startPolling();
  } catch (error) {
    const legacy = readLegacyStorage();
    cache = enrichAttendance(legacy ?? defaultData);
    initialized = true;
    setSyncState({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize Supabase',
      isOnline: false,
    });
  }
}

export function stopDataStorePolling(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export async function forceSyncNow(): Promise<void> {
  await pushNow();
  await pullRemote();
}
