import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getDailyPayroll,
  getWeeklyPayroll,
  getMonthlyPayroll,
  type PayrollPeriod,
} from '@/lib/payroll';
import { PayrollSummaryCards } from '@/components/payroll/PayrollSummaryCards';
import { PayrollTable } from '@/components/payroll/PayrollTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdminLockScreen } from '@/components/auth/AdminLockScreen';
import { useAdminLock } from '@/hooks/useAdminLock';
import { Wallet } from 'lucide-react';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useActualWorkVersion } from '@/contexts/ActualWorkContext';
import { usePayrollAdjustments } from '@/contexts/PayrollAdjustmentsContext';

export function PayrollPage() {
  const unlocked = useAdminLock();
  const { version: employeeVersion } = useEmployees();
  const actualWorkVersion = useActualWorkVersion();
  const { version: adjustmentVersion } = usePayrollAdjustments();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [period, setPeriod] = useState<PayrollPeriod>('monthly');

  const summary = useMemo(() => {
    switch (period) {
      case 'daily':
        return getDailyPayroll(year, month, day);
      case 'weekly':
        return getWeeklyPayroll(year, month, day);
      case 'monthly':
        return getMonthlyPayroll(year, month);
    }
  }, [period, year, month, day, employeeVersion, actualWorkVersion, adjustmentVersion]);

  const goPrev = () => {
    if (period === 'monthly') {
      if (month === 1) {
        setYear((y) => y - 1);
        setMonth(12);
      } else {
        setMonth((m) => m - 1);
      }
    } else if (period === 'weekly') {
      const d = new Date(year, month - 1, day - 7);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
    } else {
      const d = new Date(year, month - 1, day - 1);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
    }
  };

  const goNext = () => {
    if (period === 'monthly') {
      if (month === 12) {
        setYear((y) => y + 1);
        setMonth(1);
      } else {
        setMonth((m) => m + 1);
      }
    } else if (period === 'weekly') {
      const d = new Date(year, month - 1, day + 7);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
    } else {
      const d = new Date(year, month - 1, day + 1);
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
    }
  };

  const goToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setDay(today.getDate());
  };

  const periodLabels: Record<PayrollPeriod, string> = {
    daily: '일간',
    weekly: '주간',
    monthly: '월간',
  };

  if (!unlocked) {
    return (
      <AdminLockScreen
        title="급여 관리"
        description="급여 정보는 관리자만 열람할 수 있습니다."
        icon={Wallet}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="급여 관리"
        subtitle="실근무 기준 자동 계산 · 수동 조정 반영"
      >
        <div className="segment-control">
          {(['daily', 'weekly', 'monthly'] as PayrollPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`segment-item ${period === p ? 'segment-item-active' : ''}`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
          <button onClick={goPrev} className="btn-ghost">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-stone-600 min-w-[140px] text-center px-2">
            {summary.periodLabel}
          </span>
          <button onClick={goNext} className="btn-ghost">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday} className="btn-secondary text-xs py-1.5 px-3 ml-1">
            오늘
          </button>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <PayrollSummaryCards summary={summary} />
        <PayrollTable summary={summary} period={period} />
      </div>
    </div>
  );
}
