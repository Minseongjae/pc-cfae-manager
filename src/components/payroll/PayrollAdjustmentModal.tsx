import { useEffect, useMemo, useState } from 'react';
import { X, Save } from 'lucide-react';
import type { PayrollEntry, PayrollPeriod } from '@/lib/payroll';
import { formatPayrollCurrency } from '@/lib/payroll';
import {
  ADJUSTMENT_FIELD_META,
  calculateAdjustmentTotals,
  type PayrollAdjustments,
} from '@/lib/payrollAdjustments';
import { ModalOverlay } from '@/components/ui/ModalOverlay';

interface PayrollAdjustmentModalProps {
  entry: PayrollEntry;
  period: PayrollPeriod;
  periodLabel: string;
  initialAdjustments: PayrollAdjustments;
  onSave: (adjustments: PayrollAdjustments) => void;
  onClose: () => void;
}

function parseAmount(value: string): number {
  const parsed = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

export function PayrollAdjustmentModal({
  entry,
  period,
  periodLabel,
  initialAdjustments,
  onSave,
  onClose,
}: PayrollAdjustmentModalProps) {
  const [form, setForm] = useState<PayrollAdjustments>(initialAdjustments);
  const [customSign, setCustomSign] = useState<'add' | 'deduct'>(
    initialAdjustments.customAmount < 0 ? 'deduct' : 'add'
  );

  useEffect(() => {
    setForm(initialAdjustments);
    setCustomSign(initialAdjustments.customAmount < 0 ? 'deduct' : 'add');
  }, [initialAdjustments, entry.employeeId]);

  const preview = useMemo(() => {
    const customAmount =
      customSign === 'deduct'
        ? -Math.abs(form.customAmount)
        : Math.abs(form.customAmount);
    const adjustments = { ...form, customAmount };
    const totals = calculateAdjustmentTotals(adjustments);
    const finalPay = Math.max(0, entry.automaticPay + totals.net);
    return { ...totals, finalPay, adjustments };
  }, [form, customSign, entry.automaticPay]);

  const updateField = (
    key: keyof PayrollAdjustments,
    value: string | number
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customAmount =
      customSign === 'deduct'
        ? -Math.abs(form.customAmount)
        : Math.abs(form.customAmount);
    onSave({ ...form, customAmount });
  };

  const periodLabels: Record<PayrollPeriod, string> = {
    daily: '일간',
    weekly: '주간',
    monthly: '월간',
  };

  return (
    <ModalOverlay onClose={onClose} panelClassName="card-elevated w-full max-w-xl shadow-xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
        <div>
          <h2 className="heading-display text-lg">급여 조정</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {entry.employeeName} · {periodLabels[period]} · {periodLabel}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">
              자동 급여
            </p>
            <p className="font-semibold text-stone-800">
              {formatPayrollCurrency(entry.automaticPay)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">
              조정 합계
            </p>
            <p
              className={`font-semibold ${
                preview.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {preview.net >= 0 ? '+' : ''}
              {formatPayrollCurrency(preview.net)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">
              최종 급여
            </p>
            <p className="font-semibold text-amber-700">
              {formatPayrollCurrency(preview.finalPay)}
            </p>
          </div>
        </div>

        <div>
          <p className="label-caps normal-case tracking-wide mb-3">가산 항목</p>
          <div className="space-y-3">
            {ADJUSTMENT_FIELD_META.filter((f) => f.category === 'addition').map(
              (field) => (
                <AmountField
                  key={field.key}
                  label={field.label}
                  value={form[field.key]}
                  onChange={(v) => updateField(field.key, parseAmount(v))}
                />
              )
            )}
          </div>
        </div>

        <div>
          <p className="label-caps normal-case tracking-wide mb-3">공제 항목</p>
          <div className="space-y-3">
            {ADJUSTMENT_FIELD_META.filter((f) => f.category === 'deduction').map(
              (field) => (
                <AmountField
                  key={field.key}
                  label={field.label}
                  value={form[field.key]}
                  onChange={(v) => updateField(field.key, parseAmount(v))}
                />
              )
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200/80 space-y-3">
          <p className="label-caps normal-case tracking-wide">기타 조정</p>
          <div>
            <label className="text-xs text-stone-500 block mb-1.5">항목명</label>
            <input
              type="text"
              className="input-luxury w-full"
              placeholder="예: 주말 특근 수당"
              value={form.customLabel}
              onChange={(e) => updateField('customLabel', e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="input-luxury w-28"
              value={customSign}
              onChange={(e) => setCustomSign(e.target.value as 'add' | 'deduct')}
            >
              <option value="add">가산</option>
              <option value="deduct">공제</option>
            </select>
            <input
              type="number"
              min={0}
              step={1000}
              className="input-luxury flex-1"
              placeholder="금액"
              value={form.customAmount ? Math.abs(form.customAmount) : ''}
              onChange={(e) =>
                updateField('customAmount', parseAmount(e.target.value))
              }
            />
          </div>
        </div>

        <div>
          <label className="label-caps normal-case tracking-wide block mb-2">
            메모
          </label>
          <textarea
            className="input-luxury w-full min-h-[72px] resize-y"
            placeholder="조정 사유를 입력하세요"
            value={form.note}
            onChange={(e) => updateField('note', e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save size={16} />
            저장
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-stone-600 w-28 shrink-0">{label}</label>
      <input
        type="number"
        min={0}
        step={1000}
        className="input-luxury flex-1"
        placeholder="0"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
