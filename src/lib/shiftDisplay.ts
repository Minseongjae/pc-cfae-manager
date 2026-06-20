import type { CSSProperties } from 'react';
import type { ScheduleShift } from '@/data/mockSchedule';
import type { EmployeeStatus } from '@/lib/employees';
import type { PositionDefinition, ScheduleColorMode } from '@/lib/appSettings';
import type { EmployeeRow } from '@/lib/appStorage';
import {
  EMPLOYEE_CARD_CLASSES,
  resolveEmployeeScheduleColor,
} from '@/lib/employeeColors';
import { getShiftDurationAccentPx } from '@/lib/shiftUtils';
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
  employee?: Pick<EmployeeRow, 'id' | 'position' | 'status'>,
  positions?: PositionDefinition[],
  colorMode: ScheduleColorMode = 'employee',
  _compact = false
): CSSProperties {
  let colorStyle: CSSProperties;

  if (isOffShift(shift, shiftType)) {
    colorStyle = shiftTypeCardStyle('#9CA3AF');
  } else if (isVacationShift(shift, shiftType, employee?.status)) {
    colorStyle = shiftTypeCardStyle('#F97316');
  } else if (colorMode === 'shiftType' && shiftType) {
    colorStyle = shiftTypeCardStyle(shiftType.color);
  } else if (employee) {
    colorStyle = shiftTypeCardStyle(resolveEmployeeScheduleColor(employee, positions));
  } else if (shiftType) {
    colorStyle = shiftTypeCardStyle(shiftType.color);
  } else {
    colorStyle = shiftTypeCardStyle('#9CA3AF');
  }

  return {
    ...colorStyle,
    borderBottomWidth: getShiftDurationAccentPx(shift.duration),
  };
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
