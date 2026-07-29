import { cn } from "@/lib/utils";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent outline-none transition-colors focus-visible:shadow-[var(--shadow-focus-teal)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--teal-500)] data-[state=unchecked]:bg-[var(--border-lg)]",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[1px]" />
  </SwitchPrimitive.Root>
));

Switch.displayName = "Switch";

export { Switch };
