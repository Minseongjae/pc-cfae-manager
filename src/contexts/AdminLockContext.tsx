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
  AUTH_CHANGED_EVENT,
  SESSION_HOURS,
  checkIdleLock,
  getAuthSessionExpiresAt,
  getCurrentRole,
  isAdminRole,
  logout,
  recordActivity,
  type AuthRole,
} from '@/lib/authSession';
import { canAccessPage, getPageRequiredRole } from '@/lib/pageAccess';
import type { PageId } from '@/types';

interface AdminLockContextValue {
  role: AuthRole;
  unlocked: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  sessionExpiresAt: Date | null;
  canAccessPage: (pageId: PageId) => boolean;
  logout: () => void;
  openUnlockDialog: (onUnlocked?: () => void) => void;
  requireUnlock: (onUnlocked?: () => void) => boolean;
  requireAdmin: (onUnlocked?: () => void) => boolean;
  requestPageNavigation: (pageId: PageId, navigate: () => void) => void;
}

const AdminLockContext = createContext<AdminLockContextValue | null>(null);

function readRole(): AuthRole {
  return getCurrentRole();
}

export function AdminLockProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AuthRole>(readRole);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(() =>
    getAuthSessionExpiresAt()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const sync = useCallback(() => {
    setRole(readRole());
    setSessionExpiresAt(getAuthSessionExpiresAt());
  }, []);

  useEffect(() => {
    const handler = () => sync();
    window.addEventListener(AUTH_CHANGED_EVENT, handler);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handler);
  }, [sync]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (checkIdleLock()) sync();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [sync]);

  useEffect(() => {
    const onActivity = () => recordActivity();
    const events = ['mousedown', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, []);

  const canAccess = useCallback((pageId: PageId) => canAccessPage(pageId, role), [role]);

  const handleLogout = useCallback(() => {
    logout();
    sync();
  }, [sync]);

  const openUnlockDialog = useCallback((onUnlocked?: () => void) => {
    pendingActionRef.current = onUnlocked ?? null;
    setDialogOpen(true);
  }, []);

  const requireAdmin = useCallback(
    (onUnlocked?: () => void): boolean => {
      if (isAdminRole()) {
        onUnlocked?.();
        return true;
      }
      openUnlockDialog(onUnlocked);
      return false;
    },
    [openUnlockDialog]
  );

  const requireUnlock = requireAdmin;

  const requestPageNavigation = useCallback(
    (pageId: PageId, navigate: () => void) => {
      if (canAccessPage(pageId, role)) {
        navigate();
        return;
      }
      openUnlockDialog(() => {
        if (canAccessPage(pageId, readRole())) {
          navigate();
        }
      });
    },
    [role, openUnlockDialog]
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
      role,
      unlocked: role !== 'guest',
      isAdmin: role === 'admin',
      isEmployee: role === 'employee' || role === 'admin',
      sessionExpiresAt,
      canAccessPage: canAccess,
      logout: handleLogout,
      openUnlockDialog,
      requireUnlock,
      requireAdmin,
      requestPageNavigation,
    }),
    [
      role,
      sessionExpiresAt,
      canAccess,
      handleLogout,
      openUnlockDialog,
      requireUnlock,
      requireAdmin,
      requestPageNavigation,
    ]
  );

  return (
    <AdminLockContext.Provider value={value}>
      {children}
      <AdminUnlockDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onUnlocked={handleUnlocked}
        sessionHours={SESSION_HOURS}
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

export function getRequiredRoleLabel(pageId: PageId): string {
  const required = getPageRequiredRole(pageId);
  if (required === 'admin') return '관리자';
  if (required === 'employee') return '직원';
  return '';
}
