import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * A stat tile: label, icon, and one number.
 *
 * Deliberately no footer or delta line. The secondary text under the value
 * ("10 active · 4 top-rated", "All statuses") competed with the number it sat
 * under and cost every card a row of height on screens that show a dozen of
 * them. A card answers one question; anything more belongs on the page the card
 * links to.
 */
export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";
  onClick?: () => void;
}

export function StatCard({ label, value, icon, variant = "navy", onClick }: StatCardProps) {
  return (
    <Card
      className={cn("stat-card flex flex-col justify-between h-full", `sc-${variant}`)}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="stat-stripe" />
      <div className="stat-top">
        <div className="stat-lbl">{label}</div>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-val">{value}</div>
    </Card>
  );
}
export default StatCard;
