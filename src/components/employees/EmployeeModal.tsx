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
import { useSettings } from '@/contexts/SettingsContext';
import {
  getEmployeeSwatchStyle,
  getPositionColor,
  resolveEmployeeScheduleColor,
} from '@/lib/employeeColors';

export type EmployeeSavePayload = {
  input: EmployeeInput;
  scheduleColor: string;
  useDefaultScheduleColor: boolean;
};

interface EmployeeModalProps {
  mode: EmployeeModalMode;
  employee: EmployeeRow | null;
  onSave: (payload: EmployeeSavePayload) => void;
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
  const { settings } = useSettings();
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
  const [scheduleColor, setScheduleColor] = useState('#3B82F6');
  const [useDefaultScheduleColor, setUseDefaultScheduleColor] = useState(true);

  const syncScheduleColor = (nextForm: EmployeeInput, targetEmployee: EmployeeRow | null) => {
    if (targetEmployee) {
      const resolved = resolveEmployeeScheduleColor(targetEmployee, settings.positions);
      const custom = settings.schedule.employeeScheduleColors?.[String(targetEmployee.id)];
      setScheduleColor(resolved);
      setUseDefaultScheduleColor(!custom);
      return;
    }
    setScheduleColor(getPositionColor(nextForm.position, settings.positions));
    setUseDefaultScheduleColor(true);
  };

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
      syncScheduleColor(
        {
          name: employee.name,
          position: employee.position,
          hourlyWage: employee.hourlyWage,
          phone: employee.phone,
          hireDate: employee.hireDate,
          status: employee.status,
        },
        employee
      );
    } else if (mode === 'create') {
      const next = emptyForm();
      setForm(next);
      syncScheduleColor(next, null);
    }
  }, [mode, employee, settings.positions, settings.schedule.employeeScheduleColors]);

  const handlePositionChange = (position: EmployeePosition) => {
    setForm((prev) => {
      const next = {
        ...prev,
        position,
        hourlyWage:
          mode === 'create' || prev.hourlyWage === getDefaultHourlyWage(prev.position)
            ? getDefaultHourlyWage(position)
            : prev.hourlyWage,
      };
      if (useDefaultScheduleColor) {
        setScheduleColor(getPositionColor(position, settings.positions));
      }
      return next;
    });
  };

  const handleStatusChange = (status: EmployeeStatus) => {
    setForm((prev) => {
      const next = { ...prev, status };
      if (useDefaultScheduleColor) {
        if (employee) {
          setScheduleColor(
            resolveEmployeeScheduleColor({ ...employee, status }, settings.positions)
          );
        } else {
          setScheduleColor(getPositionColor(next.position, settings.positions));
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      input: { ...form, name: form.name.trim() },
      scheduleColor,
      useDefaultScheduleColor,
    });
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
                onChange={(e) => handleStatusChange(e.target.value as EmployeeStatus)}
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

          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              스케줄표 색상
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={scheduleColor}
                onChange={(e) => {
                  setScheduleColor(e.target.value);
                  setUseDefaultScheduleColor(false);
                }}
                className="input-luxury h-[42px] p-1 w-16 shrink-0"
                aria-label="스케줄표 색상"
              />
              <div
                className="flex-1 rounded-xl border px-3 py-2 text-xs text-stone-600"
                style={getEmployeeSwatchStyle(scheduleColor)}
              >
                근무 스케줄에서 이 색으로 표시됩니다
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs mt-2"
              onClick={() => {
                const previewEmployee = employee
                  ? { ...employee, position: form.position, status: form.status }
                  : {
                      id: 0,
                      name: form.name,
                      position: form.position,
                      status: form.status,
                      hourlyWage: form.hourlyWage,
                      phone: form.phone,
                      hireDate: form.hireDate,
                    };
                setScheduleColor(
                  resolveEmployeeScheduleColor(previewEmployee, settings.positions)
                );
                setUseDefaultScheduleColor(true);
              }}
            >
              직책 기본색으로
            </button>
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
