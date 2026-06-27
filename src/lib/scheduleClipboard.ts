import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';

import { APP_STORAGE_PREFIX } from '@/lib/appBrand';

const CLIPBOARD_KEY = `${APP_STORAGE_PREFIX}-schedule-clipboard`;

export interface ScheduleClipboardEntry {
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
}

export function copyScheduleEntry(shift: ScheduleShift): ScheduleClipboardEntry {
  const entry: ScheduleClipboardEntry = {
    name: shift.name,
    startTime: shift.startTime,
    endTime: shift.endTime,
    duration: shift.duration,
  };
  try {
    sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors
  }
  return entry;
}

export function readScheduleClipboard(): ScheduleClipboardEntry | null {
  try {
    const raw = sessionStorage.getItem(CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScheduleClipboardEntry;
    if (!parsed.name || !parsed.startTime || !parsed.endTime) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearScheduleClipboard(): void {
  try {
    sessionStorage.removeItem(CLIPBOARD_KEY);
  } catch {
    // ignore
  }
}

export interface SchedulePasteTarget {
  year: number;
  month: number;
  day: number;
  rowId: ShiftRowId;
}

export function schedulePasteTargetKey(target: SchedulePasteTarget): string {
  return `${target.year}-${target.month}-${target.day}-${target.rowId}`;
}
