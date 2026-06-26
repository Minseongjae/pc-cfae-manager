import { Fragment, useCallback, useMemo, useRef, type ReactNode } from 'react';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import { ShiftCard } from './ShiftCard';
import {
  computeInsertIndexFromPointer,
  encodeDropTarget,
  parseDropTarget,
  sortShiftsInCell,
} from '@/lib/scheduleShiftOrder';
import { getEmptyCellMinHeightForShiftType, getShiftCardHeightFromShift } from '@/lib/shiftUtils';
import type { ShiftType } from '@/types';

interface ScheduleShiftCellProps {
  cellKey: string;
  cellShifts: ScheduleShift[];
  row: ShiftType;
  day: Date;
  draggingId: string | null;
  dropTarget: string | null;
  readOnly?: boolean;
  compact?: boolean;
  className?: string;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
  onDragOver: (target: string) => void;
  onDrop: (shiftId: string, targetDate: Date, rowId: ShiftRowId, insertBeforeShiftId?: string) => void;
  onResize: (shiftId: string, deltaHours: number) => void;
  onEditShift: (shift: ScheduleShift) => void;
  onCreateInCell?: (targetDate: Date, rowId: ShiftRowId) => void;
}

function DropPlaceholder({ height }: { height: number }) {
  return (
    <div
      className="rounded-md border-2 border-dashed border-amber-400/90 bg-amber-50/70 transition-all duration-150 ease-out shrink-0 pointer-events-none"
      style={{ height: Math.max(Math.round(height), 24) }}
      aria-hidden
    />
  );
}

export function ScheduleShiftCell({
  cellKey,
  cellShifts,
  row,
  day,
  draggingId,
  dropTarget,
  readOnly = false,
  compact = false,
  className = '',
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onResize,
  onEditShift,
  onCreateInCell,
}: ScheduleShiftCellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedShifts = useMemo(() => sortShiftsInCell(cellShifts), [cellShifts]);

  const isActiveCell = Boolean(draggingId && dropTarget?.startsWith(cellKey));
  const parsedTarget = dropTarget ? parseDropTarget(dropTarget) : null;
  const previewInsertIndex =
    isActiveCell && parsedTarget?.cellKey === cellKey ? parsedTarget.insertIndex : undefined;

  const draggedShift = useMemo(
    () => sortedShifts.find((shift) => shift.id === draggingId),
    [draggingId, sortedShifts]
  );

  const placeholderHeight = useMemo(() => {
    if (!draggedShift) return compact ? 32 : 40;
    return getShiftCardHeightFromShift(draggedShift, compact);
  }, [compact, draggedShift]);

  const staticSlotCount = useMemo(
    () => sortedShifts.filter((shift) => shift.id !== draggingId).length,
    [draggingId, sortedShifts]
  );

  const updateInsertIndex = useCallback(
    (clientY: number) => {
      if (readOnly || !containerRef.current) return;
      const index = computeInsertIndexFromPointer(containerRef.current, clientY);
      onDragOver(encodeDropTarget(cellKey, index));
    },
    [cellKey, onDragOver, readOnly]
  );

  const handleCellDragOver = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      updateInsertIndex(event.clientY);
    },
    [readOnly, updateInsertIndex]
  );

  const handleCellDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return;
      event.preventDefault();
      const shiftId = event.dataTransfer.getData('text/shift-id');
      if (!shiftId || !containerRef.current) return;

      const index = computeInsertIndexFromPointer(containerRef.current, event.clientY);
      const ordered = sortShiftsInCell(cellShifts).filter((shift) => shift.id !== shiftId);
      const beforeId = ordered[Math.min(Math.max(index, 0), ordered.length)]?.id;

      onDrop(shiftId, day, row.id, beforeId);
    },
    [cellShifts, day, onDrop, readOnly, row.id]
  );

  let staticSlot = 0;

  return (
    <div
      ref={containerRef}
      onDragOver={handleCellDragOver}
      onDrop={handleCellDrop}
      className={`flex flex-col gap-0.5 ${className}`}
    >
      {sortedShifts.map((shift) => {
        const isDragged = shift.id === draggingId;
        const nodes: ReactNode[] = [];

        if (!isDragged && previewInsertIndex === staticSlot) {
          nodes.push(<DropPlaceholder key={`placeholder-${shift.id}`} height={placeholderHeight} />);
        }

        nodes.push(
          <div
            key={shift.id}
            data-shift-slot
            data-shift-id={shift.id}
          >
            <ShiftCard
              shift={shift}
              compact={compact}
              readOnly={readOnly}
              isDragging={isDragged}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onResize={onResize}
              onEdit={onEditShift}
            />
          </div>
        );

        if (!isDragged) staticSlot += 1;
        return <Fragment key={shift.id}>{nodes}</Fragment>;
      })}

      {previewInsertIndex === staticSlotCount && previewInsertIndex !== undefined && draggingId && (
        <DropPlaceholder height={placeholderHeight} />
      )}

      {cellShifts.length === 0 && onCreateInCell && !readOnly && (
        <button
          type="button"
          onClick={() => onCreateInCell(day, row.id)}
          style={{ minHeight: getEmptyCellMinHeightForShiftType(row) }}
          className="w-full rounded-md border border-dashed border-stone-300/40 md:border-stone-300/0 hover:border-stone-400/40 hover:bg-stone-50/80 text-stone-400 md:text-transparent hover:text-stone-400 text-xs transition-all md:opacity-0 md:group-hover/cell:opacity-100 touch-target"
        >
          + 추가
        </button>
      )}
    </div>
  );
}
