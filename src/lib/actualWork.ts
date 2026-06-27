import { calculateShiftHours, parseTimeToMinutes } from '@/lib/shiftUtils';

export const ACTUAL_WORK_CHANGED_EVENT = 'actual-work-changed';

export type ActualWorkStatus = 'scheduled' | 'working' | 'completed';

export const MODIFICATION_REASONS = [
  { id: 'late-clock-in', label: '지각 출근' },
  { id: 'forgot-clock-in', label: '출근 기록 누락' },
  { id: 'forgot-clock-out', label: '퇴근 기록 누락' },
  { id: 'manual-correction', label: '수동 정정' },
  { id: 'other', label: '기타' },
] as const;

export type ModificationReasonId = (typeof MODIFICATION_REASONS)[number]['id'];

export interface ActualWorkRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  date: string;
  shiftId: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  scheduledHours: number;
  workedHours: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyLeaveMinutes: number;
  isOvertime: boolean;
  overtimeMinutes: number;
  status: ActualWorkStatus;
  payrollAmount: number;
  modificationReason: string | null;
  isManuallyEdited: boolean;
  updatedAt: string;
}

export interface ActualWorkMetrics {
  scheduledHours: number;
  workedHours: number;
  isLate: boolean;
  lateMinutes: number;
  isEarlyLeave: boolean;
  earlyLeaveMinutes: number;
  isOvertime: boolean;
  overtimeMinutes: number;
}

function normalizeEndMinutes(startMinutes: number, endMinutes: number): number {
  return endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes;
}

function normalizeActualMinutes(
  scheduledStart: string,
  scheduledEnd: string,
  actualTime: string,
  kind: 'start' | 'end'
): number {
  const start = parseTimeToMinutes(scheduledStart);
  const end = normalizeEndMinutes(start, parseTimeToMinutes(scheduledEnd));
  let actual = parseTimeToMinutes(actualTime);

  if (kind === 'end' && actual < start) {
    actual += 24 * 60;
  }

  if (kind === 'start' && end > 24 * 60 && actual < start && actual < 12 * 60) {
    actual += 24 * 60;
  }

  return actual;
}

export function calculateActualWorkMetrics(
  scheduledStart: string,
  scheduledEnd: string,
  actualStart: string | null,
  actualEnd: string | null
): ActualWorkMetrics {
  const scheduledHours = calculateShiftHours(scheduledStart, scheduledEnd);
  let workedHours = 0;
  let isLate = false;
  let lateMinutes = 0;
  let isEarlyLeave = false;
  let earlyLeaveMinutes = 0;
  let isOvertime = false;
  let overtimeMinutes = 0;

  if (actualStart && actualEnd) {
    workedHours = calculateShiftHours(actualStart, actualEnd);

    const startDiff =
      normalizeActualMinutes(scheduledStart, scheduledEnd, actualStart, 'start') -
      parseTimeToMinutes(scheduledStart);
    if (startDiff > 0) {
      isLate = true;
      lateMinutes = startDiff;
    }

    const scheduledEndMinutes = normalizeEndMinutes(
      parseTimeToMinutes(scheduledStart),
      parseTimeToMinutes(scheduledEnd)
    );
    const actualEndMinutes = normalizeActualMinutes(
      scheduledStart,
      scheduledEnd,
      actualEnd,
      'end'
    );
    const endDiff = actualEndMinutes - scheduledEndMinutes;

    if (endDiff < 0) {
      isEarlyLeave = true;
      earlyLeaveMinutes = Math.abs(endDiff);
    } else if (endDiff > 0) {
      isOvertime = true;
      overtimeMinutes = endDiff;
    }
  } else if (actualStart) {
    const startDiff =
      normalizeActualMinutes(scheduledStart, scheduledEnd, actualStart, 'start') -
      parseTimeToMinutes(scheduledStart);
    if (startDiff > 0) {
      isLate = true;
      lateMinutes = startDiff;
    }
  }

  return {
    scheduledHours,
    workedHours: Math.round(workedHours * 10) / 10,
    isLate,
    lateMinutes,
    isEarlyLeave,
    earlyLeaveMinutes,
    isOvertime,
    overtimeMinutes,
  };
}

export function enrichActualWorkRecord(
  record: ActualWorkRecord,
  hourlyWage: number
): ActualWorkRecord {
  const metrics = calculateActualWorkMetrics(
    record.scheduledStart,
    record.scheduledEnd,
    record.actualStart,
    record.actualEnd
  );

  const hoursForPay =
    record.actualStart && record.actualEnd ? metrics.workedHours : 0;

  return {
    ...record,
    scheduledHours: Math.round(metrics.scheduledHours * 10) / 10,
    workedHours: metrics.workedHours,
    isLate: metrics.isLate,
    lateMinutes: metrics.lateMinutes,
    isEarlyLeave: metrics.isEarlyLeave,
    earlyLeaveMinutes: metrics.earlyLeaveMinutes,
    isOvertime: metrics.isOvertime,
    overtimeMinutes: metrics.overtimeMinutes,
    payrollAmount: Math.round(hoursForPay * hourlyWage),
    updatedAt: new Date().toISOString(),
  };
}

export function formatMinutesLabel(minutes: number): string {
  if (minutes <= 0) return '0분';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function migrateActualWorkRecord(raw: Record<string, unknown>): ActualWorkRecord {
  const record = raw as unknown as ActualWorkRecord;
  return {
    ...record,
    modificationReason:
      typeof raw.modificationReason === 'string' ? raw.modificationReason : null,
    isManuallyEdited: Boolean(raw.isManuallyEdited),
  };
}
