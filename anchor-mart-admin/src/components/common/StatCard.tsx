import type * as React from "react";
import { IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant: "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";
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
  const stripeGradient = {
    navy: "linear-gradient(90deg, var(--navy-600), var(--navy-300))",
    teal: "linear-gradient(90deg, var(--teal-500), var(--teal-300))",
    amber: "linear-gradient(90deg, var(--amber-500), var(--amber-300))",
    red: "linear-gradient(90deg, var(--danger-icon), #f87171)",
    green: "linear-gradient(90deg, var(--green-icon), #4ade80)",
    purple: "linear-gradient(90deg, var(--purple-icon), #a78bfa)",
    blue: "linear-gradient(90deg, var(--info-icon), #60a5fa)",
  };

  const iconBg = {
    navy: "var(--navy-50)",
    teal: "var(--teal-50)",
    amber: "var(--amber-50)",
    red: "var(--danger-bg)",
    green: "var(--green-bg)",
    purple: "var(--purple-bg)",
    blue: "var(--info-bg)",
  };

  const iconColor = {
    navy: "var(--navy-600)",
    teal: "var(--teal-600)",
    amber: "var(--amber-700)",
    red: "var(--danger-icon)",
    green: "var(--green-icon)",
    purple: "var(--purple-icon)",
    blue: "var(--info-icon)",
  };

  return (
    <div
      className={cn("stat-card", `sc-${variant}`)}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        background: "var(--surface)",
        border: "1px solid var(--border-sm)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--sh-xs)",
        transition: "all 0.2s",
      }}
    >
      {/* Accent gradient stripe at the top */}
      <div
        className="stat-stripe"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: stripeGradient[variant],
        }}
      />

      {/* Top row with Label and Icon */}
      <div
        className="stat-top"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "14px",
          paddingTop: "8px",
        }}
      >
        <span
          className="stat-lbl"
          style={{
            fontSize: "11px",
            fontWeight: 800,
            color: "var(--t4)",
            textTransform: "uppercase",
            letterSpacing: "1.1px",
          }}
        >
          {label}
        </span>
        <div
          className="stat-icon"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: iconBg[variant],
            color: iconColor[variant],
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div
        className="stat-val"
        style={{
          fontSize: "34px",
          fontWeight: 800,
          color: "var(--t1)",
          lineHeight: 1,
          marginBottom: "10px",
          letterSpacing: "-2px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>

      {/* Footer / Delta */}
      {(delta || footer) && (
        <div
          className="stat-foot"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--t4)",
          }}
        >
          {delta && (
            <span
              className={cn("stat-delta", delta.direction)}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "2px",
                color: delta.direction === "up" ? "var(--green-text)" : "var(--danger-text)",
              }}
            >
              {delta.direction === "up" ? (
                <IconTrendingUp size={14} />
              ) : (
                <IconTrendingDown size={14} />
              )}
              {delta.value}
            </span>
          )}
          {footer && <span>{footer}</span>}
        </div>
      )}
    </div>
  );
}
export default StatCard;
