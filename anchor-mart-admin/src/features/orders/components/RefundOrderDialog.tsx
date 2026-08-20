import { FormField } from "@/components/common/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { formatMoney } from "@/lib/money";
import { IconCoin, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGetRefundQuoteQuery, useRefundOrderMutation } from "../api/orderRefundApi";

const R = MESSAGES.ORDERS.REFUND_DIALOG;

/** Only a partially-delivered order accepts a partial refund (Flow 12 §4B). */
const PARTIAL_ONLY_STATUS = "partially_delivered";

export interface RefundOrderDialogProps {
  isOpen: boolean;
  /** Order UUID; "" when closed. */
  orderId: string;
  /** Display reference shown in the prompt. */
  orderRef: string;
  /** Raw order status — decides whether partial mode is offered. */
  status: string;
  onClose: () => void;
}

/** `$1,234.50`, or a dash when the amount is missing. */
function money(value?: string): string {
  return formatMoney(value);
}

/**
 * Flow 12 §3–4 — preview a refund, then issue it.
 *
 * The quote is fetched whenever the dialog opens (and re-fetched when the
 * override toggle flips) because it is pure: the same policy the executor runs,
 * with no side effects. A partial refund is offered only for a
 * `partially_delivered` order and carries a fresh `Idempotency-Key` per
 * submission, so a double-click can't charge twice.
 */
export function RefundOrderDialog({
  isOpen,
  orderId,
  orderRef,
  status,
  onClose,
}: RefundOrderDialogProps) {
  const partialAllowed = status.trim().toLowerCase() === PARTIAL_ONLY_STATUS;

  const [mode, setMode] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [override, setOverride] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; amount?: string }>({});

  const [refundOrder, { isLoading: refunding }] = useRefundOrderMutation();
  const {
    data: quote,
    isFetching: quoteLoading,
    isError: quoteError,
  } = useGetRefundQuoteQuery({ orderId, override }, { skip: !isOpen || !orderId });

  // Reset every field each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    setMode(partialAllowed ? "partial" : "full");
    setReason("");
    setAmount("");
    setOverride(false);
    setErrors({});
  }, [isOpen, partialAllowed]);

  const isPartial = mode === "partial" && partialAllowed;

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    const trimmedAmount = amount.trim();
    const next: { reason?: string; amount?: string } = {};
    if (!trimmedReason) next.reason = R.REASON_REQUIRED;
    if (isPartial && (!trimmedAmount || Number(trimmedAmount) <= 0)) {
      next.amount = R.AMOUNT_REQUIRED;
    }
    if (next.reason || next.amount) {
      setErrors(next);
      return;
    }

    try {
      const res = await refundOrder({
        orderId,
        reason: trimmedReason,
        // `override` only applies to a full refund's time gate.
        override: isPartial ? undefined : override || undefined,
        amount: isPartial ? trimmedAmount : undefined,
        // A fresh key per submission: a replay of the *same* click is safe,
        // while a deliberate second refund gets a new key and goes through.
        idempotencyKey: isPartial ? crypto.randomUUID() : undefined,
      }).unwrap();
      toast.success(
        getApiMessage(res) ?? R.SUCCESS(res.refunded ?? res.total_refund ?? trimmedAmount),
      );
      onClose();
    } catch (err) {
      // Keep the dialog open so the entered reason/amount survive a rejection.
      toast.error(getApiMessage(err, { labelFields: false }) ?? R.FAILED);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{R.TITLE}</DialogTitle>
          <DialogDescription>{R.DESCRIPTION(orderRef)}</DialogDescription>
        </DialogHeader>

        {/* ── Policy preview (Flow 12 §3) ───────────────────────────── */}
        {quoteLoading ? (
          <div className="flex items-center gap-2 py-3 text-[13px] font-semibold text-[var(--t4)]">
            <IconLoader2 size={16} className="animate-spin" />
            {R.LOADING_QUOTE}
          </div>
        ) : quoteError ? (
          <div className="py-3 text-[13px] font-semibold text-[var(--danger-text)]">
            {R.QUOTE_ERROR}
          </div>
        ) : quote ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--navy-25)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Badge variant={quote.allowed ? "success" : "danger"}>
                {quote.allowed ? R.ALLOWED : R.BLOCKED}
              </Badge>
              {quote.policy && (
                <span className="text-[12px] font-semibold text-[var(--t3)]">{quote.policy}</span>
              )}
            </div>
            {/* When denied, `reason` explains why the amounts below are only a
                preview of what *would* be returned. */}
            {!quote.allowed && quote.reason && (
              <div className="mt-2 text-[12.5px] font-medium text-[var(--danger-text)]">
                {quote.reason}
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-between py-0.5">
              <span className="text-[12.5px] text-[var(--t3)]">{R.INITIAL}</span>
              <span className="text-[13px] font-semibold text-[var(--t2)] tabular-nums">
                {money(quote.initial_refund)}
              </span>
            </div>
            {!!quote.delta_refunds?.length && (
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[12.5px] text-[var(--t3)]">
                  {R.DELTAS} · {quote.delta_refunds.length}
                </span>
                <span className="text-[13px] font-semibold text-[var(--t2)] tabular-nums">
                  {money(
                    quote.delta_refunds
                      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
                      .toFixed(2),
                  )}
                </span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-[var(--border-sm)] pt-2">
              <span className="text-[13px] font-bold text-[var(--t1)]">{R.TOTAL}</span>
              <span className="text-[15px] font-extrabold text-[var(--t1)] tabular-nums">
                {money(quote.total_refund)}
              </span>
            </div>
          </div>
        ) : null}

        {/* ── Mode — partial exists only for a partially-delivered order ── */}
        {partialAllowed && (
          <div className="mt-4 flex gap-2">
            <Button
              variant={mode === "partial" ? "teal" : "secondary"}
              size="xs"
              onClick={() => setMode("partial")}
            >
              {R.MODE_PARTIAL}
            </Button>
            <Button
              variant={mode === "full" ? "teal" : "secondary"}
              size="xs"
              onClick={() => setMode("full")}
            >
              {R.MODE_FULL}
            </Button>
          </div>
        )}

        <div className="mt-3">
          {isPartial && (
            <FormField label={R.AMOUNT_LABEL} hint={R.AMOUNT_HINT} error={errors.amount}>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={R.AMOUNT_PLACEHOLDER}
                value={amount}
                error={!!errors.amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((p) => ({ ...p, amount: undefined }));
                }}
              />
            </FormField>
          )}

          <FormField label={R.REASON_LABEL} error={errors.reason}>
            <Textarea
              value={reason}
              error={!!errors.reason}
              placeholder={R.REASON_PLACEHOLDER}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) setErrors((p) => ({ ...p, reason: undefined }));
              }}
              className="min-h-[80px]"
            />
          </FormField>

          {/* Override only affects a full refund's auto-approval window. */}
          {!isPartial && (
            <div className="flex items-center gap-2">
              <Switch id="refund-override" checked={override} onCheckedChange={setOverride} />
              <label
                htmlFor="refund-override"
                className="text-[13px] font-semibold text-[var(--t2)]"
              >
                {R.OVERRIDE_LABEL}
              </label>
              <span className="fg-hint">{R.OVERRIDE_HINT}</span>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={refunding}>
            {R.CANCEL}
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm} disabled={refunding}>
            <IconCoin size={15} className="mr-1" />
            {refunding ? R.REFUNDING : R.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RefundOrderDialog;
