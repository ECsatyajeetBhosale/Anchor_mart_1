import { Badge } from "@/components/ui/badge";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconChevronDown, IconExternalLink } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useGetOrderContextQuery } from "../api/chatApi";
import type { ChatOrderRef, OrderContextSummary } from "../types/chat.types";

const M = MESSAGES.CHAT.CONTEXT;

/**
 * Remembers each thread's expanded state for the session (§5.2).
 *
 * Module-level rather than component state because the strip unmounts on every
 * thread switch — an admin working a queue wants it to stay collapsed as they
 * move down the list, which is the whole reason the doc asks for it to be
 * remembered per thread.
 */
const expandedByChat = new Map<string, boolean>();

/**
 * One fact worth a line in the expanded panel. Rendered only when it applies —
 * a grid of zeroes reads as noise and hides the number that matters.
 */
function Fact({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="xs c4 w6">{label}</span>
      <span className={`w7 ${tone === "danger" ? "cdanger" : "c1"}`}>{value}</span>
    </div>
  );
}

export interface OrderContextStripProps {
  /** The thread's chat id — what the context endpoint is keyed by. */
  chatId: string;
  /**
   * The row this screen already has. It renders the collapsed line while the
   * context call is in flight, and permanently if that call fails.
   */
  order: ChatOrderRef;
}

/**
 * The order a thread is about, pinned above the message list (Flow 23 §5).
 *
 * **A strip, not a tab and not a card in the conversation.** A tab puts the
 * order behind a deliberate action, which is the second screen this feature
 * exists to remove. A card scrolls away and goes stale, because the order keeps
 * changing after the card was posted. Pinned and collapsible is the only shape
 * that is both always visible and always current.
 *
 * **Nothing here may block the conversation.** The strip renders from the inbox
 * row the moment the thread opens and upgrades in place when the context lands.
 * If the call fails the admin still has the order number and status; if it 404s
 * the order is genuinely gone and only the conversation remains — which is not
 * an error state but a thread that outlived its order.
 *
 * The admin projection leads with the **exception** rather than with progress:
 * a blocked handover or an unavailable line is why an admin opened the thread,
 * and "31 of 40 delivered" is the context for it.
 */
export function OrderContextStrip({ chatId, order }: OrderContextStripProps) {
  const [expanded, setExpanded] = useState(() => expandedByChat.get(chatId) ?? false);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      expandedByChat.set(chatId, !prev);
      return !prev;
    });
  }, [chatId]);

  // Refetched on open: the order keeps changing after the thread was last read,
  // and a stale strip beside a live conversation is the failure mode a card in
  // the message list would have had.
  const { data, isError } = useGetOrderContextQuery(chatId, {
    refetchOnMountOrArgChange: true,
  });

  const summary: OrderContextSummary | null = data?.summary ?? null;
  // The inbox row is the fallback, and it is deliberately allowed to be all
  // there is — this is the "must never block the chat" rule, in code.
  const orderNumber = summary?.orderNumber || order.orderNumber;
  const statusLine = summary?.statusDisplay || order.status || MESSAGES.CHAT.DASH;
  const orderId = summary?.orderId || order.id;

  const onHold = summary?.deliveryOnHold ?? false;
  const unavailable = summary?.linesUnavailable ?? 0;
  const unpaid = summary ? !summary.isPaid : false;

  return (
    <div className="border-b border-[var(--border-xs)] bg-[var(--surface-2)]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-[18px] py-2.5 text-left"
      >
        <span className="badge badge-neutral mono shrink-0">{orderNumber}</span>
        <span className="xs c4 w6 trunc">{statusLine}</span>

        {/* The exception rides in the collapsed line, because it is the reason
            an admin would expand at all — one click down means it is found
            after the reply has already been sent. */}
        {onHold && (
          <Badge variant="danger">
            <IconAlertTriangle size={12} className="mr-1" />
            {M.ON_HOLD}
          </Badge>
        )}

        <span className="mla xs w6 c1 shrink-0">
          {summary ? M.DELIVERED(summary.unitsDelivered, summary.unitsOrdered) : M.LOADING}
        </span>
        <IconChevronDown
          size={15}
          className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-xs)] px-[18px] py-3">
          {summary ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Exceptions first, and only when they exist. */}
                {onHold && <Fact label={M.HOLD_LABEL} value={M.HOLD_VALUE} tone="danger" />}
                {unavailable > 0 && (
                  <Fact label={M.UNAVAILABLE} value={String(unavailable)} tone="danger" />
                )}
                {unpaid && (
                  <Fact label={M.PAYMENT} value={summary.paymentStatusDisplay} tone="danger" />
                )}

                {/* Units and lines are different quantities and are labelled as
                    such: a line is a product, a unit is a piece. */}
                <Fact
                  label={M.UNITS}
                  value={M.DELIVERED(summary.unitsDelivered, summary.unitsOrdered)}
                />
                <Fact
                  label={M.LINES}
                  value={M.LINES_VALUE(summary.linesDelivered, summary.itemsTotal)}
                />
                {summary.linesPending > 0 && (
                  <Fact label={M.PENDING} value={String(summary.linesPending)} />
                )}
                {summary.linesSubstituted > 0 && (
                  <Fact label={M.SUBSTITUTED} value={String(summary.linesSubstituted)} />
                )}
                {!unpaid && <Fact label={M.PAYMENT} value={summary.paymentStatusDisplay} />}
              </div>

              {/* §8.5 — the strip answers the question, the order screen actions
                  it. Order actions are deliberately not duplicated into chat. */}
              <Link
                to={`${APP_ROUTES.ORDERS}/${orderId}`}
                className="btn btn-ghost btn-sm mt-3 inline-flex"
              >
                <IconExternalLink size={14} className="mr-1" />
                {M.OPEN_ORDER}
              </Link>
            </>
          ) : (
            // Not an error banner: the conversation below is entirely usable and
            // the order number and status are in the line above.
            <p className="xs c4 w6">{isError ? M.UNAVAILABLE_DETAIL : MESSAGES.COMMON.LOADING}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderContextStrip;
