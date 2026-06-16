import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clockInActualWork,
  clockOutActualWork,
  getActualWorkRecords,
  saveManualActualWorkEdit,
  syncActualWorkForDate,
} from '@/lib/storage';
import { ACTUAL_WORK_CHANGED_EVENT } from '@/lib/actualWork';
import type { ActualWorkRecord } from '@/lib/actualWork';
import { ActualWorkEditModal } from '@/components/actual-work/ActualWorkEditModal';

interface ActualWorkContextValue {
  records: ActualWorkRecord[];
  version: number;
  selectedDate: { year: number; month: number; day: number };
  setSelectedDate: (year: number, month: number, day: number) => void;
  syncFromSchedule: () => void;
  clockIn: (recordId: string) => void;
  clockOut: (recordId: string) => void;
  openEdit: (record: ActualWorkRecord) => void;
  refresh: () => void;
}

const ActualWorkContext = createContext<ActualWorkContextValue | null>(null);

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ActualWorkProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [selectedDate, setSelectedDateState] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
  const [records, setRecords] = useState<ActualWorkRecord[]>([]);
  const [version, setVersion] = useState(0);
  const [editingRecord, setEditingRecord] = useState<ActualWorkRecord | null>(null);

  const dateKey = toDateKey(selectedDate.year, selectedDate.month, selectedDate.day);

  const refresh = useCallback(() => {
    setRecords(getActualWorkRecords(dateKey));
    setVersion((v) => v + 1);
  }, [dateKey]);

  const syncFromSchedule = useCallback(() => {
    setRecords(
      syncActualWorkForDate(selectedDate.year, selectedDate.month, selectedDate.day)
    );
    setVersion((v) => v + 1);
  }, [selectedDate.year, selectedDate.month, selectedDate.day]);

  useEffect(() => {
    syncFromSchedule();
  }, [syncFromSchedule]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(ACTUAL_WORK_CHANGED_EVENT, handler);
    return () => window.removeEventListener(ACTUAL_WORK_CHANGED_EVENT, handler);
  }, [refresh]);

  const setSelectedDate = useCallback((year: number, month: number, day: number) => {
    setSelectedDateState({ year, month, day });
  }, []);

  const clockIn = useCallback(
    (recordId: string) => {
      clockInActualWork(recordId);
      refresh();
    },
    [refresh]
  );

  const clockOut = useCallback(
    (recordId: string) => {
      clockOutActualWork(recordId);
      refresh();
    },
    [refresh]
  );

  const openEdit = useCallback((record: ActualWorkRecord) => {
    setEditingRecord(record);
  }, []);

  const closeEdit = useCallback(() => {
    setEditingRecord(null);
  }, []);

  const saveManualEdit = useCallback(
    (
      actualStart: string | null,
      actualEnd: string | null,
      modificationReason: string
    ) => {
      if (!editingRecord) return;
      saveManualActualWorkEdit(
        editingRecord.id,
        actualStart,
        actualEnd,
        modificationReason
      );
      setEditingRecord(null);
      refresh();
    },
    [editingRecord, refresh]
  );

  const value = useMemo(
    () => ({
      records,
      version,
      selectedDate,
      setSelectedDate,
      syncFromSchedule,
      clockIn,
      clockOut,
      openEdit,
      refresh,
    }),
    [
      records,
      version,
      selectedDate,
      setSelectedDate,
      syncFromSchedule,
      clockIn,
      clockOut,
      openEdit,
      refresh,
    ]
  );

  return (
    <ActualWorkContext.Provider value={value}>
      {children}
      {editingRecord && (
        <ActualWorkEditModal
          record={editingRecord}
          onSave={saveManualEdit}
          onClose={closeEdit}
        />
      )}
    </ActualWorkContext.Provider>
  );
}

export function useActualWork(): ActualWorkContextValue {
  const ctx = useContext(ActualWorkContext);
  if (!ctx) {
    throw new Error('useActualWork must be used within ActualWorkProvider');
  }
  return ctx;
}

export function useActualWorkVersion(): number {
  const ctx = useContext(ActualWorkContext);
  return ctx?.version ?? 0;
}
