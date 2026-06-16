import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Search, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useEmployees } from '@/contexts/EmployeesContext';
import {
  getPositionLabel,
  getStatusLabel,
  STATUS_OPTIONS,
  type EmployeeStatus,
} from '@/lib/employees';
import type { EmployeeRow } from '@/lib/storage';

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const styles: Record<EmployeeStatus, string> = {
    working: 'bg-emerald-50 text-emerald-700',
    leave: 'bg-amber-50 text-amber-700',
    resigned: 'bg-stone-100 text-stone-500',
  };
  const dots: Record<EmployeeStatus, string> = {
    working: 'bg-emerald-500',
    leave: 'bg-amber-500',
    resigned: 'bg-stone-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {getStatusLabel(status)}
    </span>
  );
}

function formatHireDate(date: string): string {
  try {
    return format(parseISO(date), 'yyyy.MM.dd', { locale: ko });
  } catch {
    return date;
  }
}

export function EmployeesPage() {
  const { employees, openCreate, openEdit } = useEmployees();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.phone.includes(q) ||
        getPositionLabel(emp.position).toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: employees.length,
      working: employees.filter((e) => e.status === 'working').length,
      leave: employees.filter((e) => e.status === 'leave').length,
      resigned: employees.filter((e) => e.status === 'resigned').length,
    };
  }, [employees]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="직원 관리" subtitle={`총 ${counts.total}명 등록`}>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          직원 추가
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="전체" value={counts.total} />
          <SummaryCard label="근무" value={counts.working} accent="emerald" />
          <SummaryCard label="휴가" value={counts.leave} accent="amber" />
          <SummaryCard label="퇴사" value={counts.resigned} accent="stone" />
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="이름, 직책, 전화번호 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-luxury pl-10 py-2 text-sm"
              />
            </div>
            <div className="segment-control">
              <button
                onClick={() => setStatusFilter('all')}
                className={`segment-item ${statusFilter === 'all' ? 'segment-item-active' : ''}`}
              >
                전체
              </button>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`segment-item ${statusFilter === status ? 'segment-item-active' : ''}`}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-stone-500 text-sm font-light">
                {employees.length === 0
                  ? '등록된 직원이 없습니다. 직원을 추가해 주세요.'
                  : '검색 결과가 없습니다.'}
              </p>
            </div>
          ) : (
            <table className="w-full table-luxury">
              <thead>
                <tr className="border-b border-stone-200">
                  <th>이름</th>
                  <th>직책</th>
                  <th>시급</th>
                  <th>전화번호</th>
                  <th>입사일</th>
                  <th>상태</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <EmployeeRowItem key={emp.id} employee={emp} onEdit={openEdit} />
                ))}
              </tbody>
            </table>
          )}
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
  value: number;
  accent?: 'emerald' | 'amber' | 'stone';
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-600'
      : accent === 'amber'
        ? 'text-amber-600'
        : accent === 'stone'
          ? 'text-stone-500'
          : 'text-stone-800';

  return (
    <div className="card p-5">
      <p className="label-caps normal-case tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold mt-2 tracking-tight ${accentClass}`}>
        {value}
      </p>
    </div>
  );
}

function EmployeeRowItem({
  employee,
  onEdit,
}: {
  employee: EmployeeRow;
  onEdit: (employee: EmployeeRow) => void;
}) {
  return (
    <tr>
      <td className="font-medium text-stone-800">{employee.name}</td>
      <td>{getPositionLabel(employee.position)}</td>
      <td>₩{employee.hourlyWage.toLocaleString('ko-KR')}</td>
      <td className="text-stone-500">{employee.phone || '—'}</td>
      <td className="text-stone-500">{formatHireDate(employee.hireDate)}</td>
      <td>
        <StatusBadge status={employee.status} />
      </td>
      <td>
        <button
          onClick={() => onEdit(employee)}
          className="btn-ghost p-2"
          title="수정"
        >
          <Pencil size={15} />
        </button>
      </td>
    </tr>
  );
}
