import { Badge, type BadgeProps } from "@/components/ui/badge";

export interface StatusBadgeProps {
  status: string | boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusBadge({
  status,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: StatusBadgeProps) {
  let isTrue = false;
  let label = "";

  if (typeof status === "boolean") {
    isTrue = status;
    label = isTrue ? activeLabel : inactiveLabel;
  } else {
    const norm = status.trim().toLowerCase();
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
      label = status;
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

  return <Badge variant={variant}>{label}</Badge>;
}

export default StatusBadge;
