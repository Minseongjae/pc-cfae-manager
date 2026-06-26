import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import {
  calculateShiftHours,
  resizeShiftEnd,
  createShiftId,
  updateShiftDuration,
} from '@/lib/shiftUtils';
import {
  normalizeShiftSortOrders,
  shiftCellKey,
  sortShiftsInCell,
} from '@/lib/scheduleShiftOrder';
import { findEmployeeByShiftName } from '@/lib/payroll';
import { resolveEmployeeColor } from '@/lib/employeeColors';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import {
  ACTUAL_WORK_CHANGED_EVENT,
  enrichActualWorkRecord,
  getCurrentTimeString,
  toDateString,
  type ActualWorkRecord,
} from '@/lib/actualWork';
import type { PayrollPeriod } from '@/lib/payroll';
import {
  EMPTY_PAYROLL_ADJUSTMENTS,
  PAYROLL_ADJUSTMENTS_CHANGED_EVENT,
  type PayrollAdjustmentRecord,
  type PayrollAdjustments,
} from '@/lib/payrollAdjustments';

import type { DashboardStats, Employee, ShiftType } from '@/types';
import { initDataStore, normalizeAppStorage, readCache, readLocalBackup, writeCache, flushPush } from '@/lib/dataStore';
import {
  createDefaultAppSettings,
  migrateAppSettings,
  SETTINGS_CHANGED_EVENT,
  type AppSettings,
} from '@/lib/appSettings';
import type {
  AppStorage,
  EmployeeInput,
  EmployeeRow,
  InventoryItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  SalesRecord,
  SchoolSchedule,
  ShiftInput,
} from '@/lib/appStorage';
import { isLowStock, INVENTORY_CHANGED_EVENT } from '@/lib/inventory';
import {
  migrateInventoryCategories,
  normalizeInventoryCategoryId,
  type InventoryCategory,
} from '@/lib/inventoryCategories';
import {
  PURCHASE_ORDERS_CHANGED_EVENT,
  migratePurchaseOrderCategories,
  normalizePurchaseCategoryId,
  type PurchaseOrderCategory,
} from '@/lib/purchaseOrders';
import { dateKey, SALES_CHANGED_EVENT } from '@/lib/sales';
import { getMonthlyPayroll } from '@/lib/payroll';
import {
  DEFAULT_SCHEDULE_SHIFT_TYPES,
  migrateShiftTypes,
  normalizeHexColor,
  sortShiftTypes,
} from '@/lib/scheduleShiftTypes';
import {
  filterShiftsForBatchDelete,
  type ScheduleBatchDeleteParams,
} from '@/lib/scheduleBatchDelete';
import {
  createNoticeId,
  NOTICES_CHANGED_EVENT,
  sortNotices,
  type Notice,
} from '@/lib/notices';

export type {
  AppStorage,
  EmployeeInput,
  EmployeeRow,
  InventoryItem,
  PurchaseOrder,
  SalesRecord,
  SchoolSchedule,
  ShiftInput,
} from '@/lib/appStorage';

const STORAGE_VERSION = 6;

function defaultShiftTypes(): ShiftType[] {
  return DEFAULT_SCHEDULE_SHIFT_TYPES.map((type) => ({ ...type }));
}

function createMinimalSeedData(): AppStorage {
  const shiftTypes = defaultShiftTypes();
  const schoolSchedules: SchoolSchedule[] = [];
  return {
    version: STORAGE_VERSION,
    employees: [],
    shiftTypes,
    scheduleShifts: [],
    notices: [],
    schoolSchedules,
    actualWorkRecords: [],
    payrollAdjustmentRecords: [],
    inventoryItems: [],
    purchaseOrders: [],
    salesRecords: [],
    appSettings: createDefaultAppSettings(shiftTypes, schoolSchedules),
  };
}

function syncSettingsDerivedFields(data: AppStorage): AppStorage {
  return {
    ...data,
    shiftTypes: data.appSettings.shiftTypes,
    schoolSchedules: data.appSettings.schedule.schoolSchedules,
  };
}

function readStorage(): AppStorage {
  try {
    const data = readCache();
    const normalized = {
      ...data,
      inventoryItems: data.inventoryItems ?? [],
      purchaseOrders: data.purchaseOrders ?? [],
      salesRecords: data.salesRecords ?? [],
    };
    if (normalized.appSettings) return syncSettingsDerivedFields(normalized);
    return syncSettingsDerivedFields({
      ...normalized,
      appSettings: migrateAppSettings(undefined, normalized.shiftTypes, normalized.schoolSchedules),
    });
  } catch {
    const backup = readLocalBackup();
    if (backup) {
      return syncSettingsDerivedFields(normalizeAppStorage(backup, createMinimalSeedData()));
    }
    throw new Error('Data store is not initialized');
  }
}

function writeStorage(data: AppStorage): void {
  writeCache(syncSettingsDerivedFields({ ...data, version: STORAGE_VERSION }));
}

