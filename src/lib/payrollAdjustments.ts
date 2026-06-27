import { format, startOfWeek } from 'date-fns';
import type { PayrollPeriod } from '@/lib/payroll';

export const PAYROLL_ADJUSTMENTS_CHANGED_EVENT = 'payroll-adjustments-changed';

export interface PayrollAdjustments {
  bonus: number;
  mealAllowance: number;
  transportationAllowance: number;
  advanceDeduction: number;
  penaltyDeduction: number;
  customLabel: string;
  customAmount: number;
  note: string;
}

export interface PayrollAdjustmentRecord {
  employeeId: number;
  period: PayrollPeriod;
  periodKey: string;
  adjustments: PayrollAdjustments;
  updatedAt: string;
}

export const ADJUSTMENT_FIELD_META = [
  { key: 'bonus' as const, label: '보너스', labelEn: 'Bonus', category: 'addition' },
  {
    key: 'mealAllowance' as const,
    label: '식대',
    labelEn: 'Meal allowance',
    category: 'addition',
  },
  {
    key: 'transportationAllowance' as const,
    label: '교통비',
    labelEn: 'Transportation allowance',
    category: 'addition',
  },
  {
    key: 'advanceDeduction' as const,
    label: '가불금 공제',
    labelEn: 'Advance payment deduction',
    category: 'deduction',
  },
  {
    key: 'penaltyDeduction' as const,
    label: '벌금 공제',
    labelEn: 'Penalty deduction',
    category: 'deduction',
  },
] as const;

export const EMPTY_PAYROLL_ADJUSTMENTS: PayrollAdjustments = {
  bonus: 0,
  mealAllowance: 0,
  transportationAllowance: 0,
  advanceDeduction: 0,
  penaltyDeduction: 0,
  customLabel: '',
  customAmount: 0,
  note: '',
};

export function buildPeriodKey(
  period: PayrollPeriod,
  year: number,
  month: number,
  day: number
): string {
  if (period === 'monthly') {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  if (period === 'daily') {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const anchor = new Date(year, month - 1, day);
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return format(monday, 'yyyy-MM-dd');
}

export function calculateAdjustmentTotals(adjustments: PayrollAdjustments): {
  additions: number;
  deductions: number;
  net: number;
} {
  const customAddition = adjustments.customAmount > 0 ? adjustments.customAmount : 0;
  const customDeduction =
    adjustments.customAmount < 0 ? Math.abs(adjustments.customAmount) : 0;

  const additions =
    adjustments.bonus +
    adjustments.mealAllowance +
    adjustments.transportationAllowance +
    customAddition;

  const deductions =
    adjustments.advanceDeduction + adjustments.penaltyDeduction + customDeduction;

  return {
    additions: Math.round(additions),
    deductions: Math.round(deductions),
    net: Math.round(additions - deductions),
  };
}

export function hasAnyAdjustment(adjustments: PayrollAdjustments): boolean {
  const { additions, deductions } = calculateAdjustmentTotals(adjustments);
  return additions > 0 || deductions > 0 || adjustments.note.trim().length > 0;
}

export function migratePayrollAdjustments(
  raw: Record<string, unknown>
): PayrollAdjustments {
  const base = { ...EMPTY_PAYROLL_ADJUSTMENTS };
  const nonNegativeKeys = [
    'bonus',
    'mealAllowance',
    'transportationAllowance',
    'advanceDeduction',
    'penaltyDeduction',
  ] as const;

  for (const key of nonNegativeKeys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      base[key] = Math.max(0, Math.round(value));
    }
  }

  if (typeof raw.customAmount === 'number' && Number.isFinite(raw.customAmount)) {
    base.customAmount = Math.round(raw.customAmount);
  }
  if (typeof raw.customLabel === 'string') base.customLabel = raw.customLabel;
  if (typeof raw.note === 'string') base.note = raw.note;

  return base;
}

export function migratePayrollAdjustmentRecord(
  raw: Record<string, unknown>
): PayrollAdjustmentRecord | null {
  const employeeId = raw.employeeId;
  const period = raw.period;
  const periodKey = raw.periodKey;
  if (
    typeof employeeId !== 'number' ||
    (period !== 'daily' && period !== 'weekly' && period !== 'monthly') ||
    typeof periodKey !== 'string'
  ) {
    return null;
  }

  const adjustmentsRaw =
    raw.adjustments && typeof raw.adjustments === 'object'
      ? (raw.adjustments as Record<string, unknown>)
      : {};

  const adjustments = migratePayrollAdjustments(adjustmentsRaw);

  return {
    employeeId,
    period,
    periodKey,
    adjustments,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}
