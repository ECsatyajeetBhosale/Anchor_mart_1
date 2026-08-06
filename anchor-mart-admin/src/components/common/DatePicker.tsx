import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconCalendar } from "@tabler/icons-react";
import { format, isValid, parseISO } from "date-fns";
import { useState } from "react";

export interface DatePickerProps {
  /** `YYYY-MM-DD`, or "" when unset — the shape form state and the API use. */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}

/** `YYYY-MM-DD` → Date, or undefined when blank/unparseable. */
function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

/**
 * Single-date picker: the shared `Calendar` in a popover, styled as a form
 * control.
 *
 * Replaces `<Input type="date">`, whose calendar is drawn by the browser — it
 * ignores the app's theme, differs on every platform, and on Firefox/Safari is
 * effectively a text box, so a date was only as good as what the admin typed.
 *
 * Values are exchanged as `YYYY-MM-DD` strings so this drops into existing form
 * state and API payloads unchanged. Formatting for display happens here.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  error,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "input flex w-full items-center gap-2 text-left",
            !selected && "text-[var(--t4)]",
            error && "border-[var(--danger-border)]",
            disabled && "cursor-not-allowed opacity-60",
            className,
          )}
        >
          <IconCalendar size={15} className="shrink-0 text-[var(--t4)]" />
          <span className="trunc">{selected ? format(selected, "d MMM yyyy") : placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          // Reopen on the month of the selected date, not on today's month.
          defaultMonth={selected}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
