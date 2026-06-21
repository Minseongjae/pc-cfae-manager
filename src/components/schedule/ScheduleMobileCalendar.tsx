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
import { getEmptyCellMinHeightForShiftType } from '@/lib/shiftUtils';
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
import { useSettings } from '@/contexts/SettingsContext';
import { resolveScheduleFontFamily } from '@/lib/scheduleFonts';

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

/** Minimum height per day cell in month grid (px). */
const MONTH_CELL_MIN_HEIGHT = 132;
/** Minimum width per day column in week grid (px). */
const WEEK_COL_MIN_WIDTH = 88;

function weekdayHeaderOrder(weekStartsOn: 0 | 1): number[] {
  return weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
}

function dayNumberClasses(day: Date, today: boolean, inMonth: boolean): string {
  if (!inMonth) return 'text-stone-300 font-normal text-sm';
  if (today) {
    return 'w-7 h-7 flex items-center justify-center rounded-full bg-stone-800 text-white text-xs font-bold';
  }
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'text-rose-600 font-semibold text-sm';
  }
  if (isSaturday(day)) return 'text-blue-600 font-semibold text-sm';
  return 'text-stone-700 font-semibold text-sm';
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
  const { settings } = useSettings();
  const shiftTypes = useScheduleShiftTypes();
  const employee = findEmployeeByShiftName(employees, shift.name);
  const shiftType = findShiftTypeById(shiftTypes, shift.rowId);
  const colorMode = settings.schedule.scheduleColorMode ?? 'employee';
  const style = getShiftCardStyle(
    shift,
    shiftType,
    employee,
    settings.positions,
    colorMode,
    true
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
      className={`w-full text-left rounded-md border px-1 py-0.5 ${
        readOnly ? 'cursor-default' : 'active:opacity-80'
      }`}
    >
      <div className="font-semibold text-xs leading-tight truncate">{shift.name}</div>
      <div className="text-[11px] leading-tight opacity-90 truncate">
        {shift.startTime}–{shift.endTime}
      </div>
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
    <div className="shrink-0 border-t border-stone-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] max-h-[42vh] flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-stone-100">
        <div className="min-w-0">
          <p className="text-base font-semibold text-stone-800 truncate">
            {format(day, 'M월 d일 (EEE)', { locale: ko })}
          </p>
          {holidayName && <p className="text-xs text-rose-600">{holidayName}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!readOnly && onCreateInCell && (
            <button
              type="button"
              className="btn-primary text-xs px-2.5 py-1.5 touch-target"
              onClick={() => onCreateInCell(day, defaultRowId)}
            >
              <Plus size={14} />
              추가
            </button>
          )}
          <button type="button" className="btn-ghost p-2 touch-target" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {shifts.length === 0 ? (
          <p className="text-sm text-stone-400 py-3 text-center">등록된 근무 없음</p>
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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-7 shrink-0 border-b border-stone-200 bg-stone-50/80 sticky top-0 z-10">
        {headerOrder.map((dow) => (
          <div
            key={dow}
            className={`text-center py-2 text-xs font-semibold ${
              dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-blue-500' : 'text-stone-600'
            }`}
          >
            {KOREAN_WEEKDAYS[dow]}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-stone-200/50">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px mb-px">
            {week.map((day) => {
              const inMonth = monthAnchor ? isDayInScheduleMonth(day, monthAnchor) : false;
              const inRange = isDateWithinScheduleRange(day);
              const key = scheduleDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate());
              const dayShifts = inMonth && inRange ? (shiftsByDay.get(key) ?? []) : [];
              const today = isToday(day);
              const selected = selectedDay ? isSameDay(day, selectedDay) : false;

              return (
                <button
                  key={key}
                  type="button"
                  disabled={!inMonth || !inRange}
                  onClick={() => inMonth && inRange && onSelectDay(day)}
                  style={{ minHeight: MONTH_CELL_MIN_HEIGHT }}
                  className={`flex flex-col min-w-0 p-1 text-left transition-colors ${cellBgClasses(day, today, inMonth && inRange, selected)} ${
                    inMonth && inRange ? 'active:bg-stone-100' : 'cursor-default'
                  }`}
                >
                  <span className={`mb-1 shrink-0 ${dayNumberClasses(day, today, inMonth && inRange)}`}>
                    {day.getDate()}
                  </span>
                  <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-y-auto">
                    {dayShifts.map((shift) => (
                      <MobileShiftChip
                        key={shift.id}
                        shift={shift}
                        readOnly={readOnly}
                        onEdit={onEditShift}
                      />
                    ))}
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

  const gridMinWidth = 52 + days.length * WEEK_COL_MIN_WIDTH;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-auto min-h-0">
        <div style={{ minWidth: gridMinWidth }}>
          <div className="flex shrink-0 border-b border-stone-200/80 sticky top-0 z-10 bg-white">
            <div className="w-[52px] shrink-0 border-r border-stone-100 bg-stone-50/80" />
            {days.map((day) => {
              const today = isToday(day);
              const dow = day.getDay();
              return (
                <div
                  key={day.toISOString()}
                  style={{ minWidth: WEEK_COL_MIN_WIDTH }}
                  className={`flex-1 text-center py-2 border-r border-stone-100 last:border-r-0 ${today ? 'bg-amber-50/80' : 'bg-stone-50/80'}`}
                >
                  <div className={`text-xs font-semibold ${dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-blue-500' : 'text-stone-600'}`}>
                    {KOREAN_WEEKDAYS[dow]}
                  </div>
                  <div className={dayNumberClasses(day, today, true)}>{day.getDate()}</div>
                </div>
              );
            })}
          </div>

          {shiftTypes.map((row) => (
            <div key={row.id} className="flex items-start border-b-2 border-stone-200">
              <div
                className="w-[56px] shrink-0 self-stretch flex items-start justify-center px-0.5 pt-1.5 pb-1 border-r border-stone-100 bg-stone-50/50"
                style={{ color: row.color }}
              >
                <span className="text-[9px] font-semibold leading-tight text-center break-keep">
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
                    style={{ minWidth: WEEK_COL_MIN_WIDTH }}
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
                    className={`flex-1 self-start border-r border-stone-50 last:border-r-0 p-0.5 flex flex-col gap-0.5 border-b-2 border-stone-200 ${cellBgClasses(day, today, true, false)} ${
                      isDropTarget ? 'ring-2 ring-inset ring-amber-400/50' : ''
                    }`}
                  >
                    {cellShifts.map((s) => (
                      <ShiftCard
                        key={s.id}
                        shift={s}
                        compact
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
                        style={{ minHeight: getEmptyCellMinHeightForShiftType(row) }}
                        className="w-full rounded-lg border border-dashed border-stone-300/60 text-stone-400 text-xs touch-target"
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
  const { settings } = useSettings();
  const scheduleFont = resolveScheduleFontFamily(settings.schedule.scheduleFontFamily);
  const defaultRowId = shiftTypes[0]?.id ?? 'morning';
  const isMonthView = days.length > 7;

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const selectedShifts = useMemo(() => {
    if (!selectedDay) return [];
    return shifts.filter((s) => shiftMatchesDay(s, selectedDay));
  }, [shifts, selectedDay]);

  useEffect(() => {
    setSelectedDay(null);
  }, [days]);

  if (days.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-stone-400 px-4">
        표시할 날짜가 없습니다.
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{ fontFamily: scheduleFont }}
    >
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
