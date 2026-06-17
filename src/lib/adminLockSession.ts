import { hashPassword } from '@/lib/appSettings';
import { getAppSettings } from '@/lib/storage';

const LOCK_STATE_KEY = '1pc-cafe-admin-locked';

export const ADMIN_LOCK_CHANGED_EVENT = 'admin-lock-changed';

/** @deprecated Use ADMIN_LOCK_CHANGED_EVENT */
export const PAYROLL_LOCK_CHANGED_EVENT = ADMIN_LOCK_CHANGED_EVENT;

export interface UnlockResult {
  ok: boolean;
  message: string;
}

function dispatchLockChanged(): void {
  window.dispatchEvent(new Event(ADMIN_LOCK_CHANGED_EVENT));
}

export function isAdminLocked(): boolean {
  try {
    const stored = localStorage.getItem(LOCK_STATE_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch {
    return true;
  }
}

export function isAdminUnlocked(): boolean {
  return !isAdminLocked();
}

/** @deprecated Use isAdminUnlocked */
export const isPayrollUnlocked = isAdminUnlocked;

export async function unlockAdmin(password: string): Promise<UnlockResult> {
  const storedHash = getAppSettings().security.passwordHash;
  if (!storedHash) {
    return {
      ok: false,
      message: '설정 메뉴에서 관리자 비밀번호를 먼저 설정해 주세요.',
    };
  }

  const inputHash = await hashPassword(password);
  if (inputHash !== storedHash) {
    return { ok: false, message: '비밀번호가 올바르지 않습니다.' };
  }

  try {
    localStorage.setItem(LOCK_STATE_KEY, 'false');
  } catch {
    return { ok: false, message: '잠금 해제 상태를 저장할 수 없습니다.' };
  }

  dispatchLockChanged();
  return { ok: true, message: '' };
}

/** @deprecated Use unlockAdmin */
export async function unlockPayroll(password: string): Promise<UnlockResult> {
  return unlockAdmin(password);
}

export function lockAdmin(): void {
  try {
    localStorage.setItem(LOCK_STATE_KEY, 'true');
  } catch {
    // ignore storage errors
  }
  dispatchLockChanged();
}

/** @deprecated Use lockAdmin */
export const lockPayroll = lockAdmin;

export function hasAdminPasswordConfigured(): boolean {
  return Boolean(getAppSettings().security.passwordHash);
}
