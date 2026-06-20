import { useRef, useCallback, useMemo } from 'react';
import { useDragGuard } from '@/contexts/DragGuardContext';
import type { ScheduleShift } from '@/data/mockSchedule';
import { getShiftCardColorClass, getShiftCardStyle } from '@/lib/shiftDisplay';
import { getShiftWorkedHours } from '@/lib/shiftUtils';
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
  const { colorClass, cardStyle, workedHours, cardScale } = useMemo(() => {
    const employee = findEmployeeByShiftName(employees, shift.name);
    const shiftType = findShiftTypeById(shiftTypes, shift.rowId);
    const hours = getShiftWorkedHours(shift);
    const scale = settings.schedule.scheduleCardScale ?? 88;
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
        compact,
        scale
      ),
      workedHours: hours,
      cardScale: scale,
    };
  }, [
    employees,
    shift,
    shiftTypes,
    settings.positions,
    settings.schedule.scheduleColorMode,
    settings.schedule.scheduleCardScale,
    compact,
  ]);
  const resizeRef = useRef<{ startY: number; accumulated: number } | null>(null);
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

  const handleClick = () => {
    if (readOnly) return;
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    onEdit(shift);
  };

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => {
        if (readOnly) return;
        didDragRef.current = true;
        e.dataTransfer.setData('text/shift-id', shift.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(shift.id);
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => {
          didDragRef.current = false;
        }, 100);
      }}
      onClick={handleClick}
      style={cardStyle}
      className={`group relative shrink-0 border select-none ${colorClass} ${
        compact ? 'rounded-md px-1 py-0.5 leading-tight' : 'rounded-md px-1.5 py-1 leading-snug'
      } ${
        readOnly ? 'cursor-default' : 'cursor-pointer'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      {!readOnly && !compact && (
      <div
        className="absolute top-1 right-1 w-4 h-4 rounded opacity-0 group-hover:opacity-60 cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          didDragRef.current = true;
          e.dataTransfer.setData('text/shift-id', shift.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(shift.id);
        }}
        title="드래그하여 이동"
      />
      )}
      <div
        className={`font-semibold tracking-tight truncate ${compact ? 'pr-0' : 'pr-2'}`}
        style={{ fontSize: compact ? `${Math.round(12 * cardScale / 100)}px` : `${Math.round(14 * cardScale / 100)}px` }}
      >
        {shift.name}
      </div>
      <div
        className="font-medium truncate opacity-90"
        style={{ fontSize: compact ? `${Math.round(11 * cardScale / 100)}px` : `${Math.round(12 * cardScale / 100)}px` }}
      >
        {shift.startTime}–{shift.endTime}
        {!compact && (
          <span className="opacity-80"> · {Math.round(workedHours)}h</span>
        )}
      </div>

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
    </div>
  );
}
