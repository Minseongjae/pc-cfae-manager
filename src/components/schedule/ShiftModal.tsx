import { useEffect, useMemo, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import { type ShiftInput } from '@/lib/storage';
import { findEmployeeByShiftName } from '@/lib/payroll';
import { useEmployees } from '@/contexts/EmployeesContext';
import { getPositionLabel } from '@/lib/employees';
import type { EmployeeRow } from '@/lib/storage';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import {
  clampScheduleDay,
  getMaxDayInScheduleMonth,
  isScheduleDateAllowed,
} from '@/lib/scheduleDateRange';
import { findShiftTypeById, useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';

export type ShiftModalMode = 'create' | 'edit';

interface ShiftModalProps {
  mode: ShiftModalMode;
  shift: ScheduleShift | null;
  year: number;
  month: number;
  defaultDay?: number;
  defaultRowId?: ShiftRowId;
  onSave: (input: ShiftInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function getEmployeeValue(name: string, employees: EmployeeRow[]): string {
  const match = findEmployeeByShiftName(employees, name);
  return match?.name ?? name;
}

export function ShiftModal({
  mode,
  shift,
  year,
  month,
  defaultDay = 1,
  defaultRowId,
  onSave,
  onDelete,
  onClose,
}: ShiftModalProps) {
  const { employees } = useEmployees();
  const shiftTypes = useScheduleShiftTypes();
  const fallbackRowId = shiftTypes[0]?.id ?? 'morning';

  const maxDay = useMemo(
    () => getMaxDayInScheduleMonth(year, month),
    [year, month]
  );
  const initialDay =
    mode === 'edit' && shift
      ? shift.day
      : clampScheduleDay(year, month, defaultDay || new Date().getDate());

  const [day, setDay] = useState(initialDay);
  const [employeeName, setEmployeeName] = useState(
    mode === 'edit' && shift ? getEmployeeValue(shift.name, employees) : employees[0]?.name ?? ''
  );
  const [rowId, setRowId] = useState<ShiftRowId>(
    mode === 'edit' && shift ? shift.rowId : defaultRowId ?? fallbackRowId
  );
  const [startTime, setStartTime] = useState(
    mode === 'edit' && shift ? shift.startTime : '10:00'
  );
  const [endTime, setEndTime] = useState(
    mode === 'edit' && shift ? shift.endTime : '14:00'
  );

  const selectedType = findShiftTypeById(shiftTypes, rowId);

  useEffect(() => {
    setDay((current) => clampScheduleDay(year, month, current));
  }, [year, month]);

  useEffect(() => {
    if (mode === 'edit' && shift) {
      setDay(shift.day);
      setEmployeeName(getEmployeeValue(shift.name, employees));
      setRowId(shift.rowId);
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
    } else if (mode === 'create') {
      setDay(clampScheduleDay(year, month, defaultDay || new Date().getDate()));
      setEmployeeName(employees[0]?.name ?? '');
      const nextRowId = defaultRowId ?? fallbackRowId;
      setRowId(nextRowId);
      const type = findShiftTypeById(shiftTypes, nextRowId);
      setStartTime(type?.defaultStartTime ?? '10:00');
      setEndTime(type?.defaultEndTime ?? '14:00');
    }
  }, [mode, shift, defaultDay, defaultRowId, employees, year, month, shiftTypes, fallbackRowId]);

  const handleRowChange = (nextRowId: ShiftRowId) => {
    setRowId(nextRowId);
    if (mode === 'create') {
      const type = findShiftTypeById(shiftTypes, nextRowId);
      if (type?.defaultStartTime) setStartTime(type.defaultStartTime);
      if (type?.defaultEndTime) setEndTime(type.defaultEndTime);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName) return;
    const normalizedDay = clampScheduleDay(year, month, day);
    if (!isScheduleDateAllowed(year, month, normalizedDay)) return;
    onSave({
      year,
      month,
      day: normalizedDay,
      rowId,
      name: employeeName,
      startTime,
      endTime,
    });
  };

  return (
    <ModalOverlay
      onClose={onClose}
      allowBackdropDismiss={false}
      allowEscapeDismiss={false}
      panelClassName="card-elevated w-full max-w-md shadow-xl"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
        <div>
          <h2 className="heading-display text-lg">
            {mode === 'create' ? '근무 추가' : '근무 수정'}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {year}년 {month}월
            {selectedType ? ` · ${selectedType.name}` : ''}
          </p>
        </div>
        <button onClick={onClose} className="btn-ghost touch-target">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              날짜
            </label>
            <input
              type="number"
              min={1}
              max={maxDay}
              value={day}
              onChange={(e) =>
                setDay(clampScheduleDay(year, month, Number(e.target.value)))
              }
              className="input-luxury"
              required
            />
          </div>
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              근무유형
            </label>
            <select
              value={rowId}
              onChange={(e) => handleRowChange(e.target.value)}
              className="input-luxury"
            >
              {shiftTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label-caps normal-case tracking-wide block mb-2">
            직원
          </label>
          <select
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            className="input-luxury"
            required
          >
            {employees
              .filter((emp) => emp.status !== 'resigned')
              .map((emp) => (
                <option key={emp.id} value={emp.name}>
                  {emp.name} ({getPositionLabel(emp.position)})
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              시작 시간
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-luxury"
              required
            />
          </div>
          <div>
            <label className="label-caps normal-case tracking-wide block mb-2">
              종료 시간
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-luxury"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 gap-3">
          {mode === 'edit' && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors touch-target"
            >
              <Trash2 size={16} />
              삭제
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary touch-target">
              취소
            </button>
            <button type="submit" className="btn-primary touch-target">
              {mode === 'create' ? '추가' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </ModalOverlay>
  );
}
