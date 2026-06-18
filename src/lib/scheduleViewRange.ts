import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ViewMode } from '@/components/schedule/ScheduleHeader';
import {
  canGoNextScheduleMonth,
  canGoPrevScheduleMonth,
  isScheduleDateAllowed,
  SCHEDULE_MAX_YEAR,
  SCHEDULE_MAX_MONTH,
  SCHEDULE_MAX_DAY,
} from '@/lib/scheduleDateRange';

export function scheduleDateKey(year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`;
}

export function dateToScheduleParts(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function isDateWithinScheduleRange(date: Date): boolean {
  const { year, month, day } = dateToScheduleParts(date);
  return isScheduleDateAllowed(year, month, day);
}

export function clampScheduleDate(date: Date): Date {
  const max = new Date(SCHEDULE_MAX_YEAR, SCHEDULE_MAX_MONTH - 1, SCHEDULE_MAX_DAY);
  if (date.getTime() > max.getTime()) return max;
  return date;
}

export function getVisibleDays(
  anchorDate: Date,
  viewMode: ViewMode,
  weekStartsOn: 0 | 1
): Date[] {
  const anchor = clampScheduleDate(anchorDate);

  if (viewMode === 'daily') {
    return isDateWithinScheduleRange(anchor) ? [anchor] : [];
  }

  if (viewMode === 'weekly') {
    const start = startOfWeek(anchor, { weekStartsOn });
    const end = endOfWeek(anchor, { weekStartsOn });
    return eachDayOfInterval({ start, end }).filter(isDateWithinScheduleRange);
  }

  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  return eachDayOfInterval({ start, end }).filter(isDateWithinScheduleRange);
}

export function getSchedulePeriodLabel(
  anchorDate: Date,
  viewMode: ViewMode,
  weekStartsOn: 0 | 1
): string {
  const anchor = clampScheduleDate(anchorDate);

  if (viewMode === 'daily') {
    return format(anchor, 'yyyy년 M월 d일 (EEE)', { locale: ko });
  }

  if (viewMode === 'weekly') {
    const start = startOfWeek(anchor, { weekStartsOn });
    const end = endOfWeek(anchor, { weekStartsOn });
    if (isSameMonth(start, end)) {
      return `${format(start, 'yyyy년 M월 d일', { locale: ko })} ~ ${format(end, 'd일', { locale: ko })}`;
    }
    return `${format(start, 'yyyy.M.d', { locale: ko })} ~ ${format(end, 'yyyy.M.d', { locale: ko })}`;
  }

  return format(anchor, 'yyyy년 M월', { locale: ko });
}

export function navigateScheduleAnchor(
  anchorDate: Date,
  viewMode: ViewMode,
  direction: -1 | 1
): Date {
  const anchor = clampScheduleDate(anchorDate);

  if (viewMode === 'daily') {
    return clampScheduleDate(addDays(anchor, direction));
  }

  if (viewMode === 'weekly') {
    return clampScheduleDate(addDays(anchor, direction * 7));
  }

  return clampScheduleDate(direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1));
}

export function canNavigateSchedulePrev(anchorDate: Date, viewMode: ViewMode): boolean {
  if (viewMode === 'monthly') {
    const { year, month } = dateToScheduleParts(anchorDate);
    return canGoPrevScheduleMonth(year, month);
  }
  return true;
}

export function canNavigateScheduleNext(anchorDate: Date, viewMode: ViewMode): boolean {
  if (viewMode === 'monthly') {
    const { year, month } = dateToScheduleParts(anchorDate);
    return canGoNextScheduleMonth(year, month);
  }

  const next =
    viewMode === 'daily'
      ? addDays(anchorDate, 1)
      : addDays(anchorDate, 7);
  return isDateWithinScheduleRange(clampScheduleDate(next));
}

export function shiftMatchesDay(shift: { year: number; month: number; day: number }, day: Date): boolean {
  const parts = dateToScheduleParts(day);
  return (
    shift.year === parts.year && shift.month === parts.month && shift.day === parts.day
  );
}

export function isTodayDate(date: Date): boolean {
  return isToday(date);
}

export function splitDaysIntoWeeks(days: Date[], weekStartsOn: 0 | 1): Date[][] {
  if (days.length === 0) return [];

  const weeks: Date[][] = [];
  let current: Date[] = [];

  for (const day of days) {
    if (current.length > 0) {
      const currentWeekStart = startOfWeek(current[0], { weekStartsOn }).getTime();
      const dayWeekStart = startOfWeek(day, { weekStartsOn }).getTime();
      if (dayWeekStart !== currentWeekStart) {
        weeks.push(current);
        current = [];
      }
    }
    current.push(day);
  }

  if (current.length > 0) weeks.push(current);
  return weeks;
}

export function findWeekIndexForDate(weeks: Date[][], target: Date): number {
  const index = weeks.findIndex((week) => week.some((day) => isSameDay(day, target)));
  return index >= 0 ? index : 0;
}

export function formatWeekChipLabel(week: Date[]): string {
  if (week.length === 0) return '';
  const start = week[0];
  const end = week[week.length - 1];
  if (isSameMonth(start, end)) {
    return `${format(start, 'M/d')}~${format(end, 'd')}`;
  }
  return `${format(start, 'M/d')}~${format(end, 'M/d')}`;
}
