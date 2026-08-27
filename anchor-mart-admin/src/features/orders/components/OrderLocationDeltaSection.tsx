import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { formatMoney } from "@/lib/money";
import { IconAlertTriangle, IconMapPin, IconReceipt, IconTruckDelivery } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAcceptLocationReportMutation,
  useApplyLocationReportMutation,
  useDismissLocationReportMutation,
  useRaiseDeltaMutation,
  useWithdrawDeltaMutation,
} from "../api/orderDeltaApi";
import { useOrderOwnership } from "../hooks/useOrderOwnership";
import {
  type DeltaPayment,
  type DeltaStatus,
  type LocationReport,
  type LocationReportStatus,
  OPEN_DELTA_STATUSES,
} from "../types/delta.types";
import type { AssignedAdmin } from "../types/ownership.types";
import { AcceptLocationReportDialog } from "./AcceptLocationReportDialog";
import { RaiseDeltaDialog } from "./RaiseDeltaDialog";
import { RejectLocationReportDialog } from "./RejectLocationReportDialog";

const L = MESSAGES.ORDERS.LOCATION;
const D = MESSAGES.ORDERS.DELTA;

/** Badge colour per delta status — open ones read as "still owed". */
const DELTA_VARIANT: Record<DeltaStatus, "warning" | "info" | "success" | "neutral" | "danger"> = {
  pending: "warning",
  initiated: "info",
  completed: "success",
  expired: "neutral",
  withdrawn: "neutral",
};

/**
 * Badge colour per report outcome.
 *
 * `accepted` and `priced` both relocated the order, so both read as resolved.
 * `dismissed` did **not** — the order is still on the old berth and someone may
 * need to act on that — so it is deliberately not a quiet grey.
 */
const STATUS_VARIANT: Record<
  LocationReportStatus,
  "warning" | "info" | "success" | "neutral" | "danger"
> = {
  pending: "neutral",
  accepted: "success",
  priced: "info",
  dismissed: "danger",
};

export interface OrderLocationDeltaSectionProps {
  orderId: string;
  /** Display reference shown in the raise-delta prompt. */
  orderRef: string;
  /** Embedded on the order detail read (Flow 11 §14). */
  locationReports?: LocationReport[];
  deltas?: DeltaPayment[];
  /** Owning admin (Flow 27) — every action here is a gated write. */
  assignedAdmin?: AssignedAdmin | null;
  /**
   * Whether a delivery partner is currently on this job. Gates the §4.3
   * reallocation prompt: the server only suggests reallocation when one is
   * assigned, but this keeps the prompt honest if that ever drifts.
   */
  hasAssignedPartner?: boolean;
  /** Jumps to the assign-partner surface. Omit and the prompt shows without a button. */
  onReassignPartner?: () => void;
}

/** `$25.00`, or a dash when absent. */
function money(value?: string): string {
  return formatMoney(value);
}

/** "Mumbai Port · Anchorage A", from whichever parts the report carries. */
function locationLine(report: LocationReport): string {
  return [report.port?.name, report.anchorage?.name].filter(Boolean).join(" · ") || "—";
}

/**
 * Flow 11 — the admin's location-change and surcharge surface for one order.
 *
 * Both lists come from the order detail read, which embeds them, so this
 * renders the full history without hitting the queue endpoints per order. Each
 * action is a governed write: the Flow 27 gate means a sub-admin who doesn't own
 * the order sees the buttons disabled rather than collecting a 409.
 */
