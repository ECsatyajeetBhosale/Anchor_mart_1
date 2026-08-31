import { DropdownSelect } from "@/components/common/DropdownSelect";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { FormField } from "@/components/common/FormField";
import {
  KV,
  ReviewCustomerCard,
  ReviewGateBanner,
  ReviewHeader,
  ReviewSummaryStrip,
  ReviewTiles,
  Section,
} from "@/components/common/ReviewLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
import {
  partnerOptionLabel,
  useAssignOrderMutation,
  useGetOrderTimelineQuery,
  useGetPartnersByCapabilityQuery,
} from "@/features/assignments";
import { OwnerCell, type OwnershipState } from "@/features/orders";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { partnerRequirement } from "@/lib/partnerRequirement";
import {
  IconAlertTriangle,
  IconAnchor,
  IconBan,
  IconBolt,
  IconCalendar,
  IconFileInvoice,
  IconLoader2,
  IconRefresh,
  IconSend,
  IconShip,
  IconTruckDelivery,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGetIntentDetailQuery } from "../api/intentApi";
import { useGetSuggestedItemsQuery } from "../api/substitutionApi";
import {
  canCancelIntent,
  canRejectIntent,
  canRequestReverification,
  deriveIntentAction,
} from "../lib/intentAction";
import type {
  IntentAction,
  IntentBadgeVariant,
  IntentData,
  IntentDetailItem,
} from "../types/intent.types";
import { IntentLifecycleRail } from "./IntentLifecycleRail";
import { SuggestReplacementPanel } from "./SuggestReplacementPanel";

const O = MESSAGES.INTENTS.OWNERSHIP;
const S = MESSAGES.INTENTS.SUBSTITUTION;
const T = MESSAGES.INTENTS.TOAST;
const R = MESSAGES.INTENTS.REVIEW;

const TAB_OVERVIEW = "overview";
const TAB_ITEMS = "items";
const TAB_FULFILMENT = "fulfilment";

/**
 * Statuses an order holds *before* a bill exists (Flow 07 — the bill is written
 * by Create Bill, which moves the order to `payment_pending`).
 *
 * `total_amount` is a real `0.00` at these stages because nothing has been
 * priced, so rendering the usual "$0.00" reads as *"this order is free"* on the
 * very screen whose primary action is **Create Bill**. Gating on status rather
 * than on `total === 0` matters: a fully discounted order at `payment_pending`
 * is genuinely $0.00 and must still show as such.
 */
const UNBILLED_STATUSES = new Set([
  "intent_received",
  "pending_intent",
  "sourcing",
  "partner_verifying",
  "verification_submitted",
  "pending_customer_response",
]);

export interface IntentReviewDrawerProps {
  intent: IntentData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Runs the primary action for the intent's derived state (assign/suggest→release/bill). */
  onPrimaryAction: (action: IntentAction) => void;
  onReject: () => void;
  /** Opens the re-verification prompt. Rendered only where §4.3b allows it. */
  onRequestReverification: () => void;
  /** Opens the cancel prompt. Rendered where reject is no longer legal. */
  onCancel: () => void;
  /** Flow 27 ownership of the underlying order. */
  ownership: OwnershipState;
  /** May the signed-in admin perform gated writes on this order? */
  canManage: boolean;
  /** Should the claim action be offered (unassigned only)? */
  canClaim: boolean;
  isClaiming: boolean;
  /** Release-suggestions mutation in flight. */
  isReleasing: boolean;
  onClaim: () => void;
}

/** Badge variant for the order status (reuses the canonical map). */
function statusVariant(status: string): IntentBadgeVariant {
  return (ORDER_STATUS_BY_KEY[status]?.variant as IntentBadgeVariant) ?? "neutral";
}

/**
 * One line of the pricing breakdown.
 *
 * Rendered unconditionally by every caller — a missing value shows as the
 * formatter's own fallback rather than removing the row, so the reader can
 * always check the sum against the total.
 */
function PriceLine({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12.5px] text-[var(--t3)]">{label}</span>
      <span
        className={`text-[13px] font-semibold tabular-nums ${
          negative ? "text-[var(--success-text)]" : "text-[var(--t2)]"
        }`}
      >
        {negative ? "-" : ""}
        {money(value)}
      </span>
    </div>
  );
}

