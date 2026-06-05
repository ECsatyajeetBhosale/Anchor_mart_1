import type * as React from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "24px",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "21px",
            fontWeight: 800,
            color: "var(--t1)",
            letterSpacing: "-0.4px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--t4)",
              fontWeight: 500,
              marginTop: "2px",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
