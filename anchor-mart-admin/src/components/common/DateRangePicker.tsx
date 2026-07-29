import { DateRangeCalendar } from "@/components/common/DateRangeCalendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : placeholder;

  // Propagate the change, then close the panel once a full range is picked so
  // the cards refetch with the new from/to.
  const handleChange = (range: DateRange | undefined) => {
    onChange?.(range);
    if (range?.from && range?.to) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent align="end" className="w-auto p-2">
        <DateRangeCalendar value={value} onChange={handleChange} />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
