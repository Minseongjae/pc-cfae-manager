/** Parse a numeric text field: empty → null, explicit 0 → 0. */
export function parseNumericInput(raw: string): number | null {
  if (raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Display value for a controlled number input. */
export function formatNumericInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** Coerce stored/API values into number | null. */
export function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === '') return null;
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
