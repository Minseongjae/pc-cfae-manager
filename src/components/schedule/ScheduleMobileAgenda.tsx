import { useEffect, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import { useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';
import {
  getHolidayName,
  isPublicHoliday,
  isRedCalendarDay,
  isSaturday,
} from '@/lib/koreanHolidays';
import {
  findWeekIndexForDate,
  formatWeekChipLabel,
  scheduleDateKey,
  shiftMatchesDay,
  splitDaysIntoWeeks,
} from '@/lib/scheduleViewRange';
import { shiftTypeCardStyle } from '@/lib/scheduleShiftTypes';

interface ScheduleMobileAgendaProps {
  days: Date[];
  weekStartsOn: 0 | 1;
  shifts: ScheduleShift[];
  readOnly?: boolean;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
}

function dayAccentClasses(day: Date, today: boolean): string {
  if (today) return 'border-stone-700 bg-amber-50/60';
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'border-rose-200 bg-rose-50/40';
  }
  if (isSaturday(day)) return 'border-blue-200 bg-blue-50/30';
  return 'border-stone-200 bg-white';
}

function dayTitleClasses(day: Date, today: boolean): string {
  if (today) return 'text-stone-900 font-semibold';
  if (isPublicHoliday(day) || (isRedCalendarDay(day) && !isSaturday(day))) {
    return 'text-rose-600 font-semibold';
  }
  if (isSaturday(day)) return 'text-blue-600 font-semibold';
  return 'text-stone-800 font-medium';
}

export function ScheduleMobileAgenda({
  days,
  weekStartsOn,
  shifts,
  readOnly = false,
  onEditShift,
  onCreateInCell,
}: ScheduleMobileAgendaProps) {
  const shiftTypes = useScheduleShiftTypes();
  const weeks = useMemo(() => splitDaysIntoWeeks(days, weekStartsOn), [days, weekStartsOn]);
  const showWeekPicker = days.length > 7;
  const [weekIndex, setWeekIndex] = useState(() =>
    findWeekIndexForDate(weeks, new Date())
  );

  useEffect(() => {
    setWeekIndex(findWeekIndexForDate(weeks, new Date()));
  }, [weeks]);

  const visibleDays = showWeekPicker ? (weeks[weekIndex] ?? weeks[0] ?? []) : days;

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ScheduleShift[]>();
    for (const shift of shifts) {
      for (const day of visibleDays) {
        if (!shiftMatchesDay(shift, day)) continue;
        const key = scheduleDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate());
        const list = map.get(key) ?? [];
        list.push(shift);
        map.set(key, list);
      }
    }
    return map;
  }, [shifts, visibleDays]);

  if (visibleDays.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-stone-400 px-4">
        표시할 날짜가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {showWeekPicker && weeks.length > 1 && (
        <div className="shrink-0 px-2 pt-1 pb-2 border-b border-stone-200/70 bg-white/90">
          <div className="flex gap-1.5 overflow-x-auto">
            {weeks.map((week, index) => (
              <button
                key={`${week[0]?.toISOString()}-${index}`}
                type="button"
                onClick={() => setWeekIndex(index)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium touch-target ${
                  weekIndex === index
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {formatWeekChipLabel(week)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-0">
        {visibleDays.map((day) => {
          const key = scheduleDateKey(day.getFullYear(), day.getMonth() + 1, day.getDate());
          const dayShifts = shiftsByDay.get(key) ?? [];
          const today = isToday(day);
          const holidayName = getHolidayName(day);
          const defaultRowId = shiftTypes[0]?.id ?? 'morning';

          return (
            <section
              key={key}
              className={`rounded-xl border px-3 py-2.5 ${dayAccentClasses(day, today)}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <p className={`text-sm ${dayTitleClasses(day, today)}`}>
                    {format(day, 'M월 d일 (EEE)', { locale: ko })}
                    {today && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-stone-800 text-white">
                        오늘
                      </span>
                    )}
                  </p>
                  {holidayName && (
                    <p className="text-[10px] text-rose-600 mt-0.5">{holidayName}</p>
                  )}
                </div>
                {!readOnly && onCreateInCell && (
                  <button
                    type="button"
                    className="btn-ghost text-[11px] px-2 py-1 shrink-0 touch-target"
                    onClick={() => onCreateInCell(day, defaultRowId)}
                  >
                    <Plus size={12} />
                    추가
                  </button>
                )}
              </div>

              {dayShifts.length === 0 ? (
                <p className="text-xs text-stone-400 py-1">등록된 근무 없음</p>
              ) : (
                <ul className="space-y-1.5">
                  {dayShifts.map((shift) => {
                    const shiftType = shiftTypes.find((row) => row.id === shift.rowId);
                    const style = shiftTypeCardStyle(shiftType?.color ?? '#9CA3AF');

                    return (
                      <li key={shift.id}>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => !readOnly && onEditShift(shift)}
                          className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs ${
                            readOnly ? 'cursor-default' : 'active:scale-[0.99]'
                          }`}
                          style={style}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{shift.name}</span>
                            <span className="text-[10px] opacity-80 shrink-0">
                              {shiftType?.name ?? shift.rowId}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-90 mt-0.5">
                            {shift.startTime} – {shift.endTime} · {shift.duration}h
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
