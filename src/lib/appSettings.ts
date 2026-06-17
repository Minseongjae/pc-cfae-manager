import type { ShiftType } from '@/types';
import { migrateShiftTypes } from '@/lib/scheduleShiftTypes';
import type { SchoolSchedule } from '@/lib/appStorage';
import { normalizeOptionalNumber } from '@/lib/numericInput';

export const SETTINGS_CHANGED_EVENT = 'settings-changed';

export interface StoreInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  businessHours: string;
  notes: string;
}

export interface PayrollSettings {
  defaultHourlyWage: number | null;
  overtimeMultiplier: number | null;
  weeklyHolidayAllowance: number | null;
  mealAllowanceDefault: number | null;
  transportationAllowanceDefault: number | null;
  paymentDay: number | null;
  notes: string;
}

export type ResolvedPayrollSettings = {
  defaultHourlyWage: number;
  overtimeMultiplier: number;
  weeklyHolidayAllowance: number;
  mealAllowanceDefault: number;
  transportationAllowanceDefault: number;
  paymentDay: number;
  notes: string;
};

export interface ScheduleSettings {
  weekStartsOn: 0 | 1;
  defaultView: 'monthly' | 'weekly' | 'daily';
  allowDragDrop: boolean;
  maxScheduleYear: number;
  schoolSchedules: SchoolSchedule[];
}

export interface PositionDefinition {
  id: string;
  label: string;
  defaultHourlyWage: number;
}

export interface ThemeSettings {
  mode: 'light' | 'dark';
  accent: 'stone' | 'amber' | 'emerald';
}

export interface SecuritySettings {
  passwordHash: string;
}

export interface AppSettings {
  store: StoreInfo;
  payroll: PayrollSettings;
  schedule: ScheduleSettings;
  positions: PositionDefinition[];
  shiftTypes: ShiftType[];
  theme: ThemeSettings;
  security: SecuritySettings;
}

export const DEFAULT_POSITIONS: PositionDefinition[] = [
  { id: 'part-time', label: '아르바이트', defaultHourlyWage: 10030 },
  { id: 'staff', label: '직원', defaultHourlyWage: 10400 },
  { id: 'manager', label: '매니저', defaultHourlyWage: 11500 },
  { id: 'store-manager', label: '점장', defaultHourlyWage: 12000 },
];

export const DEFAULT_PAYROLL_VALUES = {
  defaultHourlyWage: 10400,
  overtimeMultiplier: 1.5,
  weeklyHolidayAllowance: 0,
  mealAllowanceDefault: 0,
  transportationAllowanceDefault: 0,
  paymentDay: 10,
} as const;

