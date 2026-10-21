import { cn } from "@/lib/utils";
import type * as React from "react";

export interface FormFieldProps {
  /** Usually text; a node when the label carries an inline control such as an info tooltip. */
  label?: React.ReactNode;
  /** Appends the `*` required marker to the label (BUG-030). A no-op if the label already ends in one. */
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className,
  style,
}: FormFieldProps) {
  const marked =
    required && !(typeof label === "string" && label.trim().endsWith("*")) ? (
      <>
        {label} <span className="text-[var(--danger-text)]">*</span>
      </>
    ) : (
      label
    );
  return (
    <div className={cn("fg", className)} style={style}>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is a generic layout element wrapping children */}
      {label && <label className="fg-label">{marked}</label>}
      {children}
      {error && (
        <div className="fg-error text-[var(--danger-text)] text-[12px] mt-1 font-semibold">
          {error}
        </div>
      )}
      {hint && !error && <div className="fg-hint">{hint}</div>}
    </div>
  );
}

export default FormField;
