import {
  IconCheck,
  IconClock,
  IconFileInvoice,
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
  type ClaimConflict,
  OwnerCell,
  useClaimOrderMutation,
  useOrderOwnership,
} from "@/features/orders";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { toast } from "sonner";
import { useCreateBillMutation } from "../api/billingApi";
import {
  useGetIntentStatsQuery,
  useGetIntentsQuery,
  useRejectIntentMutation,
} from "../api/intentApi";
import { useReleaseSuggestionsMutation } from "../api/substitutionApi";
import type { IntentAction, IntentData, IntentStats } from "../types/intent.types";
import { type BillFees, CreateBillDialog } from "./CreateBillDialog";
import { IntentReviewDrawer } from "./IntentReviewDrawer";
import { RejectIntentDialog } from "./RejectIntentDialog";

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

// Status dropdown options — values map 1:1 to the API `status` query param.
const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  { value: "intent_received", label: M.STATUS_FILTER.INTENT_RECEIVED },
  { value: "sourcing", label: M.STATUS_FILTER.SOURCING },
  { value: "verification_submitted", label: M.STATUS_FILTER.VERIFICATION_SUBMITTED },
  { value: "partner_verifying", label: M.STATUS_FILTER.PARTNER_VERIFYING },
  { value: "payment_pending", label: M.STATUS_FILTER.PAYMENT_PENDING },
  { value: "pending_customer_response", label: M.STATUS_FILTER.PENDING_CUSTOMER_RESPONSE },
  { value: "pending_intent", label: M.STATUS_FILTER.PENDING_INTENT },
  { value: "intent_rejected", label: M.STATUS_FILTER.INTENT_REJECTED },
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
  /** Which row's claim is in flight — scopes the spinner to that button. */
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { stateOf, canManage, canClaim, isSuperAdmin } = useOrderOwnership();
  const [claimOrder] = useClaimOrderMutation();
  const [rejectIntent, { isLoading: isRejecting }] = useRejectIntentMutation();
  const [releaseSuggestions, { isLoading: isReleasing }] = useReleaseSuggestionsMutation();
  const [createBill, { isLoading: isBilling }] = useCreateBillMutation();

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
   *  - `bill`      → generate payment link (Flow 7 — not yet wired)
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
    if (action === "bill") {
      // Close the drawer first — the fee popup (a custom Dialog) would render
      // behind the Sheet overlay otherwise. `selectedIntent` is retained.
      setIsReviewOpen(false);
      setIsBillOpen(true);
      return;
    }
    // assign (and any other) — partner assignment isn't wired yet.
    toast.info(M.TOAST.ASSIGN_PENDING);
  };

  /**
   * Flow 07 API 1 — create the payment bill with the entered fees. The subtotal
   * is computed server-side. Surfaces the gate/stage errors: 409 (claim first /
   * already billed / unconfirmed substitutions), 403 (wrong owner), 400.
   */
  const handleConfirmBill = async (fees: BillFees) => {
    if (!selectedIntent) return;
    try {
      const res = await createBill({ order_id: selectedIntent.id, ...fees }).unwrap();
      toast.success(M.TOAST.BILLED(res.order_number || selectedIntent.r, res.amount ?? ""));
      setIsBillOpen(false);
    } catch (err) {
      const status = (err as { status?: unknown })?.status;
      if (status === 409) {
        // 409 covers unclaimed as well as "already billed / unconfirmed subs" —
        // surface the backend's specific message when present.
        toast.error(getApiMessage(err) ?? O.CLAIM_FIRST);
        return;
      }
      toast.error(getApiMessage(err) ?? M.TOAST.BILL_FAILED);
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
      cell: (i) => <OwnerCell assignedAdmin={i.assignedAdmin} state={stateOf(i.assignedAdmin)} />,
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
          />
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

      {/* Create-bill fee popup (Flow 07 API 1) */}
      <CreateBillDialog
        isOpen={isBillOpen}
        orderRef={selectedIntent?.r ?? ""}
        isLoading={isBilling}
        onClose={() => setIsBillOpen(false)}
        onConfirm={handleConfirmBill}
      />
    </>
  );
}
