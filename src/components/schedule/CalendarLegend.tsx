import { useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';
import { normalizeHexColor } from '@/lib/scheduleShiftTypes';

export function CalendarLegend({ compact = false }: { compact?: boolean }) {
  const shiftTypes = useScheduleShiftTypes();

  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-1 py-1 text-[10px] text-stone-500">
        {shiftTypes.slice(0, 4).map((type) => (
          <span key={type.id} className="inline-flex items-center gap-1 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded border"
              style={{
                backgroundColor: `${normalizeHexColor(type.color)}22`,
                borderColor: normalizeHexColor(type.color),
              }}
            />
            {type.name}
          </span>
        ))}
        {shiftTypes.length > 4 && (
          <span className="text-stone-400 shrink-0">+{shiftTypes.length - 4}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-[10px] md:text-xs text-stone-500">
      <span className="font-medium text-stone-600 shrink-0">근무유형</span>
      {shiftTypes.map((type) => (
        <span key={type.id} className="inline-flex items-center gap-1.5 shrink-0">
          <span
            className="w-3 h-3 rounded border"
            style={{
              backgroundColor: `${normalizeHexColor(type.color)}22`,
              borderColor: normalizeHexColor(type.color),
            }}
          />
          {type.name}
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
