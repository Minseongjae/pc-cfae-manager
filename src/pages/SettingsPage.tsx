import { useMemo, useState, useEffect, useRef, type FocusEvent } from 'react';
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
import { deleteShiftType, getAppSettings, ShiftTypeDeleteError, getEmployees, saveEmployeeScheduleColor } from '@/lib/storage';
import {
  resolveEmployeeScheduleColor,
} from '@/lib/employeeColors';
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
  { id: 'security', label: '비밀번호 / 권한', icon: KeyRound },
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

  useEffect(() => {
    setDraft((current) => {
      if (JSON.stringify(current.shiftTypes) === JSON.stringify(settings.shiftTypes)) {
        return current;
      }
      return { ...current, shiftTypes: settings.shiftTypes };
    });
  }, [settings.shiftTypes, version]);

  useEffect(() => {
    setDraft((current) => {
      const nextColors = settings.schedule.employeeScheduleColors ?? {};
      const currentColors = current.schedule.employeeScheduleColors ?? {};
      if (JSON.stringify(currentColors) === JSON.stringify(nextColors)) {
        return current;
      }
      return {
        ...current,
        schedule: { ...current.schedule, employeeScheduleColors: nextColors },
      };
    });
  }, [settings.schedule.employeeScheduleColors, version]);

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
      shiftTypes: sortShiftTypes(getAppSettings().shiftTypes),
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
                positions={draft.positions}
                onChange={(schedule) => patchDraft({ schedule })}
              />
            )}
            {active === 'positions' && (
              <PositionsSection
                value={draft.positions}
                onChange={(positions) => patchDraft({ positions })}
              />
            )}
            {active === 'shifts' && <ShiftTypesSection />}
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
  positions,
  onChange,
}: {
  value: ScheduleSettings;
  positions: PositionDefinition[];
  onChange: (v: ScheduleSettings) => void;
}) {
  const employees = getEmployees().filter((employee) => employee.status !== 'resigned');

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
        <Field label="스케줄 색상 기준">
          <select
            className="input-luxury"
            value={value.scheduleColorMode ?? 'employee'}
            onChange={(e) =>
              onChange({
                ...value,
                scheduleColorMode: e.target.value as ScheduleSettings['scheduleColorMode'],
              })
            }
          >
            <option value="employee">직원별 색상</option>
            <option value="shiftType">근무유형별 색상</option>
          </select>
        </Field>
      </div>

      <div className="pt-4 space-y-3 border-t border-stone-200">
        <div>
          <p className="text-xs font-medium text-stone-600">
            {value.scheduleColorMode === 'shiftType' ? '근무유형 색상' : '직원별 스케줄 색상'}
          </p>
          <p className="text-[11px] text-stone-500 mt-1">
            {value.scheduleColorMode === 'shiftType'
              ? '근무유형 관리에서 색상을 변경할 수 있습니다. 스케줄표에는 근무유형별 색상이 적용됩니다.'
              : '근무 스케줄표에서 직원별로 구분되는 색상입니다. 변경 시 즉시 저장됩니다.'}
          </p>
        </div>
        {value.scheduleColorMode !== 'shiftType' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2"
            >
              <input
                type="color"
                className="w-10 h-10 rounded-lg border border-stone-200 p-0.5 shrink-0"
                value={resolveEmployeeScheduleColor(employee, positions)}
                onChange={(e) => {
                  saveEmployeeScheduleColor(employee.id, e.target.value, employee);
                  onChange({
                    ...value,
                    employeeScheduleColors: {
                      ...(getAppSettings().schedule.employeeScheduleColors ?? {}),
                    },
                  });
                }}
                aria-label={`${employee.name} 스케줄 색상`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800 truncate">{employee.name}</p>
                <p className="text-[11px] text-stone-500">{employee.position}</p>
              </div>
              <button
                type="button"
                className="btn-ghost text-[11px] shrink-0"
                onClick={() => {
                  saveEmployeeScheduleColor(employee.id, null, employee);
                  onChange({
                    ...value,
                    employeeScheduleColors: {
                      ...(getAppSettings().schedule.employeeScheduleColors ?? {}),
                    },
                  });
                }}
              >
                기본
              </button>
            </div>
          ))}
        </div>
        )}
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

