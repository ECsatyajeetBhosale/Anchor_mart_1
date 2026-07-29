import type * as React from "react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";
  delta?: { value: string; direction: "up" | "down" };
  footer?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  icon,
  variant = "navy",
  delta,
  footer,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn("stat-card flex flex-col justify-between h-full", `sc-${variant}`)}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", paddingBottom: "8px" }}
    >
      <div className="stat-stripe" />
      <div className="stat-top">
        <div className="stat-lbl">{label}</div>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-val">{value}</div>
      {(delta || footer) && (
        <div className="stat-foot mt-auto">
          {delta && (
            <span className={cn("stat-delta", delta.direction === "up" ? "up" : "dn")}>
              {delta.direction === "up" ? (
                <IconTrendingUp size={13} />
              ) : (
                <IconTrendingDown size={13} />
              )}
              {delta.value}
            </span>
          )}
          {footer && <span>{footer}</span>}
        </div>
      )}
    </Card>
  );
}
export default StatCard;
