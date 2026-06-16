import { formatNumericInput, parseNumericInput } from '@/lib/numericInput';

interface NumericInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange'
  > {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function NumericInput({ value, onChange, ...props }: NumericInputProps) {
  return (
    <input
      type="number"
      {...props}
      value={formatNumericInput(value)}
      onChange={(e) => onChange(parseNumericInput(e.target.value))}
    />
  );
}
