import { migrateShiftTypes, normalizeHexColor } from '@/lib/scheduleShiftTypes';
import type { SchoolSchedule } from '@/lib/appStorage';
import type { ShiftType } from '@/types';
import {
  DEFAULT_PURCHASE_ORDER_CATEGORIES,
  migratePurchaseOrderCategories,
  type PurchaseOrderCategory,
} from '@/lib/purchaseOrders';
import {
  DEFAULT_INVENTORY_CATEGORIES,
  migrateInventoryCategories,
  type InventoryCategory,
} from '@/lib/inventoryCategories';
import { migrateScheduleFontFamily, type ScheduleFontId } from '@/lib/scheduleFonts';
import { migrateScheduleCardScale } from '@/lib/shiftUtils';
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

export type ScheduleColorMode = 'employee' | 'shiftType';

export interface ScheduleSettings {
  weekStartsOn: 0 | 1;
  defaultView: 'monthly' | 'weekly' | 'daily';
  allowDragDrop: boolean;
  maxScheduleYear: number;
  schoolSchedules: SchoolSchedule[];
  /** employee id (string) -> hex color for schedule cards */
  employeeScheduleColors?: Record<string, string>;
  /** Schedule card color source */
  scheduleColorMode?: ScheduleColorMode;
  /** Schedule card font */
  scheduleFontFamily?: ScheduleFontId;
  /** Schedule card size scale (70–130%, default 88) */
  scheduleCardScale?: number;
}

export interface PositionDefinition {
  id: string;
  label: string;
  defaultHourlyWage: number;
  color: string;
}

export interface ThemeSettings {
  mode: 'light' | 'dark';
  accent: 'stone' | 'amber' | 'emerald';
}

export interface SecuritySettings {
  passwordHash: string;
  employeePasswordHash: string;
}

export interface AppSettings {
  store: StoreInfo;
  payroll: PayrollSettings;
  schedule: ScheduleSettings;
  positions: PositionDefinition[];
  shiftTypes: ShiftType[];
  theme: ThemeSettings;
  security: SecuritySettings;
  purchaseOrderCategories: PurchaseOrderCategory[];
  inventoryCategories: InventoryCategory[];
}

export const DEFAULT_POSITIONS: PositionDefinition[] = [
  { id: 'part-time', label: '아르바이트', defaultHourlyWage: 10030, color: '#10B981' },
  { id: 'staff', label: '직원', defaultHourlyWage: 10400, color: '#3B82F6' },
  { id: 'manager', label: '매니저', defaultHourlyWage: 11500, color: '#8B5CF6' },
  { id: 'store-manager', label: '점장', defaultHourlyWage: 12000, color: '#F59E0B' },
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
      employeeScheduleColors: {},
      scheduleColorMode: 'employee' as ScheduleColorMode,
      scheduleFontFamily: 'dm-sans' as const,
      scheduleCardScale: migrateScheduleCardScale(undefined),
    },
    positions: DEFAULT_POSITIONS.map((p) => ({ ...p })),
    shiftTypes,
    theme: {
      mode: 'light',
      accent: 'stone',
    },
    security: {
      passwordHash: '',
      employeePasswordHash: '',
    },
    purchaseOrderCategories: DEFAULT_PURCHASE_ORDER_CATEGORIES.map((row) => ({ ...row })),
    inventoryCategories: DEFAULT_INVENTORY_CATEGORIES.map((row) => ({ ...row })),
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
      employeeScheduleColors:
        input.schedule?.employeeScheduleColors &&
        typeof input.schedule.employeeScheduleColors === 'object'
          ? input.schedule.employeeScheduleColors
          : defaults.schedule.employeeScheduleColors ?? {},
      scheduleColorMode:
        input.schedule?.scheduleColorMode === 'shiftType' ||
        input.schedule?.scheduleColorMode === 'employee'
          ? input.schedule.scheduleColorMode
          : defaults.schedule.scheduleColorMode ?? 'employee',
      scheduleFontFamily: migrateScheduleFontFamily(
        input.schedule?.scheduleFontFamily ?? defaults.schedule.scheduleFontFamily
      ),
      scheduleCardScale: migrateScheduleCardScale(
        input.schedule?.scheduleCardScale ?? defaults.schedule.scheduleCardScale
      ),
    },
    positions: migratePositions(
      input.positions?.length && Array.isArray(input.positions)
        ? input.positions
        : defaults.positions
    ),
    shiftTypes: migrateShiftTypes(
      input.shiftTypes?.length && Array.isArray(input.shiftTypes)
        ? input.shiftTypes
        : shiftTypes
    ),
    theme: { ...defaults.theme, ...(input.theme ?? {}) },
    security: {
      passwordHash: input.security?.passwordHash ?? defaults.security.passwordHash,
      employeePasswordHash:
        input.security?.employeePasswordHash ?? defaults.security.employeePasswordHash,
    },
    purchaseOrderCategories: migratePurchaseOrderCategories(
      input.purchaseOrderCategories ?? defaults.purchaseOrderCategories
    ),
    inventoryCategories: migrateInventoryCategories(
      input.inventoryCategories ?? defaults.inventoryCategories
    ),
  };
}

export function applyThemeSettings(theme: ThemeSettings): void {
  const root = document.documentElement;
  root.classList.toggle('theme-dark', theme.mode === 'dark');
  root.dataset.accent = theme.accent;
}

const DEFAULT_POSITION_COLORS: Record<string, string> = {
  'store-manager': '#F59E0B',
  manager: '#8B5CF6',
  staff: '#3B82F6',
  'part-time': '#10B981',
};

function migratePositions(positions: PositionDefinition[]): PositionDefinition[] {
  return positions.map((position) => ({
    ...position,
    color: position.color
      ? normalizeHexColor(position.color)
      : (DEFAULT_POSITION_COLORS[position.id] ?? '#3B82F6'),
  }));
}

function resolvePayrollNumber(value: number | null | undefined, fallback: number): number {
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
