import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const controlClass =
  'field mt-1.5 w-full rounded-xl px-3 py-2.5 text-ink outline-none placeholder:text-mist/70';

type TextFieldProps = {
  label: string;
  error?: string | undefined;
} & InputHTMLAttributes<HTMLInputElement>;

export function TextField({ label, error, id, name, ...props }: TextFieldProps) {
  const fieldId = id ?? name ?? label;
  const errorId = `${fieldId}-error`;
  return (
    <label className="block text-sm" htmlFor={fieldId}>
      <span className="font-semibold">{label}</span>
      <input
        id={fieldId}
        name={name}
        className={controlClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-clay">
          {error}
        </span>
      ) : null}
    </label>
  );
}

type TextAreaFieldProps = {
  label: string;
  error?: string | undefined;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ label, error, id, name, ...props }: TextAreaFieldProps) {
  const fieldId = id ?? name ?? label;
  const errorId = `${fieldId}-error`;
  return (
    <label className="block text-sm" htmlFor={fieldId}>
      <span className="font-semibold">{label}</span>
      <textarea
        id={fieldId}
        name={name}
        className={`${controlClass} min-h-28`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <span id={errorId} className="mt-1 block text-clay">
          {error}
        </span>
      ) : null}
    </label>
  );
}
