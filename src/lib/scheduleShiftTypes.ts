import type { ShiftType } from '@/types';

/** Legacy row ids used in seed schedule data */
export const LEGACY_SHIFT_ROW_LABELS: Record<string, string> = {
  morning: '오전',
  afternoon1: '오후 1',
  afternoon2: '오후 2',
  afternoon3: '오후 3',
  afternoon4: '오후 4',
  middle: '미들',
  night: '야간 1~2',
  training: '교육 1~3',
};

export const DEFAULT_SCHEDULE_SHIFT_TYPES: ShiftType[] = [
  {
    id: 'morning',
    name: '오전',
    color: '#3B82F6',
    sortOrder: 0,
    defaultStartTime: '10:00',
    defaultEndTime: '14:00',
  },
  {
    id: 'afternoon1',
    name: '오후 1',
    color: '#10B981',
    sortOrder: 1,
    defaultStartTime: '14:00',
    defaultEndTime: '18:00',
  },
  {
    id: 'afternoon2',
    name: '오후 2',
    color: '#06B6D4',
    sortOrder: 2,
    defaultStartTime: '15:00',
    defaultEndTime: '19:00',
  },
  {
    id: 'afternoon3',
    name: '오후 3',
    color: '#14B8A6',
    sortOrder: 3,
    defaultStartTime: '16:00',
    defaultEndTime: '20:00',
  },
  {
    id: 'afternoon4',
    name: '오후 4',
    color: '#0EA5E9',
    sortOrder: 4,
    defaultStartTime: '17:00',
    defaultEndTime: '21:00',
  },
  {
    id: 'middle',
    name: '미들',
    color: '#8B5CF6',
    sortOrder: 5,
    defaultStartTime: '18:00',
    defaultEndTime: '22:00',
  },
  {
    id: 'night',
    name: '야간 1~2',
    color: '#6366F1',
    sortOrder: 6,
    defaultStartTime: '22:00',
    defaultEndTime: '06:00',
  },
  {
    id: 'training',
    name: '교육 1~3',
    color: '#F97316',
    sortOrder: 7,
    defaultStartTime: '16:00',
    defaultEndTime: '18:00',
  },
];

type LegacyShiftType = {
  id: number;
  name: string;
  dayType: string;
  startTime: string;
  endTime: string;
  color: string;
};

function isLegacyShiftType(value: unknown): value is LegacyShiftType {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'number' && typeof row.dayType === 'string';
}

function isModernShiftType(value: unknown): value is ShiftType {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.name === 'string' && typeof row.color === 'string';
}

function normalizeShiftType(raw: ShiftType, index: number): ShiftType {
  return {
    id: raw.id,
    name: raw.name.trim() || `근무유형 ${index + 1}`,
    color: normalizeHexColor(raw.color),
    sortOrder: Number.isFinite(raw.sortOrder) ? raw.sortOrder : index,
    defaultStartTime: raw.defaultStartTime || '10:00',
    defaultEndTime: raw.defaultEndTime || '14:00',
  };
}

export function normalizeHexColor(color: string): string {
  if (!color) return '#9CA3AF';
  const trimmed = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const hex = trimmed.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  return '#9CA3AF';
}

export function migrateShiftTypes(input: unknown): ShiftType[] {
  let result: ShiftType[];

  if (!Array.isArray(input) || input.length === 0) {
    result = DEFAULT_SCHEDULE_SHIFT_TYPES.map((type) => ({ ...type }));
  } else if (isLegacyShiftType(input[0])) {
    result = (input as LegacyShiftType[])
      .map((row, index) => ({
        id: row.dayType?.trim() || `legacy-${row.id}`,
        name: row.name.trim() || `근무유형 ${index + 1}`,
        color: normalizeHexColor(row.color),
        sortOrder: index,
        defaultStartTime: row.startTime || '10:00',
        defaultEndTime: row.endTime || '14:00',
      }))
      .map((type, index) => normalizeShiftType(type, index));
  } else if (!isModernShiftType(input[0])) {
    result = DEFAULT_SCHEDULE_SHIFT_TYPES.map((type) => ({ ...type }));
  } else {
    result = [...(input as ShiftType[])]
      .map((type, index) => normalizeShiftType(type, index))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((type, index) => ({ ...type, sortOrder: index }));
  }

  return ensureAfternoonShiftRows(result);
}

const AFTERNOON_SHIFT_DEFAULTS: Omit<ShiftType, 'sortOrder'>[] = [
  {
    id: 'afternoon3',
    name: '오후 3',
    color: '#14B8A6',
    defaultStartTime: '16:00',
    defaultEndTime: '20:00',
  },
  {
    id: 'afternoon4',
    name: '오후 4',
    color: '#0EA5E9',
    defaultStartTime: '17:00',
    defaultEndTime: '21:00',
  },
];

function ensureAfternoonShiftRows(types: ShiftType[]): ShiftType[] {
  const known = new Set(types.map((type) => type.id));
  const merged = [...types];
  let order = merged.length;

  for (const row of AFTERNOON_SHIFT_DEFAULTS) {
    if (known.has(row.id)) continue;
    merged.push({ ...row, sortOrder: order });
    known.add(row.id);
    order += 1;
  }

  return sortShiftTypes(merged);
}

export function createShiftTypeId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
    .slice(0, 24);
  return `${slug || 'shift'}-${Date.now().toString(36)}`;
}

export function sortShiftTypes(types: ShiftType[]): ShiftType[] {
  return [...types]
    .map((type, index) => normalizeShiftType(type, index))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((type, index) => ({ ...type, sortOrder: index }));
}

export function moveShiftType(types: ShiftType[], index: number, direction: -1 | 1): ShiftType[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= types.length) return types;
  const sorted = sortShiftTypes(types);
  const reordered = [...sorted];
  const [item] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, item);
  return reordered.map((type, i) => ({ ...type, sortOrder: i }));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex).slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function shiftTypeCardStyle(color: string): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  const { r, g, b } = hexToRgb(color);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.14)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.45)`,
    color: `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`,
  };
}

export function appendMissingShiftTypes(
  types: ShiftType[],
  usedRowIds: string[]
): ShiftType[] {
  const merged = sortShiftTypes(types);
  const known = new Set(merged.map((type) => type.id));
  let order = merged.length;

  for (const rowId of usedRowIds) {
    if (known.has(rowId)) continue;
    merged.push({
      id: rowId,
      name: LEGACY_SHIFT_ROW_LABELS[rowId] ?? rowId,
      color: '#9CA3AF',
      sortOrder: order,
      defaultStartTime: '10:00',
      defaultEndTime: '14:00',
    });
    known.add(rowId);
    order += 1;
  }

  return merged.map((type, index) => ({ ...type, sortOrder: index }));
}
