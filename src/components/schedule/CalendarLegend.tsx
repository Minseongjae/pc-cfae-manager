import {
  EMPLOYEE_COLOR_LABELS,
  EMPLOYEE_SWATCH_CLASSES,
  type EmployeeColorCategory,
} from '@/lib/employeeColors';

const LEGEND_ITEMS: EmployeeColorCategory[] = [
  'store-manager',
  'manager',
  'staff',
  'part-time',
  'off',
  'vacation',
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-[10px] md:text-xs text-stone-500">
      <span className="font-medium text-stone-600 shrink-0">직원 색상</span>
      {LEGEND_ITEMS.map((category) => (
        <span key={category} className="inline-flex items-center gap-1.5 shrink-0">
          <span
            className={`w-3 h-3 rounded border ${EMPLOYEE_SWATCH_CLASSES[category]}`}
          />
          {EMPLOYEE_COLOR_LABELS[category]}
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
