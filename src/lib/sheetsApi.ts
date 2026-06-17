import type { AppStorage, PurchaseOrder } from '@/lib/appStorage';
import type { AppSettings } from '@/lib/appSettings';
import { migrateAppSettings } from '@/lib/appSettings';
import type { PayrollAdjustmentRecord } from '@/lib/payrollAdjustments';
import type { ActualWorkRecord } from '@/lib/actualWork';

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
  inventoryItems: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    expiryDate: string;
    updatedAt: string;
  }>;
  purchaseOrders: Array<{
    id: string;
    productName: string;
    quantity: number;
    status: PurchaseOrder['status'];
    scheduledDate: string;
    note: string;
    updatedAt: string;
  }>;
  salesRecords: Array<{
    id: string;
    date: string;
    amount: number;
    note: string;
    updatedAt: string;
  }>;
  syncToken: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

function headers(): HeadersInit {
  const result: HeadersInit = { 'Content-Type': 'application/json' };
  if (API_KEY) result['x-api-key'] = API_KEY;
  return result;
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    if (!response.ok) return false;
    const body = (await response.json()) as { ok?: boolean; sheetsConfigured?: boolean };
    return body.ok === true && body.sheetsConfigured === true;
  } catch {
    return false;
  }
}

export async function fetchRemoteData(): Promise<RemoteDataPayload> {
  const response = await fetch(`${API_BASE}/api/data`, { headers: headers() });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<RemoteDataPayload>;
}

export async function pushRemoteData(
  payload: Omit<RemoteDataPayload, 'syncToken'>
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/data`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const body = (await response.json()) as { syncToken?: string };
  return body.syncToken ?? '';
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
    inventoryItems: data.inventoryItems.map((item) => ({
      id: item.id,
      name: item.name,
      currentStock: item.currentStock,
      minStock: item.minStock,
      expiryDate: item.expiryDate,
      updatedAt: item.updatedAt || now,
    })),
    purchaseOrders: data.purchaseOrders.map((order) => ({
      id: order.id,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      scheduledDate: order.scheduledDate,
      note: order.note,
      updatedAt: order.updatedAt || now,
    })),
    salesRecords: data.salesRecords.map((record) => ({
      id: record.id,
      date: record.date,
      amount: record.amount,
      note: record.note,
      updatedAt: record.updatedAt || now,
    })),
  };
}

export function fromRemotePayload(
  remote: RemoteDataPayload,
  defaults: AppStorage
): AppStorage {
  const shiftTypes = defaults.shiftTypes;
  const schoolSchedules = remote.schoolSchedules;
  const appSettings = migrateAppSettings(
    remote.appSettings,
    shiftTypes,
    schoolSchedules
  );

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
    inventoryItems: (remote.inventoryItems ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      currentStock: item.currentStock,
      minStock: item.minStock,
      expiryDate: item.expiryDate,
      updatedAt: item.updatedAt,
    })),
    purchaseOrders: (remote.purchaseOrders ?? []).map((order) => ({
      id: order.id,
      productName: order.productName,
      quantity: order.quantity,
      status: order.status,
      scheduledDate: order.scheduledDate,
      note: order.note,
      updatedAt: order.updatedAt,
    })),
    salesRecords: (remote.salesRecords ?? []).map((record) => ({
      id: record.id,
      date: record.date,
      amount: record.amount,
      note: record.note,
      updatedAt: record.updatedAt,
    })),
    appSettings,
  };
}
