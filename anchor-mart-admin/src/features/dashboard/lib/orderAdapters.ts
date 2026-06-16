import type { OrderDetail } from "@/components/common/OrderDetailDrawer";
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
    total: `$${Number(order.total_amount).toFixed(2)}`,
    payment: "—",
    items: [],
  };
}

/** Map the full details payload to the drawer's {@link OrderDetail} shape. */
export function detailsToOrderDetail(d: LiveOrderDetailsResponse): OrderDetail {
  const info = d.information;
  return {
    id: d.order_number,
    sailor: info.sailor?.name ?? "—",
    ship: info.ship ? `${info.ship.vessel_name} · IMO ${info.ship.imo}` : "—",
    terminal: info.terminal ?? "—",
    partner: info.delivery_partner?.name ?? "Unassigned",
    status: d.status_display,
    total: `$${d.totals.total_amount.toFixed(2)}`,
    payment: info.payment ? `${info.payment.method} · ${info.payment.status}` : "—",
    coupon: info.coupon ?? undefined,
    items: d.items.map((it) => ({
      name: it.name,
      qty: it.quantity,
      price: `$${it.subtotal.toFixed(2)}`,
    })),
  };
}
