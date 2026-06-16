export interface EmployeeRow {
  id: number;
  name: string;
  position: string;
  hourlyWage: number;
  phone: string;
  hireDate: string;
  status: string;
  updatedAt: string;
}

export interface ScheduleShift {
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
}

export interface AttendanceRecord {
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
}

export interface PayrollAdjustments {
  bonus: number;
  mealAllowance: number;
  transportationAllowance: number;
  advanceDeduction: number;
  penaltyDeduction: number;
  customLabel: string;
  customAmount: number;
  note: string;
}

export interface PayrollAdjustmentRecord {
  employeeId: number;
  period: string;
  periodKey: string;
  adjustments: PayrollAdjustments;
  updatedAt: string;
}

export interface SchoolSchedule {
  school: string;
  schedule: string;
}

export interface AppSettingsPayload {
  store: Record<string, unknown>;
  payroll: Record<string, unknown>;
  schedule: Record<string, unknown> & { schoolSchedules?: SchoolSchedule[] };
  positions: Array<Record<string, unknown>>;
  shiftTypes: Array<Record<string, unknown>>;
  theme: Record<string, unknown>;
  security: Record<string, unknown>;
}

export interface AppDataPayload {
  employees: EmployeeRow[];
  scheduleShifts: ScheduleShift[];
  actualWorkRecords: AttendanceRecord[];
  payrollAdjustmentRecords: PayrollAdjustmentRecord[];
  schoolSchedules: SchoolSchedule[];
  appSettings: AppSettingsPayload;
  syncToken: string;
}
