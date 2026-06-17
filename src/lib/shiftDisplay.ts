import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import type { EmployeeStatus } from '@/lib/employees';

export type ShiftDisplayCategory = 'morning' | 'afternoon' | 'closing' | 'off' | 'vacation';

export const SHIFT_CATEGORY_LABELS: Record<ShiftDisplayCategory, string> = {
  morning: '오전',
  afternoon: '오후',
  closing: '마감',
  off: '휴무',
  vacation: '휴가',
};

export const SHIFT_CATEGORY_COLORS: Record<ShiftDisplayCategory, string> = {
  morning: 'bg-blue-50 border-blue-300/80 text-blue-900',
  afternoon: 'bg-emerald-50 border-emerald-300/80 text-emerald-900',
  closing: 'bg-violet-50 border-violet-400/80 text-violet-900',
  off: 'bg-stone-100 border-stone-300/80 text-stone-500',
  vacation: 'bg-orange-50 border-orange-300/80 text-orange-900',
};

export const SHIFT_CATEGORY_SWATCHES: Record<ShiftDisplayCategory, string> = {
  morning: 'bg-blue-50 border-blue-300',
  afternoon: 'bg-emerald-50 border-emerald-300',
  closing: 'bg-violet-50 border-violet-400',
  off: 'bg-stone-100 border-stone-300',
  vacation: 'bg-orange-50 border-orange-300',
};

const OFF_KEYWORDS = ['휴무', 'off', 'OFF'];
const VACATION_KEYWORDS = ['휴가', '연차', '병가', '교육'];

function nameMatches(name: string, keywords: string[]): boolean {
  const normalized = name.trim().toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function getShiftDisplayCategory(
  shift: ScheduleShift,
  employeeStatus?: EmployeeStatus
): ShiftDisplayCategory {
  const name = shift.name.trim();

  if (nameMatches(name, OFF_KEYWORDS)) return 'off';
  if (nameMatches(name, VACATION_KEYWORDS) || shift.rowId === 'training') return 'vacation';
  if (employeeStatus === 'leave') return 'vacation';

  switch (shift.rowId as ShiftRowId) {
    case 'morning':
      return 'morning';
    case 'afternoon1':
    case 'afternoon2':
      return 'afternoon';
    case 'middle':
    case 'night':
      return 'closing';
    default:
      return 'afternoon';
  }
}

export function getShiftCardColorClass(
  shift: ScheduleShift,
  employeeStatus?: EmployeeStatus
): string {
  return SHIFT_CATEGORY_COLORS[getShiftDisplayCategory(shift, employeeStatus)];
}
