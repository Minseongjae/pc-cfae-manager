import { useEffect, useState } from 'react';

interface TimeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/** Normalize partial time text to HH:mm (24h). Returns null if invalid. */
export function normalizeTimeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function TimeInput({ value, onChange, onBlur, onFocus, ...props }: TimeInputProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value);
  }, [focused, value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="09:00"
      pattern="[0-9]{1,2}:[0-9]{2}"
      value={focused ? draft : value}
      onFocus={(event) => {
        setFocused(true);
        setDraft(value);
        onFocus?.(event);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        setFocused(false);
        if (!draft.trim()) {
          onChange('');
          setDraft('');
          onBlur?.(event);
          return;
        }
        const normalized = normalizeTimeInput(draft);
        if (normalized) {
          onChange(normalized);
          setDraft(normalized);
        } else {
          setDraft(value);
        }
        onBlur?.(event);
      }}
    />
  );
}
