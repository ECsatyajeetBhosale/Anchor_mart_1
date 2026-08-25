import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import { toast } from "sonner";
import type { BadgeQueue, SignalFrame } from "../types/realtime.types";

/**
 * The visible half of an arrival.
 *
 * The sidebar marker answers "something happened somewhere else"; it says
 * nothing about *what*, and it is invisible to an admin already on the screen —
 * who instead watched rows silently reshuffle under the cursor with no
 * explanation. A toast is the only one of the three notices that can carry the
 * detail: which order, which stage, and a way to open it.
 *
 * Deliberately **not** gated on the current route. On another screen it is the
 * arrival notice; on the screen itself it is the caption for a list that just
 * moved on its own.
 */

/**
 * Queue names for badge-driven toasts.
 *
 * A badge frame carries no stage and no order number — only a queue that moved
 * and an advisory id — so the copy can never be more specific than this. The
 * two folded queues read as their parent screens, matching where the View
 * action actually lands.
 */
const QUEUE_LABELS: Record<BadgeQueue, string> = {
  intents: "Intents",
  orders: "Orders",
  express_orders: "Express Orders",
  special_requests: "Special Requests",
  seller_requests: "Seller Requests",
  verifications: "Intents",
  delivery_failed: "Orders",
};

export interface ArrivalToastDeps {
  /** Navigates to the queue's screen. Passed in so this stays router-free. */
  onView: (route: string) => void;
  /** The screen behind the queue that moved. */
  route: string;
}

/**
 * "The ball is in your court" — the rich case.
 *
 * A signal names the stage an order just entered, which is the one thing the
 * counters structurally cannot express: every hand-off inside the intent funnel
 * moves an order *within* the `intents` bucket, so the badge is silent for
 * exactly the transitions the work chain is made of.
 */
export function showSignalToast(frame: SignalFrame, deps: ArrivalToastDeps): void {
  // Unknown stages come from a server newer than this build. The raw key is
  // still more useful than nothing — it is at least searchable — so it is shown
  // rather than swallowed, tidied out of snake_case.
  const stage = ORDER_STATUS_BY_KEY[frame.stage]?.label ?? humanise(frame.stage);
  const from = frame.previous_stage
    ? (ORDER_STATUS_BY_KEY[frame.previous_stage]?.label ?? humanise(frame.previous_stage))
    : null;

  const parts = [frame.order_number, from ? `moved from ${from}` : null].filter(Boolean);

  toast.info(stage, {
    description: parts.length > 0 ? parts.join(" · ") : undefined,
    // Keyed on the order, not left to stack. One arrival routinely produces a
    // signal *and* a badge frame; without a shared id the admin gets two
    // notices for one thing. sonner replaces a live toast of the same id.
    id: toastId(frame.order_id),
    action: { label: "View", onClick: () => deps.onView(deps.route) },
  });
}

/**
 * Something landed in a queue, and the frame does not say what — the generic
 * case.
 *
 * Kept deliberately vague because an arrival genuinely is: it names a queue and
 * nothing else. Claiming "new intent" when all we were told is that the intents
 * queue moved would be inventing detail the server did not send. When there is
 * a stage to name, a signal arrives alongside and {@link showSignalToast}
 * replaces this one on the shared `order_id`.
 */
export function showArrivalToast(
  queue: BadgeQueue,
  orderId: string | null,
  deps: ArrivalToastDeps,
): void {
  toast.info(`New activity in ${QUEUE_LABELS[queue]}`, {
    id: toastId(orderId),
    action: { label: "View", onClick: () => deps.onView(deps.route) },
  });
}

/**
 * The dedupe key.
 *
 * `id` is advisory in the contract and may be null. When it is, there is nothing
 * to collapse on, so we let sonner assign its own id and stack normally — two
 * anonymous arrivals really are two notices.
 */
function toastId(orderId: string | null | undefined): string | undefined {
  return orderId ? `arrival-${orderId}` : undefined;
}

/** `verification_submitted` → `Verification submitted`. */
function humanise(key: string): string {
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