export function OrderLocationDeltaSection({
  orderId,
  orderRef,
  locationReports = [],
  deltas = [],
  assignedAdmin,
  hasAssignedPartner = false,
  onReassignPartner,
}: OrderLocationDeltaSectionProps) {
  const { canManage } = useOrderOwnership();
  const [raiseOpen, setRaiseOpen] = useState(false);
  /** The report being accepted free of charge, or null when the dialog is shut. */
  const [acceptTarget, setAcceptTarget] = useState<LocationReport | null>(null);
  /** The 409 `detail`, held so the dialog can show the server's own way out. */
  const [acceptConflict, setAcceptConflict] = useState<string | null>(null);
  /** The report being rejected — a rejection is confirmed, never one-click. */
  const [rejectTarget, setRejectTarget] = useState<LocationReport | null>(null);
  /**
   * §4.3 — raised by whichever write moved the berth, and cleared only by the
   * admin. It outlives the mutation's own state deliberately: a prompt that
   * vanishes on the next re-render is a toast with extra steps.
   */
  const [reallocSuggested, setReallocSuggested] = useState(false);

  const [raiseDelta, { isLoading: raising }] = useRaiseDeltaMutation();
  const [acceptReport, { isLoading: accepting }] = useAcceptLocationReportMutation();
  const [dismissReport, { isLoading: dismissing }] = useDismissLocationReportMutation();
  const [applyReport, { isLoading: applying }] = useApplyLocationReportMutation();
  const [withdrawDelta, { isLoading: withdrawing }] = useWithdrawDeltaMutation();

  const writable = canManage(assignedAdmin);
  const busy = raising || accepting || dismissing || applying || withdrawing;
  // An open delta blocks the partner's final handover until it is paid,
  // withdrawn or expires (#10).
  const holdingDelivery = deltas.some((d) => OPEN_DELTA_STATUSES.has(d.status));

  /**
   * The berth moved and someone is already out on the job (§4.3).
   *
   * Read from the write's own response rather than inferred: the server knows
   * whether the *location* actually changed, and an accept that only adjusted
   * timings should not send anyone driving anywhere.
   */
  const noteReallocation = (result: { partner_reallocation_suggested?: boolean }) => {
    if (result.partner_reallocation_suggested) setReallocSuggested(true);
  };

  const handleRaise = async (deltaAmount: string, note: string) => {
    try {
      noteReallocation(await raiseDelta({ orderId, delta_amount: deltaAmount, note }).unwrap());
      setRaiseOpen(false);
      toast.success(D.RAISED(Number(deltaAmount).toFixed(2)));
    } catch (err) {
      // Keep the popup open so the entered amount/note survive.
      toast.error(getApiMessage(err, { labelFields: false }) ?? D.RAISE_FAILED);
    }
  };

  /** §4.2 — apply the move and bill nothing. */
  const handleAccept = async (reason: string) => {
    if (!acceptTarget) return;
    try {
      noteReallocation(await acceptReport({ orderId, reportId: acceptTarget.id, reason }).unwrap());
      setAcceptTarget(null);
      toast.success(L.ACCEPTED);
    } catch (err) {
      // 409 is not a failure to retry — it is a standing surcharge that
      // contradicts "no charge". The dialog stays open and switches to
      // explaining it, with the server's `detail` as the explanation.
      if (getApiStatus(err) === 409) {
        setAcceptConflict(getApiMessage(err, { labelFields: false }) ?? L.CONFLICT_TITLE);
        return;
      }
      toast.error(getApiMessage(err, { labelFields: false }) ?? L.ACTION_FAILED);
    }
  };

  /** Flow 11 §4 — reject. The order does **not** move. */
  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await dismissReport({
        orderId,
        reportId: rejectTarget.id,
        reason: reason || undefined,
      }).unwrap();
      setRejectTarget(null);
      toast.success(L.REJECTED);
    } catch (err) {
      toast.error(getApiMessage(err, { labelFields: false }) ?? L.ACTION_FAILED);
    }
  };

  const handleApply = async (report: LocationReport) => {
    try {
      noteReallocation(await applyReport({ orderId, reportId: report.id }).unwrap());
      toast.success(L.APPLIED);
    } catch (err) {
      toast.error(getApiMessage(err, { labelFields: false }) ?? L.ACTION_FAILED);
    }
  };

  /** The surcharge a 409 is pointing at — the one blocking a free acceptance. */
  const openDelta = deltas.find((d) => OPEN_DELTA_STATUSES.has(d.status));

  const handleWithdraw = async (delta: DeltaPayment) => {
    try {
      await withdrawDelta({ orderId, deltaId: delta.id }).unwrap();
      toast.success(D.WITHDRAWN);
    } catch (err) {
      toast.error(getApiMessage(err, { labelFields: false }) ?? D.WITHDRAW_FAILED);
    }
  };

  return (
    <>
      {/* ── Location reports ──────────────────────────────────────── */}
      <div className="mt16">
        <div className="sec-label flex items-center gap-1.5">
          <IconMapPin size={13} className="inline" />
          {L.SECTION}
        </div>

        {/* §4.3 — the berth moved while someone is already out on the job.
            Inline and persistent, not a toast: this is an instruction to do a
            second thing, and it is gone before it is read otherwise. Dismissing
            it is the admin's call, so it survives re-renders and refetches. */}
        {reallocSuggested && hasAssignedPartner && (
          <div className="mb-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
            <IconTruckDelivery size={15} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-bold">{L.REALLOC_TITLE}</div>
              <div className="mt-0.5">{L.REALLOC_BODY}</div>
              <div className="mt-1.5 flex gap-2">
                {onReassignPartner && (
                  <Button variant="primary" size="xs" onClick={onReassignPartner}>
                    {L.REALLOC_ACTION}
                  </Button>
                )}
                <Button variant="ghost" size="xs" onClick={() => setReallocSuggested(false)}>
                  {L.REALLOC_DISMISS}
                </Button>
              </div>
            </div>
          </div>
        )}

        {locationReports.length === 0 ? (
          <div className="td-m">{L.NONE}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {locationReports.map((report) => {
              const pending = report.status === "pending";
              return (
                <div className="ecard flex flex-col gap-2" key={report.id}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="td-p">{locationLine(report)}</div>
                      <div className="td-m">
                        {report.created_at ? L.REPORTED(report.created_at) : ""}
                        {report.dismiss_reason ? ` · ${report.dismiss_reason}` : ""}
                      </div>
                    </div>
                    <Badge variant={report.kind === "delta" ? "warning" : "info"}>
                      {report.kind === "delta" ? L.KIND_DELTA : L.KIND_REBILL}
                    </Badge>
                    {/* `success` for both resolved outcomes would say a rejected
                        report went fine. A rejection leaves the order on a berth
                        the ship has left, so it reads as `danger`. Wording comes
                        from `status_display` — the server writes it so that
                        "Accepted (no charge)" and "Dismissed" cannot be collapsed
                        into one label here. */}
                    <Badge variant={STATUS_VARIANT[report.status] ?? "neutral"}>
                      {report.status_display || report.status}
                    </Badge>
                  </div>

                  {/* The sailor's own account of the move, and the admin's answer
                      to it. The note is what the charge-or-waive decision rests
                      on, so it sits with the location rather than in a drawer. */}
                  {report.note && (
                    <div className="td-m">
                      <span className="font-semibold">{L.SAILOR_NOTE}:</span> {report.note}
                    </div>
                  )}
                  {report.review_reason && (
                    <div className="td-m">
                      <span className="font-semibold">{L.REVIEW_REASON}:</span>{" "}
                      {report.review_reason}
                    </div>
                  )}

                  {/* Pending reports are the only actionable ones. A `delta`
                      report is priced; a `rebill` report is applied. */}
                  {pending && (
                    <div className="flex justify-end gap-2">
                      {/* Three answers, not two (§1.3). "Reject" is destructive
                          in the sense that matters — the ship moved and the
                          order will not follow — so it is the danger action, and
                          it is confirmed rather than fired on one click. */}
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={!writable || busy}
                        onClick={() => setRejectTarget(report)}
                      >
                        {dismissing ? L.REJECTING : L.REJECT}
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={!writable || busy}
                        onClick={() => {
                          setAcceptConflict(null);
                          setAcceptTarget(report);
                        }}
                      >
                        {accepting ? L.ACCEPTING : L.ACCEPT_FREE}
                      </Button>
                      {report.kind === "rebill" ? (
                        <Button
                          variant="primary"
                          size="xs"
                          disabled={!writable || busy}
                          onClick={() => handleApply(report)}
                        >
                          {applying ? L.APPLYING : L.APPLY}
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="xs"
                          disabled={!writable || busy}
                          onClick={() => setRaiseOpen(true)}
                        >
                          {L.RAISE}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delta surcharges ──────────────────────────────────────── */}
      <div className="mt16">
        <div className="sec-label flex items-center gap-1.5">
          <IconReceipt size={13} className="inline" />
          {D.SECTION}
        </div>

        {holdingDelivery && (
          <div className="mb-2 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2 text-[12px] font-bold text-[var(--warning-text)]">
            <IconAlertTriangle size={14} className="shrink-0" />
            {D.HOLD_NOTICE}
          </div>
        )}

        {deltas.length === 0 ? (
          <div className="td-m">{D.NONE}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {deltas.map((delta) => {
              const open = OPEN_DELTA_STATUSES.has(delta.status);
              return (
                <div className="ecard flex flex-col gap-2" key={delta.id}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="td-p">
                        {D.SURCHARGE} {money(delta.delta_amount)}
                      </div>
                      <div className="td-m">
                        {D.BASELINE} {money(delta.original_shipping)} → {D.NEW_SHIPPING}{" "}
                        {money(delta.new_shipping)}
                        {delta.note ? ` · ${delta.note}` : ""}
                      </div>
                      {/* `final_delta_amount` is what the sailor actually owes
                          after any coupon applied to the surcharge. */}
                      {delta.final_delta_amount && (
                        <div className="td-m">
                          {D.PAYABLE} {money(delta.final_delta_amount)}
                          {delta.due_at ? ` · ${D.DUE} ${delta.due_at}` : ""}
                        </div>
                      )}
                    </div>
                    <Badge variant={DELTA_VARIANT[delta.status] ?? "neutral"}>{delta.status}</Badge>
                  </div>

                  {/* Only an open (unpaid) delta can be withdrawn. */}
                  {open && (
                    <div className="flex justify-end">
                      <Button
                        variant="danger"
                        size="xs"
                        disabled={!writable || busy}
                        onClick={() => handleWithdraw(delta)}
                      >
                        {withdrawing ? D.WITHDRAWING : D.WITHDRAW}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AcceptLocationReportDialog
        isOpen={acceptTarget !== null}
        orderRef={orderRef}
        isLoading={accepting || withdrawing}
        conflict={acceptConflict}
        onClose={() => {
          setAcceptTarget(null);
          setAcceptConflict(null);
        }}
        onConfirm={handleAccept}
        // Only offered when there is genuinely something to withdraw. A button
        // that 404s is worse than no button on a screen already showing a
        // conflict the admin did not expect.
        onWithdraw={
          openDelta
            ? async () => {
                await handleWithdraw(openDelta);
                // The blocker is gone; drop back to asking for the reason
                // rather than making the admin reopen the dialog.
                setAcceptConflict(null);
              }
            : undefined
        }
      />

      <RejectLocationReportDialog
        isOpen={rejectTarget !== null}
        isLoading={dismissing}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />

      <RaiseDeltaDialog
        isOpen={raiseOpen}
        orderRef={orderRef}
        isLoading={raising}
        onClose={() => setRaiseOpen(false)}
        onConfirm={handleRaise}
      />
    </>
  );
}

export default OrderLocationDeltaSection;
