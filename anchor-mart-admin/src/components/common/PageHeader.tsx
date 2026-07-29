import type * as React from "react";

export interface PageHeaderProps {
  title: string;
  /** Optional subtitle. A plain string is wrapped in `.pg-sub`; a node renders as-is. */
  actions?: React.ReactNode;
}

export function PageHeader({ title,  actions }: PageHeaderProps) {
  return (
    <div className="pg-header">
      <div className="pg-header-l">
        <h1 className="pg-title">{title}</h1>
      </div>
      {actions && <div className="pg-actions">{actions}</div>}
    </div>
  );
}
