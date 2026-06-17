import type { EmployeeStatus } from '@/lib/employees';

export type EmployeeColorCategory =
  | 'store-manager'
  | 'manager'
  | 'staff'
  | 'part-time'
  | 'off'
  | 'vacation';

export const EMPLOYEE_COLOR_LABELS: Record<EmployeeColorCategory, string> = {
  'store-manager': '점장',
  manager: '매니저',
  staff: '직원',
  'part-time': '아르바이트',
  off: '휴무',
  vacation: '휴가',
};

export const EMPLOYEE_CARD_CLASSES: Record<EmployeeColorCategory, string> = {
  'store-manager': 'bg-amber-50 border-amber-400/80 text-amber-900',
  manager: 'bg-violet-50 border-violet-400/80 text-violet-900',
  staff: 'bg-blue-50 border-blue-300/80 text-blue-900',
  'part-time': 'bg-emerald-50 border-emerald-300/80 text-emerald-900',
  off: 'bg-stone-100 border-stone-300/80 text-stone-500',
  vacation: 'bg-orange-50 border-orange-300/80 text-orange-900',
};

export const EMPLOYEE_AVATAR_CLASSES: Record<EmployeeColorCategory, string> = {
  'store-manager': 'bg-amber-100 text-amber-800 ring-1 ring-amber-300/80',
  manager: 'bg-violet-100 text-violet-800 ring-1 ring-violet-300/80',
  staff: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300/80',
  'part-time': 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/80',
  off: 'bg-stone-200 text-stone-500 ring-1 ring-stone-300/80',
  vacation: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300/80',
};

export const EMPLOYEE_SWATCH_CLASSES: Record<EmployeeColorCategory, string> = {
  'store-manager': 'bg-amber-50 border-amber-400',
  manager: 'bg-violet-50 border-violet-400',
  staff: 'bg-blue-50 border-blue-300',
  'part-time': 'bg-emerald-50 border-emerald-300',
  off: 'bg-stone-100 border-stone-300',
  vacation: 'bg-orange-50 border-orange-300',
};

export const EMPLOYEE_BADGE_CLASSES: Record<EmployeeColorCategory, string> = {
  'store-manager': 'bg-amber-50 text-amber-800',
  manager: 'bg-violet-50 text-violet-800',
  staff: 'bg-blue-50 text-blue-800',
  'part-time': 'bg-emerald-50 text-emerald-800',
  off: 'bg-stone-100 text-stone-500',
  vacation: 'bg-orange-50 text-orange-800',
};

const POSITION_CATEGORY_MAP: Record<string, EmployeeColorCategory> = {
  'store-manager': 'store-manager',
  manager: 'manager',
  staff: 'staff',
  'part-time': 'part-time',
};

export function getEmployeeColorCategory(
  position: string,
  status: EmployeeStatus
): EmployeeColorCategory {
  if (status === 'leave') return 'vacation';
  if (status === 'resigned') return 'off';
  return POSITION_CATEGORY_MAP[position] ?? 'staff';
}

export function getEmployeeCardClass(position: string, status: EmployeeStatus): string {
  return EMPLOYEE_CARD_CLASSES[getEmployeeColorCategory(position, status)];
}

export function getEmployeeAvatarClass(position: string, status: EmployeeStatus): string {
  return EMPLOYEE_AVATAR_CLASSES[getEmployeeColorCategory(position, status)];
}

export function getEmployeeBadgeClass(position: string, status: EmployeeStatus): string {
  return EMPLOYEE_BADGE_CLASSES[getEmployeeColorCategory(position, status)];
}
