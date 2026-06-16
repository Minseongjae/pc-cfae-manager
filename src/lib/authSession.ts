const SESSION_STORAGE_KEY = '1pc-cafe-auth-session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const APP_LOCK_PASSWORD = 'awesome1004!';

interface AuthSession {
  expiresAt: number;
}

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as AuthSession;
    if (!session.expiresAt || Date.now() >= session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function isSessionValid(): boolean {
  return readSession() !== null;
}

export function createSession(): AuthSession {
  const session: AuthSession = { expiresAt: Date.now() + SESSION_TTL_MS };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getSessionExpiresAt(): Date | null {
  const session = readSession();
  return session ? new Date(session.expiresAt) : null;
}

export function verifyAppPassword(password: string): boolean {
  return password === APP_LOCK_PASSWORD;
}
