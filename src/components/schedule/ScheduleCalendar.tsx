import { useMemo } from 'react';
import { isToday } from 'date-fns';
import { CalendarLegend } from './CalendarLegend';
import { ShiftCard } from './ShiftCard';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';
import {
  getHolidayName,
  isPublicHoliday,
  isRedCalendarDay,
  isSaturday,
  KOREAN_WEEKDAYS,
} from '@/lib/koreanHolidays';
import { scheduleDateKey, shiftMatchesDay } from '@/lib/scheduleViewRange';

interface ScheduleCalendarProps {
  days: Date[];
  shifts: ScheduleShift[];
  draggingId: string | null;
  dropTarget: string | null;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
  onDragOver: (cellKey: string) => void;
  onDrop: (shiftId: string, targetDate: Date, rowId: ShiftRowId) => void;
  onResize: (shiftId: string, deltaHours: number) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
  readOnly?: boolean;
}

const DAY_CELL_WIDTH = 128;
const ROW_LABEL_WIDTH = 72;
const ROW_MIN_HEIGHT = 112;
const HEADER_HEIGHT = 64;

function dayHeaderClasses(day: Date, today: boolean): string {
  const holiday = isPublicHoliday(day);
  const saturday = isSaturday(day);
  const redDay = isRedCalendarDay(day);

  if (today) {
    return 'bg-amber-50 ring-2 ring-inset ring-stone-700/80';
  }
  if (holiday || (redDay && !saturday)) {
    return 'bg-rose-50/70';
  }
  if (saturday) {
    return 'bg-blue-50/60';
  }
  return 'bg-white';
}

function dayNumberClasses(day: Date, today: boolean): string {
  if (today) {
    return 'w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-stone-800 text-white text-xs md:text-sm font-bold shadow-sm';
  }
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'text-rose-600 font-semibold';
  }
  if (isSaturday(day)) {
    return 'text-blue-600 font-semibold';
  }
  return 'text-stone-700 font-medium';
}

function weekdayClasses(day: Date, today: boolean): string {
  if (today) return 'text-stone-700 font-semibold';
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'text-rose-500 font-medium';
  }
  if (isSaturday(day)) return 'text-blue-500 font-medium';
  return 'text-stone-400';
}

function cellBackgroundClasses(day: Date, today: boolean): string {
  if (today) return 'bg-amber-50/30';
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'bg-rose-50/20';
  }
  if (isSaturday(day)) return 'bg-blue-50/15';
  return 'bg-white';
}

