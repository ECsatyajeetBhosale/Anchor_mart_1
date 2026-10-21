import type { Order } from "@/features/orders";
import { toInstant } from "@/lib/dates";

const MS_PER_HOUR = 3_600_000;

/** Statuses that are still owed a delivery. */
const OPEN_STATUSES = new Set([
  "order_confirmed",
  "partner_assigned",
  "items_collected",
  "at_port",
  "at_berth",
  "partially_delivered",
]);

/**
 * When the order should have been delivered by.
 *
 * `deliver_by` is the backend's own SLA deadline (arrival + tier SLA, clamped
 * to departure) and is preferred. A row without one falls back to the rule QA
 * gave for express: ship arrival plus the express SLA from Settings.
 */
export function dueAt(
  order: Pick<Order, "deliver_by" | "ship_arrival_date">,
  slaHours: number | undefined,
): Date | null {
  const deadline = toInstant(order.deliver_by);
  if (deadline) return deadline;
  const arrival = toInstant(order.ship_arrival_date);
  if (!arrival || slaHours === undefined) return null;
  return new Date(arrival.getTime() + slaHours * MS_PER_HOUR);
}

/**
 * Still undelivered past its deadline (BUG-065). An express order sitting at
 * ORDER CONFIRMED / unallocated days after the ship arrived was on no
 * Needs Attention panel.
 */
export function isOverdue(
  order: Pick<Order, "status" | "deliver_by" | "ship_arrival_date">,
  slaHours: number | undefined,
  now: Date = new Date(),
): boolean {
  if (!OPEN_STATUSES.has(order.status)) return false;
  const due = dueAt(order, slaHours);
  return !!due && due.getTime() < now.getTime();
}
