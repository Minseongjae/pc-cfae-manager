import { useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  RefreshCw,
  Pencil,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useActualWork } from '@/contexts/ActualWorkContext';
import { formatMinutesLabel } from '@/lib/actualWork';
import { formatPayrollCurrency } from '@/lib/payroll';

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'late' | 'early' | 'overtime' | 'working' | 'done' | 'pending' | 'manual';
}) {
  const styles = {
    late: 'bg-red-50 text-red-700',
    early: 'bg-amber-50 text-amber-700',
    overtime: 'bg-sky-50 text-sky-700',
    working: 'bg-emerald-50 text-emerald-700',
    done: 'bg-stone-100 text-stone-600',
    pending: 'bg-stone-50 text-stone-500',
    manual: 'bg-violet-50 text-violet-700',
  };

  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[tone]}`}>
      {label}
    </span>
  );
}

export function ActualWorkPage() {
  const {
    records,
    selectedDate,
    setSelectedDate,
    syncFromSchedule,
    clockIn,
    clockOut,
    openEdit,
  } = useActualWork();

  const dateLabel = format(
    new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day),
    'yyyy년 M월 d일 EEEE',
    { locale: ko }
  );

  const summary = useMemo(() => {
    const withHours = records.filter((r) => r.actualStart && r.actualEnd);
    return {
      total: records.length,
      working: records.filter((r) => r.status === 'working').length,
      completed: withHours.length,
      manual: records.filter((r) => r.isManuallyEdited).length,
      late: records.filter((r) => r.isLate).length,
      earlyLeave: records.filter((r) => r.isEarlyLeave).length,
      overtime: records.filter((r) => r.isOvertime).length,
      totalHours: withHours.reduce((sum, r) => sum + r.workedHours, 0),
      totalPayroll: withHours.reduce((sum, r) => sum + r.payrollAmount, 0),
    };
  }, [records]);

  const goPrev = () => {
    const d = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day - 1);
    setSelectedDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  };

  const goNext = () => {
    const d = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day + 1);
    setSelectedDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  };

  const goToday = () => {
    const today = new Date();
    setSelectedDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="실근무 관리"
        subtitle="스케줄 기준 출퇴근 기록 · 수동 수정 지원"
      >
        <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1">
          <button onClick={goPrev} className="btn-ghost">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-stone-600 min-w-[180px] text-center px-2">
            {dateLabel}
          </span>
          <button onClick={goNext} className="btn-ghost">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday} className="btn-secondary text-xs py-1.5 px-3 ml-1">
            오늘
          </button>
        </div>
        <button onClick={syncFromSchedule} className="btn-secondary">
          <RefreshCw size={16} />
          스케줄 동기화
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard label="배정 근무" value={String(summary.total)} />
          <SummaryCard label="근무 중" value={String(summary.working)} accent="emerald" />
          <SummaryCard label="기록 완료" value={String(summary.completed)} />
          <SummaryCard label="수동 수정" value={String(summary.manual)} accent="violet" />
          <SummaryCard
            label="실급여 합계"
            value={formatPayrollCurrency(summary.totalPayroll)}
            accent="amber"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {summary.late > 0 && (
            <StatusBadge label={`지각 ${summary.late}건`} tone="late" />
          )}
          {summary.earlyLeave > 0 && (
            <StatusBadge label={`조퇴 ${summary.earlyLeave}건`} tone="early" />
          )}
          {summary.overtime > 0 && (
            <StatusBadge label={`연장 ${summary.overtime}건`} tone="overtime" />
          )}
          <StatusBadge label={`실근무 ${summary.totalHours.toFixed(1)}h`} tone="done" />
        </div>

        <div className="card overflow-hidden">
          {records.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-stone-500 text-sm font-light">
                해당 날짜에 배정된 근무가 없습니다. 스케줄을 먼저 등록하세요.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-luxury min-w-[960px]">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th>직원</th>
                    <th>예정 시작</th>
                    <th>예정 종료</th>
                    <th>실제 시작</th>
                    <th>실제 종료</th>
                    <th className="text-right">근무시간</th>
                    <th>상태</th>
                    <th>수정 사유</th>
                    <th className="text-right pr-4">급여</th>
                    <th className="w-44 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium text-stone-800">{record.employeeName}</td>
                      <td className="text-stone-500">{record.scheduledStart}</td>
                      <td className="text-stone-500">{record.scheduledEnd}</td>
                      <td className="font-medium text-stone-700">
                        {record.actualStart ?? '—'}
                      </td>
                      <td className="font-medium text-stone-700">
                        {record.actualEnd ?? '—'}
                      </td>
                      <td className="text-right font-medium">
                        {record.workedHours > 0 ? `${record.workedHours}h` : '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {record.status === 'scheduled' && (
                            <StatusBadge label="대기" tone="pending" />
                          )}
                          {record.status === 'working' && (
                            <StatusBadge label="근무중" tone="working" />
                          )}
                          {record.actualStart && record.actualEnd && (
                            <StatusBadge label="완료" tone="done" />
                          )}
                          {record.isManuallyEdited && (
                            <StatusBadge label="수동" tone="manual" />
                          )}
                          {record.isLate && (
                            <StatusBadge
                              label={`지각 ${formatMinutesLabel(record.lateMinutes)}`}
                              tone="late"
                            />
                          )}
                          {record.isEarlyLeave && (
                            <StatusBadge
                              label={`조퇴 ${formatMinutesLabel(record.earlyLeaveMinutes)}`}
                              tone="early"
                            />
                          )}
                          {record.isOvertime && (
                            <StatusBadge
                              label={`연장 ${formatMinutesLabel(record.overtimeMinutes)}`}
                              tone="overtime"
                            />
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-stone-500 max-w-[140px]">
                        {record.modificationReason ?? '—'}
                      </td>
                      <td className="text-right pr-4 font-medium text-stone-700">
                        {record.payrollAmount > 0
                          ? formatPayrollCurrency(record.payrollAmount)
                          : '—'}
                      </td>
                      <td className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(record)}
                            className="btn-ghost p-2"
                            title="수동 수정"
                          >
                            <Pencil size={14} />
                          </button>
                          {record.status === 'scheduled' && (
                            <button
                              onClick={() => clockIn(record.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <LogIn size={13} />
                              출근
                            </button>
                          )}
                          {record.status === 'working' && (
                            <button
                              onClick={() => clockOut(record.id)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-stone-800 text-white hover:bg-stone-900 transition-colors"
                            >
                              <LogOut size={13} />
                              퇴근
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-stone-600 space-y-1">
              <p className="font-medium text-stone-700">수동 출퇴근 관리 안내</p>
              <p>
                출근·퇴근 버튼으로 자동 기록하거나, <strong>수정</strong> 버튼으로 실제
                시간을 직접 입력할 수 있습니다. 수정 시 사유를 반드시 선택하세요.
              </p>
              <p>
                실제 시작·종료 시간이 모두 입력되면 <strong>급여 관리</strong>에서
                실근무 시간 기준으로 급여가 자동 계산됩니다.
              </p>
            </div>
            <Clock size={18} className="text-stone-400 shrink-0 mt-0.5 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'amber' | 'violet';
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-600'
      : accent === 'amber'
        ? 'text-amber-600'
        : accent === 'violet'
          ? 'text-violet-600'
          : 'text-stone-800';

  return (
    <div className="card p-5">
      <p className="label-caps normal-case tracking-wide">{label}</p>
      <p className={`text-xl font-semibold mt-2 tracking-tight ${accentClass}`}>{value}</p>
    </div>
  );
}
