import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import type { EmployeePosition, EmployeeStatus } from '@/lib/employees';
import type { ActualWorkRecord } from '@/lib/actualWork';
import type { PayrollAdjustmentRecord } from '@/lib/payrollAdjustments';
import type { AppSettings } from '@/lib/appSettings';
import type { Notice } from '@/lib/notices';
import type { ShiftType } from '@/types';

export interface EmployeeRow {
  id: number;
  name: string;
  position: EmployeePosition;
  hourlyWage: number;
  phone: string;
  hireDate: string;
  status: EmployeeStatus;
}

export interface EmployeeInput {
  name: string;
  position: EmployeePosition;
  hourlyWage: number;
  phone: string;
  hireDate: string;
  status: EmployeeStatus;
}

export interface SchoolSchedule {
  school: string;
  schedule: string;
}

export type PurchaseOrderStatus = 'scheduled' | 'ordered' | 'received';

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  expiryDate: string;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  categoryId: string;
  productName: string;
  quantity: number;
  status: PurchaseOrderStatus;
  scheduledDate: string;
  note: string;
  updatedAt?: string;
}

export interface SalesRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
  updatedAt?: string;
}

export interface AppStorage {
  version?: number;
  employees: EmployeeRow[];
  shiftTypes: ShiftType[];
  scheduleShifts: ScheduleShift[];
  notices: Notice[];
  schoolSchedules: SchoolSchedule[];
  actualWorkRecords: ActualWorkRecord[];
  payrollAdjustmentRecords: PayrollAdjustmentRecord[];
  inventoryItems: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  salesRecords: SalesRecord[];
  appSettings: AppSettings;
}

export interface ShiftInput {
  year: number;
  month: number;
  day: number;
  rowId: ShiftRowId;
  name: string;
  startTime: string;
  endTime: string;
}
