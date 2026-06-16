import { useState } from 'react';

import { ScheduleHeader, type ViewMode } from '@/components/schedule/ScheduleHeader';

import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar';

import { ShiftModal } from '@/components/schedule/ShiftModal';

import { useScheduleShifts } from '@/hooks/useScheduleShifts';

import {

  canGoNextScheduleMonth,

  canGoPrevScheduleMonth,

} from '@/lib/scheduleDateRange';



export function SchedulePage() {

  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());

  const [month, setMonth] = useState(now.getMonth() + 1);

  const [viewMode, setViewMode] = useState<ViewMode>('monthly');



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

  } = useScheduleShifts(year, month);



  const goToPrevMonth = () => {

    if (!canGoPrevScheduleMonth(year, month)) return;

    if (month === 1) {

      setYear((y) => y - 1);

      setMonth(12);

    } else {

      setMonth((m) => m - 1);

    }

  };



  const goToNextMonth = () => {

    if (!canGoNextScheduleMonth(year, month)) return;

    if (month === 12) {

      setYear((y) => y + 1);

      setMonth(1);

    } else {

      setMonth((m) => m + 1);

    }

  };



  const goToToday = () => {

    const today = new Date();

    setYear(today.getFullYear());

    setMonth(today.getMonth() + 1);

  };



  return (

    <div className="flex flex-col h-full overflow-hidden">

      <ScheduleHeader

        year={year}

        month={month}

        viewMode={viewMode}

        onViewModeChange={setViewMode}

        onPrevMonth={goToPrevMonth}

        onNextMonth={goToNextMonth}

        canGoPrev={canGoPrevScheduleMonth(year, month)}

        canGoNext={canGoNextScheduleMonth(year, month)}

        onToday={goToToday}

        onCreateShift={() => openCreate()}

      />

      {viewMode === 'monthly' && (

        <ScheduleCalendar

          year={year}

          month={month}

          shifts={shifts}

          draggingId={draggingId}

          dropTarget={dropTarget}

          onDragStart={handleDragStart}

          onDragEnd={handleDragEnd}

          onDragOver={handleDragOver}

          onDrop={handleDrop}

          onResize={handleResize}

          onEditShift={openEdit}

          onCreateInCell={(day, rowId) => openCreate({ day, rowId })}

        />

      )}

      {viewMode === 'weekly' && (

        <div className="flex-1 flex items-center justify-center">

          <p className="text-stone-400 text-sm font-light">주간 보기 — 준비 중</p>

        </div>

      )}

      {viewMode === 'daily' && (

        <div className="flex-1 flex items-center justify-center">

          <p className="text-stone-400 text-sm font-light">일간 보기 — 준비 중</p>

        </div>

      )}



      {modalMode && (

        <ShiftModal

          mode={modalMode}

          shift={editingShift}

          year={year}

          month={month}

          defaultDay={createDefaults?.day}

          defaultRowId={createDefaults?.rowId}

          onSave={handleSave}

          onDelete={modalMode === 'edit' ? handleDelete : undefined}

          onClose={closeModal}

        />

      )}

    </div>

  );

}


