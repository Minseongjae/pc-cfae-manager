import type { CSSProperties } from 'react';
import type { ScheduleShift } from '@/data/mockSchedule';
import type { EmployeeStatus } from '@/lib/employees';
import { EMPLOYEE_CARD_CLASSES } from '@/lib/employeeColors';
import { shiftTypeCardStyle } from '@/lib/scheduleShiftTypes';
import type { ShiftType } from '@/types';

const OFF_KEYWORDS = ['휴무', 'off', 'OFF'];
const VACATION_KEYWORDS = ['휴가', '연차', '병가', '교육', '대타'];

function nameMatches(name: string, keywords: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function isOffShift(shift: ScheduleShift, shiftType?: ShiftType): boolean {
  return (
    nameMatches(shift.name, OFF_KEYWORDS) ||
    (shiftType ? nameMatches(shiftType.name, OFF_KEYWORDS) : false)
  );
}

function isVacationShift(
  shift: ScheduleShift,
  shiftType?: ShiftType,
  employeeStatus?: EmployeeStatus
): boolean {
  return (
    nameMatches(shift.name, VACATION_KEYWORDS) ||
    (shiftType ? nameMatches(shiftType.name, VACATION_KEYWORDS) : false) ||
    employeeStatus === 'leave'
  );
}

export function getShiftCardStyle(
  shift: ScheduleShift,
  shiftType: ShiftType | undefined,
  employee?: { position: string; status: EmployeeStatus }
): CSSProperties {
  if (isOffShift(shift, shiftType)) {
    const style = shiftTypeCardStyle('#9CA3AF');
    return style;
  }

  if (isVacationShift(shift, shiftType, employee?.status)) {
    return shiftTypeCardStyle('#F97316');
  }

  if (shiftType) {
    return shiftTypeCardStyle(shiftType.color);
  }

  return shiftTypeCardStyle('#9CA3AF');
}

export function getShiftCardColorClass(
  shift: ScheduleShift,
  employee?: { position: string; status: EmployeeStatus }
): string {
  if (isOffShift(shift)) return EMPLOYEE_CARD_CLASSES.off;
  if (isVacationShift(shift, undefined, employee?.status)) {
    return EMPLOYEE_CARD_CLASSES.vacation;
  }
  return 'border shadow-sm';
}
