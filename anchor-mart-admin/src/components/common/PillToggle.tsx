import { cn } from "@/lib/utils";

export interface PillToggleOption<T extends string> {
  label: string;
  value: T;
}

export interface PillToggleProps<T extends string> {
  options: PillToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Segmented pill toggle (Today / Week / Month, Daily / Weekly, …). Renders the
 * design-system `.pill-toggle` / `.pill-btn` control with real `<button>`s for
 * keyboard + a11y instead of clickable `<div>`s.
 */
export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: PillToggleProps<T>) {
  return (
    <div className={cn("pill-toggle", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cn(
            "pill-btn appearance-none border-0 bg-transparent font-[inherit]",
            opt.value === value && "active",
          )}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default PillToggle;
