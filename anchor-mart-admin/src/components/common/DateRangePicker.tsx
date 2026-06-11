import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
 * Date-range picker — a shadcn-style composition of `Popover` + `Calendar`
 * (there is no standalone DatePicker primitive). The trigger reuses the project
 * `Button`; the panel shows a two-month range calendar.
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
      <PopoverContent align="end" className="w-auto">
        <Calendar mode="range" numberOfMonths={1} selected={value} onSelect={onChange} autoFocus />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
