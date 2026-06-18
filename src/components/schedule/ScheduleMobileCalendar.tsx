import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, X } from 'lucide-react';
import { ShiftCard } from './ShiftCard';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import { useScheduleShiftTypes, findShiftTypeById } from '@/hooks/useScheduleShiftTypes';
import {
  buildMonthCalendarGrid,
  isDayInScheduleMonth,
  isDateWithinScheduleRange,
  scheduleDateKey,
  shiftMatchesDay,
} from '@/lib/scheduleViewRange';
import {
  getHolidayName,
  isPublicHoliday,
  isRedCalendarDay,
  isSaturday,
  KOREAN_WEEKDAYS,
} from '@/lib/koreanHolidays';
import { getShiftCardStyle } from '@/lib/shiftDisplay';
import { findEmployeeByShiftName } from '@/lib/payroll';
import { useEmployees } from '@/contexts/EmployeesContext';

interface ScheduleMobileCalendarProps {
  days: Date[];
  weekStartsOn: 0 | 1;
  shifts: ScheduleShift[];
  draggingId?: string | null;
  dropTarget?: string | null;
  readOnly?: boolean;
  onDragStart?: (shiftId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (cellKey: string) => void;
  onDrop?: (shiftId: string, targetDate: Date, rowId: ShiftRowId) => void;
  onResize?: (shiftId: string, deltaHours: number) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
}

const MAX_CELL_CHIPS = 2;

function weekdayHeaderOrder(weekStartsOn: 0 | 1): number[] {
  return weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}

function dayNumberClasses(day: Date, today: boolean, inMonth: boolean): string {
  if (!inMonth) return 'text-stone-300 font-normal';
  if (today) {
    return 'w-5 h-5 flex items-center justify-center rounded-full bg-stone-800 text-white text-[10px] font-bold';
  }
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'text-rose-600 font-semibold';
  }
  if (isSaturday(day)) return 'text-blue-600 font-semibold';
  return 'text-stone-700 font-medium';
}

function cellBgClasses(day: Date, today: boolean, inMonth: boolean, selected: boolean): string {
  if (!inMonth) return 'bg-stone-50/50';
  if (selected) return 'bg-amber-100/80 ring-2 ring-inset ring-amber-400/60';
  if (today) return 'bg-amber-50/70';
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'bg-rose-50/40';
  }
  if (isSaturday(day)) return 'bg-blue-50/25';
  return 'bg-white';
}

function MobileShiftChip({
  shift,
  onEdit,
  readOnly,
}: {
  shift: ScheduleShift;
  onEdit: (shift: ScheduleShift) => void;
  readOnly: boolean;
}) {
  const { employees } = useEmployees();
  const shiftTypes = useScheduleShiftTypes();
  const employee = findEmployeeByShiftName(employees, shift.name);
  const shiftType = findShiftTypeById(shiftTypes, shift.rowId);
  const style = getShiftCardStyle(
    shift,
    shiftType,
    employee ? { position: employee.position, status: employee.status } : undefined
  );

  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) onEdit(shift);
      }}
      style={style}
      className={`w-full text-left rounded px-0.5 py-px text-[8px] leading-tight truncate border ${
        readOnly ? 'cursor-default' : 'active:opacity-80'
      }`}
    >
      {shift.name}
    </button>
  );
}

