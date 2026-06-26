import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ScheduleShift } from '@/data/mockSchedule';
import { calculateShiftHours } from '@/lib/shiftUtils';
import { getPositionLabel } from '@/lib/employees';
import type { ActualWorkRecord } from '@/lib/actualWork';
import {
  buildPeriodKey,
  calculateAdjustmentTotals,
  hasAnyAdjustment,
  EMPTY_PAYROLL_ADJUSTMENTS,
  type PayrollAdjustments,
} from '@/lib/payrollAdjustments';
import {
  getEmployees,
  getScheduleShifts,
  getActualWorkRecords,
  getPayrollAdjustmentsForPeriod,
  type EmployeeRow,
} from '@/lib/storage';

export type PayrollPeriod = 'daily' | 'weekly' | 'monthly';

export interface PayrollShiftDetail {
  shiftId: string;
  date: string;
  day: number;
  startTime: string;
  endTime: string;
  hours: number;
  amount: number;
  source: 'actual' | 'scheduled';
}

export interface PayrollEntry {
  employeeId: number;
  employeeName: string;
  position: string;
  hourlyWage: number;
  hours: number;
  /** Automatic pay from actual/scheduled hours */
  automaticPay: number;
  adjustments: PayrollAdjustments;
  additions: number;
  deductions: number;
  adjustmentNet: number;
  finalPay: number;
  /** @deprecated Use automaticPay */
  amount: number;
  shiftCount: number;
  shifts: PayrollShiftDetail[];
}

export interface PayrollSummary {
  period: PayrollPeriod;
  periodLabel: string;
  periodKey: string;
  startDate: Date;
  endDate: Date;
  totalHours: number;
  totalAutomaticPay: number;
  totalAdditions: number;
  totalDeductions: number;
  totalAdjustmentNet: number;
  totalFinalPay: number;
  /** @deprecated Use totalFinalPay */
  totalPayroll: number;
  averagePerEmployee: number;
  activeEmployees: number;
  entries: PayrollEntry[];
}

const DEFAULT_WAGE = 10400;

interface PayrollEntryDraft {
  employeeId: number;
  employeeName: string;
  position: string;
  hourlyWage: number;
  hours: number;
  automaticPay: number;
  shiftCount: number;
  shifts: PayrollShiftDetail[];
}

export function findEmployeeByShiftName(
  employees: EmployeeRow[],
  shiftName: string
): EmployeeRow | undefined {
  return employees.find(
    (e) =>
      e.name === shiftName ||
      e.name.endsWith(shiftName) ||
      e.name.includes(shiftName)
  );
}

function shiftToDate(shift: ScheduleShift): Date {
  return new Date(shift.year, shift.month - 1, shift.day);
}

function findActualWorkForShift(
  shift: ScheduleShift,
  records: ActualWorkRecord[]
): ActualWorkRecord | undefined {
  const dateStr = format(shiftToDate(shift), 'yyyy-MM-dd');
  return records.find(
    (record) =>
      record.shiftId === shift.id ||
      (record.date === dateStr &&
        record.scheduledStart === shift.startTime &&
        record.scheduledEnd === shift.endTime &&
        (record.employeeName === shift.name ||
          record.employeeName.endsWith(shift.name) ||
          record.employeeName.includes(shift.name)))
  );
}

function calculateShiftPay(
  shift: ScheduleShift,
  employees: EmployeeRow[],
  actualRecords: ActualWorkRecord[]
): {
  hours: number;
  amount: number;
  employee: EmployeeRow | undefined;
  source: 'actual' | 'scheduled';
  actualStart?: string;
  actualEnd?: string;
} {
  const employee = findEmployeeByShiftName(employees, shift.name);
  const wage = employee?.hourlyWage ?? DEFAULT_WAGE;
  const actualRecord = findActualWorkForShift(shift, actualRecords);

  if (
    actualRecord?.actualStart &&
    actualRecord.actualEnd &&
    actualRecord.workedHours > 0
  ) {
    return {
      hours: actualRecord.workedHours,
      amount: actualRecord.payrollAmount,
      employee,
      source: 'actual',
      actualStart: actualRecord.actualStart,
      actualEnd: actualRecord.actualEnd,
    };
  }

  const hours = calculateShiftHours(shift.startTime, shift.endTime);
  return {
    hours,
    amount: Math.round(hours * wage),
    employee,
    source: 'scheduled',
  };
}

function applyAdjustmentsToEntry(
  entry: PayrollEntryDraft,
  adjustments: PayrollAdjustments
): PayrollEntry {
  const automaticPay = Math.round(entry.automaticPay);
  const { additions, deductions, net } = calculateAdjustmentTotals(adjustments);
  const finalPay = Math.max(0, automaticPay + net);

  return {
    ...entry,
    automaticPay,
    adjustments,
    additions,
    deductions,
    adjustmentNet: net,
    finalPay,
    amount: automaticPay,
  };
}

