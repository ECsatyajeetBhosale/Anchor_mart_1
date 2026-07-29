import {
  IconBolt,
  IconBoxSeam,
  IconChecklist,
  IconClipboardList,
  IconClipboardText,
  IconEngine,
  IconFileInvoice,
  IconMotorbike,
  IconPackage,
  IconReceiptRefund,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { getApiMessage } from "@/lib/apiError";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

import { useDashboard } from "../hooks/useDashboard";
import { DashboardOrdersCard } from "./DashboardOrdersCard";

const M = MESSAGES.DASHBOARD;

/** Value shown for source cards/fields the API does not return. */
const NA = "-";

/* ═══════════════════════════════════════════════════════
   DashboardPage

   Faithful rebuild of the AnchorMart-1 operations dashboard:
   a teal welcome hero + two rows of six stat cards. API data
   (via useDashboard) is mapped to the matching cards; cards
   the API does not cover render "-". The existing dashboard
   API hook is reused unchanged.
════════════════════════════════════════════════════════ */
export function DashboardPage() {
  const navigate = useNavigate();
  const { stats, isError, error } = useDashboard();

  // Surface stat load failures through the shared toast convention.
  useEffect(() => {
    if (isError) {
      toast.error(getApiMessage(error) ?? M.ERROR);
    }
  }, [isError, error]);

  const today = format(new Date(), "EEEE, d MMMM yyyy");

  // Row 1 — primary operations metrics.
  const row1: StatsGridItem[] = [
    {
      id: "sailors",
      label: "Sailors",
      value: stats.totalSailors,
      icon: <IconUsers size={19} />,
      variant: "navy",
      onClick: () => navigate(APP_ROUTES.SAILORS),
    },
    {
      id: "partners",
      label: "Delivery Partners",
      value: stats.activePartners,
      icon: <IconMotorbike size={19} />,
      variant: "teal",
      onClick: () => navigate(APP_ROUTES.PARTNERS),
    },
    {
      id: "orders",
      label: "Orders",
      value: stats.ordersPlaced,
      icon: <IconPackage size={19} />,
      variant: "blue",
      onClick: () => navigate(APP_ROUTES.ORDERS),
    },
    {
      id: "products",
      label: "Products",
      value: NA,
      icon: <IconBoxSeam size={19} />,
      variant: "purple",
      onClick: () => navigate(APP_ROUTES.PRODUCTS),
    },
    {
      id: "spares",
      label: "Marine Emergency Spares",
      value: NA,
      icon: <IconEngine size={19} />,
      variant: "red",
      onClick: () => navigate(APP_ROUTES.SPARES),
    },
    {
      id: "assignments",
      label: "Assignments",
      value: NA,
      icon: <IconClipboardList size={19} />,
      variant: "amber",
      onClick: () => navigate(APP_ROUTES.ASSIGNMENTS),
    },
  ];

  // Row 2 — intents, requests & program metrics.
  const row2: StatsGridItem[] = [
    {
      id: "verifications",
      label: "Verifications",
      value: NA,
      icon: <IconChecklist size={19} />,
      variant: "red",
      onClick: () => navigate(APP_ROUTES.VERIFICATION),
    },
    {
      id: "intents",
      label: "Intents",
      value: stats.intentReceived,
      icon: <IconFileInvoice size={19} />,
      variant: "purple",
      onClick: () => navigate(APP_ROUTES.INTENTS),
    },
    {
      id: "requests",
      label: "Special Requests",
      value: NA,
      icon: <IconClipboardText size={19} />,
      variant: "navy",
      onClick: () => navigate(APP_ROUTES.REQUESTS),
    },
    {
      // No dedicated route exists for cancellations — left non-navigable.
      id: "cancellation",
      label: "Special Request Cancellation",
      value: NA,
      icon: <IconReceiptRefund size={19} />,
      variant: "amber",
    },
    {
      id: "express",
      label: "Express Items",
      value: NA,
      icon: <IconBolt size={19} />,
      variant: "green",
      onClick: () => navigate(APP_ROUTES.EXPRESS),
    },
    {
      id: "rewards",
      label: "Rewards",
      value: NA,
      icon: <IconStar size={19} />,
      variant: "teal",
      onClick: () => navigate(APP_ROUTES.REWARDS),
    },
  ];

  return (
    <div className="page-enter">
      {/* ── Welcome hero ──────────────────────────────── */}
      <div className="dash-hero">
        <div className="dash-hero-glow" />
        <div className="dash-hero-inner">
          <div className="dash-hero-eyebrow">Operations Dashboard · {today}</div>
          <h1 className="dash-hero-title">Welcome back, Super Admin</h1>
          <p className="dash-hero-desc">
            You have <b>{NA}</b> verifications to review, <b>{stats.pendingIntents}</b> intents
            awaiting payment, and <b>{stats.ordersPlaced}</b> orders in flight today.
          </p>
        </div>
      </div>

      {/* ── Stat cards (2 rows of 6) ──────────────────── */}
      <StatsGrid items={row1} />
      <StatsGrid items={row2} />

      {/* ── Full order list (search · status · port) ──── */}
      <DashboardOrdersCard />
    </div>
  );
}
