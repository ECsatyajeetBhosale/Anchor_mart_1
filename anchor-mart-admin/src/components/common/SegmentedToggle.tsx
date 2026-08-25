export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Stretches each segment to fill the row. Off by default, for header use. */
  fill?: boolean;
}

/**
 * A small set of mutually exclusive choices, shown as one control.
 *
 * Preferred over a dropdown wherever the options are few and short: a dropdown
 * hides the alternatives behind a click and gives no sense of how many there
 * are, which is the wrong trade when the whole set fits on a line. It is also
 * one interaction rather than two to move between neighbouring filters.
 *
 * Deliberately generic over the value type so the caller keeps its own union —
 * the toggle never widens a filter to `string`.
 */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  fill = false,
}: SegmentedToggleProps<T>) {
  return (
    // Deliberately no wrapper role. `tablist` would promise panels that do not
    // exist, and a `group` role on a div is not a semantic element. Each button
    // carries `aria-pressed` and its own label, which makes the current choice
    // audible without inventing structure around it.
    <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-[var(--radius-sm)] px-3 py-[6px] font-bold text-[12.5px] transition-colors ${
              fill ? "flex-1" : ""
            } ${
              active
                ? "bg-[var(--surface)] text-[var(--t1)] shadow-[var(--sh-xs)]"
                : "text-[var(--t4)] hover:text-[var(--t1)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedToggle;
