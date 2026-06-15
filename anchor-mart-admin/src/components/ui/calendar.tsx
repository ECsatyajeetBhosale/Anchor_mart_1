import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * Calendar built on react-day-picker. Uses the dropdown caption layout
 * (month + year selects) so each displayed month can be navigated
 * independently. Theming lives in `index.css` under the `.am-calendar` scope
 * (overrides the library's `--rdp-*` variables with our design tokens); the
 * chevrons use the project's Tabler icon set.
 */
export function Calendar({
  className,
  captionLayout = "dropdown",
  startMonth = new Date(2000, 0),
  endMonth = new Date(2035, 11),
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      className={cn("am-calendar p-1", className)}
      captionLayout={captionLayout}
      startMonth={startMonth}
      endMonth={endMonth}
      components={{
        Chevron: ({ orientation }: { orientation?: "up" | "down" | "left" | "right" }) =>
          orientation === "left" ? <IconChevronLeft size={15} /> : <IconChevronRight size={15} />,
      }}
      {...props}
    />
  );
}
