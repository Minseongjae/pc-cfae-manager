import { useMemo, useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSchoolSchedules } from '@/lib/storage';
import { SETTINGS_CHANGED_EVENT } from '@/lib/appSettings';
import { useEmployees } from '@/contexts/EmployeesContext';
import { getPositionLabel, getStatusLabel } from '@/lib/employees';
import type { EmployeeStatus } from '@/lib/employees';

const PAGE_SIZE = 5;

export function RightPanel({ className = '' }: { className?: string }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [schoolVersion, setSchoolVersion] = useState(0);
  const { employees, openCreate, openEdit } = useEmployees();
  useEffect(() => {
    const handler = () => setSchoolVersion((v) => v + 1);
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, []);

  const schoolSchedules = useMemo(() => getSchoolSchedules(), [schoolVersion]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [search, employees]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <aside
      className={`flex-[1] min-w-[200px] max-w-[260px] h-full flex flex-col shrink-0 overflow-hidden p-4 gap-4 ${className}`}
    >
      <div className="card flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="px-4 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-700">직원 관리</h2>
            <p className="text-[11px] text-stone-400 mt-0.5">{employees.length}명 등록</p>
          </div>
          <button className="btn-primary text-xs py-2 px-3" onClick={openCreate}>
            <Plus size={14} />
            추가
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="이름 검색"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-luxury pl-10 py-2 text-xs"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-2">
          <div className="space-y-1">
            {paged.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-stone-50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-stone-700">
                      {emp.name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-700 whitespace-nowrap truncate">
                      {emp.name}
                    </p>
                    <p className="text-[11px] text-stone-400 whitespace-nowrap truncate">
                      {getPositionLabel(emp.position)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={emp.status} />
                  <button
                    className="btn-ghost p-1 opacity-0 group-hover:opacity-100"
                    onClick={() => openEdit(emp)}
                    title="수정"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-stone-200 flex items-center justify-center gap-2 text-xs text-stone-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-ghost p-1 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="font-medium">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-ghost p-1 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="card flex flex-col shrink-0 max-h-[160px] overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200">
          <h2 className="text-sm font-semibold text-stone-700">학교 일정 안내</h2>
        </div>
        <div className="overflow-y-auto px-2 py-1">
          {schoolSchedules.map((item, i) => (
            <div
              key={i}
              className="px-3 py-2.5 rounded-lg hover:bg-stone-50 transition-colors"
            >
              <p className="text-xs font-medium text-stone-600">{item.school}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{item.schedule}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function StatusPill({ status }: { status: EmployeeStatus }) {
  const styles: Record<EmployeeStatus, string> = {
    working: 'bg-emerald-50 text-emerald-700',
    leave: 'bg-amber-50 text-amber-700',
    resigned: 'bg-stone-200 text-stone-500',
  };
  const dots: Record<EmployeeStatus, string> = {
    working: 'bg-emerald-500',
    leave: 'bg-amber-500',
    resigned: 'bg-stone-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {getStatusLabel(status)}
    </span>
  );
}
