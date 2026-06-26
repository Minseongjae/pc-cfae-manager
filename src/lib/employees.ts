import { getAppSettings } from '@/lib/storage';
import { getResolvedPayrollSettings } from '@/lib/appSettings';

export type EmployeePosition = string;
export type EmployeeStatus = 'working' | 'leave' | 'resigned';

export const POSITION_LABELS: Record<string, string> = {
  'part-time': '아르바이트',
  staff: '직원',
  manager: '매니저',
  'store-manager': '점장',
};

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  working: '근무',
  leave: '휴가',
  resigned: '퇴사',
};

export const POSITION_OPTIONS: EmployeePosition[] = [
  'part-time',
  'staff',
  'manager',
  'store-manager',
];

export const STATUS_OPTIONS: EmployeeStatus[] = ['working', 'leave', 'resigned'];

export const EMPLOYEES_CHANGED_EVENT = 'employees-changed';

export function getPositionOptions(): { id: string; label: string }[] {
  const positions = getAppSettings().positions;
  if (positions.length > 0) {
    return positions.map((p) => ({ id: p.id, label: p.label }));
  }
  return POSITION_OPTIONS.map((id) => ({ id, label: POSITION_LABELS[id] ?? id }));
}

export function getPositionLabel(position: EmployeePosition): string {
  const fromSettings = getAppSettings().positions.find((p) => p.id === position);
  if (fromSettings) return fromSettings.label;
  return POSITION_LABELS[position] ?? position;
}

export function getStatusLabel(status: EmployeeStatus): string {
  return STATUS_LABELS[status];
}

export function getDefaultHourlyWage(position: EmployeePosition): number {
  const fromSettings = getAppSettings().positions.find((p) => p.id === position);
  if (fromSettings) return fromSettings.defaultHourlyWage;

  switch (position) {
    case 'store-manager':
      return 12000;
    case 'manager':
      return 11500;
    case 'staff':
      return 10400;
    case 'part-time':
      return 10030;
    default:
      return getResolvedPayrollSettings(getAppSettings().payroll).defaultHourlyWage;
  }
}
