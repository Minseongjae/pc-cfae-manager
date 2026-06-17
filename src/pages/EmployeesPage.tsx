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
import {
  EMPLOYEE_COLOR_LABELS,
  EMPLOYEE_SWATCH_CLASSES,
  getEmployeeAvatarClass,
  getEmployeeBadgeClass,
  getEmployeeColorCategory,
} from '@/lib/employeeColors';
import type { EmployeeRow } from '@/lib/storage';

function StatusBadge({ employee }: { employee: EmployeeRow }) {
  const category = getEmployeeColorCategory(employee.position, employee.status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${getEmployeeBadgeClass(employee.position, employee.status)}`}
    >
      <span className={`w-2 h-2 rounded-full border ${EMPLOYEE_SWATCH_CLASSES[category]}`} />
      {getPositionLabel(employee.position)}
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

  const handleCreate = () => openCreate();
  const handleEdit = (employee: EmployeeRow) => openEdit(employee);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="직원 관리" subtitle={`총 ${counts.total}명 등록`}>
        <button className="btn-primary" onClick={handleCreate}>
          <Plus size={16} strokeWidth={2} />
          직원 추가
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-4 md:space-y-5">

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] md:text-xs text-stone-500">
          <span className="font-medium text-stone-600">직원 색상</span>
          {(['store-manager', 'manager', 'staff', 'part-time', 'off', 'vacation'] as const).map(
            (category) => (
              <span key={category} className="inline-flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded border ${EMPLOYEE_SWATCH_CLASSES[category]}`} />
                {EMPLOYEE_COLOR_LABELS[category]}
              </span>
            )
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
            <div className="segment-control overflow-x-auto max-w-full">
              <button
                onClick={() => setStatusFilter('all')}
                className={`segment-item touch-segment shrink-0 ${statusFilter === 'all' ? 'segment-item-active' : ''}`}
              >
                전체
              </button>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`segment-item touch-segment shrink-0 ${statusFilter === status ? 'segment-item-active' : ''}`}
                >
                  {getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 md:p-12 text-center">
              <p className="text-stone-500 text-sm font-light">
                {employees.length === 0
                  ? '등록된 직원이 없습니다. 직원을 추가해 주세요.'
                  : '검색 결과가 없습니다.'}
              </p>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-stone-100">
                {filtered.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    onEdit={handleEdit}
                  />
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-luxury min-w-[640px]">
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
                      <EmployeeRowItem
                        key={emp.id}
                        employee={emp}
                        onEdit={handleEdit}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({
  employee,
  onEdit,
}: {
  employee: EmployeeRow;
  onEdit: (employee: EmployeeRow) => void;
}) {
  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${getEmployeeAvatarClass(employee.position, employee.status)}`}
          >
            {employee.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-stone-800 truncate">{employee.name}</div>
            <div className="text-sm text-stone-500">{getPositionLabel(employee.position)}</div>
          </div>
        </div>
        <StatusBadge employee={employee} />
      </div>

      <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-stone-400">시급</dt>
        <dd className="text-stone-700 font-medium">
          ₩{employee.hourlyWage.toLocaleString('ko-KR')}
        </dd>
        <dt className="text-stone-400">전화</dt>
        <dd className="text-stone-600">{employee.phone || '—'}</dd>
        <dt className="text-stone-400">입사일</dt>
        <dd className="text-stone-600">{formatHireDate(employee.hireDate)}</dd>
      </dl>

      <button
        type="button"
        onClick={() => onEdit(employee)}
        className="btn-secondary w-full touch-target justify-center"
      >
        <Pencil size={16} />
        수정
      </button>
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
      <td className="font-medium text-stone-800 whitespace-nowrap">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getEmployeeAvatarClass(employee.position, employee.status)}`}
          >
            {employee.name.charAt(0)}
          </div>
          {employee.name}
        </div>
      </td>
      <td className="whitespace-nowrap">{getPositionLabel(employee.position)}</td>
      <td>₩{employee.hourlyWage.toLocaleString('ko-KR')}</td>
      <td className="text-stone-500">{employee.phone || '—'}</td>
      <td className="text-stone-500">{formatHireDate(employee.hireDate)}</td>
      <td>
        <StatusBadge employee={employee} />
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
