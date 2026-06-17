import type { ScheduleShift } from '@/data/mockSchedule';
import type { EmployeeStatus } from '@/lib/employees';
import {
  EMPLOYEE_CARD_CLASSES,
  EMPLOYEE_COLOR_LABELS,
  EMPLOYEE_SWATCH_CLASSES,
  getEmployeeCardClass,
  type EmployeeColorCategory,
} from '@/lib/employeeColors';

export type ShiftDisplayCategory = EmployeeColorCategory;

export const SHIFT_CATEGORY_LABELS = EMPLOYEE_COLOR_LABELS;

export const SHIFT_CATEGORY_COLORS = EMPLOYEE_CARD_CLASSES;

export const SHIFT_CATEGORY_SWATCHES = EMPLOYEE_SWATCH_CLASSES;

const OFF_KEYWORDS = ['휴무', 'off', 'OFF'];
const VACATION_KEYWORDS = ['휴가', '연차', '병가', '교육'];

function nameMatches(name: string, keywords: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function getShiftDisplayCategory(
  shift: ScheduleShift,
  employee?: { position: string; status: EmployeeStatus }
): ShiftDisplayCategory {
  const name = shift.name.trim();

  if (nameMatches(name, OFF_KEYWORDS)) return 'off';
  if (nameMatches(name, VACATION_KEYWORDS) || shift.rowId === 'training') return 'vacation';
  if (employee?.status === 'leave') return 'vacation';

  if (employee) {
    if (employee.status === 'resigned') return 'off';
    const position = employee.position;
    if (position === 'store-manager') return 'store-manager';
    if (position === 'manager') return 'manager';
    if (position === 'part-time') return 'part-time';
    return 'staff';
  }

  return 'staff';
}

export function getShiftCardColorClass(
  shift: ScheduleShift,
  employee?: { position: string; status: EmployeeStatus }
): string {
  const category = getShiftDisplayCategory(shift, employee);
  if (category === 'off' || category === 'vacation') {
    return EMPLOYEE_CARD_CLASSES[category];
  }
  if (employee) {
    return getEmployeeCardClass(employee.position, employee.status);
  }
  return EMPLOYEE_CARD_CLASSES[category];
}