/** `$55.00`, or a dash when the backend sent nothing for this line. */
function money(value: string): string {
  return formatMoney(value);
}

/**
 * Availability pill for one order line — the four states the backend defines.
 *
 * **Short is not unavailable.** A partially-supplied line still delivers what
 * was found, and the two lead an admin to different actions, so they get
 * different badges. Likewise **unverified is not unavailable**: nobody has
 * looked yet, which means chase the partner, not source a replacement.
 *
 * The count comes from `availability` (`requested_qty - available_qty`), never
 * from `items[].quantity` — an unpaid order can change its quantity after
 * verification, so comparing against the current one would report a shortfall
 * that was never measured.
 */
function availabilityBadge(item: IntentDetailItem) {
  // The partner's note, surfaced on the two states where it explains something
  // the admin has to act on — why a line is missing, or short. Presentation
  // only: it never feeds the state above it. Empty string when absent, not null.
  const note = item.availability?.note?.trim();
  const explained = (badge: ReactNode) =>
    note ? (
      <span title={note} className="cursor-help">
        {badge}
      </span>
    ) : (
      badge
    );

  switch (item.availabilityState) {
    case "unavailable":
      return explained(<Badge variant="danger">{R.UNAVAILABLE}</Badge>);
    case "short":
      return explained(<Badge variant="warning">{R.SHORT_BY(item.shortBy)}</Badge>);
    case "available":
      return <Badge variant="success">{R.AVAILABLE}</Badge>;
    default:
      return <Badge variant="neutral">{R.UNVERIFIED}</Badge>;
  }
}

/**
 * Right-side review drawer for an intent request. When opened it fetches the
 * full order detail from `GET /superadmin/orders/orders/{id}/` and lays it out
 * the way an operations console is expected to: an identity header, an
 * at-a-glance summary strip (status, lifecycle rail, total, key facts), a
 * single "what to do next" callout, then the depth split across three tabs —
 * Overview, Items & Pricing, Fulfilment. All of that scrolls as one page; only
 * the tab bar (sticky) and the ownership/action footer (pinned) stay put, so
 * the primary action is reachable from anywhere in the scroll.
 */
