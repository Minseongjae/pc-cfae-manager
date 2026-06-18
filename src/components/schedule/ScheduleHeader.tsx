import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export type ViewMode = 'monthly' | 'weekly' | 'daily';

interface ScheduleHeaderProps {
  periodLabel: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevPeriod: () => void;
  onNextPeriod: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onToday: () => void;
  onCreateShift: () => void;
  onBatchDelete?: () => void;
  readOnly?: boolean;
}

export function ScheduleHeader({
  periodLabel,
  viewMode,
  onViewModeChange,
  onPrevPeriod,
  onNextPeriod,
  canGoPrev = true,
  canGoNext = true,
  onToday,
  onCreateShift,
  onBatchDelete,
  readOnly = false,
}: ScheduleHeaderProps) {
  return (
    <header className="page-header px-3 py-3 md:px-6 md:py-4 shrink-0">
      <div className="flex flex-col gap-2.5 md:gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="hidden md:block heading-display text-lg md:text-xl">근무 스케줄</h1>
            <p className="text-sm font-medium text-stone-700 md:text-stone-500 md:font-light truncate">
              {periodLabel}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={onPrevPeriod}
              disabled={!canGoPrev}
              className="btn-ghost touch-target disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={onToday} className="btn-secondary text-xs touch-target px-2.5">
              오늘
            </button>
            <button
              type="button"
              onClick={onNextPeriod}
              disabled={!canGoNext}
              className="btn-ghost touch-target disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="segment-control flex-1 min-w-0 overflow-x-auto">
            {(['monthly', 'weekly', 'daily'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`segment-item touch-segment shrink-0 text-xs md:text-sm ${
                  viewMode === mode ? 'segment-item-active' : ''
                }`}
              >
                {mode === 'monthly' ? '월간' : mode === 'weekly' ? '주간' : '일간'}
              </button>
            ))}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1.5 shrink-0">
              {onBatchDelete && (
                <button
                  type="button"
                  className="btn-secondary touch-target p-2.5 text-rose-700 border-rose-200 md:px-3 md:py-2"
                  onClick={onBatchDelete}
                  aria-label="일괄 삭제"
                >
                  <Trash2 size={16} strokeWidth={2} />
                  <span className="hidden md:inline ml-1.5 text-sm">일괄 삭제</span>
                </button>
              )}
              <button
                type="button"
                className="btn-primary touch-target p-2.5 md:px-3 md:py-2"
                onClick={onCreateShift}
                aria-label="근무 추가"
              >
                <Plus size={16} strokeWidth={2} />
                <span className="hidden md:inline ml-1.5 text-sm">근무 추가</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
