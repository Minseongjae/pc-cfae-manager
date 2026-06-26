import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { useEmployees } from '@/contexts/EmployeesContext';
import {
  clampScheduleDay,
  getMaxDayInScheduleMonth,
} from '@/lib/scheduleDateRange';
import {
  countScheduleShiftsForBatchDelete,
  deleteScheduleShiftsBatch,
} from '@/lib/storage';
import {
  describeBatchDelete,
  type ScheduleBatchDeleteMode,
  type ScheduleBatchDeleteParams,
} from '@/lib/scheduleBatchDelete';

interface ScheduleBatchDeleteDialogProps {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onDeleted: () => void;
}

const MODE_LABELS: Record<ScheduleBatchDeleteMode, string> = {
  day: '하루 전체 삭제',
  range: '선택 기간 삭제',
  employee: '직원 스케줄 삭제',
  all: '전체 초기화',
};

export function ScheduleBatchDeleteDialog({
  open,
  year,
  month,
  onClose,
  onDeleted,
}: ScheduleBatchDeleteDialogProps) {
  const { employees } = useEmployees();
  const [mode, setMode] = useState<ScheduleBatchDeleteMode>('day');
  const [day, setDay] = useState(1);
  const [startYear, setStartYear] = useState(year);
  const [startMonth, setStartMonth] = useState(month);
  const [startDay, setStartDay] = useState(1);
  const [endYear, setEndYear] = useState(year);
  const [endMonth, setEndMonth] = useState(month);
  const [endDay, setEndDay] = useState(getMaxDayInScheduleMonth(year, month));
  const [employeeName, setEmployeeName] = useState('');
  const [employeeMonthOnly, setEmployeeMonthOnly] = useState(true);
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const maxDay = getMaxDayInScheduleMonth(year, month);
  const maxStartDay = getMaxDayInScheduleMonth(startYear, startMonth);
  const maxEndDay = getMaxDayInScheduleMonth(endYear, endMonth);

  useEffect(() => {
    if (!open) return;
    setMode('day');
    setDay(clampScheduleDay(year, month, new Date().getDate()));
    setStartYear(year);
    setStartMonth(month);
    setStartDay(1);
    setEndYear(year);
    setEndMonth(month);
    setEndDay(getMaxDayInScheduleMonth(year, month));
    setEmployeeName(employees[0]?.name ?? '');
    setEmployeeMonthOnly(true);
    setConfirmStep(false);
    setSubmitting(false);
  }, [open, year, month, employees]);

  useEffect(() => {
    setDay((current) => clampScheduleDay(year, month, current));
  }, [year, month]);

  useEffect(() => {
    setStartDay((current) => clampScheduleDay(startYear, startMonth, current));
  }, [startYear, startMonth]);

  useEffect(() => {
    setEndDay((current) => clampScheduleDay(endYear, endMonth, current));
  }, [endYear, endMonth]);

  const params = useMemo<ScheduleBatchDeleteParams>(
    () => ({
      mode,
      year,
      month,
      day,
      startYear,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
      employeeName,
      employeeMonthOnly,
    }),
    [
      mode,
      year,
      month,
      day,
      startYear,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
      employeeName,
      employeeMonthOnly,
    ]
  );

  const deleteCount = useMemo(() => {
    if (!open) return 0;
    return countScheduleShiftsForBatchDelete(params);
  }, [open, params]);

  if (!open) return null;

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handlePrimaryAction = async () => {
    if (deleteCount === 0) return;

    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setSubmitting(true);
    deleteScheduleShiftsBatch(params);
    setSubmitting(false);
    onDeleted();
    onClose();
  };

  const activeEmployees = employees.filter((e) => e.status !== 'resigned');

  return (
    <ModalOverlay onClose={handleClose}>
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <Trash2 className="text-rose-600" size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-800">스케줄 일괄 삭제</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              삭제 전 대상 건수를 확인합니다. 복구할 수 없습니다.
            </p>
          </div>
        </div>

        {!confirmStep ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODE_LABELS) as ScheduleBatchDeleteMode[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`text-xs md:text-sm px-3 py-2.5 rounded-xl border transition-colors touch-target ${
                    mode === key
                      ? 'border-stone-700 bg-stone-100 text-stone-800 font-medium'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {MODE_LABELS[key]}
                </button>
              ))}
            </div>

            {mode === 'day' && (
              <div className="space-y-3">
                <p className="text-sm text-stone-600">
                  {year}년 {month}월 중 삭제할 날짜를 선택하세요.
                </p>
                <label className="block">
                  <span className="label-caps mb-2 block">날짜</span>
                  <input
                    type="number"
                    min={1}
                    max={maxDay}
                    className="input-luxury"
                    value={day}
                    onChange={(e) =>
                      setDay(clampScheduleDay(year, month, Number(e.target.value) || 1))
                    }
                  />
                </label>
              </div>
            )}

            {mode === 'range' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="label-caps mb-2 block">시작 연</span>
                    <input
                      type="number"
                      className="input-luxury"
                      value={startYear}
                      onChange={(e) => setStartYear(Number(e.target.value) || year)}
                    />
                  </label>
                  <label className="block">
                    <span className="label-caps mb-2 block">월</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="input-luxury"
                      value={startMonth}
                      onChange={(e) =>
                        setStartMonth(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="label-caps mb-2 block">일</span>
                    <input
                      type="number"
                      min={1}
                      max={maxStartDay}
                      className="input-luxury"
                      value={startDay}
                      onChange={(e) =>
                        setStartDay(
                          clampScheduleDay(startYear, startMonth, Number(e.target.value) || 1)
                        )
                      }
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="label-caps mb-2 block">종료 연</span>
                    <input
                      type="number"
                      className="input-luxury"
                      value={endYear}
                      onChange={(e) => setEndYear(Number(e.target.value) || year)}
                    />
                  </label>
                  <label className="block">
                    <span className="label-caps mb-2 block">월</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className="input-luxury"
                      value={endMonth}
                      onChange={(e) =>
                        setEndMonth(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="label-caps mb-2 block">일</span>
                    <input
                      type="number"
                      min={1}
                      max={maxEndDay}
                      className="input-luxury"
                      value={endDay}
                      onChange={(e) =>
                        setEndDay(
                          clampScheduleDay(endYear, endMonth, Number(e.target.value) || 1)
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            {mode === 'employee' && (
              <div className="space-y-3">
                <label className="block">
                  <span className="label-caps mb-2 block">직원</span>
                  <select
                    className="input-luxury"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                  >
                    {activeEmployees.length === 0 && (
                      <option value="">등록된 직원 없음</option>
                    )}
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-stone-600">
                  <input
                    type="checkbox"
                    checked={employeeMonthOnly}
                    onChange={(e) => setEmployeeMonthOnly(e.target.checked)}
                    className="rounded border-stone-300"
                  />
                  현재 보는 달({year}년 {month}월)만 삭제
                </label>
              </div>
            )}

            {mode === 'all' && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                모든 기간의 근무 스케줄이 삭제됩니다. 근무유형 설정은 유지됩니다.
              </p>
            )}

            <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
              삭제 대상: <strong>{describeBatchDelete(params)}</strong>
              <br />
              <span className="text-stone-500">총 {deleteCount}건</span>
            </p>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div className="text-sm leading-relaxed">
                <strong>{deleteCount}건</strong>의 스케줄을 삭제합니다.
                <br />
                대상: {describeBatchDelete(params)}
                <br />
                이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="btn-secondary flex-1 touch-target"
            onClick={() => (confirmStep ? setConfirmStep(false) : handleClose())}
            disabled={submitting}
          >
            {confirmStep ? '이전' : '취소'}
          </button>
          <button
            type="button"
            className="btn-primary flex-1 touch-target bg-rose-600 hover:bg-rose-700 border-rose-600"
            onClick={handlePrimaryAction}
            disabled={submitting || deleteCount === 0}
          >
            {submitting
              ? '삭제 중…'
              : confirmStep
                ? `${deleteCount}건 삭제`
                : `삭제 확인 (${deleteCount}건)`}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
