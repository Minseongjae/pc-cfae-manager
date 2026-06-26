import { useEffect, useState } from 'react';
import { SETTINGS_CHANGED_EVENT } from '@/lib/appSettings';
import { sortShiftTypes } from '@/lib/scheduleShiftTypes';
import { getShiftTypes } from '@/lib/storage';
import type { ShiftType } from '@/types';

export function useScheduleShiftTypes(): ShiftType[] {
  const [types, setTypes] = useState<ShiftType[]>(() => loadShiftTypes());

  useEffect(() => {
    const sync = () => setTypes(loadShiftTypes());
    window.addEventListener(SETTINGS_CHANGED_EVENT, sync);
    window.addEventListener('schedules-changed', sync);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, sync);
      window.removeEventListener('schedules-changed', sync);
    };
  }, []);

  return types;
}

function loadShiftTypes(): ShiftType[] {
  return sortShiftTypes(getShiftTypes());
}

export function findShiftTypeById(
  types: ShiftType[],
  rowId: string
): ShiftType | undefined {
  return types.find((type) => type.id === rowId);
}
