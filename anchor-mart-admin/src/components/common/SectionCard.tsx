import { cn } from "@/lib/utils";
import type * as React from "react";

export interface SectionCardProps {
  /** Optional leading icon shown before the title in the header. */
  icon?: React.ReactNode;
  /** Header title. When both `title` and `actions` are omitted no header renders. */
  title?: React.ReactNode;
  /** Right-aligned header slot (buttons, badges, toggles). */
  actions?: React.ReactNode;
  /** Optional footer content rendered on the muted footer bar. */
  footer?: React.ReactNode;
  /**
   * Body padding preset: `default` → `.card-body` (20px), `sm` → `.card-body-sm`
   * (14/18px), `none` → no padding (use for edge-to-edge tables / custom bodies).
   */
  bodyPadding?: "default" | "sm" | "none";
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const BODY_PADDING: Record<NonNullable<SectionCardProps["bodyPadding"]>, string> = {
  default: "card-body",
  sm: "card-body-sm",
  none: "",
};

/**
 * Canonical card shell — `.card` outline with an optional header (icon + title +
 * actions), a padded body, and an optional footer bar. Wraps the design-system
 * `.card`/`.card-hd`/`.card-foot` classes so pages compose cards without
 * hand-rolling the markup (see the dashboard sections).
 */
export function SectionCard({
  icon,
  title,
  actions,
  footer,
  bodyPadding = "default",
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  const hasHeader = title != null || actions != null;
  return (
    <div className={cn("card", className)}>
      {hasHeader && (
        <div className="card-hd">
          <div className="card-ttl">
            {icon}
            {title}
          </div>
          {actions && <div className="card-acts">{actions}</div>}
        </div>
      )}
      <div className={cn(BODY_PADDING[bodyPadding], bodyClassName)}>{children}</div>
      {footer && <div className="card-foot">{footer}</div>}
    </div>
  );
}

export default SectionCard;
