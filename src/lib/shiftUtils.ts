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
      return id === 'night' || id.includes('night') || name.includes('야간');
    case 'middle':
      return id === 'middle' || id.includes('middle') || name.includes('미들');
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
    return { refHours, rowMinHeight: 64, cardBase: 32, cardMax: 44, compactCardMax: 32 };
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

export function getRowMinHeightForShiftType(shiftType: ShiftType): number {
  const profile = getShiftTypeRowProfile(shiftType);
  const typicalMaxHours = profile.refHours + 2;
  const cardHeight = getShiftCardMinHeight(typicalMaxHours, false);
  return Math.max(profile.rowMinHeight, cardHeight + 14);
}

export function getEmptyCellMinHeightForShiftType(shiftType: ShiftType): number {
  return Math.max(getShiftTypeRowProfile(shiftType).rowMinHeight - 28, 28);
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

/** Card height grows linearly with hours worked — same rule everywhere, capped to stay compact. */
export function getShiftCardMinHeight(
  hours: number,
  compact = false
): number {
  const base = compact ? 26 : 34;
  const pxPerHour = compact ? 2 : 2.5;
  const max = compact ? 40 : 52;
  return Math.min(Math.round(base + hours * pxPerHour), max);
}

export function getShiftCardMinHeightFromShift(
  shift: { duration?: string | number; startTime?: string; endTime?: string },
  compact = false
): number {
  return getShiftCardMinHeight(getShiftWorkedHours(shift), compact);
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
