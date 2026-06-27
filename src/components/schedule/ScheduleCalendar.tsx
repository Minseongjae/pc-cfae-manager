import { Fragment, useMemo } from 'react';
import { isToday } from 'date-fns';
import { CalendarLegend } from './CalendarLegend';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSettings } from '@/contexts/SettingsContext';
import { useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';
import { resolveScheduleFontFamily } from '@/lib/scheduleFonts';
import {
  getHolidayName,
  isPublicHoliday,
  isRedCalendarDay,
  isSaturday,
  KOREAN_WEEKDAYS,
} from '@/lib/koreanHolidays';
import { scheduleDateKey, shiftMatchesDay } from '@/lib/scheduleViewRange';
import { ScheduleShiftCell } from '@/components/schedule/ScheduleShiftCell';
import { sortShiftsInCell } from '@/lib/scheduleShiftOrder';
import { ScheduleMobileCalendar } from '@/components/schedule/ScheduleMobileCalendar';
import { getRowMinHeightForShiftType } from '@/lib/shiftUtils';
import type { SchedulePasteTarget } from '@/lib/scheduleClipboard';

interface ScheduleCalendarProps {
  days: Date[];
  weekStartsOn?: 0 | 1;
  shifts: ScheduleShift[];
  draggingId: string | null;
  dropTarget: string | null;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
  onDragOver: (cellKey: string) => void;
  onDrop: (shiftId: string, targetDate: Date, rowId: ShiftRowId, insertBeforeShiftId?: string) => void;
  onResize: (shiftId: string, deltaHours: number) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
  onCopyShift?: (shift: ScheduleShift) => void;
  onSelectPasteTarget?: (targetDate: Date, rowId: ShiftRowId) => void;
  copiedShiftId?: string | null;
  pasteTarget?: SchedulePasteTarget | null;
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
  onCopyShift,
  onSelectPasteTarget,
  copiedShiftId,
  pasteTarget,
  readOnly = false,
}: ScheduleCalendarProps) {
  const isMobile = useIsMobile();
  const shiftTypes = useScheduleShiftTypes();
  const { settings } = useSettings();
  const scheduleFont = resolveScheduleFontFamily(settings.schedule.scheduleFontFamily);

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
          onCopyShift={onCopyShift}
          onSelectPasteTarget={onSelectPasteTarget}
          copiedShiftId={copiedShiftId}
          pasteTarget={pasteTarget}
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
    <div
      className="flex-1 overflow-hidden p-2 md:p-4 min-h-0 flex flex-col gap-2"
      style={{ fontFamily: scheduleFont }}
    >
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
              const rowMinHeight = getRowMinHeightForShiftType(row);

              return (
                <Fragment key={row.id}>
                  <div
                    key={`label-${row.id}`}
                    className="sticky left-0 z-10 border-r border-b-2 border-stone-300 bg-stone-50 flex items-start justify-center px-1.5 pt-2 pb-2 min-h-0"
                    style={{ gridColumn: 1, gridRow, minHeight: rowMinHeight }}
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
                    const cellShifts = sortShiftsInCell(shiftsByDayAndRow.get(cellKey) ?? []);
                    const isDropTarget = dropTarget?.startsWith(cellKey) && draggingId !== null;
                    const today = isToday(day);

                    const isCellPasteTarget =
                      pasteTarget?.year === year &&
                      pasteTarget.month === month &&
                      pasteTarget.day === dayNum &&
                      pasteTarget.rowId === row.id;

                    return (
                      <div
                        key={cellKey}
                        style={{ gridColumn: dayIndex + 2, gridRow, minHeight: rowMinHeight }}
                        className={`border-r border-b-2 border-stone-300 p-0.5 min-h-0 overflow-hidden group/cell ${cellBackgroundClasses(day, today)} ${
                          today ? 'ring-1 ring-inset ring-stone-700/15' : ''
                        } ${isDropTarget ? 'bg-amber-500/10 ring-2 ring-inset ring-amber-400/40' : ''}`}
                      >
                        <ScheduleShiftCell
                          cellKey={cellKey}
                          cellShifts={cellShifts}
                          row={row}
                          day={day}
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
                          onCopyShift={onCopyShift}
                          onSelectPasteTarget={onSelectPasteTarget}
                          copiedShiftId={copiedShiftId}
                          isPasteTarget={isCellPasteTarget}
                        />
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