export function IntentReviewDrawer({
  intent,
  isOpen,
  onClose,
  onPrimaryAction,
  onReject,
  onRequestReverification,
  onCancel,
  ownership,
  canManage,
  canClaim,
  isClaiming,
  isReleasing,
  onClaim,
}: IntentReviewDrawerProps) {
  // Assign-partner form — reset each time the drawer opens. `forceReassign`
  // flips to true after a 409 requires_confirmation, so the next click reassigns.
  const [assignPartner, setAssignPartner] = useState("");
  const [forceReassign, setForceReassign] = useState(false);
  const [tab, setTab] = useState(TAB_OVERVIEW);
  // Guards the one-shot "open on the tab that needs work" jump per drawer open.
  const autoTabbed = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      autoTabbed.current = false;
      return;
    }
    setAssignPartner("");
    setForceReassign(false);
    setTab(TAB_OVERVIEW);
  }, [isOpen]);

  // ─── Fetch full order detail when drawer opens ───────────────────────
  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useGetIntentDetailQuery(intent?.id ?? "", {
    skip: !isOpen || !intent?.id,
  });

  // Derived next-action + whether the substitution panel applies. Hooks must
  // run before the early return, so read fields defensively off a nullable intent.
  const status = detail?.status ?? intent?.status ?? "";
  const orderId = intent?.id ?? "";
  const action = deriveIntentAction(
    status,
    detail?.substitutionNeeded ?? intent?.substitutionNeeded ?? false,
    // From the list row: `situation` is part of the list contract, and the
    // detail read is a different one that does not carry it.
    intent?.situation,
  );
  /**
   * What the intent is short of, from `needs_verifier_partner` /
   * `needs_delivery_partner` — the backend's own answer, not one worked out
   * from the status or from whether an assignment exists.
   */
  const requirement = partnerRequirement(
    detail?.needsVerifierPartner ?? intent?.needsVerifierPartner,
    detail?.needsDeliveryPartner ?? intent?.needsDeliveryPartner,
  );
  const needsVerifier = requirement === "verify";
  // Reassignment while a partner verifies: the requirement is already met (the
  // verifier is working), so the flags report nothing outstanding — swapping
  // them is still legitimate, and this is the surface that offers it.
  const showReassign = !needsVerifier && status === "partner_verifying";
  const showPartnerPicker = needsVerifier || showReassign;
  const showSubstitution =
    status === "verification_submitted" || status === "pending_customer_response";

  /**
   * Will the requested lines fail to sum to the billed subtotal?
   *
   * Exactly when some line is short or unavailable: those quantities are trimmed
   * and their accepted substitutes promoted into real lines by
   * `finalise_paid_order`, which runs **at payment**. Until then `items[]` is
   * the request and `subtotal` is `compute_subtotal()`, and the two are
   * different questions.
   *
   * Read off availability rather than by summing the lines and comparing: a
   * float sum of decimal strings is the wrong instrument for an equality test,
   * and availability is the cause rather than a symptom of it.
   */
  const billedDiffersFromRequested =
    detail?.items.some(
      (i) => i.availabilityState === "short" || i.availabilityState === "unavailable",
    ) ?? false;

  // Land on the tab that carries the pending work, once the detail resolves the
  // real status. Only fires once per open so it never fights the user's clicks.
  useEffect(() => {
    if (!isOpen || autoTabbed.current || !detail) return;
    autoTabbed.current = true;
    if (showPartnerPicker || showSubstitution) setTab(TAB_FULFILMENT);
  }, [isOpen, detail, showPartnerPicker, showSubstitution]);

  // Flow 28 API 11 — every available partner. `order_id` is deliberately NOT
  // sent: scoping by it filters to the order's port + required capability, which
  // returns an empty picker while partner port/capability data is incomplete.
  // API 12 still enforces the capability rule, so a mismatched pick is rejected
  // server-side and the backend's message is surfaced on the toast.
  // Verification phase: only partners who can VERIFY stock. Filtered server-side
  // by `partner/list/?can_verify=true`, which includes both-capable partners.
  const { data: assignablePartners = [], isLoading: partnersLoading } =
    useGetPartnersByCapabilityQuery(
      { capability: "verify" },
      { skip: !isOpen || !showPartnerPicker },
    );
  const [assignOrder, { isLoading: assigning }] = useAssignOrderMutation();

  // Flow 28 API 16 — the real milestone ladder (timestamps + done flags),
  // replacing a position guessed from the current status.
  // Still fetched for the compact rail — the vertical timeline that also used
  // this was removed, since the rail already answers "where is this order?"
  // and the two sat one above the other saying the same thing.
  const { data: timeline } = useGetOrderTimelineQuery(orderId, {
    skip: !isOpen || !orderId,
  });

  const partnerOptions = assignablePartners.map((p) => ({
    value: p.deliveryPartnerId,
    // Includes the capability suffix, so a verify-only partner is visibly
    // narrower than the "both" default rather than looking identical.
    label: partnerOptionLabel(p),
  }));
  const partnerPlaceholder = partnersLoading
    ? R.PARTNER_LOADING
    : partnerOptions.length === 0
      ? R.PARTNER_EMPTY
      : R.PARTNER_PLACEHOLDER;

  // Staged suggestions — gates the Release button (shared cache with the panel).
  const { data: staged = [] } = useGetSuggestedItemsQuery(orderId, {
    skip: !isOpen || !showSubstitution || !orderId,
  });
  const hasUnreleased = staged.some((s) => !s.released);

  /**
   * Flow 28 API 12 — assign (`reassign=false`) or reassign (`reassign=true`) the
   * selected partner. First assignment moves the order to `partner_verifying`;
   * reassignment closes the current partner's assignment and opens a new one.
   *
   * `confirm` is true for an explicit reassign, or once a prior 409
   * `requires_confirmation` flipped `forceReassign`. Gate errors (409 unclaimed
   * / 403 wrong owner) surface via the message.
   */
  const handleAssign = async (reassign: boolean) => {
    if (!assignPartner) {
      toast.error(T.ASSIGN_SELECT_PARTNER);
      return;
    }
    try {
      const res = await assignOrder({
        order_id: orderId,
        delivery_partner_id: assignPartner,
        confirm: reassign || forceReassign,
      }).unwrap();
      // 200 + `already_assigned` = the backend changed nothing (the picked
      // partner already holds the order's active assignment). Not an
      // assignment, so it must not read as one — and the drawer stays open,
      // since the admin's next move is to pick someone else.
      if (res?.already_assigned) {
        toast.warning(MESSAGES.COMMON.ASSIGN_ORDER_NO_CHANGE);
        return;
      }
      toast.success(reassign ? T.REASSIGNED(intent?.r ?? "") : T.ASSIGNED(intent?.r ?? ""));
      onClose();
    } catch (err) {
      const e = err as { status?: unknown; data?: { requires_confirmation?: boolean } };
      if (e?.status === 409 && e?.data?.requires_confirmation) {
        setForceReassign(true);
        toast.error(T.REASSIGN_CONFIRM);
        return;
      }
      // 403 from the model-level capability guard (Flow 28 GL1) — the partner
      // cannot do this kind of work, so retrying the same pick cannot succeed.
      // A wrong-owner 403 carries its own message, which wins via getApiMessage.
      if (e?.status === 403) {
        toast.error(getApiMessage(err) ?? MESSAGES.ORDERS.ASSIGN_PARTNER.WRONG_CAPABILITY);
        return;
      }
      toast.error(getApiMessage(err) ?? T.ASSIGN_FAILED);
    }
  };

  if (!intent) return null;

  const owner = detail?.assignedAdmin ?? intent.assignedAdmin;

  // Summary facts render immediately from the list row and upgrade in place
  // once the detail request lands, so the strip never flashes empty.
  const view = {
    ref: detail?.orderNumber || intent.r,
    statusLabel: detail?.statusDisplay || intent.st || ORDER_STATUS_BY_KEY[status]?.label || status,
    total: detail?.total || intent.total,
    itemCount: detail?.itemCount ?? intent.itemCount,
    port: detail?.portName || intent.port,
    arrival: detail?.shipArrivalDate || intent.ar,
    // The business placement event (`placed_at`), not the record's technical
    // creation time. `createdAt` remains available and is the fallback only
    // while the detail request is in flight.
    submitted: detail?.placedAt || detail?.createdAt || intent.sb,
    isExpress: detail?.isExpress ?? false,
    isEmergency: detail?.isEmergency ?? false,
    isUnbilled: UNBILLED_STATUSES.has(status),
  };

  // Why this admin cannot write, when they cannot. The "Next step" half of this
  // — the info-tone line telling an admin who *can* act what to do next — was
  // removed from the drawer: the footer's primary button already carries that
  // instruction as its own label, so the banner restated it in a full-width
  // strip above the tabs and pushed the content down on every open.
  //
  // What remains is the blocked case, which is not a restatement of anything:
  // it is the only place the drawer explains why every action is disabled. A
  // super admin writes regardless of ownership and so never reaches it; it is
  // read by an Operator, who cannot take the order on themselves, and it names
  // who can hand it to them instead.
  const blockedHint = canManage
    ? null
    : ownership === "other" && owner
      ? O.OWNED_BY_OTHER(owner.name)
      : O.NOT_ASSIGNED;

  // Primary footer action. The assign branch is the backend's requirement, not
  // a status the frontend classified.
  const primary = needsVerifier
    ? { label: assigning ? R.ASSIGNING : R.ASSIGN_VERIFICATION, disabled: !canManage || assigning }
    : showReassign
      ? {
          label: assigning ? R.REASSIGNING : R.REASSIGN,
          disabled: !canManage || assigning,
        }
      : action === "suggest"
        ? { label: isReleasing ? S.RELEASING : S.RELEASE, disabled: !canManage || !hasUnreleased }
        : action === "bill"
          ? { label: R.BILL, disabled: !canManage }
          : // Flow 07 API 2 — a pending bill can only be corrected by updating
            // it; create-bill 409s on a second call.
            action === "awaiting_payment"
            ? { label: R.UPDATE_BILL, disabled: !canManage }
            : null;

  // Assign/reassign are handled here (the partner selection lives in this
  // drawer); release/bill are dispatched to the page (mutation/dialog owner).
  const handlePrimary = () => {
    if (needsVerifier) return handleAssign(false);
    if (showReassign) return handleAssign(true);
    return onPrimaryAction(action);
  };

  const copyRef = () => {
    navigator.clipboard?.writeText(view.ref).then(
      () => toast.success(R.COPIED),
      () => undefined,
    );
  };

  const itemColumns: Column<IntentDetailItem>[] = [
    {
      id: "item",
      header: R.ITEM_COLUMNS.ITEM,
      cell: (row) => (
        <div className="min-w-0 max-w-[230px]">
          <div className="td-p trunc" title={row.name}>
            {row.name}
          </div>
          {row.sku && <div className="td-id trunc">{row.sku}</div>}
        </div>
      ),
    },
    {
      id: "qty",
      header: R.ITEM_COLUMNS.QTY,
      headerClassName: "w-14 text-center",
      className: "w-14 text-center",
      cell: (row) => <span className="td-p tabular-nums">{row.qty}</span>,
    },
    {
      id: "unit",
      header: R.ITEM_COLUMNS.UNIT,
      headerClassName: "w-24 text-right",
      className: "w-24 text-right",
      cell: (row) => <span className="td-m tabular-nums">{money(row.unitPrice)}</span>,
    },
    {
      id: "subtotal",
      header: R.ITEM_COLUMNS.SUBTOTAL,
      headerClassName: "w-24 text-right",
      className: "w-24 text-right",
      cell: (row) => <span className="td-p tabular-nums">{money(row.subtotal)}</span>,
    },
    {
      id: "availability",
      header: R.ITEM_COLUMNS.AVAILABILITY,
      headerClassName: "w-28 text-right",
      className: "w-28 text-right",
      cell: (row) => availabilityBadge(row),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={860}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        {/* One scroll container for the whole drawer — header, summary strip,
            callout and tab content all scroll together; only the action footer
            is pinned. */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Identity header ───────────────────────────────────────── */}
          <ReviewHeader
            icon={<IconFileInvoice size={22} />}
            title={R.TITLE}
            reference={view.ref}
            copyLabel={R.COPY_REF}
            onCopy={copyRef}
            right={<OwnerCell assignedAdmin={owner} state={ownership} />}
          />

          <ReviewSummaryStrip
            badges={
              <>
                <Badge
                  variant={statusVariant(status)}
                  showDot
                  className="h-auto text-[12px] px-3 py-[5px]"
                >
                  {view.statusLabel}
                </Badge>
                {view.isExpress && (
                  <Badge variant="teal" className="h-auto text-[12px] px-3 py-[5px]">
                    <IconBolt size={13} />
                    {R.EXPRESS}
                  </Badge>
                )}
                {view.isEmergency && (
                  <Badge variant="danger" className="h-auto text-[12px] px-3 py-[5px]">
                    <IconAlertTriangle size={13} />
                    {R.EMERGENCY}
                  </Badge>
                )}
              </>
            }
            valueLabel={R.SUMMARY.TOTAL}
            value={
              view.isUnbilled ? (
                <div className="text-[13px] font-bold leading-tight text-[var(--t4)]">
                  {R.SUMMARY.NOT_PRICED}
                </div>
              ) : (
                <div className="text-[21px] font-extrabold leading-tight tracking-[-0.5px] text-[var(--t1)] tabular-nums">
                  {money(view.total)}
                </div>
              )
            }
            rail={
              <IntentLifecycleRail
                status={status}
                steps={timeline?.steps}
                reason={detail?.terminalReason}
                reasonAt={detail?.terminalReasonAt}
              />
            }
            facts={[
              { label: R.SUMMARY.ITEMS, value: String(view.itemCount ?? 0) },
              { label: R.SUMMARY.SUBMITTED, value: view.submitted },
              {
                label: R.SUMMARY.PORT,
                value: view.port,
                icon: <IconAnchor size={14} className="shrink-0 text-[var(--navy-500)]" />,
              },
              {
                label: R.SUMMARY.ARRIVAL,
                value: view.arrival,
                icon: <IconCalendar size={14} className="shrink-0 text-[var(--t4)]" />,
              },
            ]}
          />

          {blockedHint && (
            <ReviewGateBanner tone="blocked" label={R.BLOCKED} message={blockedHint} />
          )}

          {/* ── Body ──────────────────────────────────────────────────── */}
          <div className="px-6 pb-6">
            {/* Loading state */}
            {detailLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--t4)]">
                <IconLoader2 size={28} className="animate-spin" />
                <span className="text-[13px] font-semibold">{R.LOADING}</span>
              </div>
            )}

            {/* Error state */}
            {detailError && !detailLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--t4)]">
                <IconAlertTriangle size={28} className="text-[var(--danger-text)]" />
                <span className="text-[13px] font-semibold">{R.ERROR}</span>
                <Button variant="secondary" size="sm" onClick={refetchDetail}>
                  <IconRefresh size={14} className="mr-1" />
                  {R.RETRY}
                </Button>
              </div>
            )}

            {detail && !detailLoading && (
              <>
                <div className="sticky top-0 z-10 -mx-6 mb-5 bg-[var(--surface)] px-6 pt-1">
                  <DynamicTabs
                    tabs={[
                      { label: R.TABS.OVERVIEW, value: TAB_OVERVIEW },
                      { label: R.TABS.ITEMS(detail.items.length), value: TAB_ITEMS },
                      { label: R.TABS.FULFILMENT, value: TAB_FULFILMENT },
                    ]}
                    value={tab}
                    onTabChange={setTab}
                    listClassName="!mb-0"
                  />
                </div>

                {/* ── Overview: who and where ──────────────────────── */}
                {tab === TAB_OVERVIEW && (
                  <>
                    <Section title={R.CUSTOMER_INFO}>
                      <ReviewCustomerCard
                        name={detail.sailorName}
                        roleLabel={R.SAILOR}
                        email={detail.sailorEmail}
                        phone={detail.sailorPhone}
                        noEmailLabel={R.NO_EMAIL}
                        noPhoneLabel={R.NO_PHONE}
                      />
                    </Section>

                    <Section title={R.VESSEL_SHIPPING}>
                      <ReviewTiles
                        tiles={[
                          {
                            label: R.VESSEL,
                            value: detail.vesselName,
                            icon: (
                              <IconShip size={15} className="shrink-0 text-[var(--teal-600)]" />
                            ),
                          },
                          { label: R.IMO, value: detail.imo, mono: true },
                          {
                            label: R.PORT,
                            value: detail.portName,
                            icon: (
                              <IconAnchor size={15} className="shrink-0 text-[var(--navy-500)]" />
                            ),
                          },
                          { label: R.ANCHORAGE, value: detail.anchorageName },
                          {
                            label: R.ARRIVAL,
                            value: detail.shipArrivalDate,
                            icon: <IconCalendar size={14} className="shrink-0" />,
                          },
                          { label: R.EXPECTED_DEPARTURE, value: detail.expectedDeparture },
                        ]}
                      />
                    </Section>

                    <Section title={R.ORDER_SUMMARY}>
                      <KV label={R.ORDER_DATE} value={detail.createdAt} />
                      <KV label={R.PORT} value={detail.portCode || detail.portName} />
                    </Section>

                    <Section title={R.NOTES_SECTION}>
                      <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--navy-25)] px-4 py-3 text-[13px] leading-relaxed text-[var(--t2)]">
                        {detail.notes || (
                          <span className="font-medium text-[var(--t4)]">{R.NO_NOTES}</span>
                        )}
                      </div>
                    </Section>
                  </>
                )}

                {/* ── Items & Pricing: what was asked for, what it costs ── */}
                {tab === TAB_ITEMS && (
                  <>
                    <Section title={R.REQUESTED_ITEMS}>
                      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-sm)]">
                        <DataTable<IntentDetailItem>
                          bare
                          columns={itemColumns}
                          data={detail.items}
                          rowKey="id"
                          showPagination={false}
                          emptyMessage={R.NO_ITEMS}
                        />
                      </div>
                      {/*
                        Said only where the discrepancy is actually visible —
                        an order carrying a substitution. On a straightforward
                        order the rows do sum to the subtotal, and a caveat
                        about arithmetic that holds would just be noise.
                      */}
                      {billedDiffersFromRequested && (
                        <div className="mt-2 text-[11.5px] font-medium leading-[1.45] text-[var(--t4)]">
                          {R.REQUESTED_VS_BILLED}
                        </div>
                      )}
                    </Section>

                    <Section title={R.PRICING}>
                      {/* Before Create Bill the backend's subtotal/tax/discount
                          /total are all a real 0, so the old breakdown printed
                          five "$0.00" facts directly beneath priced line items.
                          Pre-bill we show one clearly-labelled estimate instead
                          — the figures that do not exist yet are not invented. */}
                      {view.isUnbilled ? (
                        <div className="rounded-[var(--radius-md)] border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-[var(--info-text)]">
                              {R.ESTIMATED_TOTAL}
                            </span>
                            <span className="text-[15px] font-extrabold text-[var(--info-text)] tabular-nums">
                              {detail.estimatedSubtotal ? money(detail.estimatedSubtotal) : "—"}
                            </span>
                          </div>
                          <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-[var(--info-text)] opacity-80">
                            {R.ESTIMATED_HINT}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--navy-25)] px-4 py-3">
                          {/*
                            Every row renders, including a zero one.
                            
                            These used to be guarded on truthiness, which hid a
                            line whenever the backend sent null — and a
                            breakdown that silently drops a summand reads as
                            complete while failing to add up. A "$0.00" is
                            itself information (the admin entered no platform
                            fee); an absent row is a question. This matches the
                            Orders drawer, which already reasons the same way.
                          */}
                          <PriceLine label={R.SUBTOTAL} value={detail.subtotal} />
                          <PriceLine label={R.SHIPPING_FEE} value={detail.shippingFee} />
                          <PriceLine label={R.TAX} value={detail.tax} />
                          <PriceLine label={R.PLATFORM_FEE} value={detail.platformFee} />
                          <PriceLine label={R.DISCOUNT} value={detail.discount} negative />
                          <PriceLine
                            label={
                              detail.loyaltyPoints > 0
                                ? R.LOYALTY_WITH_POINTS(detail.loyaltyPoints)
                                : R.LOYALTY
                            }
                            value={detail.loyaltyDiscount}
                            negative
                          />
                          <div className="mt-1 flex items-center justify-between border-t border-[var(--border-sm)] pt-2">
                            <span className="text-[13px] font-bold text-[var(--t1)]">
                              {R.TOTAL}
                            </span>
                            <span className="text-[15px] font-extrabold text-[var(--t1)] tabular-nums">
                              {money(detail.total)}
                            </span>
                          </div>
                        </div>
                      )}
                    </Section>

                    <Section title={R.PAYMENT_INFO}>
                      <KV
                        label={R.PAYMENT_STATUS}
                        value={detail.paymentStatus || "—"}
                        className={
                          detail.paymentStatus?.toLowerCase().includes("paid") ||
                          detail.paymentStatus?.toLowerCase().includes("completed")
                            ? "csuccess"
                            : detail.paymentStatus?.toLowerCase().includes("pending")
                              ? "text-[var(--warning-text)]"
                              : ""
                        }
                      />
                      <KV label={R.PAYMENT_METHOD} value={detail.paymentMethod || "—"} />
                      <KV label={R.COUPON} value={detail.coupon || "None"} />
                    </Section>
                  </>
                )}

                {/* ── Fulfilment: who delivers, and the stock report ──── */}
                {tab === TAB_FULFILMENT && (
                  <>
                    <Section title={R.DELIVERY_PARTNER}>
                      {detail.partnerName ? (
                        <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--navy-25)] p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--teal-50)] text-[var(--teal-600)]">
                              <IconTruckDelivery size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="trunc text-[14px] font-bold text-[var(--t1)]">
                                {detail.partnerName}
                              </div>
                              {detail.partnerStatus && (
                                <div className="text-[12px] text-[var(--t3)]">
                                  {detail.partnerStatus}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-md)] px-4 py-3 text-[13px] font-medium text-[var(--t4)]">
                          {R.NO_PARTNER}
                        </div>
                      )}

                      {/* Assign (intent stage) or reassign (while a partner verifies) — Flow 28. */}
                      {showPartnerPicker && (
                        <div className="mt-4">
                          <div className="sec-label">
                            {showReassign ? R.REASSIGN_SECTION : R.ASSIGN_VERIFICATION_SECTION}
                          </div>
                          <FormField label={R.PARTNER_LABEL}>
                            <DropdownSelect
                              value={assignPartner}
                              onValueChange={setAssignPartner}
                              placeholder={partnerPlaceholder}
                              options={partnerOptions}
                              width="100%"
                              searchable
                              searchPlaceholder={MESSAGES.ORDERS.ASSIGN_PARTNER.PARTNER_SEARCH}
                            />
                          </FormField>
                        </div>
                      )}
                    </Section>

                    {/* Stock verification & substitution (Flow 06) — the report lines,
                      staging a replacement per short/unavailable line, and staged list. */}
                    <Section title={S.SECTION}>
                      {showSubstitution ? (
                        <SuggestReplacementPanel
                          orderId={detail.id}
                          portId={detail.portId}
                          canManage={canManage}
                        />
                      ) : (
                        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-md)] px-4 py-3 text-[13px] font-medium text-[var(--t4)]">
                          {R.NO_VERIFICATION}
                        </div>
                      )}
                    </Section>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Pinned action footer ──────────────────────────────────── */}
        <SheetFooter className="shrink-0 p-5 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex w-full justify-end gap-3">
            {canClaim && (
              <Button variant="teal" size="sm" disabled={isClaiming} onClick={onClaim}>
                <IconUserCheck size={15} className="mr-1" />
                {isClaiming ? O.CLAIMING : O.MANAGE}
              </Button>
            )}
            {/* Send the report back to the partner. Withheld when no partner is
                assigned — the endpoint 409s there and tells you to assign one
                instead, which is what `needsVerifier` already offers. */}
            {canRequestReverification(
              status,
              detail?.needsVerifierPartner ?? intent?.needsVerifierPartner ?? null,
            ) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRequestReverification}
                disabled={!canManage}
              >
                <IconRefresh size={15} className="mr-1" />
                {R.REVERIFY}
              </Button>
            )}
            {/* Reject is terminal and only legal before substitutions are
                released — past that the correct action is cancel (Flow 12). */}
            {canRejectIntent(status) && (
              <Button variant="danger" size="sm" onClick={onReject} disabled={!canManage}>
                <IconX size={15} className="mr-1" />
                {R.REJECT}
              </Button>
            )}
            {/* Cancel takes over from reject once substitutions are released:
                the API refuses reject there and says so, naming cancel. Both
                are never offered at once — one terminal action per row. */}
            {canCancelIntent(status) && (
              <Button variant="danger" size="sm" onClick={onCancel} disabled={!canManage}>
                <IconBan size={15} className="mr-1" />
                {R.CANCEL_ORDER}
              </Button>
            )}
            {/* Billing without suggesting first. Suggesting a replacement is the
                better outcome when one exists, but it is not a precondition for
                a bill: the subtotal is computed from what the partner confirmed
                is available, so a line nobody can source does not have to hold
                the whole order. Offered beside Release rather than instead of
                it — Release stays the primary — and only where Release itself
                is: `verification_submitted` with something unavailable. */}
            {action === "suggest" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPrimaryAction("bill")}
                disabled={!canManage}
                title={R.BILL_AVAILABLE_HINT}
              >
                <IconFileInvoice size={15} className="mr-1" />
                {R.BILL_AVAILABLE}
              </Button>
            )}
            {primary && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrimary}
                disabled={primary.disabled}
              >
                <IconSend size={15} className="mr-1" />
                {primary.label}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default IntentReviewDrawer;
