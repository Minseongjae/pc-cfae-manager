import type { ScheduleShift } from '@/data/mockSchedule';

export function shiftCellKey(
  shift: Pick<ScheduleShift, 'year' | 'month' | 'day' | 'rowId'>
): string {
  return `${shift.year}-${shift.month}-${shift.day}-${shift.rowId}`;
}

export function compareShiftsByOrder(a: ScheduleShift, b: ScheduleShift): number {
  const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return a.id.localeCompare(b.id);
}

export function sortShiftsInCell(shifts: ScheduleShift[]): ScheduleShift[] {
  return [...shifts].sort(compareShiftsByOrder);
}

/** Assign contiguous sortOrder values within each day/row cell. */
export function normalizeShiftSortOrders(shifts: ScheduleShift[]): ScheduleShift[] {
  const groups = new Map<string, ScheduleShift[]>();
  for (const shift of shifts) {
    const key = shiftCellKey(shift);
    const list = groups.get(key) ?? [];
    list.push(shift);
    groups.set(key, list);
  }

  const orderById = new Map<string, number>();
  for (const group of groups.values()) {
    sortShiftsInCell(group).forEach((shift, index) => {
      orderById.set(shift.id, index);
    });
  }

  return shifts.map((shift) => ({
    ...shift,
    sortOrder: orderById.get(shift.id) ?? 0,
  }));
}

export function encodeDropTarget(cellKey: string, insertBeforeShiftId?: string): string {
  if (!insertBeforeShiftId) return cellKey;
  return `${cellKey}|before|${insertBeforeShiftId}`;
}

export function parseDropTarget(target: string): {
  cellKey: string;
  insertBeforeShiftId?: string;
} {
  const parts = target.split('|');
  if (parts.length >= 3 && parts[1] === 'before') {
    return { cellKey: parts[0], insertBeforeShiftId: parts[2] };
  }
  return { cellKey: target };
}
