const SESSION_KEY = '1pc-cafe-manager-payroll-unlock';
const ADMIN_PASSWORD = 'awesome1004!';

export const ADMIN_LOCK_CHANGED_EVENT = 'admin-lock-changed';

/** @deprecated Use ADMIN_LOCK_CHANGED_EVENT */
export const PAYROLL_LOCK_CHANGED_EVENT = ADMIN_LOCK_CHANGED_EVENT;

interface AdminUnlockSession {
  unlockedAt: string;
}

export function isAdminUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    JSON.parse(raw) as AdminUnlockSession;
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Use isAdminUnlocked */
export const isPayrollUnlocked = isAdminUnlocked;

export function unlockAdmin(password: string): boolean {
  if (password !== ADMIN_PASSWORD) return false;
  const session: AdminUnlockSession = { unlockedAt: new Date().toISOString() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(ADMIN_LOCK_CHANGED_EVENT));
  return true;
}

/** @deprecated Use unlockAdmin */
export const unlockPayroll = unlockAdmin;

export function lockAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(ADMIN_LOCK_CHANGED_EVENT));
}

/** @deprecated Use lockAdmin */
export const lockPayroll = lockAdmin;

export const PROTECTED_PAGE_IDS = ['payroll', 'employees'] as const;

export function isProtectedPage(page: string): boolean {
  return (PROTECTED_PAGE_IDS as readonly string[]).includes(page);
}
