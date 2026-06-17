import {
  SHIFT_CATEGORY_LABELS,
  SHIFT_CATEGORY_SWATCHES,
  type ShiftDisplayCategory,
} from '@/lib/shiftDisplay';

const LEGEND_ITEMS: ShiftDisplayCategory[] = [
  'morning',
  'afternoon',
  'closing',
  'off',
  'vacation',
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-[10px] md:text-xs text-stone-500">
      <span className="font-medium text-stone-600 shrink-0">근무 색상</span>
      {LEGEND_ITEMS.map((category) => (
        <span key={category} className="inline-flex items-center gap-1.5 shrink-0">
          <span
            className={`w-3 h-3 rounded border ${SHIFT_CATEGORY_SWATCHES[category]}`}
          />
          {SHIFT_CATEGORY_LABELS[category]}
        </span>
      ))}
      <span className="hidden sm:inline text-stone-300">|</span>
      <span className="inline-flex items-center gap-1 shrink-0 text-blue-600">토 파랑</span>
      <span className="inline-flex items-center gap-1 shrink-0 text-rose-600">일·공휴일 빨강</span>
      <span className="inline-flex items-center gap-1 shrink-0">
        <span className="w-3 h-3 rounded-full bg-stone-800" />
        오늘
      </span>
    </div>
  );
}
