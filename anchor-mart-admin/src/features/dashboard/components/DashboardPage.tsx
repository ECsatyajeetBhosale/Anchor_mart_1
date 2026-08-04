import {
  IconBolt,
  IconBoxSeam,
  IconChecklist,
  IconClipboardList,
  IconClipboardText,
  IconEngine,
  IconFileInvoice,
  IconFilterOff,
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

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PillToggle } from "@/components/common/PillToggle";
import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { getApiMessage } from "@/lib/apiError";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

import type { TimeRange } from "../types/dashboard.types";

import { useDashboard } from "../hooks/useDashboard";

const M = MESSAGES.DASHBOARD;

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
  const { stats, activeTab, selectPeriod, dateRange, setDateRange, isError, error } =
    useDashboard();

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
      value: stats.products,
      icon: <IconBoxSeam size={19} />,
      variant: "purple",
      onClick: () => navigate(APP_ROUTES.PRODUCTS),
    },
    {
      id: "spares",
      label: "Marine Emergency Spares",
      value: stats.marineEmergencySpares,
      icon: <IconEngine size={19} />,
      variant: "red",
      onClick: () => navigate(APP_ROUTES.SPARES),
    },
    {
      id: "assignments",
      label: "Assignments",
      value: stats.assignments,
      icon: <IconClipboardList size={19} />,
      variant: "amber",
      // Navigation parked with the Assignments screen. The tile stays as a
      // counter; without an `onClick` StatCard drops its pointer cursor, so it
      // no longer advertises a click that would dead-end at the 404 redirect.
      // onClick: () => navigate(APP_ROUTES.ASSIGNMENTS),
    },
  ];

  // Row 2 — intents, requests & program metrics.
  const row2: StatsGridItem[] = [
    {
      id: "verifications",
      label: "Verifications",
      value: stats.verifications,
      icon: <IconChecklist size={19} />,
      variant: "red",
      // Navigation parked with the Verifications screen — see the Assignments
      // tile above.
      // onClick: () => navigate(APP_ROUTES.VERIFICATION),
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
      value: stats.specialRequests,
      icon: <IconClipboardText size={19} />,
      variant: "navy",
      onClick: () => navigate(APP_ROUTES.REQUESTS),
    },
    {
      // No dedicated route exists for cancellations — left non-navigable.
      id: "cancellation",
      label: "Special Request Cancellation",
      value: stats.specialRequestCancellations,
      icon: <IconReceiptRefund size={19} />,
      variant: "amber",
    },
    {
      id: "express",
      label: "Express Items",
      value: stats.expressItems,
      icon: <IconBolt size={19} />,
      variant: "green",
      onClick: () => navigate(APP_ROUTES.EXPRESS),
    },
    {
      id: "rewards",
      label: "Rewards",
      value: stats.rewards,
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
          {/* "In flight" is `in_progress` (a snapshot of actively-worked
              orders), not `orders_placed` (volume placed in the window) — the
              two answer different questions and were previously swapped. */}
          <p className="dash-hero-desc">
            You have <b>{stats.verifications}</b> verifications to review,{" "}
            <b>{stats.pendingIntents}</b> pending intents, and <b>{stats.inProgress}</b> orders in
            flight.
          </p>
        </div>
      </div>

      {/* ── Period filter ─────────────────────────────────
          Only Orders, Cancelled and Refunded move with this — every other tile
          is a snapshot the API computes as "right now" and returns unchanged
          whatever window is asked for. Saying so beats letting the pills imply
          they filter the whole board. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--t2)]">{M.PERIOD_NOTE}</p>
        <div className="flex items-center gap-2">
          <PillToggle
            options={[
              { value: "Today", label: M.PERIOD.TODAY },
              { value: "Week", label: M.PERIOD.WEEK },
              { value: "Month", label: M.PERIOD.MONTH },
            ]}
            value={dateRange?.from ? "" : activeTab}
            onChange={(v) => selectPeriod(v as TimeRange)}
          />
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={M.DATE_RANGE_PLACEHOLDER}
          />
          {/* A custom range overrides the pills, so it needs its own way back. */}
          {dateRange?.from && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDateRange(undefined)}
              title={MESSAGES.COMMON.RESET_FILTERS}
            >
              <IconFilterOff size={15} />
              {MESSAGES.COMMON.RESET}
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards (2 rows of 6) ──────────────────── */}
      <StatsGrid items={row1} />
      <StatsGrid items={row2} />
    </div>
  );
}
