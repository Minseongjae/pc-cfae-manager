import type {
  AppDataPayload,
  AppSettingsPayload,
  AttendanceRecord,
  EmployeeRow,
  InventoryItem,
  PayrollAdjustmentRecord,
  PayrollAdjustments,
  PurchaseOrder,
  PurchaseOrderStatus,
  SalesRecord,
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
    inventoryItems: payload.inventoryItems,
    purchaseOrders: payload.purchaseOrders,
    salesRecords: payload.salesRecords,
    notices: payload.notices,
  });

  let hash = 0;
  for (let i = 0; i < blob.length; i += 1) {
    hash = (hash * 31 + blob.charCodeAt(i)) | 0;
  }

  return `${payload.employees.length}:${payload.scheduleShifts.length}:${payload.actualWorkRecords.length}:${payload.payrollAdjustmentRecords.length}:${payload.inventoryItems.length}:${payload.purchaseOrders.length}:${payload.salesRecords.length}:${payload.notices?.length ?? 0}:${hash}`;
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
  notices: import('./types.js').NoticeRow[];
  syncToken: string;
}): string[][] {
  const now = new Date().toISOString();
  return [
    ['school_schedules', JSON.stringify(payload.schoolSchedules), now],
    ['app_settings', JSON.stringify(payload.appSettings), now],
    ['notices', JSON.stringify(payload.notices ?? []), now],
    ['sync_token', payload.syncToken, now],
  ];
}

export function parseSettingsRows(
  rows: string[][],
  fallbackAppSettings: AppSettingsPayload
): {
  schoolSchedules: SchoolSchedule[];
  appSettings: AppSettingsPayload;
  notices: import('./types.js').NoticeRow[];
} {
  const schoolRow = rows.find((row) => row[0] === 'school_schedules');
  const appRow = rows.find((row) => row[0] === 'app_settings');
  const noticesRow = rows.find((row) => row[0] === 'notices');

  const schoolSchedules = parseSchoolSchedules(schoolRow?.[1] ?? '[]');
  const appSettings = parseJsonSetting(appRow?.[1] ?? '', fallbackAppSettings);
  const notices = parseJsonSetting<import('./types.js').NoticeRow[]>(noticesRow?.[1] ?? '[]', []);

  if (!appRow?.[1] && schoolSchedules.length > 0) {
    appSettings.schedule = {
      ...(appSettings.schedule ?? {}),
      schoolSchedules,
    };
  }

  return { schoolSchedules, appSettings, notices: Array.isArray(notices) ? notices : [] };
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

const INVENTORY_CATEGORY_IDS = ['inv-1', 'inv-2', 'inv-3', 'inv-4'];
const LEGACY_INVENTORY_HEADERS = [
  'id',
  'name',
  'current_stock',
  'min_stock',
  'expiry_date',
  'updated_at',
];

export function inventoryFromRow(headers: string[], row: string[]): InventoryItem | null {
  if (!row[0]) return null;

  const categorySlot = row[1] ?? '';
  const isNewFormat =
    headers.includes('category_id') &&
    INVENTORY_CATEGORY_IDS.includes(categorySlot);

  const raw = rowToObject(isNewFormat ? headers : LEGACY_INVENTORY_HEADERS, row);
  if (!raw.id) return null;

  const name = isNewFormat ? raw.name : raw.name || categorySlot;
  if (!name) return null;

  return {
    id: raw.id,
    categoryId: isNewFormat ? categorySlot : 'inv-1',
    name,
    currentStock: num(raw.current_stock),
    minStock: num(raw.min_stock),
    expiryDate: raw.expiry_date || '',
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function inventoryToRow(item: InventoryItem): string[] {
  return [
    item.id,
    item.categoryId || 'inv-1',
    item.name,
    String(item.currentStock),
    String(item.minStock),
    item.expiryDate,
    item.updatedAt,
  ];
}

const PURCHASE_STATUSES: PurchaseOrderStatus[] = ['scheduled', 'ordered', 'received'];
const PURCHASE_CATEGORY_IDS = ['po-1', 'po-2', 'po-3', 'po-4'];
const LEGACY_PURCHASE_HEADERS = [
  'id',
  'product_name',
  'quantity',
  'status',
  'scheduled_date',
  'note',
  'updated_at',
];

function parsePurchaseStatus(value: string): PurchaseOrderStatus {
  return PURCHASE_STATUSES.includes(value as PurchaseOrderStatus)
    ? (value as PurchaseOrderStatus)
    : 'scheduled';
}

export function purchaseOrderFromRow(headers: string[], row: string[]): PurchaseOrder | null {
  if (!row[0]) return null;

  const categorySlot = row[1] ?? '';
  const isNewFormat =
    headers.includes('category_id') &&
    PURCHASE_CATEGORY_IDS.includes(categorySlot);

  const raw = rowToObject(isNewFormat ? headers : LEGACY_PURCHASE_HEADERS, row);
  if (!raw.id) return null;

  const productName = isNewFormat ? raw.product_name : raw.product_name || categorySlot;
  if (!productName) return null;

  return {
    id: raw.id,
    categoryId: isNewFormat ? categorySlot : 'po-1',
    productName,
    quantity: num(isNewFormat ? raw.quantity : raw.quantity, 1),
    status: parsePurchaseStatus(raw.status),
    scheduledDate: raw.scheduled_date || '',
    note: raw.note || '',
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function purchaseOrderToRow(order: PurchaseOrder): string[] {
  return [
    order.id,
    order.categoryId || 'po-1',
    order.productName,
    String(order.quantity),
    order.status,
    order.scheduledDate,
    order.note,
    order.updatedAt,
  ];
}

export function salesFromRow(headers: string[], row: string[]): SalesRecord | null {
  const raw = rowToObject(headers, row);
  if (!raw.id || !raw.date) return null;
  return {
    id: raw.id,
    date: raw.date,
    amount: num(raw.amount),
    note: raw.note || '',
    updatedAt: raw.updated_at || new Date(0).toISOString(),
  };
}

export function salesToRow(record: SalesRecord): string[] {
  return [
    record.id,
    record.date,
    String(record.amount),
    record.note,
    record.updatedAt,
  ];
}
