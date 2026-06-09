import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "teal" | "danger" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", loading, children, disabled, ...props }, ref) => {
    // Mapping button variant classes from design system CSS
    const variantClasses = {
      primary: "bg-[var(--navy-900)] text-white hover:bg-[var(--navy-800)] hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-y-0 active:shadow-none",
      secondary: "bg-[var(--surface)] border border-[var(--border-md)] text-[var(--t2)] hover:bg-[var(--surface-alt)] hover:border-[var(--border-lg)] hover:text-[var(--t1)]",
      teal: "bg-[var(--teal-600)] text-white hover:bg-[var(--teal-500)] hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-y-0 active:shadow-none",
      danger: "bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger-text)] hover:bg-[#fee2e2] hover:border-[var(--danger-icon)]",
      ghost: "bg-transparent text-[var(--t2)] hover:bg-[var(--surface-hover)] hover:text-[var(--t1)]",
      link: "bg-transparent text-[var(--teal-600)] underline-offset-4 hover:underline",
    };

    const sizeClasses = {
      default: "h-[38px] px-4 text-[13.5px]",
      xs: "h-[26px] px-2.5 text-[11.5px] rounded-[var(--radius-xs)]",
      sm: "h-[32px] px-3 text-[12.5px] rounded-[var(--radius-sm)]",
      lg: "h-[44px] px-[22px] text-[14.5px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-bold font-body cursor-pointer border-[1.5px] border-transparent rounded-[var(--radius-md)] transition-all duration-150 select-none text-decoration-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-500)] disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
          variantClasses[variant],
          sizeClasses[size],
          loading && "relative text-transparent hover:text-transparent",
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <title>Loading spinner</title>
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
