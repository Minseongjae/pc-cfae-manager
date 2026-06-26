import { useRef, useCallback, useMemo } from 'react';
import { useDragGuard } from '@/contexts/DragGuardContext';
import type { ScheduleShift } from '@/data/mockSchedule';
import { getShiftCardColorClass, getShiftCardStyle } from '@/lib/shiftDisplay';
import { formatWorkedHoursDisplay, getShiftWorkedHours } from '@/lib/shiftUtils';
import { findEmployeeByShiftName } from '@/lib/payroll';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useSettings } from '@/contexts/SettingsContext';
import { findShiftTypeById, useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';
import { GripHorizontal } from 'lucide-react';

interface ShiftCardProps {
  shift: ScheduleShift;
  isDragging?: boolean;
  readOnly?: boolean;
  compact?: boolean;
  onDragStart: (shiftId: string) => void;
  onDragEnd: () => void;
  onResize: (shiftId: string, deltaHours: number) => void;
  onEdit: (shift: ScheduleShift) => void;
}

const RESIZE_PX_PER_HOUR = 18;
const CLICK_MOVE_THRESHOLD = 5;

export function ShiftCard({
  shift,
  isDragging,
  readOnly = false,
  compact = false,
  onDragStart,
  onDragEnd,
  onResize,
  onEdit,
}: ShiftCardProps) {
  const { beginDrag, endDrag } = useDragGuard();
  const { employees } = useEmployees();
  const { settings } = useSettings();
  const shiftTypes = useScheduleShiftTypes();
  const { colorClass, cardStyle, workedHours } = useMemo(() => {
    const employee = findEmployeeByShiftName(employees, shift.name);
    const shiftType = findShiftTypeById(shiftTypes, shift.rowId);
    const hours = getShiftWorkedHours(shift);
    return {
      colorClass: getShiftCardColorClass(
        shift,
        employee ? { position: employee.position, status: employee.status } : undefined
      ),
      cardStyle: getShiftCardStyle(
        shift,
        shiftType,
        employee,
        settings.positions,
        settings.schedule.scheduleColorMode ?? 'employee',
        compact
      ),
      workedHours: hours,
    };
  }, [employees, shift, shiftTypes, settings.positions, settings.schedule.scheduleColorMode, compact]);
  const resizeRef = useRef<{ startY: number; accumulated: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      beginDrag();
      resizeRef.current = { startY: e.clientY, accumulated: 0 };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const deltaY = ev.clientY - resizeRef.current.startY;
        const hourDelta = Math.round(deltaY / RESIZE_PX_PER_HOUR) - resizeRef.current.accumulated;
        if (hourDelta !== 0) {
          onResize(shift.id, hourDelta);
          resizeRef.current.accumulated += hourDelta;
        }
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        endDrag();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [shift.id, onResize, beginDrag, endDrag]
  );

  const handlePointerDown = (event: React.PointerEvent) => {
    if (readOnly) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (readOnly) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx > CLICK_MOVE_THRESHOLD || dy > CLICK_MOVE_THRESHOLD) return;

    onEdit(shift);
  };

  return (
    <div
      draggable={!readOnly}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onDragStart={(e) => {
        if (readOnly) return;
        didDragRef.current = true;
        e.dataTransfer.setData('text/shift-id', shift.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        onDragStart(shift.id);
      }}
      onDragEnd={() => {
        onDragEnd();
        window.setTimeout(() => {
          didDragRef.current = false;
        }, 0);
      }}
      style={cardStyle}
      className={`group relative shrink-0 border select-none touch-none transition-[opacity,transform,box-shadow] duration-150 ease-out ${colorClass} ${
        compact ? 'rounded-md px-1 py-0.5 leading-tight' : 'rounded-md px-1.5 py-1 leading-snug'
      } ${
        readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'shadow-sm' : 'opacity-100'}`}
    >
      {!readOnly && !compact && (
      <div
        onMouseDown={handleResizeStart}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-2 right-2 h-2.5 flex items-center justify-center cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl"
        title="드래그하여 근무 시간 조절"
      >
        <GripHorizontal size={12} className="text-stone-400" />
      </div>
      )}
      <div className={`font-semibold tracking-tight truncate ${compact ? 'text-xs pr-0' : 'text-sm pr-2'}`}>
        {shift.name}
      </div>
      <div className={`font-medium truncate ${compact ? 'text-[11px] opacity-90' : 'text-xs opacity-90'}`}>
        {shift.startTime}–{shift.endTime}
        {!compact && (
          <span className="opacity-80"> · {formatWorkedHoursDisplay(workedHours)}h</span>
        )}
      </div>
    </div>
  );
}
