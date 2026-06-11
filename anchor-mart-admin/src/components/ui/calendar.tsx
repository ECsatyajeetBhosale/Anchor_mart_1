import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = ComponentProps<typeof DayPicker>;

/**
 * Calendar built on react-day-picker. Theming lives in `index.css` under the
 * `.am-calendar` scope (overrides the library's `--rdp-*` variables with our
 * design tokens); the chevrons use the project's Tabler icon set.
 */
export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("am-calendar p-3", className)}
      components={{
        Chevron: ({ orientation }: { orientation?: "up" | "down" | "left" | "right" }) =>
          orientation === "left" ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />,
      }}
      {...props}
    />
  );
}
