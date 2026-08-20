import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { formatMoney } from "@/lib/money";
import { IconAlertTriangle, IconMapPin, IconReceipt } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import {
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
  OPEN_DELTA_STATUSES,
} from "../types/delta.types";
import type { AssignedAdmin } from "../types/ownership.types";
import { RaiseDeltaDialog } from "./RaiseDeltaDialog";

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

export interface OrderLocationDeltaSectionProps {
  orderId: string;
  /** Display reference shown in the raise-delta prompt. */
  orderRef: string;
  /** Embedded on the order detail read (Flow 11 §14). */
  locationReports?: LocationReport[];
  deltas?: DeltaPayment[];
  /** Owning admin (Flow 27) — every action here is a gated write. */
  assignedAdmin?: AssignedAdmin | null;
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
}: OrderLocationDeltaSectionProps) {
  const { canManage } = useOrderOwnership();
  const [raiseOpen, setRaiseOpen] = useState(false);

  const [raiseDelta, { isLoading: raising }] = useRaiseDeltaMutation();
  const [dismissReport, { isLoading: dismissing }] = useDismissLocationReportMutation();
  const [applyReport, { isLoading: applying }] = useApplyLocationReportMutation();
  const [withdrawDelta, { isLoading: withdrawing }] = useWithdrawDeltaMutation();

  const writable = canManage(assignedAdmin);
  const busy = raising || dismissing || applying || withdrawing;
  // An open delta blocks the partner's final handover until it is paid,
  // withdrawn or expires (#10).
  const holdingDelivery = deltas.some((d) => OPEN_DELTA_STATUSES.has(d.status));

  const handleRaise = async (deltaAmount: string, note: string) => {
    try {
      await raiseDelta({ orderId, delta_amount: deltaAmount, note }).unwrap();
      setRaiseOpen(false);
      toast.success(D.RAISED(Number(deltaAmount).toFixed(2)));
    } catch (err) {
      // Keep the popup open so the entered amount/note survive.
      toast.error(getApiMessage(err, { labelFields: false }) ?? D.RAISE_FAILED);
    }
  };

  const handleDismiss = async (report: LocationReport) => {
    try {
      await dismissReport({ orderId, reportId: report.id }).unwrap();
      toast.success(L.DISMISSED);
    } catch (err) {
      toast.error(getApiMessage(err, { labelFields: false }) ?? L.ACTION_FAILED);
    }
  };

  const handleApply = async (report: LocationReport) => {
    try {
      await applyReport({ orderId, reportId: report.id }).unwrap();
      toast.success(L.APPLIED);
    } catch (err) {
      toast.error(getApiMessage(err, { labelFields: false }) ?? L.ACTION_FAILED);
    }
  };

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
                    <Badge variant={pending ? "neutral" : "success"}>{report.status}</Badge>
                  </div>

                  {/* Pending reports are the only actionable ones. A `delta`
                      report is priced; a `rebill` report is applied. */}
                  {pending && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={!writable || busy}
                        onClick={() => handleDismiss(report)}
                      >
                        {dismissing ? L.DISMISSING : L.DISMISS}
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
