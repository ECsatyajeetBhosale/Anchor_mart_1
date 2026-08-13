import {
  IconAlertTriangle,
  IconBan,
  IconBolt,
  IconBoxSeam,
  IconChecklist,
  IconClipboardList,
  IconClipboardText,
  IconClockExclamation,
  IconEngine,
  IconFileInvoice,
  IconFilterOff,
  IconHourglass,
  IconMapPin,
  IconMotorbike,
  IconPackage,
  IconReceiptRefund,
  IconStar,
  IconTruckDelivery,
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
const H = MESSAGES.DASHBOARD.HERO;

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

  /**
   * Raw counts for the hero sentence, or null until every one has arrived.
   *
   * All-or-nothing on purpose: a half-loaded sentence would state one real
   * figure beside two zeros, which reads as fact rather than as loading.
   */
  const hero =
    stats.raw.verifications === undefined ||
    stats.raw.pendingIntents === undefined ||
    stats.raw.inProgress === undefined
      ? null
      : {
          verifications: stats.raw.verifications,
          intents: stats.raw.pendingIntents,
          inFlight: stats.raw.inProgress,
        };

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
  /**
   * The only three tiles the period toggle moves.
   *
   * The backend scopes exactly `orders_placed`, `cancelled` and `refunded` to
   * the selected window; everything else is a snapshot it computes as "right
   * now" whatever window is asked for. Grouping the three under the note that
   * says so is what makes the toggle legible — previously Orders sat in the
   * first row while Cancelled and Refunded were two blocks further down under
   * "Needs Attention", so changing the period appeared to move one tile.
   *
   * They are also not exception work: an order cancelled last week needs
   * nothing from anybody, which is the other reason they do not belong there.
   */
  const periodItems: StatsGridItem[] = [
    {
      id: "orders",
      label: "Orders",
      value: stats.ordersPlaced,
      icon: <IconPackage size={19} />,
      variant: "blue",
      onClick: () => navigate(APP_ROUTES.ORDERS),
    },
    {
      id: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      icon: <IconBan size={19} />,
      variant: "red",
    },
    {
      id: "refunded",
      label: "Refunded",
      value: stats.refunded,
      icon: <IconReceiptRefund size={19} />,
      variant: "purple",
    },
  ];

  /**
   * Exception work.
   *
   * Clickability follows the backend's reconciliation, not appearance:
   *
   * - `in_progress` drills to Orders. Dashboard and Orders now agree at 119 —
   *   the backend resolved this against one canonical lifecycle definition, so
   *   the link uses its `in_progress` filter rather than a status list rebuilt
   *   here. Rebuilding it is what made the two disagree before.
   * - `delivery_failed` and `pending_intents` map to real filters on their own
   *   screens.
   * - `delta_expired`, `cancelled` and `refunded` are **deliberately not
   *   clickable**: no cross-order list exists for expired deltas, and the two
   *   period metrics count `cancelled_at` / `refunded_at`, which the Orders
   *   list does not filter on. A link would land on a number that does not
   *   match the card.
   * - `location_reports_pending` has no admin screen at all — the reports are
   *   only reachable inside an individual order — so it stays a counter until
   *   one exists.
   */
  const exceptions: StatsGridItem[] = [
    {
      id: "in-progress",
      label: "In Progress",
      value: stats.inProgress,
      icon: <IconTruckDelivery size={19} />,
      variant: "teal",
      onClick: () => navigate(`${APP_ROUTES.ORDERS}?status=in_progress`),
    },
    {
      id: "delivery-failed",
      label: "Delivery Failed",
      value: stats.deliveryFailed,
      icon: <IconAlertTriangle size={19} />,
      variant: "red",
      onClick: () => navigate(`${APP_ROUTES.ORDERS}?status=delivery_failed`),
    },
    {
      id: "pending-intents",
      label: "Pending Intents",
      value: stats.pendingIntents,
      icon: <IconHourglass size={19} />,
      variant: "amber",
      onClick: () => navigate(`${APP_ROUTES.INTENTS}?status=pending_intent`),
    },
    {
      id: "location-reports",
      label: "Location Reports",
      value: stats.locationReportsPending,
      icon: <IconMapPin size={19} />,
      variant: "purple",
    },
    {
      id: "delta-expired",
      label: "Expired Deltas",
      value: stats.deltaExpired,
      icon: <IconClockExclamation size={19} />,
      variant: "amber",
    },
  ];

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
      // Label kept as "Cancellation" pending product confirmation — the counter
      // is `SpecialRequest.status = REJECTED`, but "rejected" is the database's
      // word, not necessarily the business's, and the two are distinct events
      // elsewhere in this product (an intent can be rejected OR cancelled).
      //
      // The drill-through is safe because both sides share one predicate:
      // the card counts `exclude(is_deleted=True).filter(status=REJECTED)`, and
      // `?status=rejected` runs the same base queryset with the same filter and
      // no date scoping on either side. Verified live: 3 = 3.
      label: "Special Request Cancellation",
      value: stats.specialRequestCancellations,
      onClick: () => navigate(`${APP_ROUTES.REQUESTS}?status=rejected`),
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
          <div className="dash-hero-eyebrow">{H.EYEBROW(today)}</div>
          {/* The outstanding-work sentence is the heading now — it is the only
              line here that says what to do rather than what exists. The
              greeting it replaced was a hardcoded "Welcome back, Super Admin",
              shown to every role including sub-admins.

              "In flight" is `in_progress` (a snapshot of actively-worked
              orders), not `orders_placed` (volume placed in the window) — the
              two answer different questions and were previously swapped. */}
          <h1 className="dash-hero-title">
            {hero === null ? H.LOADING : H.SUMMARY(hero.verifications, hero.intents, hero.inFlight)}
          </h1>
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
      {/* The three tiles the toggle above actually moves, directly beneath the
          note that names them. */}
      <div>
        <div className="sec-label">{M.PERIOD_GROUP}</div>
        <StatsGrid items={periodItems} className="cols-4" />
      </div>

      {/* Snapshots — "right now" regardless of the selected period. */}
      <StatsGrid items={row1} />
      <StatsGrid items={row2} />

      {/* Exception work — items an admin has to act on, as opposed to the
          inventory counters above. Kept in its own row because that is the
          distinction that matters when you open this screen. */}
      <div>
        <div className="sec-label">{"Needs Attention"}</div>
        <StatsGrid items={exceptions} className="cols-4" />
      </div>
    </div>
  );
}
