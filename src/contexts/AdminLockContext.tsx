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
  ADMIN_SESSION_HOURS,
  getAdminSessionExpiresAt,
  isAdminUnlocked,
  lockAdmin,
} from '@/lib/adminLockSession';
import { requiresPageAuth, usesBlurGate } from '@/lib/pageAccess';
import type { PageId } from '@/types';

interface AdminLockContextValue {
  unlocked: boolean;
  sessionExpiresAt: Date | null;
  logout: () => void;
  openUnlockDialog: (onUnlocked?: () => void) => void;
  requireUnlock: (onUnlocked?: () => void) => boolean;
  requestPageNavigation: (pageId: PageId, navigate: () => void) => void;
}

const AdminLockContext = createContext<AdminLockContextValue | null>(null);

function readUnlockedState(): boolean {
  return isAdminUnlocked();
}

export function AdminLockProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(readUnlockedState);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(() =>
    getAdminSessionExpiresAt()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const sync = useCallback(() => {
    setUnlocked(readUnlockedState());
    setSessionExpiresAt(getAdminSessionExpiresAt());
  }, []);

  useEffect(() => {
    window.addEventListener(ADMIN_LOCK_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ADMIN_LOCK_CHANGED_EVENT, sync);
  }, [sync]);

  useEffect(() => {
    const timer = window.setInterval(sync, 60_000);
    return () => window.clearInterval(timer);
  }, [sync]);

  const logout = useCallback(() => {
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

  const requestPageNavigation = useCallback(
    (pageId: PageId, navigate: () => void) => {
      if (!requiresPageAuth(pageId) || isAdminUnlocked()) {
        navigate();
        return;
      }
      if (usesBlurGate(pageId)) {
        navigate();
        return;
      }
      openUnlockDialog(navigate);
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
    sync();
    action?.();
  }, [sync]);

  const value = useMemo(
    () => ({
      unlocked,
      sessionExpiresAt,
      logout,
      openUnlockDialog,
      requireUnlock,
      requestPageNavigation,
    }),
    [unlocked, sessionExpiresAt, logout, openUnlockDialog, requireUnlock, requestPageNavigation]
  );

  return (
    <AdminLockContext.Provider value={value}>
      {children}
      <AdminUnlockDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onUnlocked={handleUnlocked}
        sessionHours={ADMIN_SESSION_HOURS}
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
