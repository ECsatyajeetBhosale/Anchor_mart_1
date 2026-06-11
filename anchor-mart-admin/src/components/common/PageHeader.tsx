import type * as React from "react";

export interface PageHeaderProps {
  title: string;
  /** Optional subtitle. A plain string is wrapped in `.pg-sub`; a node renders as-is. */
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="pg-header">
      <div className="pg-header-l">
        <h1 className="pg-title">{title}</h1>
        {typeof subtitle === "string" ? <p className="pg-sub">{subtitle}</p> : subtitle}
      </div>
      {actions && <div className="pg-actions">{actions}</div>}
    </div>
  );
}
