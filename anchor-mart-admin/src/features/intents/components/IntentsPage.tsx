import {
  IconCheck,
  IconClock,
  IconFileInvoice,
  IconInfoCircle,
  IconPackage,
  IconRefresh,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
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

// KPI cards — each maps 1:1 to a field on the intents stats API response.
const STAT_CONFIG: {
  id: string;
  label: string;
  key: keyof IntentStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    key: "total_intents",
    icon: <IconFileInvoice size={20} />,
    variant: "navy",
  },
  {
    id: "awaiting-payment",
    label: M.STATS.AWAITING_PAYMENT,
    key: "awaiting_payment",
    icon: <IconClock size={20} />,
    variant: "amber",
  },
  {
    id: "subs",
    label: M.STATS.SUBSTITUTIONS,
    key: "substitution_needed",
    icon: <IconRefresh size={20} />,
    variant: "red",
  },
  {
    id: "confirmed",
    label: M.STATS.CONFIRMED_TODAY,
    key: "confirmed_today",
    icon: <IconCheck size={20} />,
    variant: "green",
  },
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

// The eight values above are exactly the enum the API collection documents for
// `?status=`. The flow doc also mentions two derived views (`ready_to_bill`,
// `awaiting_customer`) but the collection doesn't list them, so they are kept
// out of the dropdown rather than risking a 400 on an unsupported value.
const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  ...INTENT_FILTER_KEYS.map((key) => ({ value: key, label: ORDER_STATUS_BY_KEY[key].label })),
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
  const { data, isLoading, isFetching, isError, refetch } = useGetIntentsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusParam,
  });

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  const { data: stats, isLoading: statsLoading } = useGetIntentStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

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
      cell: (i) => (
        <div className="flex aic g8">
          <div className="prod-thumb h-8 w-8">
            <IconPackage size={16} />
          </div>
          <span
            className="trunc block max-w-[170px] text-[12.5px] font-medium text-[var(--t3)]"
            title={i.it}
          >
            {i.it}
          </span>
        </div>
      ),
    },
    textColumn({ id: "ship", header: M.COLUMNS.SHIP, get: (i) => i.sh, className: "td-m" }),
    textColumn({ id: "arrival", header: M.COLUMNS.ARRIVAL, get: (i) => i.ar, className: "td-m" }),
    textColumn({ id: "stay", header: M.COLUMNS.STAY, get: (i) => i.sy, className: "td-m" }),
    textColumn({
      id: "submitted",
      header: M.COLUMNS.SUBMITTED,
      get: (i) => i.sb,
      className: "td-m",
    }),
    badgeColumn({ id: "status", header: M.COLUMNS.STATUS, get: (i) => i.st, variant: (i) => i.sc }),
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
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: M.ALL_STATUS,
                options: STATUS_OPTIONS,
                width: "180px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          >
            {/* Info icon beside the status filter → opens the status-meaning legend. */}
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

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={intents}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
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
