import {
  IconBan,
  IconCheck,
  IconClipboardCheck,
  IconClock,
  IconHourglass,
  IconInbox,
  IconInfoCircle,
  IconPackage,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { OrderTypeBadges } from "@/components/common/OrderTypeBadges";
import { PageHeader } from "@/components/common/PageHeader";
import { PillToggle } from "@/components/common/PillToggle";
import { RowReason } from "@/components/common/RowReason";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { avatarColumn, badgeColumn, textColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import {
  type AssignedAdmin,
  type ClaimConflict,
  OrderHandoverDialog,
  OwnerCell,
  useClaimOrderMutation,
  useOrderOwnership,
} from "@/features/orders";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { toast } from "sonner";
import {
  useCreateBillMutation,
  useGeneratePaymentLinkMutation,
  useUpdateBillMutation,
} from "../api/billingApi";
import {
  useGetIntentStatsQuery,
  useGetIntentsQuery,
  useRejectIntentMutation,
} from "../api/intentApi";
import { useReleaseSuggestionsMutation } from "../api/substitutionApi";
import type {
  GeneratePaymentLinkResponse,
  IntentAction,
  IntentData,
  IntentStats,
} from "../types/intent.types";
import { type BillFees, CreateBillDialog } from "./CreateBillDialog";
import { IntentReviewDrawer } from "./IntentReviewDrawer";
import { RejectIntentDialog } from "./RejectIntentDialog";
import { StatusLegendDialog } from "./StatusLegendDialog";

const M = MESSAGES.INTENTS;
const O = MESSAGES.INTENTS.OWNERSHIP;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

/**
 * The open funnel. These six are mutually exclusive and sum to `total_intents`,
 * which is why the total is the page heading and not a seventh card: as a card
 * it reads as another bucket beside the six it is the sum of, and invites being
 * added in.
 *
 * `substitution_needed` keeps its card and carries its two sub-buckets *inside*
 * it — `awaiting_customer + ready_to_bill == substitution_needed`, so showing
 * all three as peers counts the same orders twice.
 */
const FUNNEL_STAT_CONFIG: {
  id: string;
  label: string;
  key: keyof IntentStats;
  icon: ReactNode;
  variant: StatVariant;
  filter: string;
}[] = [
  {
    id: "new",
    label: M.STATS.NEW,
    key: "new_intents",
    icon: <IconInbox size={20} />,
    variant: "blue",
    filter: "intent_received",
  },
  {
    id: "pending",
    label: M.STATS.PENDING,
    key: "pending_intent",
    icon: <IconHourglass size={20} />,
    variant: "purple",
    filter: "pending_intent",
  },
  {
    id: "sourcing",
    label: M.STATS.SOURCING,
    key: "in_sourcing",
    icon: <IconSearch size={20} />,
    variant: "teal",
    filter: "sourcing",
  },
  {
    id: "verification",
    label: M.STATS.VERIFICATION,
    key: "in_verification",
    icon: <IconClipboardCheck size={20} />,
    variant: "blue",
    // Derived filter resolving to the same two statuses this card counts.
    filter: "in_verification",
  },
  {
    id: "substitutions",
    label: M.STATS.SUBSTITUTIONS,
    key: "substitution_needed",
    icon: <IconRefresh size={20} />,
    variant: "red",
    filter: "pending_customer_response",
  },
  {
    id: "awaiting-payment",
    label: M.STATS.AWAITING_PAYMENT,
    key: "awaiting_payment",
    icon: <IconClock size={20} />,
    variant: "amber",
    filter: "payment_pending",
  },
];

/**
 * Closed intents — terminal, and outside `total_intents`. Rendered under their
 * own heading so they are not read as open work.
 *
 * Rejected and cancelled are different events: **rejected** is the admin's
 * supply-side verdict ("we cannot source this"); **cancelled** is the order
 * being withdrawn before any payment, by the sailor or an admin.
 */
const CLOSED_STAT_CONFIG: typeof FUNNEL_STAT_CONFIG = [
  {
    id: "rejected",
    label: M.STATS.REJECTED,
    key: "rejected",
    icon: <IconBan size={20} />,
    variant: "red",
    filter: "intent_rejected",
  },
  {
    id: "cancelled",
    label: M.STATS.CANCELLED,
    key: "cancelled",
    icon: <IconX size={20} />,
    variant: "red",
    filter: "cancelled",
  },
];

/**
 * Order-type filter, identical in behaviour to the orders screen. Each option is
 * a query, not a slice of a partition: `is_express` and `is_emergency` are
 * independent and an order may be both, so the counts do not sum to the total.
 * "Regular" is the complement — `false` on both.
 */
const INTENT_TYPE_QUERY = {
  all: {},
  express: { isExpress: true },
  emergency: { isEmergency: true },
  regular: { isExpress: false, isEmergency: false },
} as const;

type IntentTypeFilter = keyof typeof INTENT_TYPE_QUERY;

/** Narrows the URL's `?type=` to a known option; anything else falls back to All. */
function asIntentType(value: string | null): IntentTypeFilter {
  return value && value in INTENT_TYPE_QUERY ? (value as IntentTypeFilter) : "all";
}

const INTENT_TYPE_CONFIG: {
  value: IntentTypeFilter;
  label: string;
  countKey: "all" | "express" | "emergency" | "regular";
}[] = [
  { value: "all", label: M.TYPE_FILTER.ALL, countKey: "all" },
  { value: "express", label: M.TYPE_FILTER.EXPRESS, countKey: "express" },
  { value: "emergency", label: M.TYPE_FILTER.EMERGENCY, countKey: "emergency" },
  { value: "regular", label: M.TYPE_FILTER.REGULAR, countKey: "regular" },
];

// Status filter values the intents endpoint accepts (backend-enforced). Only
// pre-confirmation statuses live here — confirmed/fulfilment statuses belong to
// the Orders screen. Listed in canonical lifecycle order (src/lib/orderStatuses.ts).
const INTENT_FILTER_KEYS = [
  "intent_received",
  "pending_intent",
  "sourcing",
  "partner_verifying",
  "verification_submitted",
  "pending_customer_response",
  "payment_pending",
  "intent_rejected",
];

/**
 * Derived views the endpoint accepts alongside the raw statuses, via
 * `INTENT_DERIVED_FILTERS`. They were previously kept out of the dropdown on the
 * grounds that the API collection did not document them and an unsupported value
 * would 400 — but the view resolves them explicitly (`if status_filter in
 * INTENT_DERIVED_FILTERS`), and the stat cards now select two of them, so the
 * dropdown has to be able to show what is active.
 *
 * They are not raw statuses, so their labels are not in `ORDER_STATUS_BY_KEY`.
 */
const INTENT_DERIVED_FILTER_OPTIONS = [
  { value: "in_verification", label: M.STATS.VERIFICATION },
  { value: "awaiting_customer", label: M.STATS.AWAITING_CUSTOMER },
  { value: "ready_to_bill", label: M.STATS.READY_TO_BILL },
  { value: "cancelled", label: M.STATS.CANCELLED },
];

const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  ...INTENT_FILTER_KEYS.map((key) => ({ value: key, label: ORDER_STATUS_BY_KEY[key].label })),
  ...INTENT_DERIVED_FILTER_OPTIONS,
];

export function IntentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven state (shareable, refresh-safe, preserved across pagination).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  const [selectedIntent, setSelectedIntent] = useState<IntentData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  /** create → Flow 07 API 1; update → API 2 (re-price an already-pending bill). */
  const [billMode, setBillMode] = useState<"create" | "update">("create");
  /**
   * Flow 07 API 3 result. Held here rather than inside the dialog so the
   * checkout URL survives the dialog's own re-renders — it is the one piece of
   * the response the admin can't get back from any list or drawer.
   */
  const [linkResult, setLinkResult] = useState<GeneratePaymentLinkResponse | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  /** Which row's claim is in flight — scopes the spinner to that button. */
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { stateOf, canManage, canClaim, canReassign, isSuperAdmin } = useOrderOwnership();
  const [claimOrder] = useClaimOrderMutation();
  /** The intent whose handover dialog is open, or null when closed. */
  const [handover, setHandover] = useState<{
    id: string;
    ref: string;
    owner: AssignedAdmin | null;
  } | null>(null);
  const [rejectIntent, { isLoading: isRejecting }] = useRejectIntentMutation();
  const [releaseSuggestions, { isLoading: isReleasing }] = useReleaseSuggestionsMutation();
  const [createBill, { isLoading: isBilling }] = useCreateBillMutation();
  const [updateBill, { isLoading: isUpdatingBill }] = useUpdateBillMutation();
  const [generatePaymentLink, { isLoading: isGeneratingLink }] = useGeneratePaymentLinkMutation();

  // Intents list — search + status filter server-side; paginated by DRF.
  const statusParam = statusFilter !== "all" ? statusFilter : undefined;
  const typeFilter = asIntentType(searchParams.get("type"));
  const typeQuery = INTENT_TYPE_QUERY[typeFilter];

  const { data, isLoading, isFetching, isError, refetch } = useGetIntentsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusParam,
    ...typeQuery,
  });

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  // Scoped to the same search and order type as the table beneath them — the
  // endpoint honours both, and was previously called with neither.
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetIntentStatsQuery({
    search: searchTerm,
    ...typeQuery,
  });

  /** Retry after a failed load — reloads the cards as well as the table, so the
   *  two keep describing the same population. See the orders screen for why. */
  const retryAll = () => {
    refetch();
    refetchStats();
  };

  // Chip counts come from `type_counts`, computed over the open funnel with the
  // type filter removed, so selecting one option does not zero the others.
  const typeOptions = INTENT_TYPE_CONFIG.map((t) => ({
    value: t.value,
    label: M.TYPE_FILTER.OPTION(t.label, stats?.type_counts?.[t.countKey]),
  }));
  // Clicking a card filters the table to that bucket — the same reason the stats
  // endpoint ignores `?status=`: the cards ARE the breakdown, so they must not
  // filter themselves. Click an active card again to clear.
  const cardItem = (c: (typeof FUNNEL_STAT_CONFIG)[number]) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
    active: statusFilter === c.filter,
    onClick: () => setParam("status", statusFilter === c.filter ? "" : c.filter),
  });

  const num = (key: keyof IntentStats) =>
    statsLoading ? "—" : (stats?.[key] ?? 0).toLocaleString();

  const statItems = FUNNEL_STAT_CONFIG.map((c) =>
    c.id === "substitutions"
      ? {
          ...cardItem(c),
          // Sub-buckets, shown inside their parent because they are already
          // counted in it. `ready_to_bill` is the actionable half — the sailor
          // has confirmed and an admin can raise the bill.
          breakdown: [
            {
              label: M.STATS.AWAITING_CUSTOMER,
              value: num("awaiting_customer"),
              onClick: () =>
                setParam("status", statusFilter === "awaiting_customer" ? "" : "awaiting_customer"),
            },
            {
              label: M.STATS.READY_TO_BILL,
              value: num("ready_to_bill"),
              onClick: () =>
                setParam("status", statusFilter === "ready_to_bill" ? "" : "ready_to_bill"),
            },
          ],
        }
      : cardItem(c),
  );

  // One 4-across grid: the six funnel buckets, then the two terminal ones, in
  // that order. They keep separate configs because they mean different things —
  // only the first six sum to `total_intents` — but they render as a single
  // block, with position and the red treatment carrying the distinction instead
  // of a heading.
  const allStatItems = [...statItems, ...CLOSED_STAT_CONFIG.map(cardItem)];

  const intents = data?.intents ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Update one URL param; filter/search changes reset to page 1. "all"/empty clears it.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const handleOpenReview = (intent: IntentData) => {
    setSelectedIntent(intent);
    setIsReviewOpen(true);
  };

  /**
   * Flow 27 API 1 — claim the order behind this intent. Ownership is the
   * precondition for every gated write, including intent rejection.
   *
   * A 409 is not a failure to retry: it means another admin got there first,
   * and the body names them so we can say who.
   *
   * `openReview` opens the review drawer once the claim succeeds — used by the
   * row-level "Manage Order" button so the admin lands straight in the drawer.
   */
  const handleClaim = async (intent: IntentData, openReview = false) => {
    setClaimingId(intent.id);
    try {
      const res = await claimOrder(intent.id).unwrap();
      toast.success(O.CLAIMED(intent.r));
      // Reflect the new owner on the drawer's snapshot immediately so the
      // ownership-derived buttons flip: the "Manage Order" claim button hides
      // and Assign/Reject enable, without waiting for the list refetch.
      const claimed: IntentData = { ...intent, assignedAdmin: res.assigned_admin };
      if (openReview) {
        setSelectedIntent(claimed);
        setIsReviewOpen(true);
      } else {
        setSelectedIntent((prev) => (prev && prev.id === intent.id ? claimed : prev));
      }
    } catch (err) {
      const status = (err as { status?: unknown })?.status;
      if (status === 409) {
        const owner = (err as { data?: ClaimConflict })?.data?.assigned_admin;
        toast.error(owner ? O.HELD_BY(owner.name) : O.HELD_BY_UNKNOWN);
        return;
      }
      toast.error(getApiMessage(err) ?? O.CLAIM_FAILED);
    } finally {
      setClaimingId(null);
    }
  };

  /**
   * The drawer's primary action, dispatched on the intent's derived state:
   *  - `suggest`   → release staged suggestions to the sailor (Flow 06 API 13)
   *  - `assign`    → partner assignment (Flow 28 — endpoint not yet wired)
   *  - `bill`      → open the fee popup (Flow 07 — bill and/or Stripe link)
   */
  const handlePrimaryAction = async (action: IntentAction) => {
    if (!selectedIntent) return;
    if (action === "suggest") {
      try {
        const res = (await releaseSuggestions({ order_id: selectedIntent.id }).unwrap()) as {
          released_count?: number;
        };
        toast.success(M.TOAST.RELEASED(res?.released_count ?? 0));
        setIsReviewOpen(false);
      } catch (err) {
        const status = (err as { status?: unknown })?.status;
        if (status === 409) {
          toast.error(O.CLAIM_FIRST);
          return;
        }
        toast.error(getApiMessage(err) ?? M.TOAST.RELEASE_FAILED);
      }
      return;
    }
    // `bill` opens the fee popup in create mode; `awaiting_payment` means a bill
    // already exists, so the same popup runs in update mode (API 2 — create-bill
    // 409s on a second call).
    if (action === "bill" || action === "awaiting_payment") {
      // Close the drawer first — the fee popup (a custom Dialog) would render
      // behind the Sheet overlay otherwise. `selectedIntent` is retained.
      setBillMode(action === "bill" ? "create" : "update");
      setLinkResult(null);
      setIsReviewOpen(false);
      setIsBillOpen(true);
    }
    // `assign` / `waiting_*` never reach here: assignment is handled inside the
    // drawer (it owns the partner picker) and waiting states have no action.
  };

  /**
   * Flow 07 API 1 (create) / API 2 (update) — set the fee breakdown. The
   * subtotal is computed server-side in both cases and is never sent.
   *
   * Create surfaces 409 for unclaimed / already paid / already-pending-bill /
   * unconfirmed substitutions; update surfaces 400 when the order isn't
   * `payment_pending`. The backend's own message is preferred over ours.
   */
  const handleConfirmBill = async (fees: BillFees) => {
    if (!selectedIntent) return;
    const isUpdate = billMode === "update";
    const body = { order_id: selectedIntent.id, ...fees };
    try {
      const res = await (isUpdate ? updateBill(body) : createBill(body)).unwrap();
      const ref = res.order_number || selectedIntent.r;
      const amount = res.amount ?? "";
      toast.success(isUpdate ? M.TOAST.BILL_UPDATED(ref, amount) : M.TOAST.BILLED(ref, amount));
      setIsBillOpen(false);
    } catch (err) {
      const status = (err as { status?: unknown })?.status;
      if (status === 409) {
        // 409 covers unclaimed as well as "already billed / unconfirmed subs" —
        // surface the backend's specific message when present.
        toast.error(getApiMessage(err) ?? O.CLAIM_FIRST);
        return;
      }
      toast.error(
        getApiMessage(err) ?? (isUpdate ? M.TOAST.BILL_UPDATE_FAILED : M.TOAST.BILL_FAILED),
      );
    }
  };

  /**
   * Flow 07 API 3 — set the same fees, but also mint (or reuse) a Stripe
   * Checkout link, which the backend sends to the sailor itself.
   *
   * The dialog stays open on success: the checkout URL is only returned here,
   * so closing straight away would throw away the one thing the admin came for.
   *
   * Failure modes match create-bill (409 unclaimed / paid / unanswered subs,
   * 403 wrong owner, 400 too late in the lifecycle) plus **502**, which is
   * Stripe failing rather than us — worth its own message, because a retry is
   * the right response to that one and not to the others.
   */
  const handleGenerateLink = async (fees: BillFees) => {
    if (!selectedIntent) return;
    try {
      const res = await generatePaymentLink({ order_id: selectedIntent.id, ...fees }).unwrap();
      const ref = res.order_number || selectedIntent.r;
      toast.success(
        res.reused ? M.TOAST.LINK_REUSED(ref) : M.TOAST.LINK_GENERATED(ref, res.amount ?? ""),
      );
      setLinkResult(res);
    } catch (err) {
      const status = (err as { status?: unknown })?.status;
      if (status === 502) {
        toast.error(getApiMessage(err) ?? M.TOAST.LINK_PROVIDER_ERROR);
        return;
      }
      if (status === 409) {
        toast.error(getApiMessage(err) ?? O.CLAIM_FIRST);
        return;
      }
      toast.error(getApiMessage(err) ?? M.TOAST.LINK_FAILED);
    }
  };

  /**
   * Reject button in the drawer → open the reason popup. The drawer closes
   * first: the custom Dialog isn't portaled to <body>, so it would otherwise
   * render behind the Sheet overlay. `selectedIntent` is retained, so the
   * popup still has its order reference and id.
   */
  const handleRejectIntent = () => {
    if (!selectedIntent) return;
    setIsReviewOpen(false);
    setIsRejectOpen(true);
  };

  /**
   * Flow 05 API 6 — submit the terminal rejection with the required reason.
   * Surfaces the documented gate errors: 409 (claim first), 403 (wrong owner),
   * and 400 (blank reason / past the rejectable stage).
   */
  const handleConfirmReject = async (reason: string) => {
    if (!selectedIntent) return;
    try {
      await rejectIntent({ orderId: selectedIntent.id, reason }).unwrap();
      toast.success(M.TOAST.REJECTED(selectedIntent.r));
      setIsRejectOpen(false);
      setIsReviewOpen(false);
    } catch (err) {
      const status = (err as { status?: unknown })?.status;
      if (status === 409) {
        toast.error(O.CLAIM_FIRST);
        return;
      }
      toast.error(getApiMessage(err) ?? M.TOAST.REJECT_FAILED);
    }
  };

  const columns: Column<IntentData>[] = [
    avatarColumn({
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      name: (i) => i.s,
      image: (i) => getFallbackAvatar(i.s),
    }),
    {
      id: "items",
      header: M.COLUMNS.ITEMS,
      cell: (i) => {
        // The backend's own per-line explanation ("Out of stock — none
        // available", "Short by 2: only 1 of 3 available"), prefixed with the
        // item it belongs to because a row holds several.
        //
        // A `null` reason means there is nothing to explain — most often
        // because nobody has verified the line yet. It never means the item is
        // unavailable; that verdict comes from `is_available` alone.
        const notes = i.reqItems.filter((it) => it.reason).map((it) => `${it.name} — ${it.reason}`);
        return (
          <div className="flex items-start gap-2">
            <div className="prod-thumb h-8 w-8 shrink-0">
              <IconPackage size={16} />
            </div>
            <div className="min-w-0">
              <span
                className="trunc block max-w-[170px] text-[12.5px] font-medium text-[var(--t3)]"
                title={i.it}
              >
                {i.it}
              </span>
              {notes.map((n) => (
                <RowReason key={n} text={n} className="mt-0.5" />
              ))}
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      header: M.COLUMNS.TYPE,
      cell: (i: IntentData) => (
        <OrderTypeBadges isExpress={i.isExpress} isEmergency={i.isEmergency} />
      ),
    },
    textColumn({ id: "ship", header: M.COLUMNS.SHIP, get: (i) => i.sh, className: "td-m" }),
    textColumn({ id: "arrival", header: M.COLUMNS.ARRIVAL, get: (i) => i.ar, className: "td-m" }),
    textColumn({
      id: "departure",
      header: M.COLUMNS.DEPARTURE,
      get: (i) => i.sy,
      className: "td-m",
    }),
    textColumn({
      id: "submitted",
      header: M.COLUMNS.SUBMITTED,
      get: (i) => i.sb,
      className: "td-m",
    }),
    badgeColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (i) => i.st,
      variant: (i) => i.sc,
      // Why a rejected or cancelled intent ended here. Both reason columns come
      // down on the list itself, so a terminated row explains itself in place.
      note: (i) => <RowReason text={i.reason} at={i.reasonAt} className="mt-1" />,
      filter: {
        // The URL uses "" for unfiltered; the local sentinel is "all".
        value: statusFilter === "all" ? "" : statusFilter,
        options: STATUS_OPTIONS.filter((o) => o.value !== "all"),
        onChange: (val: string) => setParam("status", val),
        allLabel: M.ALL_STATUS,
      },
    }),
    {
      id: "owner",
      header: M.COLUMNS.OWNER,
      cell: (i) => (
        <OwnerCell
          assignedAdmin={i.assignedAdmin}
          state={stateOf(i.assignedAdmin)}
          // Same rule as the Orders board: reassign/release is owner-or-super
          // admin, which is narrower than the write gate.
          onHandover={
            canReassign(i.assignedAdmin)
              ? () => setHandover({ id: i.id, ref: i.r || i.id, owner: i.assignedAdmin })
              : undefined
          }
        />
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-40 text-right",
      cell: (i) => (
        <div className="td-acts">
          {/* Claim is offered only while unassigned — on a held order it would 409. */}
          {canClaim(i.assignedAdmin) && (
            <Button
              variant="teal"
              size="xs"
              // Same xs box (26px tall) — the label just stacks inside it: smaller
              // font and tight leading so two lines clear the height, leaving the
              // breathing room above and below instead of between the words.
              className="max-w-[4.25rem] whitespace-normal px-2 text-[9px] leading-[1.05]"
              disabled={claimingId === i.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClaim(i, true);
              }}
            >
              {claimingId === i.id ? O.CLAIMING : O.MANAGE}
            </Button>
          )}
          <Button
            variant="primary"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenReview(i);
            }}
          >
            {M.ACTION_REVIEW}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title={M.TITLE}
        subtitle={statsLoading ? undefined : M.STATS.OPEN_SUMMARY(stats?.total_intents ?? 0)}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            // Status lives on the STATUS column header, not here. It narrows
            // the table only — the cards are the status breakdown and ignore it
            // — so a toolbar slot beside search, which rescopes the whole
            // screen, implied a reach it does not have.
            filters={[]}
          >
            {/* Opens the status-meaning legend. Kept in the toolbar now that the
                status filter itself has moved to the column header — it explains all
                18 statuses, not just the one selected. */}
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              aria-label={M.STATUS_LEGEND.OPEN_LABEL}
              title={M.STATUS_LEGEND.OPEN_LABEL}
              onClick={() => setIsLegendOpen(true)}
            >
              <IconInfoCircle size={18} />
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={allStatItems} className="cols-4" />

      {/* Throughput, not a funnel state: intents that LEFT this screen today by
          being paid. It belongs to no total, so it sits outside both grids. */}
      <div className="mb-5 flex items-center gap-2 text-[13px]">
        <IconCheck size={15} className="shrink-0 text-[var(--success-icon)]" />
        <span className="font-semibold text-[var(--t3)]">{M.STATS.CONFIRMED_TODAY}</span>
        <span className="font-extrabold tabular-nums text-[var(--t1)]">
          {num("confirmed_today")}
        </span>
      </div>

      {/* Order-type filter — same control and semantics as the orders screen. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="sec-label !mb-0">{M.TYPE_FILTER.LABEL}</span>
        <PillToggle
          options={typeOptions}
          value={typeFilter}
          onChange={(value) => setParam("type", value === "all" ? "" : value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={intents}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={retryAll}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY}
        onRowClick={handleOpenReview}
      />

      {/* Review Intent Drawer */}
      <IntentReviewDrawer
        intent={selectedIntent}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onPrimaryAction={handlePrimaryAction}
        onReject={handleRejectIntent}
        ownership={selectedIntent ? stateOf(selectedIntent.assignedAdmin) : "unassigned"}
        canManage={canManage(selectedIntent?.assignedAdmin)}
        canClaim={canClaim(selectedIntent?.assignedAdmin)}
        isSuperAdmin={isSuperAdmin}
        isClaiming={!!selectedIntent && claimingId === selectedIntent.id}
        isReleasing={isReleasing}
        onClaim={() => selectedIntent && handleClaim(selectedIntent)}
      />

      {/* Reject-intent reason popup (Flow 05 API 6) */}
      <RejectIntentDialog
        isOpen={isRejectOpen}
        orderRef={selectedIntent?.r ?? ""}
        isLoading={isRejecting}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
      />

      {/* Fee popup — create (Flow 07 API 1), update (API 2), or generate a
          Stripe link (API 3); all three take the same fee body. */}
      <CreateBillDialog
        isOpen={isBillOpen}
        mode={billMode}
        orderRef={selectedIntent?.r ?? ""}
        isLoading={isBilling || isUpdatingBill}
        isGeneratingLink={isGeneratingLink}
        linkResult={linkResult}
        onClose={() => {
          setIsBillOpen(false);
          setLinkResult(null);
        }}
        onConfirm={handleConfirmBill}
        onGenerateLink={handleGenerateLink}
      />

      {/* Status terminology legend (opened from the info icon by the filter) */}
      <StatusLegendDialog isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} />

      {/* Flow 27 — reassign to another admin, or release back to the pool. */}
      <OrderHandoverDialog
        isOpen={!!handover}
        orderId={handover?.id ?? ""}
        orderRef={handover?.ref ?? ""}
        assignedAdmin={handover?.owner ?? null}
        onClose={() => setHandover(null)}
      />
    </>
  );
}
