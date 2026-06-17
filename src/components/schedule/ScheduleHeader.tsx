import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export type ViewMode = 'monthly' | 'weekly' | 'daily';

interface ScheduleHeaderProps {
  year: number;
  month: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onToday: () => void;
  onCreateShift: () => void;
  onBatchDelete?: () => void;
  readOnly?: boolean;
}

export function ScheduleHeader({
  year,
  month,
  viewMode,
  onViewModeChange,
  onPrevMonth,
  onNextMonth,
  canGoPrev = true,
  canGoNext = true,
  onToday,
  onCreateShift,
  onBatchDelete,
  readOnly = false,
}: ScheduleHeaderProps) {
  return (
    <header className="page-header px-4 py-4 md:px-6 shrink-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden md:block">
            <h1 className="heading-display text-lg md:text-xl">근무 스케줄</h1>
            <p className="text-sm text-stone-500 mt-0.5 font-light">
              {year}년 {month}월
            </p>
          </div>
          <p className="md:hidden text-sm font-medium text-stone-600">
            {year}년 {month}월
          </p>

          <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 self-start">
            <button
              onClick={onPrevMonth}
              disabled={!canGoPrev}
              className="btn-ghost touch-target disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={18} />
            </button>
            <button onClick={onToday} className="btn-secondary text-xs md:text-sm touch-target">
              오늘
            </button>
            <button
              onClick={onNextMonth}
              disabled={!canGoNext}
              className="btn-ghost touch-target disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="segment-control w-full sm:w-auto overflow-x-auto">
            {(['monthly', 'weekly', 'daily'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`segment-item touch-segment shrink-0 ${
                  viewMode === mode ? 'segment-item-active' : ''
                }`}
              >
                {mode === 'monthly' ? '월간' : mode === 'weekly' ? '주간' : '일간'}
              </button>
            ))}
          </div>

          {!readOnly && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {onBatchDelete && (
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto touch-target justify-center text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={onBatchDelete}
              >
                <Trash2 size={16} strokeWidth={2} />
                일괄 삭제
              </button>
            )}
            <button className="btn-primary w-full sm:w-auto touch-target justify-center" onClick={onCreateShift}>
              <Plus size={16} strokeWidth={2} />
              근무 추가
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
