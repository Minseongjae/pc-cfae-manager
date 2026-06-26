import { getDaysInMonth } from 'date-fns';

/** Last allowed schedule date: December 31, 2030 */
export const SCHEDULE_MAX_YEAR = 2030;
export const SCHEDULE_MAX_MONTH = 12;
export const SCHEDULE_MAX_DAY = 31;

export const SCHEDULE_MAX_DATE_LABEL = '2030년 12월 31일';

export function canGoNextScheduleMonth(year: number, month: number): boolean {
  if (year > SCHEDULE_MAX_YEAR) return false;
  if (year === SCHEDULE_MAX_YEAR && month >= SCHEDULE_MAX_MONTH) return false;
  return true;
}

export function canGoPrevScheduleMonth(_year: number, _month: number): boolean {
  return true;
}

export function isScheduleDateAllowed(
  year: number,
  month: number,
  day: number
): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  if (year > SCHEDULE_MAX_YEAR) return false;
  if (year === SCHEDULE_MAX_YEAR && month > SCHEDULE_MAX_MONTH) return false;

  const maxDay = getDaysInMonth(new Date(year, month - 1));
  if (day > maxDay) return false;

  if (year === SCHEDULE_MAX_YEAR && month === SCHEDULE_MAX_MONTH && day > SCHEDULE_MAX_DAY) {
    return false;
  }

  return true;
}

export function getMaxDayInScheduleMonth(year: number, month: number): number {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  if (year === SCHEDULE_MAX_YEAR && month === SCHEDULE_MAX_MONTH) {
    return Math.min(daysInMonth, SCHEDULE_MAX_DAY);
  }
  return daysInMonth;
}

export function clampScheduleDay(year: number, month: number, day: number): number {
  const maxDay = getMaxDayInScheduleMonth(year, month);
  return Math.min(Math.max(1, day), maxDay);
}