export function createDefaultAppSettings(
  shiftTypes: ShiftType[],
  schoolSchedules: SchoolSchedule[]
): AppSettings {
  return {
    store: {
      name: '1% PC&CAFE',
      address: '',
      phone: '',
      email: '',
      businessHours: '09:00 - 22:00',
      notes: '',
    },
    payroll: {
      ...DEFAULT_PAYROLL_VALUES,
      notes: '',
    },
    schedule: {
      weekStartsOn: 1,
      defaultView: 'monthly',
      allowDragDrop: true,
      maxScheduleYear: 2030,
      schoolSchedules,
    },
    positions: DEFAULT_POSITIONS.map((p) => ({ ...p })),
    shiftTypes,
    theme: {
      mode: 'light',
      accent: 'stone',
    },
    security: {
      passwordHash: '',
    },
  };
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function migrateAppSettings(
  raw: unknown,
  shiftTypes: ShiftType[],
  schoolSchedules: SchoolSchedule[]
): AppSettings {
  const defaults = createDefaultAppSettings(shiftTypes, schoolSchedules);
  if (!raw || typeof raw !== 'object') return defaults;

  const input = raw as Partial<AppSettings>;
  return {
    store: { ...defaults.store, ...(input.store ?? {}) },
    payroll: normalizePayrollSettings(input.payroll, defaults.payroll),
    schedule: {
      ...defaults.schedule,
      ...(input.schedule ?? {}),
      schoolSchedules:
        input.schedule?.schoolSchedules?.length
          ? input.schedule.schoolSchedules
          : schoolSchedules.length
            ? schoolSchedules
            : defaults.schedule.schoolSchedules,
    },
    positions:
      input.positions?.length && Array.isArray(input.positions)
        ? input.positions
        : defaults.positions,
    shiftTypes: migrateShiftTypes(
      input.shiftTypes?.length && Array.isArray(input.shiftTypes)
        ? input.shiftTypes
        : shiftTypes
    ),
    theme: { ...defaults.theme, ...(input.theme ?? {}) },
    security: { ...defaults.security, ...(input.security ?? {}) },
  };
}

export function applyThemeSettings(theme: ThemeSettings): void {
  const root = document.documentElement;
  root.classList.toggle('theme-dark', theme.mode === 'dark');
  root.dataset.accent = theme.accent;
}

function resolvePayrollNumber(value: number | null, fallback: number): number {
  return value ?? fallback;
}

export function getResolvedPayrollSettings(
  payroll?: PayrollSettings
): ResolvedPayrollSettings {
  const source = payroll ?? createDefaultAppSettings([], []).payroll;

  return {
    defaultHourlyWage: resolvePayrollNumber(
      source.defaultHourlyWage,
      DEFAULT_PAYROLL_VALUES.defaultHourlyWage
    ),
    overtimeMultiplier: resolvePayrollNumber(
      source.overtimeMultiplier,
      DEFAULT_PAYROLL_VALUES.overtimeMultiplier
    ),
    weeklyHolidayAllowance: resolvePayrollNumber(
      source.weeklyHolidayAllowance,
      DEFAULT_PAYROLL_VALUES.weeklyHolidayAllowance
    ),
    mealAllowanceDefault: resolvePayrollNumber(
      source.mealAllowanceDefault,
      DEFAULT_PAYROLL_VALUES.mealAllowanceDefault
    ),
    transportationAllowanceDefault: resolvePayrollNumber(
      source.transportationAllowanceDefault,
      DEFAULT_PAYROLL_VALUES.transportationAllowanceDefault
    ),
    paymentDay: resolvePayrollNumber(
      source.paymentDay,
      DEFAULT_PAYROLL_VALUES.paymentDay
    ),
    notes: source.notes,
  };
}

function normalizePayrollSettings(
  partial: Partial<PayrollSettings> | undefined,
  defaults: PayrollSettings
): PayrollSettings {
  if (!partial) return defaults;

  const has = (key: keyof PayrollSettings) =>
    Object.prototype.hasOwnProperty.call(partial, key);

  return {
    notes: partial.notes ?? defaults.notes,
    defaultHourlyWage: has('defaultHourlyWage')
      ? normalizeOptionalNumber(partial.defaultHourlyWage)
      : defaults.defaultHourlyWage,
    overtimeMultiplier: has('overtimeMultiplier')
      ? normalizeOptionalNumber(partial.overtimeMultiplier)
      : defaults.overtimeMultiplier,
    weeklyHolidayAllowance: has('weeklyHolidayAllowance')
      ? normalizeOptionalNumber(partial.weeklyHolidayAllowance)
      : defaults.weeklyHolidayAllowance,
    mealAllowanceDefault: has('mealAllowanceDefault')
      ? normalizeOptionalNumber(partial.mealAllowanceDefault)
      : defaults.mealAllowanceDefault,
    transportationAllowanceDefault: has('transportationAllowanceDefault')
      ? normalizeOptionalNumber(partial.transportationAllowanceDefault)
      : defaults.transportationAllowanceDefault,
    paymentDay: has('paymentDay')
      ? normalizeOptionalNumber(partial.paymentDay)
      : defaults.paymentDay,
  };
}
