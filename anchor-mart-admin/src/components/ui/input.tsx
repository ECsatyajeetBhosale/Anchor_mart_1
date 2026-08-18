import { cn } from "@/lib/utils";
import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "w-full h-10 px-3 bg-[var(--surface-input)] border-[1.5px] border-[var(--border-md)] rounded-[var(--radius-md)] text-[var(--t1)] font-medium font-body text-[13.5px] outline-none transition-all duration-200 placeholder:text-[var(--t4)] placeholder:font-medium focus:border-[var(--teal-500)] focus:shadow-[var(--shadow-focus-teal)]",
          error &&
            "border-[var(--danger-icon)] bg-[var(--danger-bg)] focus:border-[var(--danger-icon)] focus:shadow-[var(--shadow-focus-red)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
