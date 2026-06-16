import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import type { EmployeePosition, EmployeeStatus } from '@/lib/employees';
import type { ActualWorkRecord } from '@/lib/actualWork';
import type { PayrollAdjustmentRecord } from '@/lib/payrollAdjustments';
import type { AppSettings } from '@/lib/appSettings';
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

export interface AppStorage {
  version?: number;
  employees: EmployeeRow[];
  shiftTypes: ShiftType[];
  scheduleShifts: ScheduleShift[];
  schoolSchedules: SchoolSchedule[];
  actualWorkRecords: ActualWorkRecord[];
  payrollAdjustmentRecords: PayrollAdjustmentRecord[];
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