function aggregatePayroll(
  shifts: ScheduleShift[],
  employees: EmployeeRow[],
  actualRecords: ActualWorkRecord[],
  period: PayrollPeriod,
  periodKey: string,
  periodLabel: string,
  startDate: Date,
  endDate: Date
): PayrollSummary {
  const adjustmentMap = getPayrollAdjustmentsForPeriod(period, periodKey);
  const entryMap = new Map<number, PayrollEntryDraft>();

  for (const shift of shifts) {
    const { hours, amount, employee, source, actualStart, actualEnd } = calculateShiftPay(
      shift,
      employees,
      actualRecords
    );
    const empId = employee?.id ?? -1;
    const empName = employee?.name ?? shift.name;
    const position = employee ? getPositionLabel(employee.position) : '미등록';
    const wage = employee?.hourlyWage ?? DEFAULT_WAGE;

    const existing = entryMap.get(empId);
    const base = existing ?? {
      employeeId: empId,
      employeeName: empName,
      position,
      hourlyWage: wage,
      hours: 0,
      automaticPay: 0,
      shiftCount: 0,
      shifts: [],
    };

    base.hours += hours;
    base.automaticPay += amount;
    base.shiftCount += 1;
    base.shifts.push({
      shiftId: shift.id,
      date: format(shiftToDate(shift), 'yyyy-MM-dd'),
      day: shift.day,
      startTime: actualStart ?? shift.startTime,
      endTime: actualEnd ?? shift.endTime,
      hours: Math.round(hours * 10) / 10,
      amount,
      source,
    });

    entryMap.set(empId, base);
  }

  for (const [employeeId, adjustments] of adjustmentMap) {
    if (entryMap.has(employeeId) || !hasAnyAdjustment(adjustments)) continue;

    const employee = employees.find((e) => e.id === employeeId);
    entryMap.set(employeeId, {
      employeeId,
      employeeName: employee?.name ?? `직원 #${employeeId}`,
      position: employee ? getPositionLabel(employee.position) : '미등록',
      hourlyWage: employee?.hourlyWage ?? DEFAULT_WAGE,
      hours: 0,
      automaticPay: 0,
      shiftCount: 0,
      shifts: [],
    });
  }

  const entries = Array.from(entryMap.values())
    .map((entry) => {
      const adjustments =
        adjustmentMap.get(entry.employeeId) ?? { ...EMPTY_PAYROLL_ADJUSTMENTS };
      return applyAdjustmentsToEntry(
        {
          ...entry,
          hours: Math.round(entry.hours * 10) / 10,
        },
        adjustments
      );
    })
    .sort((a, b) => b.finalPay - a.finalPay);

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const totalAutomaticPay = entries.reduce((sum, e) => sum + e.automaticPay, 0);
  const totalAdditions = entries.reduce((sum, e) => sum + e.additions, 0);
  const totalDeductions = entries.reduce((sum, e) => sum + e.deductions, 0);
  const totalAdjustmentNet = entries.reduce((sum, e) => sum + e.adjustmentNet, 0);
  const totalFinalPay = entries.reduce((sum, e) => sum + e.finalPay, 0);
  const activeEmployees = entries.length;

  return {
    period,
    periodLabel,
    periodKey,
    startDate,
    endDate,
    totalHours: Math.round(totalHours * 10) / 10,
    totalAutomaticPay,
    totalAdditions,
    totalDeductions,
    totalAdjustmentNet,
    totalFinalPay,
    totalPayroll: totalFinalPay,
    averagePerEmployee:
      activeEmployees > 0 ? Math.round(totalFinalPay / activeEmployees) : 0,
    activeEmployees,
    entries,
  };
}

function filterShiftsInRange(
  shifts: ScheduleShift[],
  start: Date,
  end: Date
): ScheduleShift[] {
  return shifts.filter((s) => {
    const d = shiftToDate(s);
    return isWithinInterval(d, { start, end });
  });
}

export function getDailyPayroll(
  year: number,
  month: number,
  day: number
): PayrollSummary {
  const employees = getEmployees();
  const allShifts = getScheduleShifts();
  const actualRecords = getActualWorkRecords();
  const date = new Date(year, month - 1, day);
  const periodKey = buildPeriodKey('daily', year, month, day);

  const shifts = allShifts.filter(
    (s) => s.year === year && s.month === month && s.day === day
  );

  return aggregatePayroll(
    shifts,
    employees,
    actualRecords,
    'daily',
    periodKey,
    format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko }),
    date,
    date
  );
}

export function getWeeklyPayroll(
  year: number,
  month: number,
  day: number
): PayrollSummary {
  const employees = getEmployees();
  const allShifts = getScheduleShifts();
  const actualRecords = getActualWorkRecords();
  const anchor = new Date(year, month - 1, day);
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(anchor, { weekStartsOn: 1 });
  const periodKey = buildPeriodKey('weekly', year, month, day);

  const shifts = filterShiftsInRange(allShifts, start, end);

  return aggregatePayroll(
    shifts,
    employees,
    actualRecords,
    'weekly',
    periodKey,
    `${format(start, 'M월 d일', { locale: ko })} ~ ${format(end, 'M월 d일', { locale: ko })}`,
    start,
    end
  );
}

export function getMonthlyPayroll(year: number, month: number): PayrollSummary {
  const employees = getEmployees();
  const allShifts = getScheduleShifts();
  const actualRecords = getActualWorkRecords();
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  const periodKey = buildPeriodKey('monthly', year, month, 1);

  const shifts = allShifts.filter((s) => s.year === year && s.month === month);

  return aggregatePayroll(
    shifts,
    employees,
    actualRecords,
    'monthly',
    periodKey,
    format(start, 'yyyy년 M월', { locale: ko }),
    start,
    end
  );
}

export function formatPayrollCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}