function DayDetailPanel({
  day,
  shifts,
  readOnly,
  onClose,
  onEditShift,
  onCreateInCell,
  defaultRowId,
}: {
  day: Date;
  shifts: ScheduleShift[];
  readOnly: boolean;
  onClose: () => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
  defaultRowId: ShiftRowId;
}) {
  const holidayName = getHolidayName(day);

  return (
    <div className="shrink-0 border-t border-stone-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] max-h-[38vh] flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-100">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800 truncate">
            {format(day, 'M월 d일 (EEE)', { locale: ko })}
          </p>
          {holidayName && <p className="text-[10px] text-rose-600">{holidayName}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!readOnly && onCreateInCell && (
            <button
              type="button"
              className="btn-primary text-[11px] px-2 py-1 touch-target"
              onClick={() => onCreateInCell(day, defaultRowId)}
            >
              <Plus size={12} />
              추가
            </button>
          )}
          <button type="button" className="btn-ghost p-1.5 touch-target" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
        {shifts.length === 0 ? (
          <p className="text-xs text-stone-400 py-2 text-center">등록된 근무 없음</p>
        ) : (
          shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              readOnly={readOnly}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onResize={() => {}}
              onEdit={onEditShift}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  days,
  weekStartsOn,
  shifts,
  readOnly,
  selectedDay,
  onSelectDay,
  onEditShift,
}: {
  days: Date[];
  weekStartsOn: 0 | 1;
  shifts: ScheduleShift[];
  readOnly: boolean;
  selectedDay: Date | null;
  onSelectDay: (day: Date) => void;
  onEditShift: (shift: ScheduleShift) => void;
}) {
  const monthAnchor = days[0];
  const weeks = useMemo(
    () => (monthAnchor ? buildMonthCalendarGrid(monthAnchor, weekStartsOn) : []),
    [monthAnchor, weekStartsOn]
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>();
    for (const shift of shifts) {
      const key = scheduleDateKey(shift.year, shift.month, shift.day);
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    return map;
  }, [shifts]);

  const headerOrder = weekdayHeaderOrder(weekStartsOn);

  return (
    <div className="flex-1 flex flex-col min-h-0 px-1 pb-1">
      <div className="grid grid-cols-7 shrink-0 border-b border-stone-200/80">
        {headerOrder.map((dow) => (
          <div
            key={dow}
            className={`text-center py-1 text-[10px] font-medium ${
              dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-blue-500' : 'text-stone-500'
            }`}
          >
            {KOREAN_WEEKDAYS[dow]}
          </div>
        ))}
      </div>

      <div
        className="flex-1 grid min-h-0 gap-px bg-stone-200/60"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 min-h-0 gap-px">
            {week.map((day) => {
              const inMonth = monthAnchor ? isDayInScheduleMonth(day, monthAnchor) : false;
              const inRange = isDateWithinScheduleRange(day);
              const key = scheduleDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate());
              const dayShifts = inMonth && inRange ? (shiftsByDay.get(key) ?? []) : [];
              const today = isToday(day);
              const selected = selectedDay ? isSameDay(day, selectedDay) : false;
              const visible = dayShifts.slice(0, MAX_CELL_CHIPS);
              const overflow = dayShifts.length - visible.length;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!inMonth || !inRange}
                  onClick={() => inMonth && inRange && onSelectDay(day)}
                  className={`flex flex-col min-h-0 min-w-0 p-0.5 text-left transition-colors ${cellBgClasses(day, today, inMonth && inRange, selected)} ${
                    inMonth && inRange ? 'active:bg-stone-100' : 'cursor-default'
                  }`}
                >
                  <span className={`text-[10px] leading-none mb-0.5 shrink-0 ${dayNumberClasses(day, today, inMonth && inRange)}`}>
                    {day.getDate()}
                  </span>
                  <div className="flex-1 min-h-0 flex flex-col gap-px overflow-hidden">
                    {visible.map((shift) => (
                      <MobileShiftChip
                        key={shift.id}
                        shift={shift}
                        readOnly={readOnly}
                        onEdit={onEditShift}
                      />
                    ))}
                    {overflow > 0 && (
                      <span className="text-[8px] text-stone-500 leading-none">+{overflow}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  shifts,
  shiftTypes,
  readOnly,
  draggingId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onResize,
  onEditShift,
  onCreateInCell,
}: {
  days: Date[];
  shifts: ScheduleShift[];
  shiftTypes: ReturnType<typeof useScheduleShiftTypes>;
  readOnly: boolean;
  draggingId?: string | null;
  dropTarget?: string | null;
  onDragStart?: (shiftId: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (cellKey: string) => void;
  onDrop?: (shiftId: string, targetDate: Date, rowId: ShiftRowId) => void;
  onResize?: (shiftId: string, deltaHours: number) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
}) {
  const shiftsByDayAndRow = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>();
    for (const shift of shifts) {
      for (const day of days) {
        if (!shiftMatchesDay(shift, day)) continue;
        const key = `${scheduleDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate())}-${shift.rowId}`;
        const list = map.get(key) ?? [];
        list.push(shift);
        map.set(key, list);
      }
    }
    return map;
  }, [days, shifts]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-1 pb-1">
      <div className="flex shrink-0 border-b border-stone-200/80 ml-9">
        {days.map((day) => {
          const today = isToday(day);
          const dow = day.getDay();
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-0 text-center py-1 border-r border-stone-100 last:border-r-0 ${today ? 'bg-amber-50/80' : ''}`}
            >
              <div className={`text-[10px] font-medium ${dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-blue-500' : 'text-stone-500'}`}>
                {KOREAN_WEEKDAYS[dow]}
              </div>
              <div className={dayNumberClasses(day, today, true)}>{day.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {shiftTypes.map((row) => (
          <div key={row.id} className="flex border-b border-stone-100 min-h-[52px]">
            <div
              className="w-9 shrink-0 flex items-start justify-center pt-1.5 border-r border-stone-100 bg-stone-50/50"
              style={{ color: row.color }}
            >
              <span className="text-[8px] font-medium leading-tight text-center break-all px-0.5">
                {row.name}
              </span>
            </div>
            {days.map((day) => {
              const key = `${scheduleDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate())}-${row.id}`;
              const cellShifts = shiftsByDayAndRow.get(key) ?? [];
              const today = isToday(day);
              const isDropTarget = dropTarget === key && draggingId != null;

              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    if (readOnly || !onDragOver) return;
                    e.preventDefault();
                    onDragOver(key);
                  }}
                  onDrop={(e) => {
                    if (readOnly || !onDrop) return;
                    const shiftId = e.dataTransfer.getData('text/shift-id');
                    if (shiftId) onDrop(shiftId, day, row.id);
                  }}
                  className={`flex-1 min-w-0 border-r border-stone-50 last:border-r-0 p-0.5 space-y-0.5 ${cellBgClasses(day, today, true, false)} ${
                    isDropTarget ? 'ring-2 ring-inset ring-amber-400/50' : ''
                  }`}
                >
                  {cellShifts.map((s) => (
                    <ShiftCard
                      key={s.id}
                      shift={s}
                      readOnly={readOnly}
                      isDragging={draggingId === s.id}
                      onDragStart={onDragStart ?? (() => {})}
                      onDragEnd={onDragEnd ?? (() => {})}
                      onResize={onResize ?? (() => {})}
                      onEdit={onEditShift}
                    />
                  ))}
                  {cellShifts.length === 0 && onCreateInCell && !readOnly && (
                    <button
                      type="button"
                      onClick={() => onCreateInCell(day, row.id)}
                      className="w-full min-h-[28px] rounded border border-dashed border-stone-300/50 text-stone-400 text-[9px] touch-target"
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleMobileCalendar({
  days,
  weekStartsOn,
  shifts,
  draggingId,
  dropTarget,
  readOnly = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onResize,
  onEditShift,
  onCreateInCell,
}: ScheduleMobileCalendarProps) {
  const shiftTypes = useScheduleShiftTypes();
  const defaultRowId = shiftTypes[0]?.id ?? 'morning';
  const isMonthView = days.length > 7;

  const initialSelected = useMemo(() => {
    const today = new Date();
    if (days.some((d) => isSameDay(d, today))) return today;
    return days[0] ?? null;
  }, [days]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(initialSelected);

  useEffect(() => {
    setSelectedDay(initialSelected);
  }, [initialSelected]);

  const selectedShifts = useMemo(() => {
    if (!selectedDay) return [];
    return shifts.filter((s) => shiftMatchesDay(s, selectedDay));
  }, [shifts, selectedDay]);

  if (days.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-stone-400 px-4">
        표시할 날짜가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {isMonthView ? (
        <MonthGrid
          days={days}
          weekStartsOn={weekStartsOn}
          shifts={shifts}
          readOnly={readOnly}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onEditShift={onEditShift}
        />
      ) : (
        <WeekGrid
          days={days}
          shifts={shifts}
          shiftTypes={shiftTypes}
          readOnly={readOnly}
          draggingId={draggingId}
          dropTarget={dropTarget}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onResize={onResize}
          onEditShift={onEditShift}
          onCreateInCell={onCreateInCell}
        />
      )}

      {isMonthView && selectedDay && (
        <DayDetailPanel
          day={selectedDay}
          shifts={selectedShifts}
          readOnly={readOnly}
          onClose={() => setSelectedDay(null)}
          onEditShift={onEditShift}
          onCreateInCell={onCreateInCell}
          defaultRowId={defaultRowId}
        />
      )}
    </div>
  );
}
