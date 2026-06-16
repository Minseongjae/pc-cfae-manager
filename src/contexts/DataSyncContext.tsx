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
  DATA_SYNC_CHANGED_EVENT,
  forceSyncNow,
  getSyncState,
} from '@/lib/dataStore';
import type { SyncState } from '@/lib/dataStore';

interface DataSyncContextValue extends SyncState {
  refresh: () => void;
  forceSync: () => Promise<void>;
}

const DataSyncContext = createContext<DataSyncContextValue | null>(null);

export function DataSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SyncState>(() => getSyncState());

  const refresh = useCallback(() => {
    setState(getSyncState());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(DATA_SYNC_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_SYNC_CHANGED_EVENT, handler);
  }, [refresh]);

  const forceSync = useCallback(async () => {
    await forceSyncNow();
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      forceSync,
    }),
    [state, refresh, forceSync]
  );

  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
}

export function useDataSync(): DataSyncContextValue {
  const ctx = useContext(DataSyncContext);
  if (!ctx) {
    throw new Error('useDataSync must be used within DataSyncProvider');
  }
  return ctx;
}
