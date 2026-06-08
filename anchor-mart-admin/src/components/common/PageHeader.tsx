import type * as React from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="pg-header">
      <div className="pg-header-l">
        <h1 className="pg-title">{title}</h1>
        {subtitle && (
          <p className="pg-sub">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="pg-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
