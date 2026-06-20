import { Fragment, useMemo } from 'react';
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
import { getEmptyCellMinHeightForShiftType } from '@/lib/shiftUtils';
import { ScheduleMobileCalendar } from '@/components/schedule/ScheduleMobileCalendar';

interface ScheduleCalendarProps {
  days: Date[];
  weekStartsOn?: 0 | 1;
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
const ROW_LABEL_WIDTH = 88;
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
  weekStartsOn = 1,
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

  if (isMobile) {
    return (
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <ScheduleMobileCalendar
          days={days}
          weekStartsOn={weekStartsOn}
          shifts={shifts}
          draggingId={draggingId}
          dropTarget={dropTarget}
          readOnly={readOnly}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onResize={onResize}
          onEditShift={onEditShift}
          onCreateInCell={onCreateInCell}
        />
      </div>
    );
  }

  const dayCellWidth = DAY_CELL_WIDTH;
  const rowLabelWidth = ROW_LABEL_WIDTH;
  const headerHeight = HEADER_HEIGHT;

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
  const tableMinWidth = rowLabelWidth + gridWidth;
  const gridTemplateColumns = `${rowLabelWidth}px repeat(${Math.max(days.length, 1)}, ${dayCellWidth}px)`;

  if (days.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-stone-400">
        표시할 날짜가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-2 md:p-4 min-h-0 flex flex-col gap-2">
      <CalendarLegend compact={false} />
      <div className="card-elevated flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-auto min-h-0 scroll-smooth">
          <div
            className="grid"
            style={{
              minWidth: tableMinWidth,
              gridTemplateColumns,
            }}
          >
            <div
              className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 backdrop-blur-sm px-2 flex items-end pb-1.5"
              style={{ height: headerHeight, gridColumn: 1 }}
            >
              <span className="text-[10px] font-medium text-stone-400">구분</span>
            </div>

            {days.map((day, dayIndex) => {
              const dayNum = day.getDate();
              const month = day.getMonth() + 1;
              const dow = day.getDay();
              const today = isToday(day);
              const holidayName = getHolidayName(day);
              const dateKey = scheduleDateKey(day.getFullYear(), month, dayNum);

              return (
                <div
                  key={dateKey}
                  style={{ gridColumn: dayIndex + 2, height: headerHeight }}
                  title={holidayName ?? undefined}
                  className={`sticky top-0 z-20 flex flex-col items-center justify-center gap-0.5 text-xs border-b border-r border-stone-200/80 ${dayHeaderClasses(day, today)}`}
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

            {shiftTypes.map((row, rowIndex) => {
              const gridRow = rowIndex + 2;

              return (
                <Fragment key={row.id}>
                  <div
                    key={`label-${row.id}`}
                    className="sticky left-0 z-10 border-r border-b-2 border-stone-300 bg-stone-50 flex items-start justify-center px-1.5 pt-2 pb-2 min-h-0"
                    style={{ gridColumn: 1, gridRow }}
                  >
                    <span
                      className="text-[10px] md:text-[11px] font-bold leading-snug text-center break-keep"
                      style={{ color: row.color }}
                    >
                      {row.name}
                    </span>
                  </div>

                  {days.map((day, dayIndex) => {
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
                        style={{ gridColumn: dayIndex + 2, gridRow }}
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
                        className={`border-r border-b-2 border-stone-300 p-0.5 flex flex-col gap-0.5 min-h-0 overflow-hidden group/cell ${cellBackgroundClasses(day, today)} ${
                          today ? 'ring-1 ring-inset ring-stone-700/15' : ''
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
                            style={{ minHeight: getEmptyCellMinHeightForShiftType(row) }}
                            className="w-full rounded-md border border-dashed border-stone-300/40 md:border-stone-300/0 hover:border-stone-400/40 hover:bg-stone-50/80 text-stone-400 md:text-transparent hover:text-stone-400 text-xs transition-all md:opacity-0 md:group-hover/cell:opacity-100 touch-target"
                          >
                            + 추가
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
