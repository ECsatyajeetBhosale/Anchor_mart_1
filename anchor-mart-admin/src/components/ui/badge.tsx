import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "navy"
    | "teal"
    | "amber"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "neutral"
    | "purple";
  showDot?: boolean;
}

function Badge({ className, variant = "neutral", showDot = false, children, ...props }: BadgeProps) {
  const variantClasses = {
    navy: "bg-[var(--navy-50)] border-[var(--navy-100)] text-[var(--navy-700)]",
    teal: "bg-[var(--teal-50)] border-[var(--teal-100)] text-[var(--teal-700)]",
    amber: "bg-[var(--amber-50)] border-[var(--amber-100)] text-[var(--amber-700)]",
    success: "bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]",
    danger: "bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger-text)]",
    warning: "bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning-text)]",
    info: "bg-[var(--info-bg)] border-[var(--info-border)] text-[var(--info-text)]",
    neutral: "bg-[var(--neutral-bg)] border-[var(--neutral-border)] text-[var(--neutral-text)]",
    purple: "bg-[var(--purple-bg)] border-[var(--purple-border)] text-[var(--purple-text)]",
  };

  const dotClasses = {
    navy: "bg-[var(--navy-500)]",
    teal: "bg-[var(--teal-500)]",
    amber: "bg-[var(--amber-500)]",
    success: "bg-[var(--success-icon)]",
    danger: "bg-[var(--danger-icon)]",
    warning: "bg-[var(--warning-icon)]",
    info: "bg-[var(--info-icon)]",
    neutral: "bg-[var(--t4)]",
    purple: "bg-[var(--purple-icon)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full border text-[11px] font-extrabold font-body tracking-[0.2px] uppercase select-none",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClasses[variant])} />
      )}
      {children}
    </div>
  );
}

export { Badge };
export type { BadgeProps as BadgePropsType };
