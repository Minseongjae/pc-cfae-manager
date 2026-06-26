import { Wallet, Clock, Users, TrendingUp, PlusCircle, MinusCircle } from 'lucide-react';
import type { PayrollSummary } from '@/lib/payroll';
import { formatPayrollCurrency } from '@/lib/payroll';

interface PayrollSummaryCardsProps {
  summary: PayrollSummary;
}

export function PayrollSummaryCards({ summary }: PayrollSummaryCardsProps) {
  const cards = [
    {
      title: '자동 급여',
      value: formatPayrollCurrency(summary.totalAutomaticPay),
      subtitle: '실근무·스케줄 기준',
      icon: Wallet,
      accent: 'bg-gradient-to-br from-stone-100 to-stone-50 text-stone-600',
    },
    {
      title: '조정 합계',
      value:
        summary.totalAdjustmentNet === 0
          ? '—'
          : `${summary.totalAdjustmentNet > 0 ? '+' : ''}${formatPayrollCurrency(summary.totalAdjustmentNet)}`,
      subtitle: `가산 ${formatPayrollCurrency(summary.totalAdditions)} · 공제 ${formatPayrollCurrency(summary.totalDeductions)}`,
      icon: summary.totalAdjustmentNet >= 0 ? PlusCircle : MinusCircle,
      accent:
        summary.totalAdjustmentNet >= 0
          ? 'bg-gradient-to-br from-emerald-50 to-stone-50 text-emerald-600'
          : 'bg-gradient-to-br from-rose-50 to-stone-50 text-rose-600',
    },
    {
      title: '최종 급여',
      value: formatPayrollCurrency(summary.totalFinalPay),
      subtitle: summary.periodLabel,
      icon: TrendingUp,
      accent: 'bg-gradient-to-br from-amber-50 to-stone-100 text-amber-600',
    },
    {
      title: '총 근무시간',
      value: `${summary.totalHours}h`,
      subtitle: `${summary.entries.reduce((s, e) => s + e.shiftCount, 0)} shifts · ${summary.activeEmployees}명`,
      icon: Clock,
      accent: 'bg-gradient-to-br from-sky-50 to-stone-50 text-sky-600',
    },
    {
      title: '평균 최종 급여',
      value: formatPayrollCurrency(summary.averagePerEmployee),
      subtitle: '직원당 평균',
      icon: Users,
      accent: 'bg-stone-100 text-stone-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="card p-5 hover:shadow-lg transition-shadow duration-300"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="label-caps normal-case tracking-wide">{card.title}</p>
              <p className="text-xl font-semibold text-stone-800 mt-2 tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-stone-400 mt-1 font-light">{card.subtitle}</p>
            </div>
            <div className={`p-2.5 rounded-2xl shadow-sm ${card.accent}`}>
              <card.icon size={18} strokeWidth={1.75} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