function notifySettingsChanged(): void {
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function getAppSettings(): AppSettings {
  return readStorage().appSettings;
}

export function saveAppSettings(settings: AppSettings): AppSettings {
  const data = readStorage();
  data.appSettings = settings;
  writeStorage(data);
  notifySettingsChanged();
  return settings;
}

export function exportAppBackup(): string {
  const data = readStorage();
  return JSON.stringify(data, null, 2);
}

export function restoreAppBackup(json: string): AppStorage {
  const parsed = JSON.parse(json) as AppStorage;
  const restored = normalizeAppStorage(parsed, createMinimalSeedData());
  writeStorage(restored);
  notifySettingsChanged();
  notifyEmployeesChanged();
  window.dispatchEvent(new Event('schedules-changed'));
  window.dispatchEvent(new Event(ACTUAL_WORK_CHANGED_EVENT));
  window.dispatchEvent(new Event(PAYROLL_ADJUSTMENTS_CHANGED_EVENT));
  return readStorage();
}

export async function initStorage(): Promise<void> {
  await initDataStore({
    fallback: createMinimalSeedData(),
    seed: createMinimalSeedData(),
  });
}

export function getEmployees(): EmployeeRow[] {
  return readStorage().employees;
}

function notifyEmployeesChanged(): void {
  window.dispatchEvent(new Event(EMPLOYEES_CHANGED_EVENT));
}

function syncShiftsForEmployeeRename(
  shifts: ScheduleShift[],
  oldEmployee: EmployeeRow,
  newName: string
): ScheduleShift[] {
  return shifts.map((shift) => {
    if (!findEmployeeByShiftName([oldEmployee], shift.name)) return shift;
    return {
      ...shift,
      name: newName,
      id: createShiftId(shift.day, shift.rowId, newName),
    };
  });
}

function removeShiftsForEmployee(
  shifts: ScheduleShift[],
  employee: EmployeeRow
): ScheduleShift[] {
  return shifts.filter((shift) => !findEmployeeByShiftName([employee], shift.name));
}

export function createEmployee(input: EmployeeInput): EmployeeRow[] {
  const data = readStorage();
  const nextId = data.employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
  const newEmployee: EmployeeRow = { id: nextId, ...input };
  data.employees = [...data.employees, newEmployee];
  writeStorage(data);
  notifyEmployeesChanged();
  return data.employees;
}

export function updateEmployee(id: number, input: EmployeeInput): EmployeeRow[] {
  const data = readStorage();
  const existing = data.employees.find((e) => e.id === id);
  if (!existing) return data.employees;

  if (input.name !== existing.name) {
    data.scheduleShifts = syncShiftsForEmployeeRename(
      data.scheduleShifts,
      existing,
      input.name
    );
    data.actualWorkRecords = syncActualWorkForEmployeeRename(
      data.actualWorkRecords,
      existing,
      input.name
    );
  }

  data.employees = data.employees.map((e) =>
    e.id === id ? { ...e, ...input } : e
  );
  data.actualWorkRecords = data.actualWorkRecords.map((record) => {
    if (record.employeeId !== id) return record;
    return enrichActualWorkRecord(
      { ...record, employeeName: input.name },
      input.hourlyWage
    );
  });
  writeStorage(data);
  notifyEmployeesChanged();
  return data.employees;
}

export function deleteEmployee(id: number): EmployeeRow[] {
  const data = readStorage();
  const existing = data.employees.find((e) => e.id === id);
  if (!existing) return data.employees;

  data.scheduleShifts = removeShiftsForEmployee(data.scheduleShifts, existing);
  data.actualWorkRecords = removeActualWorkForEmployee(data.actualWorkRecords, id);
  data.payrollAdjustmentRecords = data.payrollAdjustmentRecords.filter(
    (record) => record.employeeId !== id
  );
  data.employees = data.employees.filter((e) => e.id !== id);

  const colorMap = { ...(data.appSettings.schedule.employeeScheduleColors ?? {}) };
  delete colorMap[String(id)];
  data.appSettings = {
    ...data.appSettings,
    schedule: {
      ...data.appSettings.schedule,
      employeeScheduleColors: colorMap,
    },
  };

  writeStorage(data);
  notifyEmployeesChanged();
  notifySettingsChanged();
  return data.employees;
}

export function saveEmployeeScheduleColor(
  employeeId: number,
  color: string | null,
  employee?: Pick<EmployeeRow, 'position' | 'status'>
): void {
  const data = readStorage();
  const map = { ...(data.appSettings.schedule.employeeScheduleColors ?? {}) };
  const key = String(employeeId);

  if (color) {
    const normalized = normalizeHexColor(color);
    if (employee) {
      const defaultColor = normalizeHexColor(
        resolveEmployeeColor(employee.position, employee.status, data.appSettings.positions)
      );
      if (normalized === defaultColor) {
        delete map[key];
      } else {
        map[key] = normalized;
      }
    } else {
      map[key] = normalized;
    }
  } else {
    delete map[key];
  }

  data.appSettings = {
    ...data.appSettings,
    schedule: {
      ...data.appSettings.schedule,
      employeeScheduleColors: map,
    },
  };
  writeStorage(data);
  notifySettingsChanged();
  void flushPush();
}

function notifyActualWorkChanged(): void {
  window.dispatchEvent(new Event(ACTUAL_WORK_CHANGED_EVENT));
}

function notifyPayrollAdjustmentsChanged(): void {
  window.dispatchEvent(new Event(PAYROLL_ADJUSTMENTS_CHANGED_EVENT));
}

function adjustmentRecordKey(
  employeeId: number,
  period: PayrollPeriod,
  periodKey: string
): string {
  return `${period}:${periodKey}:${employeeId}`;
}

export function getPayrollAdjustmentsForPeriod(
  period: PayrollPeriod,
  periodKey: string
): Map<number, PayrollAdjustments> {
  const data = readStorage();
  const map = new Map<number, PayrollAdjustments>();
  for (const record of data.payrollAdjustmentRecords) {
    if (record.period === period && record.periodKey === periodKey) {
      map.set(record.employeeId, record.adjustments);
    }
  }
  return map;
}

export function getEmployeePayrollAdjustments(
  employeeId: number,
  period: PayrollPeriod,
  periodKey: string
): PayrollAdjustments {
  const data = readStorage();
  const found = data.payrollAdjustmentRecords.find(
    (record) =>
      record.employeeId === employeeId &&
      record.period === period &&
      record.periodKey === periodKey
  );
  return found?.adjustments ?? { ...EMPTY_PAYROLL_ADJUSTMENTS };
}

export function saveEmployeePayrollAdjustments(
  employeeId: number,
  period: PayrollPeriod,
  periodKey: string,
  adjustments: PayrollAdjustments
): PayrollAdjustments {
  const data = readStorage();
  const key = adjustmentRecordKey(employeeId, period, periodKey);
  const existingIndex = data.payrollAdjustmentRecords.findIndex(
    (record) =>
      adjustmentRecordKey(record.employeeId, record.period, record.periodKey) === key
  );

  const normalized: PayrollAdjustments = {
    bonus: Math.max(0, Math.round(adjustments.bonus || 0)),
    mealAllowance: Math.max(0, Math.round(adjustments.mealAllowance || 0)),
    transportationAllowance: Math.max(
      0,
      Math.round(adjustments.transportationAllowance || 0)
    ),
    advanceDeduction: Math.max(0, Math.round(adjustments.advanceDeduction || 0)),
    penaltyDeduction: Math.max(0, Math.round(adjustments.penaltyDeduction || 0)),
    customLabel: adjustments.customLabel?.trim() ?? '',
    customAmount: Math.round(adjustments.customAmount || 0),
    note: adjustments.note?.trim() ?? '',
  };

  const hasValues =
    normalized.bonus > 0 ||
    normalized.mealAllowance > 0 ||
    normalized.transportationAllowance > 0 ||
    normalized.advanceDeduction > 0 ||
    normalized.penaltyDeduction > 0 ||
    normalized.customAmount !== 0 ||
    normalized.note.length > 0;

  if (!hasValues) {
    if (existingIndex >= 0) {
      data.payrollAdjustmentRecords.splice(existingIndex, 1);
      writeStorage(data);
      notifyPayrollAdjustmentsChanged();
    }
    return { ...EMPTY_PAYROLL_ADJUSTMENTS };
  }

  const record: PayrollAdjustmentRecord = {
    employeeId,
    period,
    periodKey,
    adjustments: normalized,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    data.payrollAdjustmentRecords[existingIndex] = record;
  } else {
    data.payrollAdjustmentRecords.push(record);
  }

  writeStorage(data);
  notifyPayrollAdjustmentsChanged();
  return normalized;
}

function getEmployeeWage(employees: EmployeeRow[], employeeId: number): number {
  return employees.find((e) => e.id === employeeId)?.hourlyWage ?? 10400;
}

function buildActualWorkRecord(
  shift: ScheduleShift,
  employee: EmployeeRow | undefined,
  date: string
): ActualWorkRecord {
  const base: ActualWorkRecord = {
    id: `aw-${date}-${shift.id}`,
    employeeId: employee?.id ?? -1,
    employeeName: employee?.name ?? shift.name,
    date,
    shiftId: shift.id,
    scheduledStart: shift.startTime,
    scheduledEnd: shift.endTime,
    actualStart: null,
    actualEnd: null,
    scheduledHours: 0,
    workedHours: 0,
    isLate: false,
    lateMinutes: 0,
    isEarlyLeave: false,
    earlyLeaveMinutes: 0,
    isOvertime: false,
    overtimeMinutes: 0,
    status: 'scheduled',
    payrollAmount: 0,
    modificationReason: null,
    isManuallyEdited: false,
    updatedAt: new Date().toISOString(),
  };
  return enrichActualWorkRecord(base, employee?.hourlyWage ?? 10400);
}

export function getActualWorkRecords(date?: string): ActualWorkRecord[] {
  const records = readStorage().actualWorkRecords;
  if (!date) return records;
  return records.filter((record) => record.date === date);
}

export function syncActualWorkForDate(
  year: number,
  month: number,
  day: number
): ActualWorkRecord[] {
  const data = readStorage();
  const date = toDateString(year, month, day);
  const shifts = data.scheduleShifts.filter(
    (shift) => shift.year === year && shift.month === month && shift.day === day
  );
  const existingForDate = data.actualWorkRecords.filter((record) => record.date === date);
  const existingByShiftId = new Map(
    existingForDate
      .filter((record) => record.shiftId)
      .map((record) => [record.shiftId as string, record])
  );

  const syncedForDate: ActualWorkRecord[] = shifts.map((shift) => {
    const employee = findEmployeeByShiftName(data.employees, shift.name);
    const existing = existingByShiftId.get(shift.id);
    const wage = employee?.hourlyWage ?? getEmployeeWage(data.employees, existing?.employeeId ?? -1);

    if (existing) {
      return enrichActualWorkRecord(
        {
          ...existing,
          employeeId: employee?.id ?? existing.employeeId,
          employeeName: employee?.name ?? shift.name,
          shiftId: shift.id,
          scheduledStart: shift.startTime,
          scheduledEnd: shift.endTime,
        },
        wage
      );
    }

    return buildActualWorkRecord(shift, employee, date);
  });

  const otherDates = data.actualWorkRecords.filter((record) => record.date !== date);
  data.actualWorkRecords = [...otherDates, ...syncedForDate];
  writeStorage(data);
  notifyActualWorkChanged();
  return syncedForDate;
}

export function clockInActualWork(recordId: string): ActualWorkRecord[] {
  const data = readStorage();
  const now = getCurrentTimeString();
  data.actualWorkRecords = data.actualWorkRecords.map((record) => {
    if (record.id !== recordId || record.status !== 'scheduled') return record;
    const wage = getEmployeeWage(data.employees, record.employeeId);
    return enrichActualWorkRecord(
      {
        ...record,
        actualStart: now,
        status: 'working',
      },
      wage
    );
  });
  writeStorage(data);
  notifyActualWorkChanged();
  return data.actualWorkRecords;
}

export function clockOutActualWork(recordId: string): ActualWorkRecord[] {
  const data = readStorage();
  const now = getCurrentTimeString();
  data.actualWorkRecords = data.actualWorkRecords.map((record) => {
    if (record.id !== recordId || record.status !== 'working') return record;
    const wage = getEmployeeWage(data.employees, record.employeeId);
    return enrichActualWorkRecord(
      {
        ...record,
        actualEnd: now,
        status: 'completed',
      },
      wage
    );
  });
  writeStorage(data);
  notifyActualWorkChanged();
  return data.actualWorkRecords;
}

export function saveManualActualWorkEdit(
  recordId: string,
  actualStart: string | null,
  actualEnd: string | null,
  modificationReason: string
): ActualWorkRecord[] {
  const data = readStorage();
  data.actualWorkRecords = data.actualWorkRecords.map((record) => {
    if (record.id !== recordId) return record;
    const wage = getEmployeeWage(data.employees, record.employeeId);
    const status: ActualWorkRecord['status'] =
      actualStart && actualEnd ? 'completed' : actualStart ? 'working' : 'scheduled';
    return enrichActualWorkRecord(
      {
        ...record,
        actualStart: actualStart || null,
        actualEnd: actualEnd || null,
        status,
        modificationReason: modificationReason.trim() || null,
        isManuallyEdited: true,
      },
      wage
    );
  });
  writeStorage(data);
  notifyActualWorkChanged();
  return data.actualWorkRecords;
}

export function updateActualWorkTimes(
  recordId: string,
  actualStart: string | null,
  actualEnd: string | null
): ActualWorkRecord[] {
  const data = readStorage();
  data.actualWorkRecords = data.actualWorkRecords.map((record) => {
    if (record.id !== recordId) return record;
    const wage = getEmployeeWage(data.employees, record.employeeId);
    const status: ActualWorkRecord['status'] =
      actualStart && actualEnd ? 'completed' : actualStart ? 'working' : 'scheduled';
    return enrichActualWorkRecord(
      {
        ...record,
        actualStart,
        actualEnd,
        status,
      },
      wage
    );
  });
  writeStorage(data);
  notifyActualWorkChanged();
  return data.actualWorkRecords;
}

function syncActualWorkForEmployeeRename(
  records: ActualWorkRecord[],
  oldEmployee: EmployeeRow,
  newName: string
): ActualWorkRecord[] {
  return records.map((record) =>
    record.employeeId === oldEmployee.id ? { ...record, employeeName: newName } : record
  );
}

function removeActualWorkForEmployee(
  records: ActualWorkRecord[],
  employeeId: number
): ActualWorkRecord[] {
  return records.filter((record) => record.employeeId !== employeeId);
}

export function getSchoolSchedules(): SchoolSchedule[] {
  return readStorage().appSettings.schedule.schoolSchedules;
}

export function getShiftTypes(): ShiftType[] {
  const raw = readStorage().appSettings.shiftTypes;
  if (!Array.isArray(raw) || raw.length === 0) {
    return sortShiftTypes(migrateShiftTypes(raw));
  }
  return sortShiftTypes(raw);
}

export function getScheduleShifts(year?: number, month?: number): ScheduleShift[] {
  const data = readStorage();
  let shifts = data.scheduleShifts;
  const needsSortMigration = shifts.some((shift) => typeof shift.sortOrder !== 'number');
  if (needsSortMigration) {
    shifts = normalizeShiftSortOrders(shifts);
    data.scheduleShifts = shifts;
    writeStorage(data);
  }
  if (year === undefined || month === undefined) return shifts;
  return shifts.filter((s) => s.year === year && s.month === month);
}

export function saveScheduleShifts(shifts: ScheduleShift[]): void {
  const data = readStorage();
  data.scheduleShifts = normalizeShiftSortOrders(shifts);
  writeStorage(data);
}

export function moveShift(
  shiftId: string,
  targetDay: number,
  targetRowId: ShiftRowId,
  year: number,
  month: number,
  insertBeforeShiftId?: string | null
): ScheduleShift[] {
  const data = readStorage();
  const source = data.scheduleShifts.find((shift) => shift.id === shiftId);
  if (!source) return data.scheduleShifts;

  const moved: ScheduleShift = {
    ...source,
    day: targetDay,
    rowId: targetRowId,
    year,
    month,
  };

  const locationChanged =
    source.day !== targetDay ||
    source.rowId !== targetRowId ||
    source.year !== year ||
    source.month !== month;

  if (locationChanged || source.name !== moved.name) {
    moved.id = createShiftId(targetDay, targetRowId, moved.name);
  }

  const targetCellKey = shiftCellKey(moved);
  const cellShifts = sortShiftsInCell(
    data.scheduleShifts
      .filter((shift) => shift.id !== shiftId && shiftCellKey(shift) === targetCellKey)
  );

  let insertIndex = cellShifts.length;
  if (insertBeforeShiftId) {
    const beforeIndex = cellShifts.findIndex((shift) => shift.id === insertBeforeShiftId);
    if (beforeIndex >= 0) insertIndex = beforeIndex;
  }

  if (!locationChanged && insertIndex === (source.sortOrder ?? 0)) {
    return data.scheduleShifts;
  }

  const reorderedCell = [...cellShifts];
  reorderedCell.splice(insertIndex, 0, moved);
  const orderById = new Map(reorderedCell.map((shift, index) => [shift.id, index]));

  const updated = data.scheduleShifts
    .filter((shift) => shift.id !== shiftId && shiftCellKey(shift) !== targetCellKey)
    .concat(
      reorderedCell.map((shift) => ({
        ...shift,
        sortOrder: orderById.get(shift.id) ?? 0,
      }))
    );

  saveScheduleShifts(updated);
  return getScheduleShifts();
}

export function resizeShift(shiftId: string, deltaHours: number): ScheduleShift[] {
  const data = readStorage();
  const updated = data.scheduleShifts.map((s) => {
    if (s.id !== shiftId) return s;
    const { endTime, duration } = resizeShiftEnd(s.startTime, s.endTime, deltaHours);
    return { ...s, endTime, duration };
  });
  saveScheduleShifts(updated);
  return updated;
}

function buildShiftFromInput(input: ShiftInput, id?: string): ScheduleShift {
  const { duration } = updateShiftDuration(input.startTime, input.endTime);
  return {
    id: id ?? createShiftId(input.day, input.rowId, input.name),
    year: input.year,
    month: input.month,
    day: input.day,
    rowId: input.rowId,
    name: input.name,
    startTime: input.startTime,
    endTime: input.endTime,
    duration,
  };
}

export function createShift(input: ShiftInput): ScheduleShift[] {
  const data = readStorage();
  const cellKey = shiftCellKey({
    year: input.year,
    month: input.month,
    day: input.day,
    rowId: input.rowId,
  });
  const nextOrder = data.scheduleShifts.filter((shift) => shiftCellKey(shift) === cellKey).length;
  const newShift: ScheduleShift = {
    ...buildShiftFromInput(input),
    sortOrder: nextOrder,
  };
  saveScheduleShifts([...data.scheduleShifts, newShift]);
  return getScheduleShifts();
}

export function updateShift(shiftId: string, input: ShiftInput): ScheduleShift[] {
  const data = readStorage();
  const updated = data.scheduleShifts.map((s) => {
    if (s.id !== shiftId) return s;
    return {
      ...buildShiftFromInput(input, createShiftId(input.day, input.rowId, input.name)),
      sortOrder: s.sortOrder,
    };
  });
  saveScheduleShifts(updated);
  return getScheduleShifts();
}

export function deleteShift(shiftId: string): ScheduleShift[] {
  const data = readStorage();
  const updated = data.scheduleShifts.filter((s) => s.id !== shiftId);
  saveScheduleShifts(updated);
  return updated;
}

export function countScheduleShiftsForBatchDelete(
  params: ScheduleBatchDeleteParams
): number {
  const data = readStorage();
  return filterShiftsForBatchDelete(
    data.scheduleShifts,
    params,
    data.employees
  ).length;
}

export function deleteScheduleShiftsBatch(
  params: ScheduleBatchDeleteParams
): ScheduleShift[] {
  const data = readStorage();
  const targets = new Set(
    filterShiftsForBatchDelete(data.scheduleShifts, params, data.employees).map(
      (s) => s.id
    )
  );
  const updated = data.scheduleShifts.filter((s) => !targets.has(s.id));
  saveScheduleShifts(updated);
  return updated;
}

function notifyNoticesChanged(): void {
  window.dispatchEvent(new Event(NOTICES_CHANGED_EVENT));
}

export function getNotices(): Notice[] {
  return sortNotices(readStorage().notices ?? []);
}

export function saveNotices(notices: Notice[]): Notice[] {
  const data = readStorage();
  data.notices = sortNotices(notices);
  writeStorage(data);
  notifyNoticesChanged();
  return data.notices;
}

export function createNotice(input: {
  title: string;
  body: string;
  isImportant: boolean;
}): Notice[] {
  const now = new Date().toISOString();
  const notice: Notice = {
    id: createNoticeId(),
    title: input.title.trim(),
    body: input.body.trim(),
    isImportant: input.isImportant,
    createdAt: now,
    updatedAt: now,
  };
  return saveNotices([...readStorage().notices, notice]);
}

export function updateNotice(
  id: string,
  patch: Partial<Pick<Notice, 'title' | 'body' | 'isImportant'>>
): Notice[] {
  const now = new Date().toISOString();
  return saveNotices(
    readStorage().notices.map((notice) =>
      notice.id === id
        ? {
            ...notice,
            ...patch,
            title: patch.title !== undefined ? patch.title.trim() : notice.title,
            body: patch.body !== undefined ? patch.body.trim() : notice.body,
            updatedAt: now,
          }
        : notice
    )
  );
}

export function deleteNotice(id: string): Notice[] {
  return saveNotices(readStorage().notices.filter((notice) => notice.id !== id));
}

export function saveShiftTypes(types: ShiftType[]): ShiftType[] {
  const data = readStorage();
  const normalized = sortShiftTypes(types);
  data.appSettings = { ...data.appSettings, shiftTypes: normalized };
  writeStorage(data);
  notifySettingsChanged();
  return normalized;
}

export class ShiftTypeDeleteError extends Error {
  constructor(public readonly code: 'MIN_ONE_SHIFT_TYPE' | 'NOT_FOUND') {
    super(code);
    this.name = 'ShiftTypeDeleteError';
  }
}

/** Delete a shift type. Shifts on that row are moved to the nearest remaining type. */
export function deleteShiftType(id: string): {
  types: ShiftType[];
  reassignedShiftCount: number;
  reassignTargetName: string | null;
} {
  const data = readStorage();
  const types = sortShiftTypes(data.appSettings.shiftTypes);
  const index = types.findIndex((type) => type.id === id);
  if (index < 0) {
    throw new ShiftTypeDeleteError('NOT_FOUND');
  }
  if (types.length <= 1) {
    throw new ShiftTypeDeleteError('MIN_ONE_SHIFT_TYPE');
  }

  const remaining = types.filter((type) => type.id !== id);
  const reassignTarget = remaining[Math.min(index, remaining.length - 1)];
  const shiftsToMove = data.scheduleShifts.filter((shift) => shift.rowId === id);

  if (shiftsToMove.length > 0 && reassignTarget) {
    data.scheduleShifts = data.scheduleShifts.map((shift) => {
      if (shift.rowId !== id) return shift;
      const rowId = reassignTarget.id as ShiftRowId;
      return {
        ...shift,
        rowId,
        id: createShiftId(shift.day, rowId, shift.name),
      };
    });
  }

  const nextTypes = remaining.map((type, order) => ({ ...type, sortOrder: order }));
  data.appSettings = { ...data.appSettings, shiftTypes: nextTypes };
  writeStorage(data);
  notifySettingsChanged();
  if (shiftsToMove.length > 0) {
    window.dispatchEvent(new Event('schedules-changed'));
  }

  return {
    types: nextTypes,
    reassignedShiftCount: shiftsToMove.length,
    reassignTargetName: reassignTarget?.name ?? null,
  };
}

function toEmployee(emp: EmployeeRow): Employee {
  return {
    id: emp.id,
    name: emp.name,
    hourlyWage: emp.hourlyWage,
    isActive: emp.status !== 'resigned',
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getInventoryItems(categoryId?: string): InventoryItem[] {
  const items = readStorage().inventoryItems.map((item) => ({
    ...item,
    categoryId: normalizeInventoryCategoryId(item.categoryId),
  }));
  if (!categoryId) return items;
  const normalized = normalizeInventoryCategoryId(categoryId);
  return items.filter((item) => item.categoryId === normalized);
}

export function getInventoryCategories(): InventoryCategory[] {
  return migrateInventoryCategories(readStorage().appSettings.inventoryCategories);
}

export function saveInventoryCategoryName(id: string, name: string): InventoryCategory[] {
  const data = readStorage();
  const categories = migrateInventoryCategories(data.appSettings.inventoryCategories).map((row) =>
    row.id === id ? { ...row, name: name.trim() || row.name } : row
  );
  data.appSettings = { ...data.appSettings, inventoryCategories: categories };
  writeStorage(data);
  notifySettingsChanged();
  return categories;
}

export function saveInventoryItem(
  input: Omit<InventoryItem, 'id' | 'updatedAt'> & { id?: string }
): InventoryItem {
  const data = readStorage();
  const now = new Date().toISOString();
  const existing = input.id ? data.inventoryItems.find((row) => row.id === input.id) : undefined;
  const item: InventoryItem = {
    id: input.id ?? createId('inv'),
    categoryId: normalizeInventoryCategoryId(input.categoryId ?? existing?.categoryId),
    name: input.name.trim() || existing?.name || '',
    currentStock: Math.max(0, input.currentStock ?? existing?.currentStock ?? 0),
    minStock: Math.max(0, input.minStock ?? existing?.minStock ?? 0),
    expiryDate: input.expiryDate ?? existing?.expiryDate ?? '',
    updatedAt: now,
  };
  if (!item.name) {
    throw new Error('상품명은 비워둘 수 없습니다.');
  }
  const index = data.inventoryItems.findIndex((row) => row.id === item.id);
  if (index >= 0) data.inventoryItems[index] = item;
  else data.inventoryItems.push(item);
  writeStorage(data);
  window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
  return item;
}

export function renameInventoryItem(id: string, name: string): InventoryItem | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const data = readStorage();
  const index = data.inventoryItems.findIndex((row) => row.id === id);
  if (index < 0) return null;
  const updated: InventoryItem = {
    ...data.inventoryItems[index],
    name: trimmed,
    updatedAt: new Date().toISOString(),
  };
  data.inventoryItems[index] = updated;
  writeStorage(data);
  window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
  return updated;
}

export function deleteInventoryItem(id: string): void {
  const data = readStorage();
  data.inventoryItems = data.inventoryItems.filter((item) => item.id !== id);
  writeStorage(data);
  window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
}

export function getPurchaseOrders(categoryId?: string): PurchaseOrder[] {
  const orders = readStorage().purchaseOrders.map((order) => ({
    ...order,
    categoryId: normalizePurchaseCategoryId(order.categoryId),
  }));
  if (!categoryId) return orders;
  const normalized = normalizePurchaseCategoryId(categoryId);
  return orders.filter((order) => order.categoryId === normalized);
}

export function getPurchaseOrderCategories(): PurchaseOrderCategory[] {
  return migratePurchaseOrderCategories(
    readStorage().appSettings.purchaseOrderCategories
  );
}

export function savePurchaseOrderCategoryName(id: string, name: string): PurchaseOrderCategory[] {
  const data = readStorage();
  const categories = migratePurchaseOrderCategories(data.appSettings.purchaseOrderCategories).map(
    (row) => (row.id === id ? { ...row, name: name.trim() || row.name } : row)
  );
  data.appSettings = { ...data.appSettings, purchaseOrderCategories: categories };
  writeStorage(data);
  notifySettingsChanged();
  return categories;
}

function normalizePurchaseOrderInput(
  input: Omit<PurchaseOrder, 'id' | 'updatedAt'> & { id?: string }
): PurchaseOrder {
  const now = new Date().toISOString();
  return {
    id: input.id ?? createId('po'),
    categoryId: normalizePurchaseCategoryId(input.categoryId),
    productName: input.productName.trim(),
    quantity: Math.max(1, input.quantity),
    status: input.status,
    scheduledDate: input.scheduledDate,
    note: input.note,
    updatedAt: now,
  };
}

export function savePurchaseOrder(
  input: Omit<PurchaseOrder, 'id' | 'updatedAt'> & { id?: string }
): PurchaseOrder {
  const data = readStorage();
  const order = normalizePurchaseOrderInput(input);
  const index = data.purchaseOrders.findIndex((row) => row.id === order.id);
  data.purchaseOrders =
    index >= 0
      ? data.purchaseOrders.map((row, i) => (i === index ? order : row))
      : [...data.purchaseOrders, order];
  writeStorage(data);
  window.dispatchEvent(new Event(PURCHASE_ORDERS_CHANGED_EVENT));
  return order;
}

export function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus): PurchaseOrder[] {
  const data = readStorage();
  const now = new Date().toISOString();
  data.purchaseOrders = data.purchaseOrders.map((row) =>
    row.id === id ? { ...row, status, updatedAt: now } : row
  );
  writeStorage(data);
  window.dispatchEvent(new Event(PURCHASE_ORDERS_CHANGED_EVENT));
  return data.purchaseOrders;
}

export function deletePurchaseOrder(id: string): PurchaseOrder[] {
  const data = readStorage();
  data.purchaseOrders = data.purchaseOrders.filter((order) => order.id !== id);
  writeStorage(data);
  window.dispatchEvent(new Event(PURCHASE_ORDERS_CHANGED_EVENT));
  return data.purchaseOrders;
}

export function getSalesRecords(): SalesRecord[] {
  return readStorage().salesRecords;
}

export function saveSalesRecord(
  input: Omit<SalesRecord, 'id' | 'updatedAt'> & { id?: string }
): SalesRecord {
  const data = readStorage();
  const now = new Date().toISOString();
  const record: SalesRecord = {
    id: input.id ?? createId('sale'),
    date: input.date,
    amount: Math.max(0, input.amount),
    note: input.note,
    updatedAt: now,
  };
  const index = data.salesRecords.findIndex((row) => row.id === record.id);
  if (index >= 0) data.salesRecords[index] = record;
  else data.salesRecords.push(record);
  writeStorage(data);
  window.dispatchEvent(new Event(SALES_CHANGED_EVENT));
  return record;
}

export function deleteSalesRecord(id: string): void {
  const data = readStorage();
  data.salesRecords = data.salesRecords.filter((record) => record.id !== id);
  writeStorage(data);
  window.dispatchEvent(new Event(SALES_CHANGED_EVENT));
}

export function getMonthlySalesTotal(year: number, month: number): number {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  return getSalesRecords()
    .filter((record) => record.date.startsWith(key))
    .reduce((sum, record) => sum + record.amount, 0);
}

export function getMonthlySalesBreakdown(year: number, month: number): Array<{ day: number; amount: number }> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const totals = new Map<number, number>();
  for (let day = 1; day <= daysInMonth; day += 1) totals.set(day, 0);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  for (const record of getSalesRecords()) {
    if (!record.date.startsWith(prefix)) continue;
    const day = Number(record.date.slice(8, 10));
    if (!Number.isFinite(day)) continue;
    totals.set(day, (totals.get(day) ?? 0) + record.amount);
  }
  return [...totals.entries()].map(([day, amount]) => ({ day, amount }));
}

