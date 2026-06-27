export const SCHEDULE_FONT_IDS = ['dm-sans', 'noto-sans-kr', 'garamond', 'system'] as const;
export type ScheduleFontId = (typeof SCHEDULE_FONT_IDS)[number];

export interface ScheduleFontOption {
  id: ScheduleFontId;
  label: string;
  stack: string;
}

export const SCHEDULE_FONT_OPTIONS: ScheduleFontOption[] = [
  {
    id: 'dm-sans',
    label: 'DM Sans (기본)',
    stack: '"DM Sans", "Noto Sans KR", system-ui, sans-serif',
  },
  {
    id: 'noto-sans-kr',
    label: 'Noto Sans KR',
    stack: '"Noto Sans KR", "DM Sans", system-ui, sans-serif',
  },
  {
    id: 'garamond',
    label: 'Cormorant Garamond',
    stack: '"Cormorant Garamond", Georgia, "Noto Sans KR", serif',
  },
  {
    id: 'system',
    label: '시스템 기본',
    stack: 'system-ui, -apple-system, "Noto Sans KR", sans-serif',
  },
];

export function migrateScheduleFontFamily(input: string | undefined): ScheduleFontId {
  if (input && SCHEDULE_FONT_IDS.includes(input as ScheduleFontId)) {
    return input as ScheduleFontId;
  }
  return 'dm-sans';
}

export function resolveScheduleFontFamily(id: ScheduleFontId | string | undefined): string {
  const normalized = migrateScheduleFontFamily(id);
  return SCHEDULE_FONT_OPTIONS.find((row) => row.id === normalized)?.stack ?? SCHEDULE_FONT_OPTIONS[0].stack;
}
