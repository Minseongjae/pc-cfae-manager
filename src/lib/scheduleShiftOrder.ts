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

export function encodeDropTarget(cellKey: string, insertIndex?: number): string {
  if (insertIndex === undefined || insertIndex < 0) return cellKey;
  return `${cellKey}|at|${insertIndex}`;
}

export function parseDropTarget(target: string): {
  cellKey: string;
  insertIndex?: number;
  insertBeforeShiftId?: string;
} {
  const parts = target.split('|');
  if (parts.length >= 3 && parts[1] === 'at') {
    const index = Number.parseInt(parts[2], 10);
    if (Number.isFinite(index) && index >= 0) {
      return { cellKey: parts[0], insertIndex: index };
    }
  }
  if (parts.length >= 3 && parts[1] === 'before') {
    return { cellKey: parts[0], insertBeforeShiftId: parts[2] };
  }
  return { cellKey: target };
}

export function insertBeforeIdForIndex(
  cellShifts: ScheduleShift[],
  draggingId: string | null | undefined,
  insertIndex: number
): string | undefined {
  const ordered = sortShiftsInCell(cellShifts).filter((shift) => shift.id !== draggingId);
  const clamped = Math.min(Math.max(insertIndex, 0), ordered.length);
  return ordered[clamped]?.id;
}

export function computeInsertIndexFromPointer(
  container: HTMLElement,
  clientY: number
): number {
  const slots = Array.from(
    container.querySelectorAll<HTMLElement>('[data-shift-slot]:not([data-dragging="true"])')
  );

  for (let index = 0; index < slots.length; index += 1) {
    const rect = slots[index].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (clientY < midpoint) return index;
  }

  return slots.length;
}

export function resolveDropInsertBeforeId(
  cellShifts: ScheduleShift[],
  draggingId: string | null | undefined,
  dropTarget: string | null | undefined
): string | undefined {
  if (!dropTarget) return undefined;
  const parsed = parseDropTarget(dropTarget);
  if (parsed.insertIndex !== undefined) {
    return insertBeforeIdForIndex(cellShifts, draggingId, parsed.insertIndex);
  }
  return parsed.insertBeforeShiftId;
}
