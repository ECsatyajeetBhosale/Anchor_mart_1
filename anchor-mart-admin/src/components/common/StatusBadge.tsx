import { Badge, type BadgeProps } from "@/components/ui/badge";

export interface StatusBadgeProps {
  /**
   * Nullish is tolerated on purpose: this badge renders API-supplied status
   * fields across most tables, and a single payload missing one must not throw
   * and blank the whole page. A missing status renders as an em dash.
   */
  status: string | boolean | null | undefined;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

/** Shown when the backend omits the status field entirely. */
const MISSING_STATUS = "—";

export function StatusBadge({
  status,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  className,
}: StatusBadgeProps) {
  let isTrue = false;
  let label = "";

  if (typeof status === "boolean") {
    isTrue = status;
    label = isTrue ? activeLabel : inactiveLabel;
  } else if (status === null || status === undefined) {
    label = MISSING_STATUS;
  } else {
    const norm = String(status).trim().toLowerCase();
    isTrue =
      norm === "active" ||
      norm === "in-stock" ||
      norm === "in stock" ||
      norm === "true" ||
      norm === "success";
    if (norm === "in-stock" || norm === "in stock") {
      label = "In Stock";
    } else if (norm === "out-of-stock" || norm === "out of stock") {
      label = "Out of Stock";
    } else if (norm === "low-stock" || norm === "low stock") {
      label = "Low Stock";
    } else {
      label = String(status);
    }
  }

  let variant: BadgeProps["variant"] = "neutral";
  const normLabel = label.toLowerCase();

  if (
    normLabel === "active" ||
    normLabel === "in stock" ||
    normLabel === "success" ||
    normLabel === "delivered"
  ) {
    variant = "success";
  } else if (
    normLabel === "inactive" ||
    normLabel === "out of stock" ||
    normLabel === "danger" ||
    normLabel === "cancelled"
  ) {
    variant = "danger";
  } else if (normLabel === "low stock" || normLabel === "warning" || normLabel === "in progress") {
    variant = "warning";
  } else if (normLabel === "verifying" || normLabel === "info") {
    variant = "info";
  } else if (normLabel === "delivering" || normLabel === "teal") {
    variant = "teal";
  } else if (normLabel === "new" || normLabel === "neutral") {
    variant = "neutral";
  } else if (normLabel === "featured" || normLabel === "yes" || normLabel === "deal") {
    variant = "amber";
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export default StatusBadge;
