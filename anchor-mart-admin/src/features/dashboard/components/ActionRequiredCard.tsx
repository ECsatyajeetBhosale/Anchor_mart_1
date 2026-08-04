import {
  IconAlertCircle,
  IconBuildingStore,
  IconClipboardList,
  IconCreditCard,
  IconShieldCheck,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import type { ActionRequiredItem, ActionTone } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

/** Icon-tile background + foreground classes per tone. */
const TONE_TILE: Record<ActionTone, string> = {
  warning: "bg-[var(--warning-bg)] text-[var(--warning-icon)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-icon)]",
  info: "bg-[var(--info-bg)] text-[var(--info-icon)]",
  purple: "bg-[var(--purple-bg)] text-[var(--purple-icon)]",
  success: "bg-[var(--success-bg)] text-[var(--success-icon)]",
};

/** Per-action-type presentation + frontend destination, keyed by API `key`. */
interface ActionConfig {
  icon: ReactNode;
  tone: ActionTone;
  button: string;
  /** Frontend route (APP_ROUTES). Undefined → no navigation for this action. */
  route?: string;
}

/**
 * Maps each known action `key` to its icon, tone, button label, and frontend
 * route. The API `link` is a backend URL, so navigation resolves to the matching
 * APP_ROUTES page here; add a key to scale to future action types.
 */
const ACTION_CONFIG: Record<string, ActionConfig> = {
  new_intents: {
    icon: <IconClipboardList size={16} />,
    tone: "success",
    button: M.ACTION_BUTTONS.REVIEW,
    route: APP_ROUTES.INTENTS,
  },
  verifications_to_review: {
    icon: <IconShieldCheck size={16} />,
    tone: "info",
    button: M.ACTION_BUTTONS.VERIFY,
    // Route parked with the Verifications screen — with no `route` the button
    // renders disabled, which is honest. Left routed, it would bounce off the
    // 404 redirect straight back to this dashboard and read as broken.
    // route: APP_ROUTES.VERIFICATION,
  },
  orders_awaiting_payment: {
    icon: <IconCreditCard size={16} />,
    tone: "warning",
    button: M.ACTION_BUTTONS.COLLECT,
    route: APP_ROUTES.ORDERS,
  },
  pending_seller_applications: {
    icon: <IconBuildingStore size={16} />,
    tone: "purple",
    button: M.ACTION_BUTTONS.APPROVE,
    route: APP_ROUTES.SELLERS,
  },
};

/** Fallback for unrecognised future action keys. */
const DEFAULT_CONFIG: ActionConfig = {
  icon: <IconAlertCircle size={16} />,
  tone: "info",
  button: MESSAGES.COMMON.VIEW,
};

export interface ActionRequiredCardProps {
  items: ActionRequiredItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Operational alerts that need an admin's attention — driven by the (param-less)
 * action-required endpoint via {@link useDashboard}. Cards render dynamically
 * from the API; UI/structure is unchanged.
 */
export function ActionRequiredCard({
  items,
  total,
  isLoading,
  isError,
  onRetry,
}: ActionRequiredCardProps) {
  const navigate = useNavigate();

  return (
    <SectionCard
      bodyPadding="sm"
      bodyClassName="flex flex-col gap-5"
      icon={<IconAlertCircle size={17} className="text-[var(--t4)]" />}
      title={M.ACTION_REQUIRED}
      actions={<Badge variant="danger">{M.ACTIONS_OPEN(total)}</Badge>}
    >
      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
        </div>
      ) : isError ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
          <span className="td-m text-[var(--danger-text)]">{M.ERROR}</span>
          <Button variant="secondary" size="xs" onClick={onRetry}>
            {MESSAGES.COMMON.RETRY}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <span className="td-m">{M.ACTION_REQUIRED_EMPTY}</span>
        </div>
      ) : (
        items.map((a) => {
          const cfg = ACTION_CONFIG[a.key] ?? DEFAULT_CONFIG;
          return (
            <div key={a.key} className="flex items-start gap-2.5">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${TONE_TILE[cfg.tone]}`}
              >
                {cfg.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold leading-[1.3] text-[var(--t1)]">
                  {a.label}
                </div>
                <div className="mt-0.5 text-[10.5px] text-[var(--t4)]">
                  {M.ACTION_PENDING(a.count)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                className="shrink-0"
                disabled={!cfg.route}
                onClick={() => cfg.route && navigate(cfg.route)}
              >
                {cfg.button}
              </Button>
            </div>
          );
        })
      )}
    </SectionCard>
  );
}

export default ActionRequiredCard;
