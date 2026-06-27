import { useEffect, useState } from 'react';
import { formatNumericInput, parseNumericInput } from '@/lib/numericInput';

interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function NumericInput({ value, onChange, onBlur, onFocus, ...props }: NumericInputProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatNumericInput(value));
    }
  }, [focused, value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={focused ? draft : formatNumericInput(value)}
      onFocus={(event) => {
        setFocused(true);
        setDraft(formatNumericInput(value));
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value.replace(/[^\d]/g, '');
        setDraft(next);
      }}
      onBlur={(event) => {
        setFocused(false);
        onChange(parseNumericInput(draft));
        onBlur?.(event);
      }}
    />
  );
}
