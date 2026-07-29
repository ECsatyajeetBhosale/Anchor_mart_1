import { cn } from "@/lib/utils";
import type * as React from "react";

export interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FormField({ label, hint, error, children, className, style }: FormFieldProps) {
  return (
    <div className={cn("fg", className)} style={style}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is a generic layout element wrapping children */}
      {label && <label className="fg-label">{label}</label>}
      {children}
      {error && (
        <div className="fg-error text-[var(--danger-text)] text-[11px] mt-1 font-semibold">
          {error}
        </div>
      )}
      {hint && !error && <div className="fg-hint">{hint}</div>}
    </div>
  );
}

export default FormField;
