import { hashPassword } from '@/lib/appSettings';
import { getAppSettings } from '@/lib/storage';

const SESSION_KEY = '1pc-cafe-admin-session';
const SESSION_HOURS = 8;

export const ADMIN_LOCK_CHANGED_EVENT = 'admin-lock-changed';

/** @deprecated Use ADMIN_LOCK_CHANGED_EVENT */
export const PAYROLL_LOCK_CHANGED_EVENT = ADMIN_LOCK_CHANGED_EVENT;

export interface UnlockResult {
  ok: boolean;
  message: string;
}

interface AdminSession {
  unlockedAt: string;
  expiresAt: string;
}

function dispatchLockChanged(): void {
  window.dispatchEvent(new Event(ADMIN_LOCK_CHANGED_EVENT));
}

function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AdminSession;
    if (!session.unlockedAt || !session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

function writeSession(session: AdminSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

function isSessionValid(session: AdminSession | null): boolean {
  if (!session) return false;
  return Date.now() < new Date(session.expiresAt).getTime();
}

export function getAdminSession(): AdminSession | null {
  const session = readSession();
  if (!isSessionValid(session)) {
    if (session) {
      writeSession(null);
      dispatchLockChanged();
    }
    return null;
  }
  return session;
}

export function getAdminSessionExpiresAt(): Date | null {
  const session = getAdminSession();
  return session ? new Date(session.expiresAt) : null;
}

export function isAdminLocked(): boolean {
  return getAdminSession() === null;
}

export function isAdminUnlocked(): boolean {
  return getAdminSession() !== null;
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

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  writeSession({
    unlockedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  dispatchLockChanged();
  return { ok: true, message: '' };
}

/** @deprecated Use unlockAdmin */
export async function unlockPayroll(password: string): Promise<UnlockResult> {
  return unlockAdmin(password);
}

export function lockAdmin(): void {
  writeSession(null);
  dispatchLockChanged();
}

/** @deprecated Use lockAdmin */
export const lockPayroll = lockAdmin;

export function hasAdminPasswordConfigured(): boolean {
  return Boolean(getAppSettings().security.passwordHash);
}

export const ADMIN_SESSION_HOURS = SESSION_HOURS;
