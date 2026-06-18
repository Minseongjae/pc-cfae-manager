import type { CSSProperties } from 'react';
import type { EmployeeStatus } from '@/lib/employees';
import type { PositionDefinition } from '@/lib/appSettings';
import type { EmployeeRow } from '@/lib/appStorage';
import { normalizeHexColor, shiftTypeCardStyle } from '@/lib/scheduleShiftTypes';
import { getAppSettings } from '@/lib/storage';

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

const STATUS_COLORS = {
  off: '#9CA3AF',
  vacation: '#F97316',
} as const;

const DEFAULT_POSITION_COLORS: Record<string, string> = {
  'store-manager': '#F59E0B',
  manager: '#8B5CF6',
  staff: '#3B82F6',
  'part-time': '#10B981',
};

export const EMPLOYEE_CARD_CLASSES: Record<EmployeeColorCategory, string> = {
  'store-manager': 'bg-amber-50 border-amber-400/80 text-amber-900',
  manager: 'bg-violet-50 border-violet-400/80 text-violet-900',
  staff: 'bg-blue-50 border-blue-300/80 text-blue-900',
  'part-time': 'bg-emerald-50 border-emerald-300/80 text-emerald-900',
  off: 'bg-stone-100 border-stone-300/80 text-stone-500',
  vacation: 'bg-orange-50 border-orange-300/80 text-orange-900',
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

export function getEmployeeScheduleColorMap(): Record<string, string> {
  return getAppSettings().schedule.employeeScheduleColors ?? {};
}

export function resolveEmployeeScheduleColor(
  employee: Pick<EmployeeRow, 'id' | 'position' | 'status'>,
  positions?: PositionDefinition[]
): string {
  const custom = getEmployeeScheduleColorMap()[String(employee.id)];
  if (custom) return normalizeHexColor(custom);
  return resolveEmployeeColor(employee.position, employee.status, positions);
}

export function resolveShiftScheduleColor(
  shiftName: string,
  employees: EmployeeRow[],
  positions?: PositionDefinition[]
): string {
  const employee = employees.find(
    (row) =>
      row.name === shiftName ||
      row.name.endsWith(shiftName) ||
      row.name.includes(shiftName)
  );
  if (employee) {
    return resolveEmployeeScheduleColor(employee, positions);
  }
  return '#9CA3AF';
}

export function getPositionColor(position: string, positions?: PositionDefinition[]): string {
  const list = positions ?? getAppSettings().positions;
  const fromSettings = list.find((row) => row.id === position);
  if (fromSettings?.color) return normalizeHexColor(fromSettings.color);
  return DEFAULT_POSITION_COLORS[position] ?? '#3B82F6';
}

export function resolveEmployeeColor(
  position: string,
  status: EmployeeStatus,
  positions?: PositionDefinition[]
): string {
  if (status === 'leave') return STATUS_COLORS.vacation;
  if (status === 'resigned') return STATUS_COLORS.off;
  return getPositionColor(position, positions);
}

export function getEmployeeColorStyle(
  position: string,
  status: EmployeeStatus,
  positions?: PositionDefinition[]
): CSSProperties {
  return shiftTypeCardStyle(resolveEmployeeColor(position, status, positions));
}

export function getEmployeeAvatarStyle(
  position: string,
  status: EmployeeStatus,
  positions?: PositionDefinition[]
): CSSProperties {
  const style = getEmployeeColorStyle(position, status, positions);
  return {
    ...style,
    borderWidth: 1,
    borderStyle: 'solid',
  };
}

export function getEmployeeBadgeStyle(
  position: string,
  status: EmployeeStatus,
  positions?: PositionDefinition[]
): CSSProperties {
  return getEmployeeColorStyle(position, status, positions);
}

export function getEmployeeSwatchStyle(color: string): CSSProperties {
  const normalized = normalizeHexColor(color);
  const style = shiftTypeCardStyle(normalized);
  return {
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: 1,
    borderStyle: 'solid',
  };
}

export function getEmployeeCardClass(position: string, status: EmployeeStatus): string {
  return EMPLOYEE_CARD_CLASSES[getEmployeeColorCategory(position, status)];
}

export function getEmployeeAvatarClass(position: string, status: EmployeeStatus): string {
  return EMPLOYEE_CARD_CLASSES[getEmployeeColorCategory(position, status)];
}

export function getEmployeeBadgeClass(position: string, status: EmployeeStatus): string {
  return EMPLOYEE_CARD_CLASSES[getEmployeeColorCategory(position, status)];
}
