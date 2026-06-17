import { useRef, useCallback, useMemo } from 'react';
import { useDragGuard } from '@/contexts/DragGuardContext';
import type { ScheduleShift } from '@/data/mockSchedule';
import { getShiftCardColorClass } from '@/lib/shiftDisplay';
import { findEmployeeByShiftName } from '@/lib/payroll';
import { useEmployees } from '@/contexts/EmployeesContext';
import { GripHorizontal } from 'lucide-react';

interface ShiftCardProps {
  shift: ScheduleShift;
  isDragging?: boolean;
  readOnly?: boolean;
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
  onDragStart,
  onDragEnd,
  onResize,
  onEdit,
}: ShiftCardProps) {
  const { beginDrag, endDrag } = useDragGuard();
  const { employees } = useEmployees();
  const colorClass = useMemo(() => {
    const employee = findEmployeeByShiftName(employees, shift.name);
    return getShiftCardColorClass(
      shift,
      employee ? { position: employee.position, status: employee.status } : undefined
    );
  }, [employees, shift]);
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
      className={`group relative rounded-xl border shadow-sm px-3 py-2.5 text-xs leading-snug select-none transition-all duration-200 ${colorClass} ${
        readOnly
          ? 'cursor-default'
          : 'cursor-pointer'
      } ${
        isDragging ? 'opacity-50 scale-95 shadow-none' : `opacity-100 ${readOnly ? '' : 'hover:shadow-md hover:-translate-y-0.5'}`
      }`}
    >
      {!readOnly && (
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
      <div className="font-semibold text-sm tracking-tight pr-4 truncate">{shift.name}</div>
      <div className="mt-1 font-medium opacity-90 text-[11px] md:text-xs">
        {shift.startTime} – {shift.endTime}
      </div>
      <div className="opacity-75 text-[10px] md:text-[11px] mt-0.5">{shift.duration}h</div>

      {!readOnly && (
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
