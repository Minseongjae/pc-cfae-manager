import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT, getCurrentRole, isAdminRole } from '@/lib/authSession';

export function useAdminLock(): boolean {
  const [unlocked, setUnlocked] = useState(isAdminRole);

  useEffect(() => {
    const sync = () => setUnlocked(isAdminRole());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  return unlocked;
}

export function useAuthRole() {
  const [role, setRole] = useState(getCurrentRole);

  useEffect(() => {
    const sync = () => setRole(getCurrentRole());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  return role;
}

/** Prefer useAdminLockContext for lock/unlock actions */
export { useAdminLockContext } from '@/contexts/AdminLockContext';
