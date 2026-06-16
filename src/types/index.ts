export interface Employee {
  id: number;
  name: string;
  hourlyWage: number;
  isActive: boolean;
}

export interface ShiftType {
  id: number;
  name: string;
  dayType: 'weekday' | 'saturday' | 'sunday';
  startTime: string;
  endTime: string;
  color: string;
}

export interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftTypeId: number;
  date: string;
}

export interface DashboardStats {
  totalEmployees: number;
  totalPayroll: number;
  averagePayrollPerEmployee: number;
  totalWorkHours: number;
  employeesWorkingToday: number;
  employeesOffToday: number;
  workingToday: Employee[];
  offToday: Employee[];
}

export interface ScheduleDay {
  date: string;
  dayOfWeek: number;
  assignments: (ShiftAssignment & {
    employeeName: string;
    shiftName: string;
    shiftColor: string;
    startTime: string;
    endTime: string;
  })[];
}

export type PageId =
  | 'dashboard'
  | 'schedule'
  | 'employees'
  | 'payroll'
  | 'actual-work'
  | 'settings';
