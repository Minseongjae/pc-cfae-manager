import type { ShiftType } from '@/types';

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateShiftHours(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}

export function formatDurationLabel(hours: number): string {
  return String(Math.round(hours)).padStart(2, '0');
}

export function parseShiftDurationHours(duration: string | number | undefined): number {
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  const parsed = parseInt(String(duration ?? ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1;
}

export interface ShiftTypeRowProfile {
  refHours: number;
  rowMinHeight: number;
  cardBase: number;
  cardMax: number;
  compactCardMax: number;
}

export function getShiftTypeDefaultHours(
  shiftType: Pick<ShiftType, 'defaultStartTime' | 'defaultEndTime'>
): number {
  if (!shiftType.defaultStartTime || !shiftType.defaultEndTime) return 4;
  return calculateShiftHours(shiftType.defaultStartTime, shiftType.defaultEndTime);
}

function matchesShiftKind(
  shiftType: Pick<ShiftType, 'id' | 'name'>,
  kind: 'night' | 'middle' | 'afternoon' | 'morning' | 'training'
): boolean {
  const id = shiftType.id.toLowerCase();
  const name = shiftType.name.toLowerCase();

  switch (kind) {
    case 'night':
      return (
        (id === 'night' || id.includes('night') || name.includes('야간')) &&
        !name.includes('미들야간')
      );
    case 'middle':
      return (
        id === 'middle' ||
        id.includes('middle') ||
        name.includes('미들야간') ||
        (name.includes('미들') && !name.includes('야간'))
      );
    case 'afternoon':
      return id.startsWith('afternoon') || name.includes('오후');
    case 'morning':
      return id === 'morning' || name.includes('오전');
    case 'training':
      return id === 'training' || name.includes('교육');
  }
}

/** Row + card sizing tuned per shift type (오전/오후/미들/야간). */
export function getShiftTypeRowProfile(shiftType: ShiftType): ShiftTypeRowProfile {
  const defaultHours = getShiftTypeDefaultHours(shiftType);

  if (matchesShiftKind(shiftType, 'night')) {
    const refHours = Math.max(defaultHours, 8);
    return { refHours, rowMinHeight: 82, cardBase: 32, cardMax: 50, compactCardMax: 36 };
  }
  if (matchesShiftKind(shiftType, 'middle')) {
    const refHours = Math.max(defaultHours, 5);
    return { refHours, rowMinHeight: 74, cardBase: 32, cardMax: 46, compactCardMax: 34 };
  }
  if (matchesShiftKind(shiftType, 'afternoon') || matchesShiftKind(shiftType, 'morning')) {
    const refHours = Math.max(defaultHours, 4);
    return { refHours, rowMinHeight: 52, cardBase: 30, cardMax: 46, compactCardMax: 32 };
  }
  if (matchesShiftKind(shiftType, 'training')) {
    const refHours = Math.max(defaultHours, 2);
    return { refHours, rowMinHeight: 56, cardBase: 30, cardMax: 38, compactCardMax: 30 };
  }

  const refHours = defaultHours;
  return {
    refHours,
    rowMinHeight: Math.min(52 + refHours * 4, 84),
    cardBase: 32,
    cardMax: Math.min(34 + refHours * 2, 50),
    compactCardMax: Math.min(28 + refHours * 2, 36),
  };
}

export function getRowMinHeightForShiftType(_shiftType?: ShiftType): number {
  const shortCard = getShiftCardHeight(4, false);
  return shortCard * SCHEDULE_STACK_TARGET + SCHEDULE_CARD_GAP * (SCHEDULE_STACK_TARGET - 1) + 10;
}

export function getEmptyCellMinHeightForShiftType(_shiftType?: ShiftType): number {
  return getShiftCardHeight(4, false) + 4;
}

/** Actual worked hours — prefer start/end times over stored duration label. */
export function getShiftWorkedHours(shift: {
  duration?: string | number;
  startTime?: string;
  endTime?: string;
}): number {
  if (shift.startTime && shift.endTime) {
    const fromTimes = calculateShiftHours(shift.startTime, shift.endTime);
    if (fromTimes > 0) return fromTimes;
  }
  return parseShiftDurationHours(shift.duration);
}

/** Target stacked cards per cell (오전/오후/미들/야간 +1). */
export const SCHEDULE_STACK_TARGET = 4;
export const SCHEDULE_CARD_GAP = 2;

/** Card height grows linearly with hours — fixed height, clearly distinguishable. */
export function getShiftCardHeight(hours: number, compact = false): number {
  const h = Math.max(hours, 1);
  const base = compact ? 20 : 26;
  const pxPerHour = compact ? 5 : 10;
  const max = compact ? 46 : 120;
  return Math.min(Math.round(base + h * pxPerHour), max);
}

/** 0–1 fill ratio for duration bar (12h = full). */
export function getShiftDurationFillRatio(hours: number): number {
  return Math.min(Math.max(hours, 1) / 12, 1);
}

export function getShiftCardHeightFromShift(
  shift: { duration?: string | number; startTime?: string; endTime?: string },
  compact = false
): number {
  return getShiftCardHeight(getShiftWorkedHours(shift), compact);
}

/** @deprecated Use getShiftCardHeight */
export function getShiftCardMinHeight(hours: number, compact = false): number {
  return getShiftCardHeight(hours, compact);
}

export function getShiftCardMinHeightFromShift(
  shift: { duration?: string | number; startTime?: string; endTime?: string },
  compact = false
): number {
  return getShiftCardHeightFromShift(shift, compact);
}

export function updateShiftDuration(startTime: string, endTime: string): {
  endTime: string;
  duration: string;
} {
  const hours = calculateShiftHours(startTime, endTime);
  return {
    endTime,
    duration: formatDurationLabel(hours),
  };
}

export function resizeShiftEnd(
  startTime: string,
  endTime: string,
  deltaHours: number
): { endTime: string; duration: string } {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) end += 24 * 60;

  const newEnd = end + deltaHours * 60;
  const minEnd = start + 60;
  const clampedEnd = Math.max(minEnd, newEnd);
  const newEndTime = minutesToTime(clampedEnd);

  return updateShiftDuration(startTime, newEndTime);
}

export function createShiftId(day: number, rowId: string, name: string): string {
  return `${day}-${rowId}-${name}-${Date.now()}`;
}
