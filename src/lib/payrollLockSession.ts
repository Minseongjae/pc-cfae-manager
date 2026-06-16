const SESSION_KEY = '1pc-cafe-manager-payroll-unlock';
const PAYROLL_PASSWORD = 'awesome1004!';

export const PAYROLL_LOCK_CHANGED_EVENT = 'payroll-lock-changed';

interface PayrollUnlockSession {
  unlockedAt: string;
}

export function isPayrollUnlocked(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    JSON.parse(raw) as PayrollUnlockSession;
    return true;
  } catch {
    return false;
  }
}

export function unlockPayroll(password: string): boolean {
  if (password !== PAYROLL_PASSWORD) return false;
  const session: PayrollUnlockSession = { unlockedAt: new Date().toISOString() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(PAYROLL_LOCK_CHANGED_EVENT));
  return true;
}

export function lockPayroll(): void {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(PAYROLL_LOCK_CHANGED_EVENT));
}
