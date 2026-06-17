import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AdminUnlockDialog } from '@/components/auth/AdminUnlockDialog';
import {
  ADMIN_LOCK_CHANGED_EVENT,
  isAdminUnlocked,
  lockAdmin,
} from '@/lib/adminLockSession';

interface AdminLockContextValue {
  unlocked: boolean;
  lock: () => void;
  openUnlockDialog: (onUnlocked?: () => void) => void;
  requireUnlock: (onUnlocked?: () => void) => boolean;
}

const AdminLockContext = createContext<AdminLockContextValue | null>(null);

export function AdminLockProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const sync = () => setUnlocked(isAdminUnlocked());
    window.addEventListener(ADMIN_LOCK_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ADMIN_LOCK_CHANGED_EVENT, sync);
  }, []);

  const lock = useCallback(() => {
    lockAdmin();
  }, []);

  const openUnlockDialog = useCallback((onUnlocked?: () => void) => {
    pendingActionRef.current = onUnlocked ?? null;
    setDialogOpen(true);
  }, []);

  const requireUnlock = useCallback(
    (onUnlocked?: () => void): boolean => {
      if (isAdminUnlocked()) {
        onUnlocked?.();
        return true;
      }
      openUnlockDialog(onUnlocked);
      return false;
    },
    [openUnlockDialog]
  );

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

  const handleUnlocked = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const value = useMemo(
    () => ({
      unlocked,
      lock,
      openUnlockDialog,
      requireUnlock,
    }),
    [unlocked, lock, openUnlockDialog, requireUnlock]
  );

  return (
    <AdminLockContext.Provider value={value}>
      {children}
      <AdminUnlockDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onUnlocked={handleUnlocked}
      />
    </AdminLockContext.Provider>
  );
}

export function useAdminLockContext(): AdminLockContextValue {
  const ctx = useContext(AdminLockContext);
  if (!ctx) {
    throw new Error('useAdminLockContext must be used within AdminLockProvider');
  }
  return ctx;
}
