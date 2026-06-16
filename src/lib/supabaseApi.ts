import type { AppStorage } from '@/lib/appStorage';
import type { AppSettings } from '@/lib/appSettings';
import { migrateAppSettings } from '@/lib/appSettings';
import type { PayrollAdjustmentRecord } from '@/lib/payrollAdjustments';
import type { ActualWorkRecord } from '@/lib/actualWork';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface RemoteDataPayload {
  employees: Array<{
    id: number;
    name: string;
    position: string;
    hourlyWage: number;
    phone: string;
    hireDate: string;
    status: string;
    updatedAt: string;
  }>;
  scheduleShifts: Array<{
    id: string;
    year: number;
    month: number;
    day: number;
    rowId: string;
    name: string;
    startTime: string;
    endTime: string;
    duration: string;
    updatedAt: string;
  }>;
  actualWorkRecords: Array<{
    id: string;
    employeeId: number;
    employeeName: string;
    date: string;
    shiftId: string | null;
    scheduledStart: string;
    scheduledEnd: string;
    actualStart: string | null;
    actualEnd: string | null;
    status: string;
    modificationReason: string | null;
    isManuallyEdited: boolean;
    updatedAt: string;
  }>;
  payrollAdjustmentRecords: Array<{
    employeeId: number;
    period: string;
    periodKey: string;
    adjustments: PayrollAdjustmentRecord['adjustments'];
    updatedAt: string;
  }>;
  schoolSchedules: AppStorage['schoolSchedules'];
  appSettings: AppSettings;
  syncToken: string;
}

type EmployeeRow = {
  id: number;
  name: string;
  position: string;
  hourly_wage: number;
  phone: string;
  hire_date: string;
  status: string;
  updated_at: string;
};

type ScheduleShiftRow = {
  id: string;
  year: number;
  month: number;
  day: number;
  row_id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration: string;
  updated_at: string;
};

type ActualWorkRow = {
  id: string;
  employee_id: number;
  employee_name: string;
  date: string;
  shift_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  modification_reason: string | null;
  is_manually_edited: boolean;
  updated_at: string;
};

type PayrollAdjustmentRow = {
  employee_id: number;
  period: string;
  period_key: string;
  adjustments: PayrollAdjustmentRecord['adjustments'];
  updated_at: string;
};

type AppStateRow = {
  id: number;
  app_settings: AppSettings | Record<string, unknown>;
  sync_token: string;
  updated_at: string;
};

function supabaseErrorMessage(error: { message: string } | null): string {
  return error?.message ?? 'Supabase request failed';
}

async function syncRows(
  table: string,
  rows: Record<string, unknown>[],
  idField: string
): Promise<void> {
  const supabase = getSupabase();
  const ids = rows.map((row) => row[idField]);

  const { data: existing, error: readError } = await supabase
    .from(table)
    .select(idField);

  if (readError) throw new Error(supabaseErrorMessage(readError));

  const existingIds = (existing ?? []).map((row) => {
    const record = row as unknown as Record<string, string | number>;
    return record[idField];
  });
  const keep = new Set(ids);
  const toDelete = existingIds.filter((id) => !keep.has(id));

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in(idField, toDelete);
    if (deleteError) throw new Error(supabaseErrorMessage(deleteError));
  }

  if (rows.length === 0) return;

  const { error: upsertError } = await supabase.from(table).upsert(rows);
  if (upsertError) throw new Error(supabaseErrorMessage(upsertError));
}

async function syncPayrollRows(rows: PayrollAdjustmentRow[]): Promise<void> {
  const supabase = getSupabase();

  const { data: existing, error: readError } = await supabase
    .from('payroll_adjustment_records')
    .select('employee_id, period_key');

  if (readError) throw new Error(supabaseErrorMessage(readError));

  const keep = new Set(rows.map((row) => `${row.employee_id}:${row.period_key}`));
  const toDelete = (existing ?? []).filter(
    (row) => !keep.has(`${row.employee_id}:${row.period_key}`)
  );

  for (const row of toDelete) {
    const { error } = await supabase
      .from('payroll_adjustment_records')
      .delete()
      .eq('employee_id', row.employee_id)
      .eq('period_key', row.period_key);
    if (error) throw new Error(supabaseErrorMessage(error));
  }

  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from('payroll_adjustment_records')
    .upsert(rows);
  if (upsertError) throw new Error(supabaseErrorMessage(upsertError));
}

