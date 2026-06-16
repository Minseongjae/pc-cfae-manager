import type {
  AppDataPayload,
  AppSettingsPayload,
  AttendanceRecord,
  EmployeeRow,
  PayrollAdjustmentRecord,
  PayrollAdjustments,
  ScheduleShift,
  SchoolSchedule,
} from './types.js';

function str(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = str(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function rowToObject(headers: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] ?? '';
  });
  return obj;
}

export function employeeFromRow(headers: string[], row: string[]): EmployeeRow | null {
  const raw = rowToObject(headers, row);
  const id = num(raw.id);
  if (!id || !raw.name) return null;
  return {
    id,
    name: raw.name,
    position: raw.position || 'staff',
    hourlyWage: num(raw.hourly_wage, 10400),
    phone: raw.phone,
    hireDate: raw.hire_date || '2024-01-01',
    status: raw.status || 'working',
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function employeeToRow(employee: EmployeeRow): string[] {
  return [
    String(employee.id),
    employee.name,
    employee.position,
    String(employee.hourlyWage),
    employee.phone,
    employee.hireDate,
    employee.status,
    employee.updatedAt,
  ];
}

export function scheduleFromRow(headers: string[], row: string[]): ScheduleShift | null {
  const raw = rowToObject(headers, row);
  if (!raw.id) return null;
  return {
    id: raw.id,
    year: num(raw.year),
    month: num(raw.month),
    day: num(raw.day),
    rowId: raw.row_id || 'morning',
    name: raw.name,
    startTime: raw.start_time,
    endTime: raw.end_time,
    duration: raw.duration,
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function scheduleToRow(shift: ScheduleShift): string[] {
  return [
    shift.id,
    String(shift.year),
    String(shift.month),
    String(shift.day),
    shift.rowId,
    shift.name,
    shift.startTime,
    shift.endTime,
    shift.duration,
    shift.updatedAt,
  ];
}

export function attendanceFromRow(headers: string[], row: string[]): AttendanceRecord | null {
  const raw = rowToObject(headers, row);
  if (!raw.id) return null;
  return {
    id: raw.id,
    employeeId: num(raw.employee_id),
    employeeName: raw.employee_name,
    date: raw.date,
    shiftId: raw.shift_id || null,
    scheduledStart: raw.scheduled_start,
    scheduledEnd: raw.scheduled_end,
    actualStart: raw.actual_start || null,
    actualEnd: raw.actual_end || null,
    status: raw.status || 'scheduled',
    modificationReason: raw.modification_reason || null,
    isManuallyEdited: bool(raw.is_manually_edited),
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function attendanceToRow(record: AttendanceRecord): string[] {
  return [
    record.id,
    String(record.employeeId),
    record.employeeName,
    record.date,
    record.shiftId ?? '',
    record.scheduledStart,
    record.scheduledEnd,
    record.actualStart ?? '',
    record.actualEnd ?? '',
    record.status,
    record.modificationReason ?? '',
    record.isManuallyEdited ? 'true' : 'false',
    record.updatedAt,
  ];
}

export function payrollFromRow(headers: string[], row: string[]): PayrollAdjustmentRecord | null {
  const raw = rowToObject(headers, row);
  const employeeId = num(raw.employee_id);
  if (!employeeId || !raw.period || !raw.period_key) return null;

  const adjustments: PayrollAdjustments = {
    bonus: num(raw.bonus),
    mealAllowance: num(raw.meal_allowance),
    transportationAllowance: num(raw.transportation_allowance),
    advanceDeduction: num(raw.advance_deduction),
    penaltyDeduction: num(raw.penalty_deduction),
    customLabel: raw.custom_label,
    customAmount: num(raw.custom_amount),
    note: raw.note,
  };

  return {
    employeeId,
    period: raw.period,
    periodKey: raw.period_key,
    adjustments,
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function payrollToRow(record: PayrollAdjustmentRecord): string[] {
  const { adjustments: a } = record;
  return [
    String(record.employeeId),
    record.period,
    record.periodKey,
    String(a.bonus),
    String(a.mealAllowance),
    String(a.transportationAllowance),
    String(a.advanceDeduction),
    String(a.penaltyDeduction),
    a.customLabel,
    String(a.customAmount),
    a.note,
    record.updatedAt,
  ];
}

export function computeSyncToken(payload: Omit<AppDataPayload, 'syncToken'>): string {
  const blob = JSON.stringify({
    employees: payload.employees,
    scheduleShifts: payload.scheduleShifts,
    actualWorkRecords: payload.actualWorkRecords,
    payrollAdjustmentRecords: payload.payrollAdjustmentRecords,
    schoolSchedules: payload.schoolSchedules,
    appSettings: payload.appSettings,
  });

  let hash = 0;
  for (let i = 0; i < blob.length; i += 1) {
    hash = (hash * 31 + blob.charCodeAt(i)) | 0;
  }

  return `${payload.employees.length}:${payload.scheduleShifts.length}:${payload.actualWorkRecords.length}:${payload.payrollAdjustmentRecords.length}:${hash}`;
}

export function parseJsonSetting<T>(value: string, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function buildSettingsRows(payload: {
  schoolSchedules: SchoolSchedule[];
  appSettings: AppSettingsPayload;
}): string[][] {
  const now = new Date().toISOString();
  return [
    ['school_schedules', JSON.stringify(payload.schoolSchedules), now],
    ['app_settings', JSON.stringify(payload.appSettings), now],
  ];
}

export function parseSettingsRows(
  rows: string[][],
  fallbackAppSettings: AppSettingsPayload
): { schoolSchedules: SchoolSchedule[]; appSettings: AppSettingsPayload } {
  const schoolRow = rows.find((row) => row[0] === 'school_schedules');
  const appRow = rows.find((row) => row[0] === 'app_settings');

  const schoolSchedules = parseSchoolSchedules(schoolRow?.[1] ?? '[]');
  const appSettings = parseJsonSetting(appRow?.[1] ?? '', fallbackAppSettings);

  if (!appRow?.[1] && schoolSchedules.length > 0) {
    appSettings.schedule = {
      ...(appSettings.schedule ?? {}),
      schoolSchedules,
    };
  }

  return { schoolSchedules, appSettings };
}

export function parseSchoolSchedules(value: string): SchoolSchedule[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as SchoolSchedule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
