import { useMemo, useState } from 'react';
import { ScheduleHeader, type ViewMode } from '@/components/schedule/ScheduleHeader';
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';
import { ShiftModal } from '@/components/schedule/ShiftModal';
import { ScheduleBatchDeleteDialog } from '@/components/schedule/ScheduleBatchDeleteDialog';
import { useAdminLockContext } from '@/contexts/AdminLockContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useScheduleShifts } from '@/hooks/useScheduleShifts';
import {
  canNavigateScheduleNext,
  canNavigateSchedulePrev,
  dateToScheduleParts,
  getSchedulePeriodLabel,
  getVisibleDays,
  navigateScheduleAnchor,
} from '@/lib/scheduleViewRange';
import type { ScheduleShift, ShiftRowId } from '@/data/mockSchedule';

export function SchedulePage() {
  const { isAdmin, requireAdmin } = useAdminLockContext();
  const { settings } = useSettings();
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const prefersMobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    if (prefersMobile) return 'monthly';
    return settings.schedule.defaultView ?? 'monthly';
  });
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const weekStartsOn = settings.schedule.weekStartsOn ?? 1;
  const visibleDays = useMemo(
    () => getVisibleDays(anchorDate, viewMode, weekStartsOn),
    [anchorDate, viewMode, weekStartsOn]
  );

  const periodLabel = useMemo(
    () => getSchedulePeriodLabel(anchorDate, viewMode, weekStartsOn),
    [anchorDate, viewMode, weekStartsOn]
  );

  const { year, month } = dateToScheduleParts(anchorDate);

  const {
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
  } = useScheduleShifts(visibleDays);

  const goToPrevPeriod = () => {
    setAnchorDate((current) => navigateScheduleAnchor(current, viewMode, -1));
  };

  const goToNextPeriod = () => {
    setAnchorDate((current) => navigateScheduleAnchor(current, viewMode, 1));
  };

  const goToToday = () => {
    setAnchorDate(new Date());
  };

  const guardedCreate = (defaults?: { targetDate: Date; rowId: ShiftRowId }) => {
    requireAdmin(() => openCreate(defaults));
  };

  const guardedEdit = (shift: ScheduleShift) => {
    requireAdmin(() => openEdit(shift));
  };

  const guardedDrop = (shiftId: string, targetDate: Date, rowId: ShiftRowId) => {
    if (!isAdmin) return;
    handleDrop(shiftId, targetDate, rowId);
  };

  const guardedResize = (shiftId: string, deltaHours: number) => {
    if (!isAdmin) return;
    handleResize(shiftId, deltaHours);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!isAdmin && (
        <div className="px-3 pt-2 md:px-6 md:pt-3 shrink-0">
          <p className="text-[11px] md:text-xs text-stone-500 bg-stone-100/80 border border-stone-200 rounded-xl px-3 py-1.5 md:py-2">
            조회 전용 · 수정은 관리자 인증 필요
          </p>
        </div>
      )}

      <ScheduleHeader
        periodLabel={periodLabel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrevPeriod={goToPrevPeriod}
        onNextPeriod={goToNextPeriod}
        canGoPrev={canNavigateSchedulePrev(anchorDate, viewMode)}
        canGoNext={canNavigateScheduleNext(anchorDate, viewMode)}
        onToday={goToToday}
        onCreateShift={() => guardedCreate()}
        onBatchDelete={() => requireAdmin(() => setBatchDeleteOpen(true))}
        readOnly={!isAdmin}
      />

      <ScheduleCalendar
        days={visibleDays}
        weekStartsOn={weekStartsOn}
        shifts={shifts}
        draggingId={draggingId}
        dropTarget={dropTarget}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={guardedDrop}
        onResize={guardedResize}
        onEditShift={guardedEdit}
        onCreateInCell={(targetDate, rowId) => guardedCreate({ targetDate, rowId })}
        readOnly={!isAdmin}
      />

      {modalMode && isAdmin && (
        <ShiftModal
          mode={modalMode}
          shift={editingShift}
          year={createDefaults?.year ?? editingShift?.year ?? year}
          month={createDefaults?.month ?? editingShift?.month ?? month}
          defaultDay={createDefaults?.day}
          defaultRowId={createDefaults?.rowId}
          onSave={handleSave}
          onDelete={modalMode === 'edit' ? handleDelete : undefined}
          onClose={closeModal}
        />
      )}

      <ScheduleBatchDeleteDialog
        open={batchDeleteOpen}
        year={year}
        month={month}
        onClose={() => setBatchDeleteOpen(false)}
        onDeleted={refresh}
      />
    </div>
  );
}
