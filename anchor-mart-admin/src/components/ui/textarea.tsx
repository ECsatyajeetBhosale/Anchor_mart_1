import { cn } from "@/lib/utils";
import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full min-h-[80px] px-3 py-2 bg-[var(--surface-input)] border-[1.5px] border-[var(--border-md)] rounded-[var(--radius-md)] text-[var(--t1)] font-medium font-body text-[13.5px] outline-none transition-all duration-200 resize-y placeholder:text-[var(--t4)] placeholder:font-medium focus:border-[var(--teal-500)] focus:shadow-[var(--shadow-focus-teal)] disabled:cursor-not-allowed disabled:opacity-60",
          error &&
            "border-[var(--danger-icon)] bg-[var(--danger-bg)] focus:border-[var(--danger-icon)] focus:shadow-[var(--shadow-focus-red)]",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
