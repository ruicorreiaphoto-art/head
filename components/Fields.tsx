'use client';
import { useId } from 'react';
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
  required = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        aria-label={label}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | [string, string])[];
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => {
          const [v, l] = typeof o === 'string' ? [o, o] : o;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}
export function Range({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <label className="field range" htmlFor={id}>
      <span>
        {label}
        <strong>
          {value}
          <small>/10</small>
        </strong>
      </span>
      <input
        id={id}
        aria-label={label}
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function Multi({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="multi">
      <legend>{label}</legend>
      <div className="chips">
        {Array.from(new Set(options)).map((o) => (
          <button
            type="button"
            key={o}
            className={value.includes(o) ? 'chip selected' : 'chip'}
            aria-pressed={value.includes(o)}
            onClick={() =>
              onChange(
                value.includes(o)
                  ? value.filter((v) => v !== o)
                  : [...value, o],
              )
            }
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Section({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details className="form-section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}
