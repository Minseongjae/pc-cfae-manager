import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Building2,
  Calendar,
  Cloud,
  Database,
  KeyRound,
  Palette,
  Save,
  Shield,
  Users,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { NumericInput } from '@/components/ui/NumericInput';
import { useDataSync } from '@/contexts/DataSyncContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import type {
  AppSettings,
  PayrollSettings,
  PositionDefinition,
  ScheduleSettings,
  StoreInfo,
  ThemeSettings,
} from '@/lib/appSettings';
import type { SchoolSchedule } from '@/lib/appStorage';
import type { ShiftType } from '@/types';

type SettingsSectionId =
  | 'store'
  | 'payroll'
  | 'schedule'
  | 'positions'
  | 'shifts'
  | 'sheets'
  | 'backup'
  | 'password'
  | 'theme';

const SECTIONS: { id: SettingsSectionId; label: string; icon: typeof Building2 }[] = [
  { id: 'store', label: '매장 정보', icon: Building2 },
  { id: 'payroll', label: '급여 설정', icon: Shield },
  { id: 'schedule', label: '스케줄 설정', icon: Calendar },
  { id: 'positions', label: '직책 관리', icon: Users },
  { id: 'shifts', label: '근무 유형', icon: Clock },
  { id: 'sheets', label: 'Google Sheets', icon: Cloud },
  { id: 'backup', label: '백업 / 복원', icon: Database },
  { id: 'password', label: '비밀번호 변경', icon: KeyRound },
  { id: 'theme', label: '테마 설정', icon: Palette },
];

