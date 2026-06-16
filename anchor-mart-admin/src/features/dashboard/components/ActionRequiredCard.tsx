import {
  IconAlertCircle,
  IconBuildingStore,
  IconClock,
  IconFileInvoice,
  IconMapPin,
  IconPackageOff,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import type { ActionItem, ActionTone } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

/** Icon-tile background + foreground classes per tone. */
const TONE_TILE: Record<ActionTone, string> = {
  warning: "bg-[var(--warning-bg)] text-[var(--warning-icon)]",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-icon)]",
  info: "bg-[var(--info-bg)] text-[var(--info-icon)]",
  purple: "bg-[var(--purple-bg)] text-[var(--purple-icon)]",
  success: "bg-[var(--success-bg)] text-[var(--success-icon)]",
};

/* ─── Mock data — pending an operational-alerts endpoint ──────────────────── */
const ACTION_ITEMS: ActionItem[] = [
  {
    icon: <IconClock size={16} />,
    tone: "warning",
    title: "12 orders awaiting payment",
    sub: "48hr window expiring soon",
    route: APP_ROUTES.ORDERS,
    label: "Review",
  },
  {
    icon: <IconPackageOff size={16} />,
    tone: "danger",
    title: "3 items out of stock",
    sub: "Admin substitution needed",
    route: APP_ROUTES.PRODUCTS,
    label: "Fix",
  },
  {
    icon: <IconMapPin size={16} />,
    tone: "info",
    title: "2 location changes post-payment",
    sub: "Additional charges required",
    route: APP_ROUTES.ORDERS,
    label: "Review",
  },
  {
    icon: <IconBuildingStore size={16} />,
    tone: "purple",
    title: "4 seller applications pending",
    sub: "Review required",
    route: APP_ROUTES.SELLERS,
    label: "Open",
  },
  {
    icon: <IconFileInvoice size={16} />,
    tone: "success",
    title: "8 new intent requests",
    sub: "Awaiting availability check",
    route: APP_ROUTES.INTENTS,
    label: "Review",
  },
];

/** Total open alerts shown in the header badge (mock). */
const OPEN_COUNT = 7;

/** Operational alerts that need an admin's attention. */
export function ActionRequiredCard() {
  const navigate = useNavigate();

  return (
    <SectionCard
      bodyPadding="sm"
      bodyClassName="flex flex-col gap-2.5"
      icon={<IconAlertCircle size={17} className="text-[var(--t4)]" />}
      title={M.ACTION_REQUIRED}
      actions={<Badge variant="danger">{M.ACTIONS_OPEN(OPEN_COUNT)}</Badge>}
    >
      {ACTION_ITEMS.map((a) => (
        <div key={a.title} className="flex items-start gap-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${TONE_TILE[a.tone]}`}
          >
            {a.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold leading-[1.3] text-[var(--t1)]">{a.title}</div>
            <div className="mt-0.5 text-[10.5px] text-[var(--t4)]">{a.sub}</div>
          </div>
          <Button variant="ghost" size="xs" className="shrink-0" onClick={() => navigate(a.route)}>
            {a.label}
          </Button>
        </div>
      ))}
    </SectionCard>
  );
}

export default ActionRequiredCard;