export async function checkApiHealth(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('app_state').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchRemoteData(): Promise<RemoteDataPayload> {
  const supabase = getSupabase();

  const [employeesRes, shiftsRes, workRes, payrollRes, stateRes] = await Promise.all([
    supabase.from('employees').select('*').order('id'),
    supabase.from('schedule_shifts').select('*'),
    supabase.from('actual_work_records').select('*'),
    supabase.from('payroll_adjustment_records').select('*'),
    supabase.from('app_state').select('*').eq('id', 1).maybeSingle(),
  ]);

  if (employeesRes.error) throw new Error(supabaseErrorMessage(employeesRes.error));
  if (shiftsRes.error) throw new Error(supabaseErrorMessage(shiftsRes.error));
  if (workRes.error) throw new Error(supabaseErrorMessage(workRes.error));
  if (payrollRes.error) throw new Error(supabaseErrorMessage(payrollRes.error));
  if (stateRes.error) throw new Error(supabaseErrorMessage(stateRes.error));

  const employees = (employeesRes.data as EmployeeRow[] | null) ?? [];
  const scheduleShifts = (shiftsRes.data as ScheduleShiftRow[] | null) ?? [];
  const actualWorkRecords = (workRes.data as ActualWorkRow[] | null) ?? [];
  const payrollAdjustmentRecords =
    (payrollRes.data as PayrollAdjustmentRow[] | null) ?? [];
  const appState = stateRes.data as AppStateRow | null;

  const appSettings = migrateAppSettings(
    appState?.app_settings,
    [],
    []
  );

  return {
    employees: employees.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      hourlyWage: row.hourly_wage,
      phone: row.phone,
      hireDate: row.hire_date,
      status: row.status,
      updatedAt: row.updated_at,
    })),
    scheduleShifts: scheduleShifts.map((row) => ({
      id: row.id,
      year: row.year,
      month: row.month,
      day: row.day,
      rowId: row.row_id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      updatedAt: row.updated_at,
    })),
    actualWorkRecords: actualWorkRecords.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      date: row.date,
      shiftId: row.shift_id,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      status: row.status,
      modificationReason: row.modification_reason,
      isManuallyEdited: row.is_manually_edited,
      updatedAt: row.updated_at,
    })),
    payrollAdjustmentRecords: payrollAdjustmentRecords.map((row) => ({
      employeeId: row.employee_id,
      period: row.period,
      periodKey: row.period_key,
      adjustments: row.adjustments,
      updatedAt: row.updated_at,
    })),
    schoolSchedules: appSettings.schedule.schoolSchedules,
    appSettings,
    syncToken: appState?.sync_token ?? '',
  };
}

export async function pushRemoteData(
  payload: Omit<RemoteDataPayload, 'syncToken'>
): Promise<string> {
  const supabase = getSupabase();
  const syncToken = crypto.randomUUID();
  const now = new Date().toISOString();

  await syncRows(
    'employees',
    payload.employees.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      hourly_wage: row.hourlyWage,
      phone: row.phone,
      hire_date: row.hireDate,
      status: row.status,
      updated_at: row.updatedAt || now,
    })),
    'id'
  );

  await syncRows(
    'schedule_shifts',
    payload.scheduleShifts.map((row) => ({
      id: row.id,
      year: row.year,
      month: row.month,
      day: row.day,
      row_id: row.rowId,
      name: row.name,
      start_time: row.startTime,
      end_time: row.endTime,
      duration: row.duration,
      updated_at: row.updatedAt || now,
    })),
    'id'
  );

  await syncRows(
    'actual_work_records',
    payload.actualWorkRecords.map((row) => ({
      id: row.id,
      employee_id: row.employeeId,
      employee_name: row.employeeName,
      date: row.date,
      shift_id: row.shiftId,
      scheduled_start: row.scheduledStart,
      scheduled_end: row.scheduledEnd,
      actual_start: row.actualStart,
      actual_end: row.actualEnd,
      status: row.status,
      modification_reason: row.modificationReason,
      is_manually_edited: row.isManuallyEdited,
      updated_at: row.updatedAt || now,
    })),
    'id'
  );

  await syncPayrollRows(
    payload.payrollAdjustmentRecords.map((row) => ({
      employee_id: row.employeeId,
      period: row.period,
      period_key: row.periodKey,
      adjustments: row.adjustments,
      updated_at: row.updatedAt || now,
    }))
  );

  const { error: stateError } = await supabase.from('app_state').upsert({
    id: 1,
    app_settings: payload.appSettings,
    sync_token: syncToken,
    updated_at: now,
  });

  if (stateError) throw new Error(supabaseErrorMessage(stateError));

  return syncToken;
}