export function ScheduleCalendar({
  days,
  shifts,
  draggingId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onResize,
  onEditShift,
  onCreateInCell,
  readOnly = false,
}: ScheduleCalendarProps) {
  const isMobile = useIsMobile();
  const shiftTypes = useScheduleShiftTypes();
  const dayCellWidth = isMobile ? 92 : DAY_CELL_WIDTH;
  const rowLabelWidth = isMobile ? 52 : ROW_LABEL_WIDTH;
  const headerHeight = isMobile ? 58 : HEADER_HEIGHT;

  const shiftsByDayAndRow = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>();
    for (const shift of shifts) {
      for (const day of days) {
        if (!shiftMatchesDay(shift, day)) continue;
        const key = `${scheduleDateKey(shift.year, shift.month, shift.day)}-${shift.rowId}`;
        const existing = map.get(key) ?? [];
        existing.push(shift);
        map.set(key, existing);
      }
    }
    return map;
  }, [days, shifts]);

  const gridWidth = Math.max(days.length, 1) * dayCellWidth;

  if (days.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-stone-400">
        표시할 날짜가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-2 md:p-4 min-h-0 flex flex-col gap-2">
      <CalendarLegend />
      <div className="card-elevated flex-1 flex overflow-hidden min-h-0">
        <div
          className="shrink-0 flex flex-col border-r border-stone-200 bg-stone-50/50"
          style={{ width: rowLabelWidth }}
        >
          <div
            className="shrink-0 border-b border-stone-200 px-1 flex items-end pb-1"
            style={{ height: headerHeight }}
          >
            <span className="text-[10px] font-medium text-stone-400">구분</span>
          </div>
          {shiftTypes.map((row) => (
            <div
              key={row.id}
              className="flex items-start px-2 py-3 md:px-3 md:py-4 border-b border-stone-200/80 last:border-b-0"
              style={{ minHeight: ROW_MIN_HEIGHT }}
            >
              <span
                className="text-[10px] md:text-[11px] font-medium leading-tight tracking-wide"
                style={{ color: row.color }}
              >
                {row.name}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto min-w-0 scroll-smooth">
          <div style={{ width: gridWidth, minWidth: '100%' }}>
            <div
              className="flex border-b border-stone-200 sticky top-0 z-10 backdrop-blur-sm bg-white/90"
              style={{ height: headerHeight }}
            >
              {days.map((day) => {
                const dayNum = day.getDate();
                const month = day.getMonth() + 1;
                const dow = day.getDay();
                const today = isToday(day);
                const holidayName = getHolidayName(day);
                const dateKey = scheduleDateKey(day.getFullYear(), month, dayNum);

                return (
                  <div
                    key={dateKey}
                    style={{ width: dayCellWidth }}
                    title={holidayName ?? undefined}
                    className={`shrink-0 flex flex-col items-center justify-center gap-0.5 text-xs border-r border-stone-200/80 ${dayHeaderClasses(day, today)}`}
                  >
                    {days.length > 1 && days.length < 28 && (
                      <span className="text-[9px] text-stone-400">{month}월</span>
                    )}
                    <span className={dayNumberClasses(day, today)}>{dayNum}</span>
                    <span className={`text-[10px] md:text-[11px] ${weekdayClasses(day, today)}`}>
                      {KOREAN_WEEKDAYS[dow]}
                    </span>
                    {holidayName && (
                      <span className="hidden md:block text-[9px] text-rose-600 truncate max-w-[90%] leading-none">
                        {holidayName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {shiftTypes.map((row) => (
              <div
                key={row.id}
                className="flex border-b border-stone-200/60 last:border-b-0"
                style={{ minHeight: ROW_MIN_HEIGHT }}
              >
                {days.map((day) => {
                  const dayNum = day.getDate();
                  const month = day.getMonth() + 1;
                  const year = day.getFullYear();
                  const dateKey = scheduleDateKey(year, month, dayNum);
                  const cellKey = `${dateKey}-${row.id}`;
                  const cellShifts = shiftsByDayAndRow.get(cellKey) ?? [];
                  const isDropTarget = dropTarget === cellKey && draggingId !== null;
                  const today = isToday(day);

                  return (
                    <div
                      key={cellKey}
                      style={{ width: dayCellWidth }}
                      onDragOver={(e) => {
                        if (readOnly) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        onDragOver(cellKey);
                      }}
                      onDrop={(e) => {
                        if (readOnly) return;
                        const shiftId = e.dataTransfer.getData('text/shift-id');
                        if (shiftId) onDrop(shiftId, day, row.id);
                      }}
                      className={`shrink-0 border-r border-stone-100 p-1.5 md:p-2 space-y-1.5 md:space-y-2 transition-all duration-200 group/cell ${cellBackgroundClasses(day, today)} ${
                        today ? 'ring-1 ring-inset ring-stone-700/20' : ''
                      } ${isDropTarget ? 'bg-amber-500/10 ring-2 ring-inset ring-amber-400/40' : ''}`}
                    >
                      {cellShifts.map((s) => (
                        <ShiftCard
                          key={s.id}
                          shift={s}
                          readOnly={readOnly}
                          isDragging={draggingId === s.id}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          onResize={onResize}
                          onEdit={onEditShift}
                        />
                      ))}
                      {cellShifts.length === 0 && onCreateInCell && !readOnly && (
                        <button
                          type="button"
                          onClick={() => onCreateInCell(day, row.id)}
                          className="w-full h-full min-h-[48px] md:min-h-[52px] rounded-xl border border-dashed border-stone-300/40 md:border-stone-300/0 hover:border-stone-400/40 hover:bg-stone-50/80 text-stone-400 md:text-transparent hover:text-stone-400 text-xs transition-all md:opacity-0 md:group-hover/cell:opacity-100 touch-target"
                        >
                          + 추가
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
    </div>
  );
}
