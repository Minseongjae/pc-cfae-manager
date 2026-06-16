import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { EmployeeInput, EmployeeRow } from '@/lib/storage';
import type { EmployeeModalMode } from '@/contexts/EmployeesContext';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import {
  getPositionOptions,
  STATUS_OPTIONS,
  getDefaultHourlyWage,
  getStatusLabel,
  type EmployeePosition,
  type EmployeeStatus,
} from '@/lib/employees';

interface EmployeeModalProps {
  mode: EmployeeModalMode;
  employee: EmployeeRow | null;
  onSave: (input: EmployeeInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const emptyForm = (): EmployeeInput => ({
  name: '',
  position: 'staff',
  hourlyWage: getDefaultHourlyWage('staff'),
  phone: '',
  hireDate: new Date().toISOString().slice(0, 10),
  status: 'working',
});

export function EmployeeModal({
  mode,
  employee,
  onSave,
  onDelete,
  onClose,
}: EmployeeModalProps) {
  const [form, setForm] = useState<EmployeeInput>(
    employee
      ? {
          name: employee.name,
          position: employee.position,
          hourlyWage: employee.hourlyWage,
          phone: employee.phone,
          hireDate: employee.hireDate,
          status: employee.status,
        }
      : emptyForm()
  );

  useEffect(() => {
    if (mode === 'edit' && employee) {
      setForm({
        name: employee.name,
        position: employee.position,
        hourlyWage: employee.hourlyWage,
        phone: employee.phone,
        hireDate: employee.hireDate,
        status: employee.status,
      });
    } else if (mode === 'create') {
      setForm(emptyForm());
    }
  }, [mode, employee]);

  const handlePositionChange = (position: EmployeePosition) => {
    setForm((prev) => ({
      ...prev,
      position,
      hourlyWage:
        mode === 'create' || prev.hourlyWage === getDefaultHourlyWage(prev.position)
          ? getDefaultHourlyWage(position)
          : prev.hourlyWage,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, name: form.name.trim() });
  };

  return (
    <ModalOverlay onClose={onClose} panelClassName="card-elevated w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
          <div>
            <h2 className="heading-display text-lg">
              {mode === 'create' ? '직원 추가' : '직원 수정'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {mode === 'create' ? '새 직원 정보를 입력하세요' : employee?.name}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              이름
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="input-luxury"
              placeholder="홍길동"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-caps normal-case tracking-wide block mb-2">
                직책
              </label>
              <select
                value={form.position}
                onChange={(e) =>
                  handlePositionChange(e.target.value as EmployeePosition)
                }
                className="input-luxury"
              >
                {getPositionOptions().map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-caps normal-case tracking-wide block mb-2">
                상태
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as EmployeeStatus,
                  }))
                }
                className="input-luxury"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-caps normal-case tracking-wide block mb-2">
                시급 (원)
              </label>
              <input
                type="number"
                min={0}
                step={10}
                value={form.hourlyWage}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    hourlyWage: Number(e.target.value),
                  }))
                }
                className="input-luxury"
                required
              />
            </div>
            <div>
              <label className="label-caps normal-case tracking-wide block mb-2">
                입사일
              </label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, hireDate: e.target.value }))
                }
                className="input-luxury"
                required
              />
            </div>
          </div>

          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              전화번호
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="input-luxury"
              placeholder="010-0000-0000"
            />
          </div>

          <div className="flex items-center justify-between pt-2 gap-3">
            {mode === 'edit' && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
                삭제
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                취소
              </button>
              <button type="submit" className="btn-primary">
                {mode === 'create' ? '추가' : '저장'}
              </button>
            </div>
          </div>
        </form>
    </ModalOverlay>
  );
}
