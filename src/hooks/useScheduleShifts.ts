import { useState, useCallback, useEffect } from 'react';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';
import {
  getScheduleShifts,
  getShiftTypes,
  moveShift as moveShiftInStorage,
  resizeShift as resizeShiftInStorage,
  createShift as createShiftInStorage,
  updateShift as updateShiftInStorage,
  deleteShift as deleteShiftInStorage,
  type ShiftInput,
} from '@/lib/storage';
import { EMPLOYEES_CHANGED_EVENT } from '@/lib/employees';
import { DATA_SYNC_CHANGED_EVENT, SCHEDULES_CHANGED_EVENT } from '@/lib/dataStore';
import type { ShiftModalMode } from '@/components/schedule/ShiftModal';
import { isScheduleDateAllowed } from '@/lib/scheduleDateRange';

function filterMonth(shifts: ScheduleShift[], year: number, month: number) {
  return shifts.filter((s) => s.year === year && s.month === month);
}

export function useScheduleShifts(year: number, month: number) {
  const [shifts, setShifts] = useState<ScheduleShift[]>(() =>
    getScheduleShifts(year, month)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ShiftModalMode | null>(null);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    day: number;
    rowId: ShiftRowId;
  } | null>(null);

  const refresh = useCallback(() => {
    setShifts(getScheduleShifts(year, month));
  }, [year, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(EMPLOYEES_CHANGED_EVENT, handler);
    window.addEventListener(SCHEDULES_CHANGED_EVENT, handler);
    window.addEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(EMPLOYEES_CHANGED_EVENT, handler);
      window.removeEventListener(SCHEDULES_CHANGED_EVENT, handler);
      window.removeEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    };
  }, [refresh]);

  const handleDragStart = useCallback((shiftId: string) => {
    setDraggingId(shiftId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((cellKey: string) => {
    setDropTarget(cellKey || null);
  }, []);

  const handleDrop = useCallback(
    (shiftId: string, day: number, rowId: ShiftRowId) => {
      if (!isScheduleDateAllowed(year, month, day)) return;
      const updated = moveShiftInStorage(shiftId, day, rowId, year, month);
      setShifts(filterMonth(updated, year, month));
      setDraggingId(null);
      setDropTarget(null);
    },
    [year, month]
  );

  const handleResize = useCallback(
    (shiftId: string, deltaHours: number) => {
      const updated = resizeShiftInStorage(shiftId, deltaHours);
      setShifts(filterMonth(updated, year, month));
    },
    [year, month]
  );

  const openCreate = useCallback(
    (defaults?: { day: number; rowId: ShiftRowId }) => {
      setModalMode('create');
      setEditingShift(null);
      setCreateDefaults(
        defaults ?? {
          day: new Date().getDate(),
          rowId: getShiftTypes()[0]?.id ?? 'morning',
        }
      );
    },
    []
  );

  const openEdit = useCallback((shift: ScheduleShift) => {
    setModalMode('edit');
    setEditingShift(shift);
    setCreateDefaults(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditingShift(null);
    setCreateDefaults(null);
  }, []);

  const handleSave = useCallback(
    (input: ShiftInput) => {
      if (!isScheduleDateAllowed(input.year, input.month, input.day)) return;
      if (modalMode === 'create') {
        const updated = createShiftInStorage(input);
        setShifts(filterMonth(updated, year, month));
      } else if (modalMode === 'edit' && editingShift) {
        const updated = updateShiftInStorage(editingShift.id, input);
        setShifts(filterMonth(updated, year, month));
      }
      closeModal();
    },
    [modalMode, editingShift, year, month, closeModal]
  );

  const handleDelete = useCallback(() => {
    if (!editingShift) return;
    const updated = deleteShiftInStorage(editingShift.id);
    setShifts(filterMonth(updated, year, month));
    closeModal();
  }, [editingShift, year, month, closeModal]);

  return {
    shifts,
    draggingId,
    dropTarget,
    modalMode,
    editingShift,
    createDefaults,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleResize,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
  };
}
