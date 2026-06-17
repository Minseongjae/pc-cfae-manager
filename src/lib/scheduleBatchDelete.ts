import type { ScheduleShift } from '@/data/mockSchedule';
import { findEmployeeByShiftName } from '@/lib/payroll';
import type { EmployeeRow } from '@/lib/storage';
import { isScheduleDateAllowed } from '@/lib/scheduleDateRange';

export type ScheduleBatchDeleteMode = 'day' | 'range' | 'employee' | 'all';

export interface ScheduleBatchDeleteParams {
  mode: ScheduleBatchDeleteMode;
  year: number;
  month: number;
  day?: number;
  startYear?: number;
  startMonth?: number;
  startDay?: number;
  endYear?: number;
  endMonth?: number;
  endDay?: number;
  employeeName?: string;
  /** 직원 삭제 시 현재 월만 대상 */
  employeeMonthOnly?: boolean;
}

function toDateKey(year: number, month: number, day: number): number {
  return year * 10_000 + month * 100 + day;
}

function isShiftInRange(
  shift: ScheduleShift,
  startKey: number,
  endKey: number
): boolean {
  const key = toDateKey(shift.year, shift.month, shift.day);
  return key >= startKey && key <= endKey;
}

export function filterShiftsForBatchDelete(
  shifts: ScheduleShift[],
  params: ScheduleBatchDeleteParams,
  employees: EmployeeRow[] = []
): ScheduleShift[] {
  switch (params.mode) {
    case 'all':
      return [...shifts];

    case 'day': {
      const day = params.day ?? 1;
      if (!isScheduleDateAllowed(params.year, params.month, day)) return [];
      return shifts.filter(
        (s) => s.year === params.year && s.month === params.month && s.day === day
      );
    }

    case 'range': {
      const sy = params.startYear ?? params.year;
      const sm = params.startMonth ?? params.month;
      const sd = params.startDay ?? 1;
      const ey = params.endYear ?? params.year;
      const em = params.endMonth ?? params.month;
      const ed = params.endDay ?? sd;
      if (
        !isScheduleDateAllowed(sy, sm, sd) ||
        !isScheduleDateAllowed(ey, em, ed)
      ) {
        return [];
      }
      const startKey = toDateKey(sy, sm, sd);
      const endKey = toDateKey(ey, em, ed);
      const [lo, hi] = startKey <= endKey ? [startKey, endKey] : [endKey, startKey];
      return shifts.filter((s) => isShiftInRange(s, lo, hi));
    }

    case 'employee': {
      const name = params.employeeName?.trim();
      if (!name) return [];
      const employee = employees.find((e) => e.name === name);
      const pool = employee
        ? shifts.filter((s) => findEmployeeByShiftName([employee], s.name))
        : shifts.filter((s) => s.name === name);
      if (params.employeeMonthOnly) {
        return pool.filter((s) => s.year === params.year && s.month === params.month);
      }
      return pool;
    }

    default:
      return [];
  }
}

export function describeBatchDelete(params: ScheduleBatchDeleteParams): string {
  switch (params.mode) {
    case 'day':
      return `${params.year}년 ${params.month}월 ${params.day ?? 1}일 전체`;
    case 'range':
      return `${params.startYear ?? params.year}.${params.startMonth ?? params.month}.${params.startDay ?? 1} ~ ${params.endYear ?? params.year}.${params.endMonth ?? params.month}.${params.endDay ?? 1}`;
    case 'employee':
      return params.employeeMonthOnly
        ? `${params.employeeName} (${params.year}년 ${params.month}월)`
        : `${params.employeeName} (전체 기간)`;
    case 'all':
      return '전체 스케줄';
    default:
      return '';
  }
}
