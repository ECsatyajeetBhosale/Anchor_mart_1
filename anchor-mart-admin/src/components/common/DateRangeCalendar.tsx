import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export interface DateRangeCalendarProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  /** Heading above the start-date calendar. */
  fromLabel?: string;
  /** Heading above the end-date calendar. */
  toLabel?: string;
  className?: string;
}

/**
 * Two side-by-side single-date calendars (shadcn `Calendar`, dropdown caption)
 * sharing one surface — a "From" calendar on the left and a "To" calendar on
 * the right. Each pick updates its end of the range and the combined
 * {@link DateRange} is returned through `onChange`.
 */
export function DateRangeCalendar({
  value,
  onChange,
  fromLabel = "From",
  toLabel = "To",
  className,
}: DateRangeCalendarProps) {
  // Every range picker here filters history (orders, analytics, audit), so a
  // day after today can only produce an empty result (BUG-025).
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth());
  const handleFrom = (date: Date | undefined) => onChange?.({ from: date, to: value?.to });
  const handleTo = (date: Date | undefined) => onChange?.({ from: value?.from, to: date });

  return (
    <div className={cn("flex flex-wrap items-start", className)}>
      {/* From */}
      <div className="flex flex-col gap-1 px-2">
        <span className="fg-label">{fromLabel}</span>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value?.from}
          defaultMonth={value?.from}
          onSelect={handleFrom}
          endMonth={lastMonth}
          // A start after the chosen end is a range every API rejects (BUG-001).
          disabled={{ after: value?.to && value.to < today ? value.to : today }}
        />
      </div>

      {/* To */}
      <div className="flex flex-col gap-1 pl-2 border-l border-[var(--border-sm)]">
        <span className="fg-label">{toLabel}</span>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={value?.to}
          defaultMonth={value?.to}
          onSelect={handleTo}
          endMonth={lastMonth}
          disabled={value?.from ? [{ before: value.from }, { after: today }] : { after: today }}
        />
      </div>
    </div>
  );
}

export default DateRangeCalendar;