function ShiftTypeNameInput({
  value,
  onChange,
  onCommit,
  placeholder,
}: {
  value: string;
  onChange: (name: string) => void;
  onCommit: (name: string) => void;
  placeholder?: string;
}) {
  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    requestAnimationFrame(() => {
      input.select();
    });
  };

  return (
    <input
      className="input-luxury"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={() => onCommit(value)}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  );
}

function ShiftTypesSection() {
  const { settings, saveShiftTypes } = useSettings();
  const [deleteError, setDeleteError] = useState('');
  const [savedHint, setSavedHint] = useState('');
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const nameSaveTimersRef = useRef<Record<string, number>>({});

  const types = settings.shiftTypes;
  const sorted = sortShiftTypes(types);

  useEffect(() => {
    setNameDrafts((current) => {
      const next = { ...current };
      for (const row of types) {
        if (!(row.id in next)) {
          next[row.id] = row.name;
        }
      }
      for (const id of Object.keys(next)) {
        if (!types.some((row) => row.id === id)) {
          delete next[id];
        }
      }
      return next;
    });
  }, [types]);

  useEffect(() => {
    return () => {
      for (const timer of Object.values(nameSaveTimersRef.current)) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  useEffect(() => {
    if (!savedHint) return;
    const timer = window.setTimeout(() => setSavedHint(''), 2000);
    return () => window.clearTimeout(timer);
  }, [savedHint]);

  const persist = (next: ShiftType[], hint = '저장됨') => {
    saveShiftTypes(next);
    setSavedHint(hint);
  };

  const updateById = (id: string, patch: Partial<ShiftType>) => {
    persist(types.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const commitName = (id: string, name: string) => {
    const currentTypes = getAppSettings().shiftTypes;
    const trimmed = name.trim();
    const fallback = currentTypes.find((row) => row.id === id)?.name ?? '근무유형';
    const nextName = trimmed || fallback;
    setNameDrafts((current) => ({ ...current, [id]: nextName }));
    if (nextName !== currentTypes.find((row) => row.id === id)?.name) {
      persist(
        currentTypes.map((row) => (row.id === id ? { ...row, name: nextName } : row))
      );
    }
  };

  const handleNameChange = (id: string, name: string) => {
    setNameDrafts((current) => ({ ...current, [id]: name }));

    const existingTimer = nameSaveTimersRef.current[id];
    if (existingTimer) window.clearTimeout(existingTimer);

    nameSaveTimersRef.current[id] = window.setTimeout(() => {
      delete nameSaveTimersRef.current[id];
      commitName(id, name);
    }, 350);
  };

  const handleNameCommit = (id: string, name: string) => {
    const existingTimer = nameSaveTimersRef.current[id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete nameSaveTimersRef.current[id];
    }
    commitName(id, name);
  };

  const handleDelete = (id: string) => {
    const target = types.find((row) => row.id === id);
    if (!target) return;

    try {
      const { types: nextTypes, reassignedShiftCount, reassignTargetName } =
        deleteShiftType(id);

      setDeleteError('');
      setNameDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      saveShiftTypes(nextTypes);

      if (reassignedShiftCount > 0 && reassignTargetName) {
        setSavedHint(
          `"${target.name}" 삭제됨 · 스케줄 ${reassignedShiftCount}건을 "${reassignTargetName}"(으)로 이동`
        );
      } else {
        setSavedHint(`"${target.name}" 삭제됨`);
      }
    } catch (error) {
      if (error instanceof ShiftTypeDeleteError && error.code === 'MIN_ONE_SHIFT_TYPE') {
        setDeleteError('최소 1개의 근무유형이 필요합니다.');
        return;
      }
      setDeleteError('근무유형을 삭제하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  return (
    <SectionCard
      title="근무유형 관리"
      description="추가·수정·삭제·순서·색상 변경 시 Google Sheets에 즉시 저장됩니다."
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
                  onClick={() => persist(moveShiftType(types, index, -1))}
                  title="위로"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost p-1.5 touch-target"
                  disabled={index === sorted.length - 1}
                  onClick={() => persist(moveShiftType(types, index, 1))}
                  title="아래로"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  className="btn-ghost text-rose-600 text-xs px-2 touch-target"
                  onClick={() => handleDelete(row.id)}
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="유형 이름">
                <ShiftTypeNameInput
                  value={nameDrafts[row.id] ?? row.name}
                  onChange={(name) => handleNameChange(row.id, name)}
                  onCommit={(name) => handleNameCommit(row.id, name)}
                  placeholder="예: 오픈, 미들, 마감"
                />
              </Field>
              <Field label="색상">
                <input
                  type="color"
                  className="input-luxury h-[42px] p-1 w-full touch-target"
                  value={row.color}
                  onChange={(e) => updateById(row.id, { color: e.target.value })}
                />
              </Field>
              <Field label="기본 시작">
                <input
                  type="time"
                  className="input-luxury touch-target"
                  value={row.defaultStartTime ?? '10:00'}
                  onChange={(e) => updateById(row.id, { defaultStartTime: e.target.value })}
                />
              </Field>
              <Field label="기본 종료">
                <input
                  type="time"
                  className="input-luxury touch-target"
                  value={row.defaultEndTime ?? '14:00'}
                  onChange={(e) => updateById(row.id, { defaultEndTime: e.target.value })}
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

        {savedHint && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {savedHint} · Google Sheets에 반영됨
          </p>
        )}

        <button
          type="button"
          className="btn-secondary text-sm w-full sm:w-auto touch-target"
          onClick={() => {
            setDeleteError('');
            const nextId = createShiftTypeId('새 근무');
            persist([
              ...types,
              {
                id: nextId,
                name: '새 근무',
                color: '#C4A35A',
                sortOrder: types.length,
                defaultStartTime: '10:00',
                defaultEndTime: '14:00',
              },
            ]);
            setNameDrafts((current) => ({ ...current, [nextId]: '새 근무' }));
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
  const { settings, changePassword, changeEmployeePassword } = useSettings();
  const isAdminFirstSetup = !settings.security.passwordHash;
  const isEmployeeFirstSetup = !settings.security.employeePasswordHash;

  const [adminCurrent, setAdminCurrent] = useState('');
  const [adminNew, setAdminNew] = useState('');
  const [adminConfirm, setAdminConfirm] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const [employeeCurrent, setEmployeeCurrent] = useState('');
  const [employeeNew, setEmployeeNew] = useState('');
  const [employeeConfirm, setEmployeeConfirm] = useState('');
  const [employeeMessage, setEmployeeMessage] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);

  const handleAdminSubmit = async () => {
    setAdminError('');
    setAdminMessage('');

    if (adminNew !== adminConfirm) {
      setAdminError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setAdminSubmitting(true);
    const result = await changePassword(isAdminFirstSetup ? '' : adminCurrent, adminNew);
    setAdminSubmitting(false);

    if (result.ok) {
      setAdminMessage(result.message);
      setAdminCurrent('');
      setAdminNew('');
      setAdminConfirm('');
      return;
    }

    setAdminError(result.message);
  };

  const handleEmployeeSubmit = async () => {
    setEmployeeError('');
    setEmployeeMessage('');

    if (employeeNew !== employeeConfirm) {
      setEmployeeError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setEmployeeSubmitting(true);
    const result = await changeEmployeePassword(
      isEmployeeFirstSetup ? '' : employeeCurrent,
      employeeNew
    );
    setEmployeeSubmitting(false);

    if (result.ok) {
      setEmployeeMessage(result.message);
      setEmployeeCurrent('');
      setEmployeeNew('');
      setEmployeeConfirm('');
      return;
    }

    setEmployeeError(result.message);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="관리자 비밀번호"
        description="대시보드, 직원·실근무·급여·매출·재고·발주·설정 메뉴 접근에 사용됩니다"
      >
        {isAdminFirstSetup ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            최초 1회 관리자 비밀번호를 설정해 주세요.
          </p>
        ) : (
          <p className="text-sm text-stone-600">
            비밀번호는 Google Sheets에 해시 형태로 저장됩니다. 로그인 후 8시간 유지, 30분 미사용 시
            자동 잠금됩니다.
          </p>
        )}

        <div className="grid gap-4 max-w-md">
          {!isAdminFirstSetup && (
            <Field label="현재 관리자 비밀번호">
              <input
                type="password"
                className="input-luxury"
                value={adminCurrent}
                onChange={(e) => setAdminCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          )}
          <Field label="새 관리자 비밀번호">
            <input
              type="password"
              className="input-luxury"
              value={adminNew}
              onChange={(e) => setAdminNew(e.target.value)}
              autoComplete="new-password"
              placeholder="4자 이상"
            />
          </Field>
          <Field label="새 관리자 비밀번호 확인">
            <input
              type="password"
              className="input-luxury"
              value={adminConfirm}
              onChange={(e) => setAdminConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>

        {adminError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {adminError}
          </p>
        )}
        {adminMessage && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {adminMessage}
          </p>
        )}

        <button
          type="button"
          className="btn-primary text-sm"
          onClick={handleAdminSubmit}
          disabled={adminSubmitting || !adminNew || !adminConfirm}
        >
          {adminSubmitting ? '저장 중…' : isAdminFirstSetup ? '관리자 비밀번호 설정' : '관리자 비밀번호 변경'}
        </button>
      </SectionCard>

      <SectionCard
        title="직원 비밀번호"
        description="재고 관리·발주 관리 메뉴 접근에 사용됩니다"
      >
        {isEmployeeFirstSetup ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            직원용 비밀번호를 설정하면 재고·발주 메뉴를 직원 권한으로 열 수 있습니다.
          </p>
        ) : (
          <p className="text-sm text-stone-600">
            직원 비밀번호는 관리자 비밀번호와 별도입니다. 로그인 후 8시간 유지, 30분 미사용 시 자동
            잠금됩니다.
          </p>
        )}

        <div className="grid gap-4 max-w-md">
          {!isEmployeeFirstSetup && (
            <Field label="현재 직원 비밀번호">
              <input
                type="password"
                className="input-luxury"
                value={employeeCurrent}
                onChange={(e) => setEmployeeCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          )}
          <Field label="새 직원 비밀번호">
            <input
              type="password"
              className="input-luxury"
              value={employeeNew}
              onChange={(e) => setEmployeeNew(e.target.value)}
              autoComplete="new-password"
              placeholder="4자 이상"
            />
          </Field>
          <Field label="새 직원 비밀번호 확인">
            <input
              type="password"
              className="input-luxury"
              value={employeeConfirm}
              onChange={(e) => setEmployeeConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>

        {employeeError && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
            {employeeError}
          </p>
        )}
        {employeeMessage && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {employeeMessage}
          </p>
        )}

        <button
          type="button"
          className="btn-primary text-sm"
          onClick={handleEmployeeSubmit}
          disabled={employeeSubmitting || !employeeNew || !employeeConfirm}
        >
          {employeeSubmitting
            ? '저장 중…'
            : isEmployeeFirstSetup
              ? '직원 비밀번호 설정'
              : '직원 비밀번호 변경'}
        </button>
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
