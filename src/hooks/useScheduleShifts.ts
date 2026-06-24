import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { dateToScheduleParts, isDateWithinScheduleRange, shiftMatchesDay } from '@/lib/scheduleViewRange';
import { isScheduleDateAllowed } from '@/lib/scheduleDateRange';

function filterVisibleShifts(shifts: ScheduleShift[], visibleDays: Date[]): ScheduleShift[] {
  if (visibleDays.length === 0) return [];
  return shifts.filter((shift) => visibleDays.some((day) => shiftMatchesDay(shift, day)));
}

export function useScheduleShifts(visibleDays: Date[]) {
  const daySignature = useMemo(
    () => visibleDays.map((day) => day.toISOString().slice(0, 10)).join('|'),
    [visibleDays]
  );

  const [shifts, setShifts] = useState<ScheduleShift[]>(() =>
    filterVisibleShifts(getScheduleShifts(), visibleDays)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ShiftModalMode | null>(null);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    year: number;
    month: number;
    day: number;
    rowId: ShiftRowId;
  } | null>(null);

  const refresh = useCallback(() => {
    setShifts(filterVisibleShifts(getScheduleShifts(), visibleDays));
  }, [daySignature, visibleDays]);

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
    (
      shiftId: string,
      targetDate: Date,
      rowId: ShiftRowId,
      insertBeforeShiftId?: string
    ) => {
      if (!isDateWithinScheduleRange(targetDate)) return;
      const { year, month, day } = dateToScheduleParts(targetDate);
      const updated = moveShiftInStorage(
        shiftId,
        day,
        rowId,
        year,
        month,
        insertBeforeShiftId ?? null
      );
      setShifts(filterVisibleShifts(updated, visibleDays));
      setDraggingId(null);
      setDropTarget(null);
    },
    [visibleDays]
  );

  const handleResize = useCallback(
    (shiftId: string, deltaHours: number) => {
      const updated = resizeShiftInStorage(shiftId, deltaHours);
      setShifts(filterVisibleShifts(updated, visibleDays));
    },
    [visibleDays]
  );

  const openCreate = useCallback((defaults?: { targetDate: Date; rowId: ShiftRowId }) => {
    const targetDate = defaults?.targetDate ?? new Date();
    const parts = dateToScheduleParts(targetDate);
    setModalMode('create');
    setEditingShift(null);
    setCreateDefaults({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      rowId: defaults?.rowId ?? getShiftTypes()[0]?.id ?? 'morning',
    });
  }, []);

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
        setShifts(filterVisibleShifts(updated, visibleDays));
      } else if (modalMode === 'edit' && editingShift) {
        const updated = updateShiftInStorage(editingShift.id, input);
        setShifts(filterVisibleShifts(updated, visibleDays));
      }
      closeModal();
    },
    [modalMode, editingShift, visibleDays, closeModal]
  );

  const handleDelete = useCallback(() => {
    if (!editingShift) return;
    const updated = deleteShiftInStorage(editingShift.id);
    setShifts(filterVisibleShifts(updated, visibleDays));
    closeModal();
  }, [editingShift, visibleDays, closeModal]);

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
    refresh,
  };
}
