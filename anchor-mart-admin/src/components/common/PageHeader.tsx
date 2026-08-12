import type * as React from "react";

/**
 * Page title + right-aligned actions.
 *
 * The optional subtitle is for a *figure*, not a description. Every page used to
 * carry a descriptive line under its title ("Platform configuration, admin
 * accounts and the help centre") that restated what the nav item already said
 * and pushed the real content down; those are gone and should not return. What
 * belongs here is the population the screen is showing — "715 orders" — which
 * has to live somewhere and must not be a card.
 */
export interface PageHeaderProps {
  title: string;
  /**
   * The population the screen is showing, e.g. "89 open intents".
   *
   * This is where a total belongs. As a card it read as a seventh bucket beside
   * the six it is the sum of, which invites adding it in — the "92 vs 89" class
   * of error. As a heading it is unmistakably the whole, not a part.
   */
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="pg-header">
      <div className="pg-header-l">
        <h1 className="pg-title">{title}</h1>
        {subtitle && <div className="text-[13px] font-semibold text-[var(--t3)]">{subtitle}</div>}
      </div>
      {actions && <div className="pg-actions">{actions}</div>}
    </div>
  );
}