export function getDashboardStats(): DashboardStats {
  const data = readStorage();
  const today = new Date();
  const todayDay = today.getDate();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const activeEmployeeRows = data.employees.filter((e) => e.status !== 'resigned');
  const employees = activeEmployeeRows.map(toEmployee);
  const monthShifts = data.scheduleShifts.filter(
    (s) => s.year === todayYear && s.month === todayMonth
  );

  let totalWorkHours = 0;
  let totalPayroll = 0;

  for (const shift of monthShifts) {
    const hours = calculateShiftHours(shift.startTime, shift.endTime);
    const emp = findEmployeeByShiftName(data.employees, shift.name);
    const wage = emp?.hourlyWage ?? 10400;
    totalWorkHours += hours;
    totalPayroll += hours * wage;
  }

  const workingTodayNames = new Set(
    monthShifts.filter((s) => s.day === todayDay).map((s) => s.name)
  );

  const workingToday = employees.filter((e) =>
    [...workingTodayNames].some(
      (n) => e.name === n || e.name.endsWith(n) || e.name.includes(n)
    )
  );
  const offToday = employees.filter(
    (e) =>
      ![...workingTodayNames].some(
        (n) => e.name === n || e.name.endsWith(n) || e.name.includes(n)
      )
  );

  const totalEmployees = employees.length;
  const averagePayrollPerEmployee =
    totalEmployees > 0 ? Math.round(totalPayroll / totalEmployees) : 0;

  const todayStr = dateKey(today);
  const todayAttendance = data.actualWorkRecords.filter(
    (record) =>
      record.date === todayStr &&
      (record.status === 'working' || record.status === 'completed' || record.actualStart)
  ).length;

  const lowStockCount = data.inventoryItems.filter(isLowStock).length;
  const monthPayroll = getMonthlyPayroll(todayYear, todayMonth);
  const monthLaborCost = monthPayroll.totalFinalPay;
  const monthSales = getMonthlySalesTotal(todayYear, todayMonth);

  return {
    totalEmployees,
    totalPayroll: Math.round(totalPayroll),
    averagePayrollPerEmployee,
    totalWorkHours: Math.round(totalWorkHours * 10) / 10,
    employeesWorkingToday: workingToday.length,
    employeesOffToday: offToday.length,
    workingToday,
    offToday,
    todayAttendance,
    lowStockCount,
    monthLaborCost,
    monthSales,
  };
}
