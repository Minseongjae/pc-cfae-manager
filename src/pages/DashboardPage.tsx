import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Users,
  Wallet,
  TrendingUp,
  Clock,
  UserCheck,
  UserX,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchDashboardStats } from '@/lib/api';
import { useEmployees } from '@/contexts/EmployeesContext';
import type { DashboardStats } from '@/types';
function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

export function DashboardPage() {
  const { version } = useEmployees();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDashboardStats()
      .then(setStats)
      .catch((error) => console.error('Failed to load dashboard stats:', error))
      .finally(() => setLoading(false));
  }, [version]);
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

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard
            title="총 직원"
            value={String(stats?.totalEmployees ?? 0)}
            subtitle="활성 직원"
            icon={Users}
            accent="stone"
          />
          <StatCard
            title="총 급여"
            value={formatCurrency(stats?.totalPayroll ?? 0)}
            subtitle="이번 달"
            icon={Wallet}
            accent="gold"
          />
          <StatCard
            title="평균 급여"
            value={formatCurrency(stats?.averagePayrollPerEmployee ?? 0)}
            subtitle="직원당 평균"
            icon={TrendingUp}
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
            title="오늘 근무"
            value={String(stats?.employeesWorkingToday ?? 0)}
            subtitle="스케줄 등록"
            icon={UserCheck}
            accent="green"
          />
          <StatCard
            title="오늘 휴무"
            value={String(stats?.employeesOffToday ?? 0)}
            subtitle="미배정"
            icon={UserX}
            accent="stone"
          />
        </div>
      </div>
    </div>
  );
}
