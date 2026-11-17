import type { ReactNode } from 'react';

interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FormField({ name, label, required, hint, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={name}>{label} {required ? <span className="required-mark" aria-hidden="true">*</span> : <span className="optional-label">Opcional</span>}</label>
      {children}
      {hint && <p id={`${name}-hint`} className="field-hint">{hint}</p>}
    </div>
  );
}
