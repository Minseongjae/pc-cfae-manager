import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemeSettings,
  hashPassword,
  SETTINGS_CHANGED_EVENT,
  type AppSettings,
} from '@/lib/appSettings';
import type { ShiftType } from '@/types';
import { flushPush } from '@/lib/dataStore';
import { APP_STORAGE_PREFIX } from '@/lib/appBrand';
import {
  exportAppBackup,
  getAppSettings,
  restoreAppBackup,
  saveAppSettings,
  saveShiftTypes as persistShiftTypes,
} from '@/lib/storage';

interface SettingsContextValue {
  settings: AppSettings;
  version: number;
  save: (next: AppSettings) => void;
  update: (patch: Partial<AppSettings>) => void;
  saveShiftTypes: (types: ShiftType[]) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; message: string }>;
  changeEmployeePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; message: string }>;
  exportBackup: () => void;
  restoreBackup: (json: string) => Promise<{ ok: boolean; message: string }>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    const next = getAppSettings();
    setSettings(next);
    applyThemeSettings(next.theme);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener(SETTINGS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler);
  }, [refresh]);

  const save = useCallback(
    (next: AppSettings) => {
      saveAppSettings(next);
      applyThemeSettings(next.theme);
      setSettings(next);
      setVersion((v) => v + 1);
    },
    []
  );

  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      save({ ...settings, ...patch });
    },
    [save, settings]
  );

  const saveShiftTypes = useCallback(
    (types: ShiftType[]) => {
      const normalized = persistShiftTypes(types);
      setSettings((current) => ({ ...current, shiftTypes: normalized }));
      setVersion((v) => v + 1);
      void flushPush();
    },
    []
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const currentHash = await hashPassword(currentPassword);
      const storedHash = settings.security.passwordHash;

      if (storedHash && storedHash !== currentHash) {
        return { ok: false, message: '현재 비밀번호가 일치하지 않습니다.' };
      }
      if (newPassword.length < 4) {
        return { ok: false, message: '새 비밀번호는 4자 이상이어야 합니다.' };
      }

      const nextHash = await hashPassword(newPassword);
      save({
        ...settings,
        security: { ...settings.security, passwordHash: nextHash },
      });
      return { ok: true, message: '관리자 비밀번호가 저장되었습니다.' };
    },
    [save, settings]
  );

  const changeEmployeePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const currentHash = await hashPassword(currentPassword);
      const storedHash = settings.security.employeePasswordHash;

      if (storedHash && storedHash !== currentHash) {
        return { ok: false, message: '현재 직원 비밀번호가 일치하지 않습니다.' };
      }
      if (newPassword.length < 4) {
        return { ok: false, message: '새 비밀번호는 4자 이상이어야 합니다.' };
      }

      const nextHash = await hashPassword(newPassword);
      save({
        ...settings,
        security: { ...settings.security, employeePasswordHash: nextHash },
      });
      return { ok: true, message: '직원 비밀번호가 저장되었습니다.' };
    },
    [save, settings]
  );

  const exportBackup = useCallback(() => {
    const blob = new Blob([exportAppBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${APP_STORAGE_PREFIX}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const restoreBackup = useCallback(async (json: string) => {
    try {
      restoreAppBackup(json);
      refresh();
      return { ok: true, message: '백업이 복원되었습니다.' };
    } catch {
      return { ok: false, message: '백업 파일 형식이 올바르지 않습니다.' };
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      settings,
      version,
      save,
      update,
      saveShiftTypes,
      changePassword,
      changeEmployeePassword,
      exportBackup,
      restoreBackup,
    }),
    [
      settings,
      version,
      save,
      update,
      saveShiftTypes,
      changePassword,
      changeEmployeePassword,
      exportBackup,
      restoreBackup,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
