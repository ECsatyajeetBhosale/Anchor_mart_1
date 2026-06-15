import { DateRangeCalendar } from "@/components/common/DateRangeCalendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Date-range picker — a `Popover` trigger (the project `Button` showing the
 * selected range) over a {@link DateRangeCalendar} panel: two separate
 * From / To single-date calendars on one shared surface.
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "Date Range",
  className,
}: DateRangePickerProps) {
  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn(!value?.from && "text-[var(--t3)]", className)}
        >
          <IconCalendar size={14} />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <DateRangeCalendar value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