export function SettingsPage() {
  const { settings, save, version } = useSettings();
  const [active, setActive] = useState<SettingsSectionId>('store');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedMessage, setSavedMessage] = useState('');
  const isDirtyRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = JSON.stringify(draft) !== JSON.stringify(settings);
  }, [draft, settings]);

  useEffect(() => {
    if (isDirtyRef.current) return;
    setDraft(settings);
  }, [settings, version]);

  const patchDraft = (patch: Partial<AppSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );

  const resetDraft = () => setDraft(settings);

  const handleSave = () => {
    save(draft);
    setSavedMessage('Google Sheets에 저장되었습니다.');
    setTimeout(() => setSavedMessage(''), 2500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="설정" subtitle="모든 설정은 Google Sheets에 저장됩니다">
        <div className="flex items-center gap-2">
          {savedMessage && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
              {savedMessage}
            </span>
          )}
          {isDirty && (
            <button type="button" onClick={resetDraft} className="btn-secondary text-sm">
              되돌리기
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="btn-primary text-sm disabled:opacity-40"
          >
            <Save size={16} />
            저장
          </button>
        </div>
      </PageHeader>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-stone-200 bg-white/70 p-3 space-y-1 overflow-y-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActive(id);
                setDraft(settings);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active === id
                  ? 'bg-stone-200 text-stone-800 font-medium'
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            {active === 'store' && (
              <StoreSection
                value={draft.store}
                onChange={(store) => patchDraft({ store })}
              />
            )}
            {active === 'payroll' && (
              <PayrollSection
                value={draft.payroll}
                onChange={(payroll) => patchDraft({ payroll })}
              />
            )}
            {active === 'schedule' && (
              <ScheduleSection
                value={draft.schedule}
                onChange={(schedule) => patchDraft({ schedule })}
              />
            )}
            {active === 'positions' && (
              <PositionsSection
                value={draft.positions}
                onChange={(positions) => patchDraft({ positions })}
              />
            )}
            {active === 'shifts' && (
              <ShiftTypesSection
                value={draft.shiftTypes}
                onChange={(shiftTypes) => patchDraft({ shiftTypes })}
              />
            )}
            {active === 'sheets' && <GoogleSheetsSection />}
            {active === 'backup' && <BackupSection />}
            {active === 'password' && <PasswordSection />}
            {active === 'theme' && (
              <ThemeSection
                value={draft.theme}
                onChange={(theme) => patchDraft({ theme })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
        {description && <p className="text-xs text-stone-500 mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label-caps normal-case tracking-wide block mb-2">{label}</label>
      {children}
    </div>
  );
}

function StoreSection({
  value,
  onChange,
}: {
  value: StoreInfo;
  onChange: (v: StoreInfo) => void;
}) {
  const set = (key: keyof StoreInfo, val: string) => onChange({ ...value, [key]: val });
  return (
    <SectionCard title="매장 정보" description="카페 기본 정보">
      <div className="grid grid-cols-2 gap-4">
        <Field label="매장명">
          <input className="input-luxury" value={value.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="전화번호">
          <input className="input-luxury" value={value.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="이메일">
          <input className="input-luxury" value={value.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="영업시간">
          <input className="input-luxury" value={value.businessHours} onChange={(e) => set('businessHours', e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="주소">
            <input className="input-luxury" value={value.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="메모">
            <textarea className="input-luxury min-h-[80px]" value={value.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}

function PayrollSection({
  value,
  onChange,
}: {
  value: PayrollSettings;
  onChange: (v: PayrollSettings) => void;
}) {
  const setNum = (
    key:
      | 'defaultHourlyWage'
      | 'overtimeMultiplier'
      | 'weeklyHolidayAllowance'
      | 'mealAllowanceDefault'
      | 'transportationAllowanceDefault'
      | 'paymentDay',
    next: number | null
  ) => onChange({ ...value, [key]: next });

  const setStr = (key: 'notes', raw: string) => onChange({ ...value, [key]: raw });

  return (
    <SectionCard title="급여 설정" description="기본 급여 계산 옵션">
      <div className="grid grid-cols-2 gap-4">
        <Field label="기본 시급 (원)">
          <NumericInput
            className="input-luxury"
            value={value.defaultHourlyWage}
            onChange={(v) => setNum('defaultHourlyWage', v)}
          />
        </Field>
        <Field label="연장 수당 배율">
          <NumericInput
            step={0.1}
            className="input-luxury"
            value={value.overtimeMultiplier}
            onChange={(v) => setNum('overtimeMultiplier', v)}
          />
        </Field>
        <Field label="주휴 수당 (원)">
          <NumericInput
            className="input-luxury"
            value={value.weeklyHolidayAllowance}
            onChange={(v) => setNum('weeklyHolidayAllowance', v)}
          />
        </Field>
        <Field label="기본 식대 (원)">
          <NumericInput
            className="input-luxury"
            value={value.mealAllowanceDefault}
            onChange={(v) => setNum('mealAllowanceDefault', v)}
          />
        </Field>
        <Field label="기본 교통비 (원)">
          <NumericInput
            className="input-luxury"
            value={value.transportationAllowanceDefault}
            onChange={(v) => setNum('transportationAllowanceDefault', v)}
          />
        </Field>
        <Field label="급여 지급일 (매월)">
          <NumericInput
            min={1}
            max={31}
            className="input-luxury"
            value={value.paymentDay}
            onChange={(v) => setNum('paymentDay', v)}
          />
        </Field>
        <div className="col-span-2">
          <Field label="메모">
            <textarea className="input-luxury min-h-[80px]" value={value.notes} onChange={(e) => setStr('notes', e.target.value)} />
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}

function ScheduleSection({
  value,
  onChange,
}: {
  value: ScheduleSettings;
  onChange: (v: ScheduleSettings) => void;
}) {
  const updateSchool = (index: number, patch: Partial<SchoolSchedule>) => {
    const schoolSchedules = value.schoolSchedules.map((row, i) =>
      i === index ? { ...row, ...patch } : row
    );
    onChange({ ...value, schoolSchedules });
  };

  return (
    <SectionCard title="스케줄 설정" description="캘린더 및 학교 일정">
      <div className="grid grid-cols-2 gap-4">
        <Field label="주 시작 요일">
          <select
            className="input-luxury"
            value={value.weekStartsOn}
            onChange={(e) => onChange({ ...value, weekStartsOn: Number(e.target.value) as 0 | 1 })}
          >
            <option value={1}>월요일</option>
            <option value={0}>일요일</option>
          </select>
        </Field>
        <Field label="기본 보기">
          <select
            className="input-luxury"
            value={value.defaultView}
            onChange={(e) =>
              onChange({
                ...value,
                defaultView: e.target.value as ScheduleSettings['defaultView'],
              })
            }
          >
            <option value="monthly">월간</option>
            <option value="weekly">주간</option>
            <option value="daily">일간</option>
          </select>
        </Field>
        <Field label="최대 연도">
          <input
            type="number"
            className="input-luxury"
            value={value.maxScheduleYear}
            onChange={(e) => onChange({ ...value, maxScheduleYear: Number(e.target.value) || 2030 })}
          />
        </Field>
        <Field label="드래그 이동">
          <select
            className="input-luxury"
            value={value.allowDragDrop ? 'yes' : 'no'}
            onChange={(e) => onChange({ ...value, allowDragDrop: e.target.value === 'yes' })}
          >
            <option value="yes">허용</option>
            <option value="no">비허용</option>
          </select>
        </Field>
      </div>

      <div className="pt-2 space-y-3">
        <p className="text-xs font-medium text-stone-600">학교 일정 안내</p>
        {value.schoolSchedules.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input
              className="input-luxury"
              placeholder="학교명"
              value={row.school}
              onChange={(e) => updateSchool(index, { school: e.target.value })}
            />
            <input
              className="input-luxury"
              placeholder="일정"
              value={row.schedule}
              onChange={(e) => updateSchool(index, { schedule: e.target.value })}
            />
            <button
              type="button"
              className="btn-ghost text-rose-600 text-xs"
              onClick={() =>
                onChange({
                  ...value,
                  schoolSchedules: value.schoolSchedules.filter((_, i) => i !== index),
                })
              }
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() =>
            onChange({
              ...value,
              schoolSchedules: [...value.schoolSchedules, { school: '', schedule: '' }],
            })
          }
        >
          + 학교 일정 추가
        </button>
      </div>
    </SectionCard>
  );
}

function PositionsSection({
  value,
  onChange,
}: {
  value: PositionDefinition[];
  onChange: (v: PositionDefinition[]) => void;
}) {
  const update = (index: number, patch: Partial<PositionDefinition>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <SectionCard title="직책 관리" description="직책명 및 기본 시급">
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_120px_auto] gap-2 px-1 text-[11px] font-medium text-stone-500">
          <span>직책명</span>
          <span>기본 시급</span>
          <span className="w-12" />
        </div>
        {value.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
            <input
              type="text"
              className="input-luxury"
              value={row.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="직책명 입력"
              aria-label="직책명"
            />
            <NumericInput
              className="input-luxury"
              value={row.defaultHourlyWage}
              onChange={(wage) => update(index, { defaultHourlyWage: wage ?? 0 })}
            />
            <button
              type="button"
              className="btn-ghost text-rose-600 text-xs w-12"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() =>
            onChange([
              ...value,
              {
                id: `custom-${Date.now()}`,
                label: '',
                defaultHourlyWage: 10400,
              },
            ])
          }
        >
          + 직책 추가
        </button>
      </div>
    </SectionCard>
  );
}

function ShiftTypesSection({
  value,
  onChange,
}: {
  value: ShiftType[];
  onChange: (v: ShiftType[]) => void;
}) {
  const update = (index: number, patch: Partial<ShiftType>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <SectionCard title="근무 유형 관리" description="요일별 근무 템플릿">
      <div className="space-y-3">
        {value.map((row, index) => (
          <div key={row.id} className="p-3 rounded-xl border border-stone-200 grid grid-cols-2 md:grid-cols-6 gap-2">
            <input className="input-luxury" value={row.name} onChange={(e) => update(index, { name: e.target.value })} />
            <select
              className="input-luxury"
              value={row.dayType}
              onChange={(e) => update(index, { dayType: e.target.value as ShiftType['dayType'] })}
            >
              <option value="weekday">평일</option>
              <option value="saturday">토요일</option>
              <option value="sunday">일요일</option>
            </select>
            <input type="time" className="input-luxury" value={row.startTime} onChange={(e) => update(index, { startTime: e.target.value })} />
            <input type="time" className="input-luxury" value={row.endTime} onChange={(e) => update(index, { endTime: e.target.value })} />
            <input type="color" className="input-luxury h-[42px] p-1" value={row.color} onChange={(e) => update(index, { color: e.target.value })} />
            <button
              type="button"
              className="btn-ghost text-rose-600 text-xs"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() =>
            onChange([
              ...value,
              {
                id: Math.max(0, ...value.map((v) => v.id)) + 1,
                name: '새 근무',
                dayType: 'weekday',
                startTime: '10:00',
                endTime: '14:00',
                color: '#C4A35A',
              },
            ])
          }
        >
          + 근무 유형 추가
        </button>
      </div>
    </SectionCard>
  );
}

function GoogleSheetsSection() {
  const { isOnline, lastSyncAt, error, forceSync } = useDataSync();
  const apiUrl = import.meta.env.VITE_API_URL || '(same-origin /api)';

  return (
    <SectionCard title="Google Sheets 상태" description="데이터베이스 연결">
      <dl className="grid grid-cols-[120px_1fr] gap-3 text-sm">
        <dt className="text-stone-500">상태</dt>
        <dd className={isOnline ? 'text-emerald-700' : 'text-rose-600'}>
          {isOnline ? '연결됨' : '오프라인'}
        </dd>
        <dt className="text-stone-500">API</dt>
        <dd className="text-stone-700 break-all">{apiUrl}</dd>
        <dt className="text-stone-500">마지막 동기화</dt>
        <dd className="text-stone-700">
          {lastSyncAt ? new Date(lastSyncAt).toLocaleString('ko-KR') : '아직 없음'}
        </dd>
      </dl>
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      <button type="button" className="btn-secondary text-sm" onClick={() => forceSync().catch(console.error)}>
        지금 동기화
      </button>
    </SectionCard>
  );
}

function BackupSection() {
  const { exportBackup, restoreBackup } = useSettings();
  const [message, setMessage] = useState('');

  return (
    <SectionCard title="백업 & 복원" description="전체 데이터 JSON 백업">
      <p className="text-sm text-stone-600">
        직원, 스케줄, 실근무, 급여, 설정을 포함한 전체 데이터를 백업합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary text-sm" onClick={exportBackup}>
          백업 다운로드
        </button>
        <label className="btn-primary text-sm cursor-pointer">
          백업 복원
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const result = await restoreBackup(text);
              setMessage(result.message);
            }}
          />
        </label>
      </div>
      {message && <p className="text-xs text-stone-600">{message}</p>}
    </SectionCard>
  );
}

function PasswordSection() {
  const { changePassword, settings } = useSettings();
  const { logout, sessionExpiresAt } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    const result = await changePassword(currentPassword, newPassword);
    setMessage(result.message);
    if (result.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="앱 잠금" description="이 기기의 로그인 세션">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-stone-700">현재 로그인 상태입니다.</p>
            {sessionExpiresAt && (
              <p className="text-xs text-stone-500 mt-1">
                세션 만료: {sessionExpiresAt.toLocaleString('ko-KR')}
              </p>
            )}
          </div>
          <button type="button" onClick={logout} className="btn-secondary text-sm shrink-0">
            로그아웃
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="비밀번호 변경"
        description={settings.security.passwordHash ? '비밀번호가 설정되어 있습니다.' : '아직 비밀번호가 없습니다.'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          {settings.security.passwordHash && (
            <Field label="현재 비밀번호">
              <input
                type="password"
                className="input-luxury"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
          )}
          <Field label="새 비밀번호">
            <input
              type="password"
              className="input-luxury"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="새 비밀번호 확인">
            <input
              type="password"
              className="input-luxury"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn-primary text-sm">
            비밀번호 저장
          </button>
          {message && <p className="text-xs text-stone-600">{message}</p>}
        </form>
      </SectionCard>
    </div>
  );
}

function ThemeSection({
  value,
  onChange,
}: {
  value: ThemeSettings;
  onChange: (v: ThemeSettings) => void;
}) {
  return (
    <SectionCard title="테마 설정" description="화면 모드 및 강조색">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Field label="모드">
          <select
            className="input-luxury"
            value={value.mode}
            onChange={(e) => onChange({ ...value, mode: e.target.value as ThemeSettings['mode'] })}
          >
            <option value="light">라이트</option>
            <option value="dark">다크</option>
          </select>
        </Field>
        <Field label="강조색">
          <select
            className="input-luxury"
            value={value.accent}
            onChange={(e) => onChange({ ...value, accent: e.target.value as ThemeSettings['accent'] })}
          >
            <option value="stone">Stone</option>
            <option value="amber">Amber</option>
            <option value="emerald">Emerald</option>
          </select>
        </Field>
      </div>
    </SectionCard>
  );
}
