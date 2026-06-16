import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
} from 'date-fns';
import { ShiftCard } from './ShiftCard';
import { shiftRows, type ScheduleShift, type ShiftRowId } from '@/data/mockSchedule';

interface ScheduleCalendarProps {
  year: number;
  month: number;
  shifts: ScheduleShift[];
  draggingId: string | null;
  dropTarget: string | null;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
  onDragOver: (cellKey: string) => void;
  onDrop: (shiftId: string, day: number, rowId: ShiftRowId) => void;
  onResize: (shiftId: string, deltaHours: number) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (day: number, rowId: ShiftRowId) => void;
}

const DAY_CELL_WIDTH = 136;
const ROW_LABEL_WIDTH = 72;
const ROW_MIN_HEIGHT = 112;
const HEADER_HEIGHT = 48;

export function ScheduleCalendar({
  year,
  month,
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
}: ScheduleCalendarProps) {
  const { days, shiftsByDayAndRow } = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    const allDays = eachDayOfInterval({ start, end });

    const map = new Map<string, ScheduleShift[]>();
    for (const s of shifts) {
      if (s.year === year && s.month === month) {
        const key = `${s.day}-${s.rowId}`;
        const existing = map.get(key) ?? [];
        existing.push(s);
        map.set(key, existing);
      }
    }

    return { days: allDays, shiftsByDayAndRow: map };
  }, [year, month, shifts]);

  const gridWidth = days.length * DAY_CELL_WIDTH;

  return (
    <div className="flex-1 overflow-hidden p-4 min-h-0">
      <div className="card-elevated h-full flex overflow-hidden">
        <div
          className="shrink-0 flex flex-col border-r border-stone-200 bg-stone-50/50"
          style={{ width: ROW_LABEL_WIDTH }}
        >
          <div className="shrink-0 border-b border-stone-200" style={{ height: HEADER_HEIGHT }} />
          {shiftRows.map((row) => (
            <div
              key={row.id}
              className="flex items-start px-3 py-4 border-b border-stone-200/80 last:border-b-0"
              style={{ minHeight: ROW_MIN_HEIGHT }}
            >
              <span className="text-[11px] font-medium text-stone-500 leading-tight tracking-wide">
                {row.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto min-w-0">
          <div style={{ width: gridWidth, minWidth: '100%' }}>
            <div
              className="flex border-b border-stone-200 sticky top-0 z-10 bg-white/95 backdrop-blur-sm"
              style={{ height: HEADER_HEIGHT }}
            >
              {days.map((day) => {
                const dayNum = day.getDate();
                const dow = getDay(day);
                const isWeekend = dow === 0 || dow === 6;
                const today = isToday(day);

                return (
                  <div
                    key={dayNum}
                    style={{ width: DAY_CELL_WIDTH }}
                    className={`shrink-0 flex items-center justify-center text-sm border-r border-stone-200/80 ${
                      today
                        ? 'bg-stone-700/8 font-semibold text-stone-600'
                        : isWeekend
                          ? 'text-stone-400'
                          : 'text-stone-600 font-medium'
                    }`}
                  >
                    {today ? (
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-700 text-white text-sm font-semibold shadow-sm">
                        {dayNum}
                      </span>
                    ) : (
                      dayNum
                    )}
                  </div>
                );
              })}
            </div>

            {shiftRows.map((row) => (
              <div
                key={row.id}
                className="flex border-b border-stone-200/60 last:border-b-0"
                style={{ minHeight: ROW_MIN_HEIGHT }}
              >
                {days.map((day) => {
                  const dayNum = day.getDate();
                  const cellKey = `${dayNum}-${row.id}`;
                  const cellShifts = shiftsByDayAndRow.get(cellKey) ?? [];
                  const isDropTarget = dropTarget === cellKey && draggingId !== null;

                  return (
                    <div
                      key={cellKey}
                      style={{ width: DAY_CELL_WIDTH }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        onDragOver(cellKey);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const shiftId = e.dataTransfer.getData('text/shift-id');
                        if (shiftId) onDrop(shiftId, dayNum, row.id);
                      }}
                      className={`shrink-0 border-r border-stone-100 p-2 space-y-2 transition-all duration-200 group/cell ${
                        isToday(day) ? 'bg-stone-50/40' : 'bg-white'
                      } ${isDropTarget ? 'bg-amber-500/10 ring-2 ring-inset ring-stone-500/25' : ''}`}
                    >
                      {cellShifts.map((s) => (
                        <ShiftCard
                          key={s.id}
                          shift={s}
                          isDragging={draggingId === s.id}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                          onResize={onResize}
                          onEdit={onEditShift}
                        />
                      ))}
                      {cellShifts.length === 0 && onCreateInCell && (
                        <button
                          onClick={() => onCreateInCell(dayNum, row.id)}
                          className="w-full h-full min-h-[60px] rounded-xl border border-dashed border-stone-300/0 hover:border-stone-400/40 hover:bg-stone-50/80 text-transparent hover:text-stone-400 text-xs transition-all opacity-0 group-hover/cell:opacity-100"
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
