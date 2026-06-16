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