export function toRemotePayload(data: AppStorage): Omit<RemoteDataPayload, 'syncToken'> {
  const now = new Date().toISOString();

  return {
    employees: data.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.position,
      hourlyWage: employee.hourlyWage,
      phone: employee.phone,
      hireDate: employee.hireDate,
      status: employee.status,
      updatedAt: now,
    })),
    scheduleShifts: data.scheduleShifts.map((shift) => ({
      id: shift.id,
      year: shift.year,
      month: shift.month,
      day: shift.day,
      rowId: shift.rowId,
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      duration: shift.duration,
      updatedAt: now,
    })),
    actualWorkRecords: data.actualWorkRecords.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      date: record.date,
      shiftId: record.shiftId,
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
      actualStart: record.actualStart,
      actualEnd: record.actualEnd,
      status: record.status,
      modificationReason: record.modificationReason,
      isManuallyEdited: record.isManuallyEdited,
      updatedAt: record.updatedAt || now,
    })),
    payrollAdjustmentRecords: data.payrollAdjustmentRecords.map((record) => ({
      employeeId: record.employeeId,
      period: record.period,
      periodKey: record.periodKey,
      adjustments: record.adjustments,
      updatedAt: record.updatedAt || now,
    })),
    schoolSchedules: data.appSettings.schedule.schoolSchedules,
    appSettings: data.appSettings,
  };
}

export function fromRemotePayload(
  remote: RemoteDataPayload,
  defaults: AppStorage
): AppStorage {
  const shiftTypes = defaults.shiftTypes;
  const schoolSchedules = remote.schoolSchedules;
  const appSettings = migrateAppSettings(remote.appSettings, shiftTypes, schoolSchedules);

  return {
    version: 5,
    employees: remote.employees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      position: employee.position as AppStorage['employees'][number]['position'],
      hourlyWage: employee.hourlyWage,
      phone: employee.phone,
      hireDate: employee.hireDate,
      status: employee.status as AppStorage['employees'][number]['status'],
    })),
    shiftTypes: appSettings.shiftTypes,
    scheduleShifts: remote.scheduleShifts.map((shift) => ({
      id: shift.id,
      year: shift.year,
      month: shift.month,
      day: shift.day,
      rowId: shift.rowId as AppStorage['scheduleShifts'][number]['rowId'],
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      duration: shift.duration,
    })),
    schoolSchedules: appSettings.schedule.schoolSchedules,
    actualWorkRecords: remote.actualWorkRecords.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      date: record.date,
      shiftId: record.shiftId,
      scheduledStart: record.scheduledStart,
      scheduledEnd: record.scheduledEnd,
      actualStart: record.actualStart,
      actualEnd: record.actualEnd,
      scheduledHours: 0,
      workedHours: 0,
      isLate: false,
      lateMinutes: 0,
      isEarlyLeave: false,
      earlyLeaveMinutes: 0,
      isOvertime: false,
      overtimeMinutes: 0,
      status: record.status as ActualWorkRecord['status'],
      payrollAmount: 0,
      modificationReason: record.modificationReason,
      isManuallyEdited: record.isManuallyEdited,
      updatedAt: record.updatedAt,
    })),
    payrollAdjustmentRecords: remote.payrollAdjustmentRecords.map((record) => ({
      employeeId: record.employeeId,
      period: record.period as PayrollAdjustmentRecord['period'],
      periodKey: record.periodKey,
      adjustments: record.adjustments,
      updatedAt: record.updatedAt,
    })),
    appSettings,
  };
}
