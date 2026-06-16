import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LoginScreen } from '@/components/auth/LoginScreen';
import {
  clearSession,
  createSession,
  getSessionExpiresAt,
  isSessionValid,
  verifyAppPassword,
} from '@/lib/authSession';

interface AuthContextValue {
  isAuthenticated: boolean;
  sessionExpiresAt: Date | null;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionValid());
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(() =>
    getSessionExpiresAt()
  );

  const login = useCallback((password: string) => {
    if (!verifyAppPassword(password)) return false;

    const session = createSession();
    setIsAuthenticated(true);
    setSessionExpiresAt(new Date(session.expiresAt));
    return true;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      sessionExpiresAt,
      login,
      logout,
    }),
    [isAuthenticated, sessionExpiresAt, login, logout]
  );

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
