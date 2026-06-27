import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Users,
  Wallet,
  TrendingUp,
  Clock,
  UserCheck,
  AlertTriangle,
  Package,
  Banknote,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchDashboardStats } from '@/lib/api';
import { INVENTORY_CHANGED_EVENT } from '@/lib/inventory';
import { SALES_CHANGED_EVENT, formatSalesCurrency } from '@/lib/sales';
import { ACTUAL_WORK_CHANGED_EVENT } from '@/lib/actualWork';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import { PAYROLL_ADJUSTMENTS_CHANGED_EVENT } from '@/lib/payrollAdjustments';
import type { DashboardStats } from '@/types';

function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchDashboardStats()
      .then(setStats)
      .catch((error) => console.error('Failed to load dashboard stats:', error))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const events = [
      EMPLOYEES_CHANGED_EVENT,
      ACTUAL_WORK_CHANGED_EVENT,
      PAYROLL_ADJUSTMENTS_CHANGED_EVENT,
      INVENTORY_CHANGED_EVENT,
      SALES_CHANGED_EVENT,
    ];
    events.forEach((event) => window.addEventListener(event, load));
    return () => events.forEach((event) => window.removeEventListener(event, load));
  }, []);

  const today = new Date();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-stone-400 text-sm font-light">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <PageHeader
        title="대시보드"
        subtitle={format(today, 'yyyy년 M월 d일 EEEE', { locale: ko })}
      />

      <div className="px-4 py-4 md:px-6 md:py-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">오늘 / 이번 달 핵심</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            <StatCard
              title="오늘 출근"
              value={`${stats?.todayAttendance ?? 0}명`}
              subtitle="실근무 기록"
              icon={UserCheck}
              accent="green"
            />
            <StatCard
              title="재고 부족"
              value={`${stats?.lowStockCount ?? 0}개`}
              subtitle="최소 재고 미달"
              icon={AlertTriangle}
              accent="gold"
            />
            <StatCard
              title="이번 달 인건비"
              value={formatCurrency(stats?.monthLaborCost ?? 0)}
              subtitle="급여 자동 계산"
              icon={Wallet}
              accent="stone"
            />
            <StatCard
              title="이번 달 매출"
              value={formatSalesCurrency(stats?.monthSales ?? 0)}
              subtitle="일매출 합계"
              icon={Banknote}
              accent="blue"
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-stone-700 mb-3">운영 현황</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            <StatCard
              title="총 직원"
              value={String(stats?.totalEmployees ?? 0)}
              subtitle="활성 직원"
              icon={Users}
              accent="stone"
            />
            <StatCard
              title="오늘 근무"
              value={String(stats?.employeesWorkingToday ?? 0)}
              subtitle="스케줄 등록"
              icon={UserCheck}
              accent="green"
            />
            <StatCard
              title="총 근무시간"
              value={`${stats?.totalWorkHours ?? 0}h`}
              subtitle="이번 달"
              icon={Clock}
              accent="blue"
            />
            <StatCard
              title="평균 급여"
              value={formatCurrency(stats?.averagePayrollPerEmployee ?? 0)}
              subtitle="직원당"
              icon={TrendingUp}
              accent="green"
            />
            <StatCard
              title="스케줄 급여"
              value={formatCurrency(stats?.totalPayroll ?? 0)}
              subtitle="이번 달 추정"
              icon={Wallet}
              accent="gold"
            />
            <StatCard
              title="재고 품목"
              value={`${(stats?.lowStockCount ?? 0) > 0 ? '주의' : '양호'}`}
              subtitle="재고 상태"
              icon={Package}
              accent="stone"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
