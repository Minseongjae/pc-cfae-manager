import { useMemo } from 'react';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getEmployeeSwatchStyle,
  resolveEmployeeScheduleColor,
} from '@/lib/employeeColors';
import { normalizeHexColor } from '@/lib/scheduleShiftTypes';
import { useScheduleShiftTypes } from '@/hooks/useScheduleShiftTypes';

export function CalendarLegend({ compact = false }: { compact?: boolean }) {
  const { employees } = useEmployees();
  const { settings } = useSettings();
  const shiftTypes = useScheduleShiftTypes();
  const colorMode = settings.schedule.scheduleColorMode ?? 'employee';
  const employeeColors = settings.schedule.employeeScheduleColors;

  const legendEmployees = useMemo(
    () =>
      employees
        .filter((employee) => employee.status !== 'resigned')
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [employees, employeeColors, settings.positions]
  );

  const legendShiftTypes = useMemo(
    () => [...shiftTypes].sort((a, b) => a.sortOrder - b.sortOrder),
    [shiftTypes]
  );

  if (colorMode === 'shiftType') {
    if (compact) {
      return (
        <div className="flex items-center gap-2 overflow-x-auto px-1 py-1 text-[10px] text-stone-500">
          {legendShiftTypes.slice(0, 5).map((shiftType) => (
            <span key={shiftType.id} className="inline-flex items-center gap-1 shrink-0">
              <span
                className="w-2.5 h-2.5 rounded border"
                style={{
                  backgroundColor: `${normalizeHexColor(shiftType.color)}22`,
                  borderColor: normalizeHexColor(shiftType.color),
                }}
              />
              {shiftType.name}
            </span>
          ))}
          {legendShiftTypes.length > 5 && (
            <span className="text-stone-400 shrink-0">+{legendShiftTypes.length - 5}</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-[10px] md:text-xs text-stone-500">
        <span className="font-medium text-stone-600 shrink-0">근무유형 색상</span>
        {legendShiftTypes.map((shiftType) => (
          <span key={shiftType.id} className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className="w-3 h-3 rounded border"
              style={{
                backgroundColor: `${normalizeHexColor(shiftType.color)}22`,
                borderColor: normalizeHexColor(shiftType.color),
              }}
            />
            {shiftType.name}
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

  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto px-1 py-1 text-[10px] text-stone-500">
        {legendEmployees.slice(0, 5).map((employee) => {
          const color = resolveEmployeeScheduleColor(employee, settings.positions);
          return (
            <span key={employee.id} className="inline-flex items-center gap-1 shrink-0">
              <span
                className="w-2.5 h-2.5 rounded border"
                style={{
                  backgroundColor: `${normalizeHexColor(color)}22`,
                  borderColor: normalizeHexColor(color),
                }}
              />
              {employee.name}
            </span>
          );
        })}
        {legendEmployees.length > 5 && (
          <span className="text-stone-400 shrink-0">+{legendEmployees.length - 5}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 text-[10px] md:text-xs text-stone-500">
      <span className="font-medium text-stone-600 shrink-0">직원 색상</span>
      {legendEmployees.map((employee) => {
        const color = resolveEmployeeScheduleColor(employee, settings.positions);
        return (
          <span key={employee.id} className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className="w-3 h-3 rounded border"
              style={getEmployeeSwatchStyle(color)}
            />
            {employee.name}
          </span>
        );
      })}
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
