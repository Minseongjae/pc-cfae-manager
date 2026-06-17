import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Building2,
  Calendar,
  Cloud,
  Database,
  Palette,
  Save,
  Shield,
  Users,
  Clock,
  KeyRound,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { NumericInput } from '@/components/ui/NumericInput';
import { useDataSync } from '@/contexts/DataSyncContext';
import { useSettings } from '@/contexts/SettingsContext';
import type {
  AppSettings,
  PayrollSettings,
  PositionDefinition,
  ScheduleSettings,
  StoreInfo,
  ThemeSettings,
} from '@/lib/appSettings';
import type { SchoolSchedule } from '@/lib/appStorage';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getScheduleShifts } from '@/lib/storage';
import {
  createShiftTypeId,
  moveShiftType,
  sortShiftTypes,
} from '@/lib/scheduleShiftTypes';
import type { ShiftType } from '@/types';

type SettingsSectionId =
  | 'store'
  | 'payroll'
  | 'schedule'
  | 'positions'
  | 'shifts'
  | 'security'
  | 'sheets'
  | 'backup'
  | 'theme';

const SECTIONS: { id: SettingsSectionId; label: string; icon: typeof Building2 }[] = [
  { id: 'store', label: '매장 정보', icon: Building2 },
  { id: 'payroll', label: '급여 설정', icon: Shield },
  { id: 'schedule', label: '스케줄 설정', icon: Calendar },
  { id: 'positions', label: '직책 관리', icon: Users },
  { id: 'shifts', label: '근무유형 관리', icon: Clock },
  { id: 'security', label: '관리자 비밀번호', icon: KeyRound },
  { id: 'sheets', label: '클라우드 동기화', icon: Cloud },
  { id: 'backup', label: '백업 / 복원', icon: Database },
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
    save({
      ...draft,
      shiftTypes: sortShiftTypes(draft.shiftTypes),
    });
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="shrink-0 border-b md:border-b-0 md:border-r border-stone-200 bg-white/70 overflow-x-auto md:overflow-y-auto md:w-56">
          <div className="flex md:flex-col gap-1 p-2 md:p-3 min-w-max md:min-w-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex items-center gap-2.5 px-3 py-3 md:py-2.5 rounded-xl text-sm transition-colors touch-nav shrink-0 md:w-full ${
                active === id
                  ? 'bg-stone-200 text-stone-800 font-medium'
                  : 'text-stone-500 hover:bg-stone-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
            {active === 'security' && <SecuritySection />}
            {active === 'sheets' && <CloudSyncSection />}
            {active === 'backup' && <BackupSection />}
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
    <SectionCard title="직책 관리" description="직책명, 기본 시급, 직원 색상을 설정합니다.">
      <div className="space-y-3">
        <div className="grid grid-cols-[auto_1fr_120px_auto] gap-2 px-1 text-[11px] font-medium text-stone-500">
          <span className="w-10">색상</span>
          <span>직책명</span>
          <span>기본 시급</span>
          <span className="w-12" />
        </div>
        {value.map((row, index) => (
          <div key={row.id} className="grid grid-cols-[auto_1fr_120px_auto] gap-2 items-center">
            <input
              type="color"
              className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer shrink-0"
              value={row.color || '#3B82F6'}
              onChange={(e) => update(index, { color: e.target.value })}
              aria-label={`${row.label || '직책'} 색상`}
            />
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
                color: '#3B82F6',
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
  const [deleteError, setDeleteError] = useState('');
  const sorted = sortShiftTypes(value);

  const update = (index: number, patch: Partial<ShiftType>) => {
    onChange(sorted.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleDelete = (index: number) => {
    const target = sorted[index];
    const usedCount = getScheduleShifts().filter((shift) => shift.rowId === target.id).length;
    if (usedCount > 0) {
      setDeleteError(`"${target.name}" 유형은 스케줄에 ${usedCount}건 사용 중이라 삭제할 수 없습니다.`);
      return;
    }
    if (sorted.length <= 1) {
      setDeleteError('최소 1개의 근무유형이 필요합니다.');
      return;
    }
    setDeleteError('');
    onChange(sorted.filter((_, i) => i !== index).map((row, i) => ({ ...row, sortOrder: i })));
  };

  return (
    <SectionCard
      title="근무유형 관리"
      description="스케줄표 행(근무유형)을 추가·수정·삭제하고 색상과 순서를 설정합니다. 저장 시 Google Sheets에 반영됩니다."
    >
      <div className="space-y-3">
        {sorted.map((row, index) => (
          <div
            key={row.id}
            className="p-3 md:p-4 rounded-xl border border-stone-200 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded border shrink-0"
                  style={{ backgroundColor: `${row.color}22`, borderColor: row.color }}
                />
                <span className="text-xs text-stone-400 truncate">#{index + 1}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="btn-ghost p-1.5 touch-target"
                  disabled={index === 0}
                  onClick={() => onChange(moveShiftType(sorted, index, -1))}
                  title="위로"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost p-1.5 touch-target"
                  disabled={index === sorted.length - 1}
                  onClick={() => onChange(moveShiftType(sorted, index, 1))}
                  title="아래로"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost text-rose-600 text-xs px-2 touch-target"
                  onClick={() => handleDelete(index)}
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="유형 이름">
                <input
                  className="input-luxury"
                  value={row.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="예: 오픈, 미들, 마감"
                />
              </Field>
              <Field label="색상">
                <input
                  type="color"
                  className="input-luxury h-[42px] p-1 w-full"
                  value={row.color}
                  onChange={(e) => update(index, { color: e.target.value })}
                />
              </Field>
              <Field label="기본 시작">
                <input
                  type="time"
                  className="input-luxury"
                  value={row.defaultStartTime ?? '10:00'}
                  onChange={(e) => update(index, { defaultStartTime: e.target.value })}
                />
              </Field>
              <Field label="기본 종료">
                <input
                  type="time"
                  className="input-luxury"
                  value={row.defaultEndTime ?? '14:00'}
                  onChange={(e) => update(index, { defaultEndTime: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}

        {deleteError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {deleteError}
          </p>
        )}

        <button
          type="button"
          className="btn-secondary text-sm w-full sm:w-auto touch-target"
          onClick={() => {
            setDeleteError('');
            onChange([
              ...sorted,
              {
                id: createShiftTypeId('새 근무'),
                name: '새 근무',
                color: '#C4A35A',
                sortOrder: sorted.length,
                defaultStartTime: '10:00',
                defaultEndTime: '14:00',
              },
            ]);
          }}
        >
          + 근무유형 추가
        </button>
      </div>
    </SectionCard>
  );
}

function CloudSyncSection() {
  const { isOnline, lastSyncAt, error, forceSync } = useDataSync();

  return (
    <SectionCard
      title="Google Sheets 동기화"
      description="변경 시 자동 저장 · 90초마다 변경 여부만 확인(할당량 절약)"
    >
      <dl className="grid grid-cols-[120px_1fr] gap-3 text-sm">
        <dt className="text-stone-500">상태</dt>
        <dd className={isOnline ? 'text-emerald-700' : 'text-rose-600'}>
          {isOnline ? '연결됨' : '오프라인'}
        </dd>
        <dt className="text-stone-500">저장소</dt>
        <dd className="text-stone-700">Google Sheets (Vercel API)</dd>
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
      <button type="button" className="btn-secondary text-sm" onClick={() => forceSync({ pull: true }).catch(console.error)}>
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

function SecuritySection() {
  const { settings, changePassword } = useSettings();
  const isFirstSetup = !settings.security.passwordHash;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);
    const result = await changePassword(isFirstSetup ? '' : currentPassword, newPassword);
    setSubmitting(false);

    if (result.ok) {
      setMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }

    setError(result.message);
  };

  return (
    <SectionCard
      title="관리자 비밀번호"
      description="직원 추가·수정·삭제, 시급 변경, 근무표·급여 수정에 사용됩니다"
    >
      {isFirstSetup ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          최초 1회 관리자 비밀번호를 설정해 주세요. 설정 후 잠금 해제에 사용됩니다.
        </p>
      ) : (
        <p className="text-sm text-stone-600">
          비밀번호는 Google Sheets에 암호화(해시)되어 저장됩니다.
        </p>
      )}

      <div className="grid gap-4 max-w-md">
        {!isFirstSetup && (
          <Field label="현재 비밀번호">
            <input
              type="password"
              className="input-luxury"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
        )}
        <Field label={isFirstSetup ? '새 비밀번호' : '새 비밀번호'}>
          <input
            type="password"
            className="input-luxury"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="4자 이상"
          />
        </Field>
        <Field label="새 비밀번호 확인">
          <input
            type="password"
            className="input-luxury"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {message}
        </p>
      )}

      <button
        type="button"
        className="btn-primary text-sm"
        onClick={handleSubmit}
        disabled={submitting || !newPassword || !confirmPassword}
      >
        {submitting ? '저장 중…' : isFirstSetup ? '비밀번호 설정' : '비밀번호 변경'}
      </button>
    </SectionCard>
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
