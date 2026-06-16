import { useEffect, useState } from 'react';
import { ADMIN_LOCK_CHANGED_EVENT, isAdminUnlocked } from '@/lib/adminLockSession';

export function useAdminLock(): boolean {
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);

  useEffect(() => {
    const sync = () => setUnlocked(isAdminUnlocked());
    window.addEventListener(ADMIN_LOCK_CHANGED_EVENT, sync);
    return () => window.removeEventListener(ADMIN_LOCK_CHANGED_EVENT, sync);
  }, []);

  return unlocked;
}
