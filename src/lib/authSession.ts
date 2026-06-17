import { hashPassword } from '@/lib/appSettings';
import { getAppSettings } from '@/lib/storage';

const SESSION_KEY = '1pc-cafe-auth-session';
const LEGACY_SESSION_KEY = '1pc-cafe-admin-session';

export const AUTH_CHANGED_EVENT = 'admin-lock-changed';
/** @deprecated Use AUTH_CHANGED_EVENT */
export const ADMIN_LOCK_CHANGED_EVENT = AUTH_CHANGED_EVENT;
/** @deprecated Use AUTH_CHANGED_EVENT */
export const PAYROLL_LOCK_CHANGED_EVENT = AUTH_CHANGED_EVENT;

export const SESSION_HOURS = 8;
export const IDLE_LOCK_MINUTES = 30;
const IDLE_LOCK_MS = IDLE_LOCK_MINUTES * 60 * 1000;

export type AuthRole = 'guest' | 'employee' | 'admin';
export type SessionRole = 'employee' | 'admin';

export interface UnlockResult {
  ok: boolean;
  message: string;
  role?: SessionRole;
}

interface AuthSession {
  role: SessionRole;
  unlockedAt: string;
  expiresAt: string;
  lastActivityAt: string;
}

function dispatchAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw) as AuthSession;
      if (session.role && session.unlockedAt && session.expiresAt && session.lastActivityAt) {
        return session;
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as { unlockedAt?: string; expiresAt?: string };
    if (!legacy.unlockedAt || !legacy.expiresAt) return null;

    const migrated: AuthSession = {
      role: 'admin',
      unlockedAt: legacy.unlockedAt,
      expiresAt: legacy.expiresAt,
      lastActivityAt: legacy.unlockedAt,
    };
    writeSession(migrated);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    return migrated;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LEGACY_SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

function isExpired(session: AuthSession): boolean {
  return Date.now() >= new Date(session.expiresAt).getTime();
}

function isIdleExpired(session: AuthSession): boolean {
  return Date.now() - new Date(session.lastActivityAt).getTime() >= IDLE_LOCK_MS;
}

function clearInvalidSession(session: AuthSession | null): void {
  if (!session) return;
  if (isExpired(session) || isIdleExpired(session)) {
    writeSession(null);
    dispatchAuthChanged();
  }
}

export function getAuthSession(): AuthSession | null {
  const session = readSession();
  if (!session) return null;
  if (isExpired(session) || isIdleExpired(session)) {
    writeSession(null);
    dispatchAuthChanged();
    return null;
  }
  return session;
}

export function getCurrentRole(): AuthRole {
  const session = getAuthSession();
  return session?.role ?? 'guest';
}

export function getAuthSessionExpiresAt(): Date | null {
  const session = getAuthSession();
  return session ? new Date(session.expiresAt) : null;
}

export function isAuthenticated(): boolean {
  return getAuthSession() !== null;
}

export function isAdminRole(): boolean {
  return getCurrentRole() === 'admin';
}

export function isEmployeeRole(): boolean {
  const role = getCurrentRole();
  return role === 'employee' || role === 'admin';
}

/** @deprecated Use isAdminRole */
export function isAdminUnlocked(): boolean {
  return isAdminRole();
}

/** @deprecated Use !isAuthenticated */
export function isAdminLocked(): boolean {
  return !isAuthenticated();
}

/** @deprecated Use getAuthSessionExpiresAt */
export function getAdminSessionExpiresAt(): Date | null {
  return getAuthSessionExpiresAt();
}

export function recordActivity(): void {
  const session = readSession();
  if (!session || isExpired(session)) return;
  if (isIdleExpired(session)) {
    writeSession(null);
    dispatchAuthChanged();
    return;
  }
  writeSession({ ...session, lastActivityAt: new Date().toISOString() });
}

export function checkIdleLock(): boolean {
  const session = readSession();
  if (!session) return false;
  if (isExpired(session) || isIdleExpired(session)) {
    writeSession(null);
    dispatchAuthChanged();
    return true;
  }
  return false;
}

function createSession(role: SessionRole): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  writeSession({
    role,
    unlockedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActivityAt: now.toISOString(),
  });
  dispatchAuthChanged();
}

export async function unlockWithPassword(password: string): Promise<UnlockResult> {
  const security = getAppSettings().security;
  const inputHash = await hashPassword(password);

  if (security.passwordHash && inputHash === security.passwordHash) {
    createSession('admin');
    return { ok: true, message: '', role: 'admin' };
  }

  if (security.employeePasswordHash && inputHash === security.employeePasswordHash) {
    createSession('employee');
    return { ok: true, message: '', role: 'employee' };
  }

  if (!security.passwordHash && !security.employeePasswordHash) {
    return {
      ok: false,
      message: '설정 메뉴에서 관리자·직원 비밀번호를 먼저 설정해 주세요.',
    };
  }

  return { ok: false, message: '비밀번호가 올바르지 않습니다.' };
}

/** @deprecated Use unlockWithPassword */
export async function unlockAdmin(password: string): Promise<UnlockResult> {
  return unlockWithPassword(password);
}

/** @deprecated Use unlockWithPassword */
export async function unlockPayroll(password: string): Promise<UnlockResult> {
  return unlockWithPassword(password);
}

export function logout(): void {
  writeSession(null);
  dispatchAuthChanged();
}

/** @deprecated Use logout */
export function lockAdmin(): void {
  logout();
}

/** @deprecated Use logout */
export const lockPayroll = logout;

export function hasAdminPasswordConfigured(): boolean {
  return Boolean(getAppSettings().security.passwordHash);
}

export function hasEmployeePasswordConfigured(): boolean {
  return Boolean(getAppSettings().security.employeePasswordHash);
}

/** @deprecated Use SESSION_HOURS */
export const ADMIN_SESSION_HOURS = SESSION_HOURS;

// Validate session on module load paths
clearInvalidSession(readSession());
