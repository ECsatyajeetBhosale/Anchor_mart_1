import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconGift, IconGiftOff, IconShip, IconUser } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGetGiftShipQuery } from "../api/giftApi";
import { DepartureValue, GiftProgress, shortDate } from "../lib/giftFormat";
import type { GiftShipOrder, GiftShipSailor } from "../types/gift.types";
import { useShipGiftActions } from "./useShipGiftActions";

const M = MESSAGES.GIFTS;
const D = M.DETAIL;

export interface GiftShipDetailDrawerProps {
  /** Normalised 7-digit IMO; null while nothing is selected. */
  imo: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Which order the whole-ship grant would put this sailor's gift on.
 *
 * The bulk grant rides each sailor's **earliest-arriving** giftable order, so
 * naming it before the admin presses the button removes the guesswork. The
 * backend tie-breaks on `created_at`, which this payload doesn't expose — so a
 * genuine tie is left unmarked rather than guessed at.
 */
function autoPickOrderId(orders: GiftShipOrder[]): string | null {
  const dated = orders.filter((o) => o.ship_arrival_date);
  if (dated.length === 0) return null;

  let earliest = dated[0];
  let tied = false;
  for (const order of dated.slice(1)) {
    const a = order.ship_arrival_date ?? "";
    const b = earliest.ship_arrival_date ?? "";
    if (a < b) {
      earliest = order;
      tied = false;
    } else if (a === b) {
      tied = true;
    }
  }
  return tied ? null : earliest.id;
}

/**
 * Flow 20 §2b — **sailors first, orders nested underneath.**
 *
 * That nesting is the reason this screen exists: an admin must never be shown
 * four order rows for one person and be able to gift each of them. Every action
 * is scoped to a sailor, and per-order buttons appear only beneath the sailor
 * they belong to.
 *
 * The crew is then split into a work queue and a done pile, because the only
 * question the admin is really asking is *who is left* — a flat roster makes
 * them derive that themselves.
 *
 * There is no ownership gate anywhere in this flow — no "claim this order"
 * step — so no button here checks for one.
 */
export function GiftShipDetailDrawer({ imo, isOpen, onClose }: GiftShipDetailDrawerProps) {
  const { data, isLoading, isError } = useGetGiftShipQuery(imo ?? "", { skip: !imo });

  const { grantShip, revokeShip, isGranting, isRevoking } = useShipGiftActions();

  const [confirmShipGrant, setConfirmShipGrant] = useState(false);
  const [confirmShipRevoke, setConfirmShipRevoke] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Drop any half-finished action when the drawer switches vessels.
  useEffect(() => {
    setConfirmShipGrant(false);
    setConfirmShipRevoke(false);
    setRevokeReason("");
    setRevokeError(null);
  }, []);

  const programEnabled = data?.program_enabled !== false;
  const sailors = data?.sailors ?? [];
  const awaiting = sailors.filter((s) => !s.gift);
  const gifted = sailors.filter((s) => s.gift);

  const handleShipGrant = async () => {
    if (!imo) return;
    try {
      // `sailors_gifted` may legitimately be 0 when everyone already holds one —
      // the API's own message says so, so prefer it over a generic success line.
      const message = await grantShip(imo);
      setConfirmShipGrant(false);
      toast.success(message || D.GRANTED_TOAST);
    } catch (error) {
      toast.error(getApiMessage(error) ?? D.GRANT_ERROR);
    }
  };

  const handleShipRevoke = async () => {
    if (!imo) return;
    if (!revokeReason.trim()) {
      setRevokeError(D.REVOKE_REASON_REQUIRED);
      return;
    }
    try {
      const { revoked, failed } = await revokeShip(imo, revokeReason.trim());
      setConfirmShipRevoke(false);
      setRevokeReason("");
      setRevokeError(null);
      // Assembled from per-order calls, so a partial outcome is possible and is
      // reported as one rather than dressed up as success.
      if (revoked === 0 && failed === 0) toast.info(D.REVOKE_SHIP_NONE);
      else if (failed > 0) toast.warning(D.REVOKE_SHIP_PARTIAL(revoked, failed));
      else toast.success(D.REVOKE_SHIP_DONE(revoked));
    } catch (error) {
      toast.error(getApiMessage(error) ?? D.REVOKE_ERROR);
    }
  };

  /**
   * Column widths shared by an order list and its header row, so every value
   * sits under the label that names it.
   */
  const ORDER_GRID = "grid grid-cols-[1.5fr_0.9fr_1.1fr_0.8fr_0.9fr] items-center gap-3";

  /** Header naming each order column. Repeated per sailor so nothing is a bare figure. */
  const renderOrderHeader = () => (
    <div className={`${ORDER_GRID} px-2 pb-1`}>
      <span className="info-lbl">{D.ORDER_COLS.ORDER}</span>
      <span className="info-lbl">{D.ORDER_COLS.VALUE}</span>
      <span className="info-lbl">{D.ORDER_COLS.PORT}</span>
      <span className="info-lbl">{D.ORDER_COLS.ARRIVES}</span>
      <span className="info-lbl">{D.ORDER_COLS.DEPARTS}</span>
    </div>
  );

  /** One order row beneath a sailor. */
  const renderOrder = (order: GiftShipOrder, sailor: GiftShipSailor, autoPickId: string | null) => (
    <div
      key={order.id}
      className={`${ORDER_GRID} rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-[var(--surface-alt)]`}
    >
      <div className="min-w-0">
        <div className="td-id trunc">{order.order_number}</div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {order.is_gift_carrier && (
            <Badge variant="teal" className="h-[17px] px-1.5 text-[9px]">
              {D.GIFT_CARRIER}
            </Badge>
          )}
          {/* Only meaningful while the sailor is still un-gifted and has a
              choice to make — otherwise it is noise. */}
          {!sailor.gift && order.id === autoPickId && sailor.orders.length > 1 && (
            <Badge
              variant="neutral"
              className="h-[17px] px-1.5 text-[9px]"
              title={D.AUTO_PICK_TITLE}
            >
              {D.AUTO_PICK}
            </Badge>
          )}
        </div>
      </div>

      <span className="td-p tabular-nums">${Number(order.total_amount).toFixed(2)}</span>
      <span className="td-m trunc">{order.port_name ?? M.DASH}</span>
      <span className="td-m">{shortDate(order.ship_arrival_date)}</span>
      {/* Flow 20 leaves timing to the admin rather than encoding a rule, so the
          departure turns into a red countdown once it is close. */}
      <DepartureValue departure={order.expected_departure} />
    </div>
  );

  /** One sailor: a single header line with their orders listed beneath. */
  const renderSailor = (sailor: GiftShipSailor) => {
    const gift = sailor.gift;
    const autoPickId = autoPickOrderId(sailor.orders);

    return (
      <div
        key={sailor.user_id}
        className="rounded-[var(--radius-md)] border border-[var(--border-sm)] px-3 py-2.5"
      >
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className={`av av-sm shrink-0 ${gift ? "av-teal" : "av-navy"}`}>
              <IconUser size={13} />
            </div>
            <div className="min-w-0">
              <div className="td-p trunc">{sailor.sailor_name || M.DASH}</div>
              {/* Always the same two facts, gifted or not. This line used to
                  swap between order totals and gift provenance depending on
                  state, so it could never be read as meaning one thing. */}
              <div className="td-m trunc">
                {D.SAILOR_META(sailor.order_count, Number(sailor.total_value).toFixed(2))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {/* Earlier closed groups. A judgment aid for repeat crews — it
                blocks nothing, so it is shown but never gates a button. */}
            {sailor.previously_gifted_count > 0 && (
              <Badge variant="neutral" className="h-[20px] px-1.5 text-[9px]">
                {D.PREVIOUSLY_GIFTED(sailor.previously_gifted_count)}
              </Badge>
            )}
            {gift && (
              <Badge
                variant={gift.handover_status === "delivered" ? "success" : "amber"}
                className="h-[20px] px-1.5 text-[9px]"
              >
                {gift.handover_status === "delivered" ? D.HANDOVER_DELIVERED : D.HANDOVER_PENDING}
              </Badge>
            )}
          </div>
        </div>

        {/* Provenance as a named field rather than a bare string — "who granted
            it, when, and on which order" is three facts, not one caption. */}
        {gift && (
          <div className="mb-2 flex flex-wrap items-baseline gap-2 rounded-[var(--radius-sm)] bg-[var(--teal-50)] px-2 py-1.5">
            <span className="info-lbl text-[var(--teal-700)]">{D.GIFT_LINE_LABEL}</span>
            <span className="text-[12.5px] font-bold text-[var(--teal-700)]">
              {gift.carrier_order_number
                ? D.GIFT_ON_ORDER(gift.carrier_order_number)
                : D.GIFT_UNKNOWN_CARRIER}
            </span>
            <span className="text-[11.5px] font-medium text-[var(--teal-700)] opacity-80">
              {gift.granted_by_name && gift.granted_at
                ? D.GIFT_BY(gift.granted_by_name, gift.granted_at)
                : gift.source === "bulk"
                  ? D.GIFT_SOURCE_BULK
                  : D.GIFT_SOURCE_MANUAL}
            </span>
          </div>
        )}

        <div className="flex flex-col">
          {sailor.orders.length === 0 ? (
            <p className="td-m px-2">{D.NO_ORDERS}</p>
          ) : (
            <>
              {renderOrderHeader()}
              {sailor.orders.map((order) => renderOrder(order, sailor, autoPickId))}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          adjustable
          defaultWidth={720}
          className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
        >
          <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="av av-lg av-teal shrink-0">
                <IconShip size={20} />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-xl">{data?.vessel_name || D.TITLE}</SheetTitle>
                <SheetDescription>{data ? `IMO ${data.imo_number}` : D.SUBTITLE}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {isError ? (
              <p className="text-[13px] font-semibold text-[var(--danger-text)]">{D.FETCH_ERROR}</p>
            ) : isLoading || !data ? (
              <p className="td-m">{MESSAGES.COMMON.LOADING}</p>
            ) : (
              <>
                {!programEnabled && (
                  <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-2.5">
                    <IconAlertTriangle
                      size={16}
                      className="mt-px shrink-0 text-[var(--warning-icon)]"
                    />
                    <span className="text-[12px] font-semibold text-[var(--warning-text)]">
                      {M.PROGRAM_OFF}
                    </span>
                  </div>
                )}

                {/* Three counts and the progress bar, so the shape of the crew
                    is readable without adding up sailor blocks. */}
                <div className="infobox flex flex-wrap items-center justify-between gap-5">
                  <div className="flex gap-7">
                    <div>
                      <div className="info-lbl">{D.SUMMARY_SAILORS}</div>
                      <div className="mt-1 text-[17px] font-extrabold text-[var(--t1)]">
                        {data.sailor_count}
                      </div>
                    </div>
                    <div>
                      <div className="info-lbl">{D.SUMMARY_ORDERS}</div>
                      <div className="mt-1 text-[17px] font-extrabold text-[var(--t1)]">
                        {data.order_count}
                      </div>
                    </div>
                    <div>
                      <div className="info-lbl">{D.SUMMARY_AWAITING}</div>
                      <div className="mt-1 text-[17px] font-extrabold text-[var(--amber-600)]">
                        {awaiting.length}
                      </div>
                    </div>
                  </div>
                  <GiftProgress
                    gifted={data.gifted_sailor_count}
                    total={data.sailor_count}
                    label={D.SUMMARY_COVERAGE}
                  />
                </div>

                {sailors.length === 0 && <p className="td-m">{D.NO_SAILORS}</p>}

                {/* Work queue first. */}
                {awaiting.length > 0 && (
                  <>
                    <div className="sec-label">{D.SECTION_AWAITING(awaiting.length)}</div>
                    <div className="flex flex-col gap-2">{awaiting.map(renderSailor)}</div>
                  </>
                )}

                {sailors.length > 0 && awaiting.length === 0 && (
                  <p className="text-[12.5px] font-semibold text-[var(--success-text)]">
                    {D.ALL_GIFTED}
                  </p>
                )}

                {gifted.length > 0 && (
                  <>
                    <div className="sec-label">{D.SECTION_GIFTED(gifted.length)}</div>
                    <div className="flex flex-col gap-2">{gifted.map(renderSailor)}</div>
                  </>
                )}

                <p className="fg-hint">{D.NO_ITEM_NOTE}</p>
              </>
            )}
          </div>

          <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
            <div className="flex w-full items-center justify-between gap-4">
              <span className="fg-hint">
                {gifted.length > 0 ? D.REVOKE_SHIP_HINT : D.GRANT_SHIP_HINT}
              </span>
              {/* One action for the vessel. Gifting is ship-level, so there is
                  deliberately no per-order button anywhere on this screen. */}
              {gifted.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-danger shrink-0"
                  disabled={!programEnabled || isRevoking}
                  onClick={() => setConfirmShipRevoke(true)}
                >
                  <IconGiftOff size={16} />
                  {isRevoking ? M.ACTION_REVOKING : M.ACTION_REVOKE}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary shrink-0"
                  disabled={!programEnabled || isGranting || awaiting.length === 0}
                  onClick={() => setConfirmShipGrant(true)}
                >
                  <IconGift size={16} />
                  {isGranting ? M.ACTION_GRANTING : M.ACTION_GRANT}
                </button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        isOpen={confirmShipGrant}
        onClose={() => setConfirmShipGrant(false)}
        onConfirm={handleShipGrant}
        isLoading={isGranting}
        title={D.GRANT_CONFIRM_TITLE}
        description={D.GRANT_CONFIRM_MESSAGE(awaiting.length)}
        confirmText={M.ACTION_GRANT}
        loadingText={M.ACTION_GRANTING}
      />

      {/* Ship-wide revoke. `reason` is required and non-blank on every
          underlying call, so this is a form rather than a plain confirm. */}
      <Sheet open={confirmShipRevoke} onOpenChange={(open) => !open && setConfirmShipRevoke(false)}>
        <SheetContent side="right" defaultWidth={460} className="flex flex-col gap-0 p-0">
          <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
            <SheetTitle>{D.REVOKE_SHIP_TITLE}</SheetTitle>
            <SheetDescription>{D.REVOKE_SHIP_HINT}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 p-6">
            <FormField label={D.REVOKE_REASON} error={revokeError ?? undefined}>
              <Textarea
                className="h-24"
                placeholder={D.REVOKE_REASON_PLACEHOLDER}
                value={revokeReason}
                error={!!revokeError}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </FormField>
          </div>
          <SheetFooter className="border-t border-[var(--border-md)] p-6">
            <div className="flex w-full justify-end gap-3">
              <button
                type="button"
                className="btn btn-ghost btn-cancel"
                onClick={() => setConfirmShipRevoke(false)}
                disabled={isRevoking}
              >
                {MESSAGES.COMMON.CANCEL}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleShipRevoke}
                disabled={isRevoking}
              >
                {isRevoking ? M.ACTION_REVOKING : D.REVOKE_SHIP_SUBMIT}
              </button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default GiftShipDetailDrawer;
