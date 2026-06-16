import { IconArrowRight, IconMotorbike } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import type { ActivePartner } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

/* ─── Mock data — pending an active-partners endpoint ─────────────────────── */
const ACTIVE_PARTNERS: ActivePartner[] = [
  { name: "Rahul Singh", id: "DP-00124", active: 3, status: "Delivering", variant: "teal" },
  { name: "Pita Havili", id: "DP-00087", active: 2, status: "Verifying", variant: "warning" },
  { name: "Marco Reyes", id: "DP-00201", active: 1, status: "Delivering", variant: "teal" },
  { name: "Aisha Karimi", id: "DP-00056", active: 0, status: "Available", variant: "success" },
];

/** Mock weekly earnings total shown in the footer. */
const WEEKLY_EARNINGS_TOTAL = "$3,400";

/** Delivery partners currently on shift. */
export function ActivePartnersCard() {
  const navigate = useNavigate();
  const goPartners = () => navigate(APP_ROUTES.PARTNERS);

  return (
    <SectionCard
      bodyPadding="sm"
      bodyClassName="flex flex-col gap-3"
      icon={<IconMotorbike size={17} className="text-[var(--t4)]" />}
      title={M.ACTIVE_PARTNERS_TITLE}
      actions={
        <Button variant="ghost" size="xs" onClick={goPartners}>
          {M.VIEW_ALL} <IconArrowRight size={13} />
        </Button>
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold text-[var(--t4)]">{M.WEEKLY_EARNINGS}</span>
          <span className="text-[13px] font-extrabold text-[var(--amber-700)]">
            {WEEKLY_EARNINGS_TOTAL}
          </span>
        </div>
      }
    >
      {ACTIVE_PARTNERS.map((p) => (
        <button
          type="button"
          key={p.id}
          onClick={goPartners}
          className="flex aic g10 w-full appearance-none border-0 bg-transparent p-0 text-left"
        >
          <div className="av av-sm av-teal">{p.name[0]}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-[var(--t1)]">{p.name}</div>
            <div className="text-[10.5px] text-[var(--t4)]">
              {p.id} · {p.active > 0 ? M.PARTNER_ACTIVE(p.active) : M.PARTNER_FREE}
            </div>
          </div>
          <Badge variant={p.variant}>{p.status}</Badge>
        </button>
      ))}
    </SectionCard>
  );
}

export default ActivePartnersCard;
