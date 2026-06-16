import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import type { PayrollPeriod, PayrollSummary } from '@/lib/payroll';
import { formatPayrollCurrency } from '@/lib/payroll';
import { usePayrollAdjustments } from '@/contexts/PayrollAdjustmentsContext';
import { hasAnyAdjustment } from '@/lib/payrollAdjustments';

interface PayrollTableProps {
  summary: PayrollSummary;
  period: PayrollPeriod;
}

export function PayrollTable({ summary, period }: PayrollTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { openEdit } = usePayrollAdjustments();

  if (summary.entries.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-stone-500 text-sm font-light">
          해당 기간에 배정된 근무가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full table-luxury">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="w-10" />
            <th>직원</th>
            <th>직책</th>
            <th className="text-right">시급</th>
            <th className="text-right">근무시간</th>
            <th className="text-right">자동 급여</th>
            <th className="text-right">조정</th>
            <th className="text-right pr-2">최종 급여</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {summary.entries.map((entry) => {
            const isExpanded = expandedId === entry.employeeId;
            const hasAdjustments = hasAnyAdjustment(entry.adjustments);

            return (
              <Fragment key={entry.employeeId}>
                <tr className="group">
                  <td
                    className="text-stone-400 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {entry.shifts.length > 0 ? (
                      isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )
                    ) : null}
                  </td>
                  <td
                    className="font-medium text-stone-800 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {entry.employeeName}
                    {hasAdjustments && (
                      <span className="ml-2 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        조정
                      </span>
                    )}
                  </td>
                  <td
                    className="text-stone-700 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {entry.position}
                  </td>
                  <td
                    className="text-right text-stone-700 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {formatPayrollCurrency(entry.hourlyWage)}
                  </td>
                  <td
                    className="text-right text-stone-700 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {entry.hours}h
                    <span className="text-stone-400 text-xs ml-1">
                      ({entry.shiftCount}회)
                    </span>
                  </td>
                  <td
                    className="text-right text-stone-700 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {formatPayrollCurrency(entry.automaticPay)}
                  </td>
                  <td
                    className={`text-right cursor-pointer ${
                      entry.adjustmentNet > 0
                        ? 'text-emerald-700'
                        : entry.adjustmentNet < 0
                          ? 'text-rose-600'
                          : 'text-stone-400'
                    }`}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : entry.employeeId)
                    }
                  >
                    {entry.adjustmentNet === 0
                      ? '—'
                      : `${entry.adjustmentNet > 0 ? '+' : ''}${formatPayrollCurrency(entry.adjustmentNet)}`}
                  </td>
                  <td className="text-right pr-2 font-semibold text-stone-800">
                    {formatPayrollCurrency(entry.finalPay)}
                  </td>
                  <td className="pr-4">
                    <button
                      type="button"
                      className="btn-ghost p-1.5 opacity-60 group-hover:opacity-100"
                      title="급여 조정"
                      onClick={() =>
                        openEdit({
                          entry,
                          period,
                          periodKey: summary.periodKey,
                          periodLabel: summary.periodLabel,
                        })
                      }
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
                {isExpanded &&
                  entry.shifts.map((shift) => (
                    <tr key={shift.shiftId} className="bg-stone-50/60 text-xs">
                      <td />
                      <td className="py-2.5 pl-6 text-stone-500" colSpan={2}>
                        <span>
                          {shift.date} · {shift.startTime}–{shift.endTime}
                        </span>
                        {shift.source === 'actual' && (
                          <span className="ml-2 inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            실근무
                          </span>
                        )}
                      </td>
                      <td />
                      <td className="py-2.5 text-right text-stone-500">
                        {shift.hours}h
                      </td>
                      <td className="py-2.5 text-right text-stone-700">
                        {formatPayrollCurrency(shift.amount)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  ))}
                {isExpanded && hasAdjustments && (
                  <tr className="bg-amber-50/40 text-xs">
                    <td />
                    <td colSpan={8} className="py-2.5 pl-6 pr-6 text-stone-600">
                      <AdjustmentBreakdown entry={entry} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-stone-100/80 border-t border-stone-200 font-semibold text-sm">
            <td colSpan={5} className="px-4 py-4 text-stone-700">
              합계
            </td>
            <td className="py-4 text-right text-stone-700">
              {formatPayrollCurrency(summary.totalAutomaticPay)}
            </td>
            <td
              className={`py-4 text-right ${
                summary.totalAdjustmentNet > 0
                  ? 'text-emerald-700'
                  : summary.totalAdjustmentNet < 0
                    ? 'text-rose-600'
                    : 'text-stone-500'
              }`}
            >
              {summary.totalAdjustmentNet === 0
                ? '—'
                : `${summary.totalAdjustmentNet > 0 ? '+' : ''}${formatPayrollCurrency(summary.totalAdjustmentNet)}`}
            </td>
            <td className="py-4 pr-2 text-right text-amber-800 text-base">
              {formatPayrollCurrency(summary.totalFinalPay)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function AdjustmentBreakdown({
  entry,
}: {
  entry: {
    adjustments: {
      bonus: number;
      mealAllowance: number;
      transportationAllowance: number;
      advanceDeduction: number;
      penaltyDeduction: number;
      customLabel: string;
      customAmount: number;
      note: string;
    };
    additions: number;
    deductions: number;
  };
}) {
  const { adjustments } = entry;
  const lines: string[] = [];

  if (adjustments.bonus > 0) lines.push(`보너스 +${adjustments.bonus.toLocaleString()}`);
  if (adjustments.mealAllowance > 0)
    lines.push(`식대 +${adjustments.mealAllowance.toLocaleString()}`);
  if (adjustments.transportationAllowance > 0)
    lines.push(`교통비 +${adjustments.transportationAllowance.toLocaleString()}`);
  if (adjustments.advanceDeduction > 0)
    lines.push(`가불금 -${adjustments.advanceDeduction.toLocaleString()}`);
  if (adjustments.penaltyDeduction > 0)
    lines.push(`벌금 -${adjustments.penaltyDeduction.toLocaleString()}`);
  if (adjustments.customAmount !== 0) {
    const label = adjustments.customLabel || '기타 조정';
    const sign = adjustments.customAmount > 0 ? '+' : '-';
    lines.push(
      `${label} ${sign}${Math.abs(adjustments.customAmount).toLocaleString()}`
    );
  }

  return (
    <div>
      <span className="font-medium text-amber-800">조정 내역: </span>
      {lines.join(' · ')}
      {adjustments.note && (
        <span className="text-stone-500 ml-2">({adjustments.note})</span>
      )}
    </div>
  );
}
