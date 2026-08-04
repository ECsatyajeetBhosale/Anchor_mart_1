import type * as React from "react";

/**
 * Page title + right-aligned actions.
 *
 * There is deliberately no subtitle. Every page used to carry a descriptive
 * line under its title ("Platform configuration, admin accounts and the help
 * centre") that restated what the nav item already said, and pushed the real
 * content down on every screen.
 */
export interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="pg-header">
      <div className="pg-header-l">
        <h1 className="pg-title">{title}</h1>
      </div>
      {actions && <div className="pg-actions">{actions}</div>}
    </div>
  );
}
