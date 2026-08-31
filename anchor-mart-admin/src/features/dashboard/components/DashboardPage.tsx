import {
  IconAlertTriangle,
  IconBolt,
  IconBoxSeam,
  IconChecklist,
  IconClipboardList,
  IconClipboardText,
  IconClockExclamation,
  IconEngine,
  IconFileInvoice,
  IconFilterOff,
  IconMapPin,
  IconMotorbike,
  IconReceiptRefund,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PillToggle } from "@/components/common/PillToggle";
import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { getApiMessage } from "@/lib/apiError";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

import type { LiveOrder, TimeRange } from "../types/dashboard.types";

import { useDashboard } from "../hooks/useDashboard";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { AttentionPanel } from "./AttentionPanel";
import { CommandHeader } from "./CommandHeader";
import { LiveOrdersCard } from "./LiveOrdersCard";
import { PulseCell } from "./PulseCell";

const M = MESSAGES.DASHBOARD;

/* ═══════════════════════════════════════════════════════
   DashboardPage — Operations Command Center

   A presentation-layer rebuild. Every figure, every route and
   every deliberate *absence* of a route below is unchanged;
   `useDashboard` is untouched and no request was added.

   What changed is rank. The screen was eighteen tiles of one
   size in four groups, which made "7 deliveries failed" and
   "412 products" look equally worth reading. It is now ordered
   by what an operator does with a number:

     1. Needs Attention — work that has gone wrong or is waiting
     2. Operations Pulse — what is happening, and this period
     3. Order Activity / Pending Work — the live queues
     4. Reference — true, rarely actionable, demoted

   Three sections were **already fetched and never rendered**:
   `liveOrders` and `actionRequired` fired on every load and had
   their results discarded, and `oldest_failed_at` sat unused on
   the stats payload. They are shown now — no new calls, four
   fewer wasted ones in effect.

   Deliberately NOT built: an order-lifecycle funnel. The stats
   endpoint has no per-stage breakdown and the live-orders
   preview is capped at five rows, so stage counts would be
   invented. The real per-order statuses in Order Activity are
   the honest version of the same question.
════════════════════════════════════════════════════════ */
export function DashboardPage() {
  const navigate = useNavigate();
  const {
    stats,
    period,
    activeTab,
    selectPeriod,
    dateRange,
    setDateRange,
    isError,
    error,
    liveOrders,
    actionRequired,
  } = useDashboard();

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
    stats.raw.verifications === undefined || stats.raw.inProgress === undefined
      ? null
      : {
          verifications: stats.raw.verifications,
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

  /**
   * Regrouped from the two unlabelled rows by what a number is **for**, not by
   * which endpoint returned it.
   *
   * `row2` mixed four queues with two catalog counts (Express Items, Rewards),
   * so neither row had a heading it could honestly carry. Split here rather than
   * at the definitions above, so each tile keeps its own click-through and copy.
   */
  /**
   * The oldest unattended delivery failure, as "6 days ago".
   *
   * Fetched by the stats endpoint since before this screen shipped and never
   * shown. It is the difference between seven failures from this morning and
   * seven that have been sitting for a week — the count alone cannot say which.
   */
  const oldestFailed = stats.oldestFailedAt
    ? M.OCC.OLDEST_FAILED(formatDistanceToNow(parseISO(stats.oldestFailedAt), { addSuffix: true }))
    : null;

  /** Row click lands on the order itself, not on an unfiltered Orders list. */
  const openOrder = (order: LiveOrder) =>
    navigate(`${APP_ROUTES.ORDERS}?search=${encodeURIComponent(order.order_number)}`);

  const CATALOG_IDS = new Set(["express", "rewards"]);
  const workItems = row2.filter((item) => !CATALOG_IDS.has(item.id));
  const catalogItems = [...row1, ...row2.filter((item) => CATALOG_IDS.has(item.id))];

  /**
   * The period controls, unchanged and passed into the command band.
   *
   * Same PillToggle, same DateRangePicker, same reset button, same handlers —
   * lifted into a variable only so they can be rendered inside the header
   * instead of in a strip below it.
   */
  const periodControls = (
    <>
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
    </>
  );

  return (
    <div className="page-enter">
      <CommandHeader
        today={today}
        summary={hero}
        period={period?.label ?? null}
        controls={periodControls}
      />

      {/* ── 1 · Needs Attention ───────────────────────────────────────────
          The dominant block, and the first thing under the title. It used to
          be the third of four groups, below fourteen reference counts.

          Each panel carries a number, what it means, and a severity — and the
          two without a destination stay unclickable, exactly as the tiles they
          replace did. */}
      <div className="occ-sec">
        <span className="occ-sec-label">{M.OCC.ATTENTION}</span>
      </div>
      <div className="occ-attention">
        <AttentionPanel
          label="Delivery Failed"
          value={stats.deliveryFailed}
          description={M.OCC.DELIVERY_FAILED_DESC}
          icon={<IconAlertTriangle size={17} />}
          severity="danger"
          meta={oldestFailed}
          onClick={() => navigate(`${APP_ROUTES.ORDERS}?status=delivery_failed`)}
        />
        <AttentionPanel
          label="Expired Deltas"
          value={stats.deltaExpired}
          description={M.OCC.DELTA_EXPIRED_DESC}
          icon={<IconClockExclamation size={17} />}
          severity="warning"
          // No cross-order list exists for expired deltas, so no destination —
          // unchanged from the tile this replaces.
        />
        <AttentionPanel
          label="Location Reports"
          value={stats.locationReportsPending}
          description={M.OCC.LOCATION_REPORTS_DESC}
          icon={<IconMapPin size={17} />}
          severity="review"
          // Reports are only reachable inside an individual order; there is no
          // admin screen to link to yet.
        />
      </div>

      {/* ── 2 · Operations Pulse ──────────────────────────────────────────
          One divided strip rather than four cards. In Flight leads at roughly
          double width because it is the only live figure here; the three
          beside it are the period counts, and they are the only things on the
          screen the toggle moves — which the note now says next to the
          resolved window instead of above a filter bar. */}
      <div className="occ-sec">
        <span className="occ-sec-label">{M.OCC.PULSE}</span>
        <span className="occ-sec-note">
          {period?.label ? M.OCC.PULSE_NOTE(period.label) : M.OCC.PULSE_NOTE_PLAIN}
        </span>
      </div>
      <div className="occ-pulse">
        <PulseCell
          lead
          label={M.OCC.IN_FLIGHT}
          value={stats.inProgress}
          description={M.OCC.IN_FLIGHT_DESC}
          onClick={() => navigate(`${APP_ROUTES.ORDERS}?status=in_progress`)}
        />
        <PulseCell
          label="Orders"
          value={stats.ordersPlaced}
          description={M.OCC.ORDERS_DESC}
          zeroDescription={M.OCC.ZERO_PERIOD}
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
        {/* Cancelled and Refunded count `cancelled_at` / `refunded_at`, which
            the Orders list does not filter on — a link would land on a number
            that disagrees with the one clicked. Unchanged. */}
        <PulseCell
          label="Cancelled"
          value={stats.cancelled}
          description={M.OCC.CANCELLED_DESC}
          zeroDescription={M.OCC.ZERO_PERIOD}
        />
        <PulseCell
          label="Refunded"
          value={stats.refunded}
          description={M.OCC.REFUNDED_DESC}
          zeroDescription={M.OCC.ZERO_PERIOD}
        />
      </div>

      {/* ── 3 · Order Activity + Pending Work ─────────────────────────────
          Both were already being fetched on every dashboard load and thrown
          away. This is what "what is happening" and "what is queued" actually
          look like with real records behind them, rather than two more counts. */}
      <div className="occ-sec">
        <span className="occ-sec-label">{M.OCC.ACTIVITY}</span>
      </div>
      <div className="occ-split">
        <LiveOrdersCard
          orders={liveOrders.items}
          count={liveOrders.count}
          isLoading={liveOrders.isLoading}
          isError={liveOrders.isError}
          onRetry={liveOrders.refetch}
          onRowClick={openOrder}
          onViewAll={() => navigate(APP_ROUTES.ORDERS)}
        />
        <ActionRequiredCard
          items={actionRequired.items}
          total={actionRequired.total}
          isLoading={actionRequired.isLoading}
          isError={actionRequired.isError}
          onRetry={actionRequired.refetch}
        />
      </div>

      {/* ── 4 · Reference ─────────────────────────────────────────────────
          Demoted, not removed. Every tile keeps its figure, its variant and
          its click-through — including the two whose routes are deliberately
          parked. The existing StatsGrid renders them unchanged; only their
          rank on the page moved. */}
      <div className="occ-ref">
        <div className="occ-sec">
          <span className="occ-sec-label">{M.OCC.REFERENCE}</span>
        </div>
        <p className="occ-ref-hint">{M.OCC.REFERENCE_HINT}</p>

        <div>
          <div className="sec-label">{M.WORK_GROUP}</div>
          <StatsGrid items={workItems} className="fill" />
        </div>

        <div>
          <div className="sec-label">{M.CATALOG_GROUP}</div>
          <StatsGrid items={catalogItems} className="fill" />
        </div>
      </div>
    </div>
  );
}
