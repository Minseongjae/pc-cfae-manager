import {
  canGoNextScheduleMonth,
  canGoPrevScheduleMonth,
  getMaxDayInScheduleMonth,
  isScheduleDateAllowed,
  SCHEDULE_MAX_DATE_LABEL,
  SCHEDULE_MAX_MONTH,
  SCHEDULE_MAX_YEAR,
} from '../src/lib/scheduleDateRange';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

let year = 2026;
let month = 6;

while (canGoNextScheduleMonth(year, month)) {
  if (month === 12) {
    year += 1;
    month = 1;
  } else {
    month += 1;
  }
}

assert(year === SCHEDULE_MAX_YEAR, `Expected to stop at ${SCHEDULE_MAX_YEAR}, got ${year}`);
assert(month === SCHEDULE_MAX_MONTH, `Expected to stop at month ${SCHEDULE_MAX_MONTH}, got ${month}`);
assert(!canGoNextScheduleMonth(year, month), 'Next should be disabled at Dec 2030');
assert(canGoPrevScheduleMonth(year, month), 'Prev should remain enabled at Dec 2030');

assert(
  isScheduleDateAllowed(SCHEDULE_MAX_YEAR, SCHEDULE_MAX_MONTH, 31),
  'Dec 31 2030 should be allowed'
);
assert(
  !isScheduleDateAllowed(SCHEDULE_MAX_YEAR, SCHEDULE_MAX_MONTH, 32),
  'Day 32 in Dec 2030 should be rejected'
);
assert(
  !isScheduleDateAllowed(2031, 1, 1),
  'Dates after 2030 should be rejected'
);

assert(getMaxDayInScheduleMonth(2030, 12) === 31, 'Dec 2030 max day should be 31');
assert(getMaxDayInScheduleMonth(2030, 2) === 28, 'Feb 2030 max day should be 28');

console.log(`Schedule range verified through ${SCHEDULE_MAX_DATE_LABEL}.`);
