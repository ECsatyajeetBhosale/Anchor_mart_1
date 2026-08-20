import type { OrderDetail } from "@/components/common/OrderDetailDrawer";
import { formatMoney } from "@/lib/money";
import type { LiveOrder, LiveOrderDetailsResponse } from "../types/dashboard.types";

/** Compose the "Ship / Port" cell from the live-order ship + port name. */
export function shipPort(order: LiveOrder): string {
  return order.port?.name ? `${order.ship} · ${order.port.name}` : order.ship;
}

/**
 * Adapt a list row to the {@link OrderDetail} the detail drawer expects. The
 * list endpoint omits items/payment, so those are left empty — the drawer still
 * opens with the order's summary fields.
 */
export function toOrderDetail(order: LiveOrder): OrderDetail {
  return {
    id: order.order_number,
    sailor: order.sailor.name,
    ship: order.ship,
    terminal: shipPort(order),
    partner: order.partner?.name ?? "Unassigned",
    status: order.status_display,
    total: money(order.total_amount),
    payment: "—",
    items: [],
  };
}

/**
 * `$0.00` for a real amount, "—" when there isn't one.
 *
 * Delegates rather than re-deriving: the local version guarded with
 * `Number.isFinite(Number(value))`, which is `true` for `""` and `null` — so a
 * missing total rendered as a confident `$0.00`.
 */
function money(value: unknown): string {
  return formatMoney(value as string | number | null | undefined);
}

/**
 * Map the full details payload to the drawer's {@link OrderDetail} shape.
 *
 * Two different endpoints feed this (`live-orders/{id}/` and
 * `orders/detail/?order_id=`) and neither publishes a sample response, so every
 * nested block is read optionally — a missing `totals` or `items` must degrade
 * to a dash rather than throw and blank the page.
 */
export function detailsToOrderDetail(d: LiveOrderDetailsResponse): OrderDetail {
  const info = d?.information;
  return {
    id: d?.order_number ?? "—",
    sailor: info?.sailor?.name ?? "—",
    ship: info?.ship ? `${info.ship.vessel_name} · IMO ${info.ship.imo}` : "—",
    terminal: info?.terminal ?? "—",
    partner: info?.delivery_partner?.name ?? "Unassigned",
    status: d?.status_display ?? d?.status ?? "—",
    total: money(d?.totals?.total_amount),
    payment: info?.payment ? `${info.payment.method} · ${info.payment.status}` : "—",
    coupon: info?.coupon ?? undefined,
    items: (d?.items ?? []).map((it) => ({
      name: it?.name ?? "—",
      qty: it?.quantity ?? 0,
      price: money(it?.subtotal),
    })),
  };
}
