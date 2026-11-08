"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordField({
  id,
  label,
  autoComplete,
  required = true,
  minLength,
  hint,
  className = "",
  defaultValue,
}: {
  id: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
  className?: string;
  defaultValue?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          defaultValue={defaultValue}
          className="input password-input"
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
