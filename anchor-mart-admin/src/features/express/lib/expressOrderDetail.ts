import type { OrderDetail } from "@/components/common/OrderDetailDrawer";
import { MESSAGES } from "@/lib/messages";
import type { ExpressOrder } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS;

/** `"2027.42"` → `"$2027.42"`; anything unparseable → the dash. */
function money(value: string | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : M.DASH;
}

/**
 * An express **list row** rendered as the shared drawer's `OrderDetail`.
 *
 * The Orders screen opens its drawer on the row and upgrades in place when the
 * detail read lands; this is the row half of that same pattern, so an express
 * order opens instantly with everything the list already knows and fills in the
 * rest — items, pricing, vessel — if the detail arrives.
 *
 * `items` is deliberately empty rather than faked from `item_count`: the drawer
 * renders a per-line table, and inventing lines to match a number would be worse
 * than an honestly empty one.
 */
export function toExpressOrderDetail(row: ExpressOrder): OrderDetail {
  return {
    id: row.order_number,
    sailor: row.customer_name || M.DASH,
    ship: row.port_name || M.DASH,
    terminal: row.anchorage_name || M.DASH,
    items: [],
    total: money(row.total_amount),
    status: row.status_display || row.status,
    partner: row.partner_name || M.UNALLOCATED,
    // Express is direct-pay: `payment_completed_at` is the whole payment story.
    payment: row.payment_completed_at ? M.PAYMENT_PAID : M.PAYMENT_PENDING,

    statusKey: row.status,
    sailorEmail: row.customer_email || undefined,
    portName: row.port_name || undefined,
    anchorageName: row.anchorage_name || undefined,
    shipArrivalDate: row.ship_arrival_date || undefined,
    orderDate: row.created_at || undefined,
    itemCount: row.item_count,
    isExpress: row.is_express,
    isEmergency: row.is_emergency,
  };
}
