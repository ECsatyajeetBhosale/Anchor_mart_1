import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { ORDER_STATUS_BY_KEY } from "@/lib/orderStatuses";
import type { ExpressOrder } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS;

/**
 * Flow 09 API 2: this list shares `_apply_order_list_filters()` with the main
 * Orders screen, so `?status=` takes **post-payment statuses only** and 400s on
 * anything else. These are the same nine keys the Orders page offers, labelled
 * from the single source of truth.
 *
 * The previous set (`pending`, `confirmed`, `processing`, `delivering`, …) was
 * invented rather than taken from `Order.Status`; only two of its six values
 * existed, so picking any of the other four returned 400 instead of filtering.
 */
const STATUS_FILTER_OPTIONS = [
  "order_confirmed",
  "partner_assigned",
  "items_collected",
  "at_port",
  "at_berth",
  "delivered",
  "delivery_failed",
  "cancelled",
  "refunded",
].map((value) => ({ value, label: ORDER_STATUS_BY_KEY[value].label }));

const DASH = M.DASH;

/**
 * No actions column: the row itself opens the detail drawer, and the drawer is
 * where partner assignment lives — the same shape as the intents queue, rather
 * than a per-row icon that duplicates the row click.
 */
export interface UseExpressColumnsOptions {
  statusFilter: string;
  onStatusFilter: (value: string) => void;
}

/**
 * Column definitions for the express orders table. Follows the products table
 * patterns: two-line primary cells, truncation + tooltip, currency, status
 * badges, boolean-flag badges, and a header status filter.
 */
export function useExpressColumns({
  statusFilter,
  onStatusFilter,
}: UseExpressColumnsOptions): Column<ExpressOrder>[] {
  return [
    {
      id: "order",
      header: M.COLUMNS.ORDER,
      cell: (row) => (
        <div className="max-w-[160px]">
          <div className="td-p mono trunc" title={row.order_number}>
            {row.order_number}
          </div>
          <div className="td-m trunc" title={row.created_at ?? ""}>
            {row.created_at ?? DASH}
          </div>
        </div>
      ),
    },
    {
      id: "customer",
      header: M.COLUMNS.CUSTOMER,
      cell: (row) => (
        <div className="max-w-[200px]">
          <div className="td-p trunc" title={row.customer_name}>
            {row.customer_name || DASH}
          </div>
          <div className="td-m trunc" title={row.customer_email}>
            {row.customer_email || DASH}
          </div>
        </div>
      ),
    },
    {
      id: "location",
      header: M.COLUMNS.LOCATION,
      cell: (row) => (
        <div className="max-w-[200px]">
          <div className="td-p trunc" title={row.port_name ?? ""}>
            {row.port_name ?? DASH}
          </div>
          <div className="td-m trunc" title={row.anchorage_name ?? ""}>
            {row.anchorage_name ?? DASH}
          </div>
        </div>
      ),
    },
    {
      id: "items",
      header: M.COLUMNS.ITEMS,
      cell: (row) => <span className="td-p">{row.item_count ?? 0}</span>,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "amount",
      header: M.COLUMNS.AMOUNT,
      cell: (row) => `$${Number(row.total_amount).toFixed(2)}`,
      className: "td-p",
    },
    {
      id: "flags",
      header: M.COLUMNS.FLAGS,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          {row.is_express && (
            <Badge variant="teal" className="text-[10px] h-[22px]">
              {M.FLAGS.EXPRESS}
            </Badge>
          )}
          {row.is_emergency && (
            <Badge variant="danger" className="text-[10px] h-[22px]">
              {M.FLAGS.EMERGENCY}
            </Badge>
          )}
          {row.is_fastest_delivery && (
            <Badge variant="amber" className="text-[10px] h-[22px]">
              {M.FLAGS.FASTEST}
            </Badge>
          )}
          {row.has_location_request && (
            <Badge variant="warning" className="text-[10px] h-[22px]">
              {M.FLAGS.LOCATION_REQ}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "partner",
      header: M.COLUMNS.PARTNER,
      cell: (row) =>
        row.partner_allocated && row.partner_name ? (
          <span className="td-p trunc block max-w-[140px]" title={row.partner_name}>
            {row.partner_name}
          </span>
        ) : (
          <Badge variant="neutral" className="text-[10px] h-[22px]">
            {M.UNALLOCATED}
          </Badge>
        ),
    },
    {
      id: "arrival",
      header: M.COLUMNS.ARRIVAL,
      cell: (row) => <span className="td-m">{row.ship_arrival_date ?? DASH}</span>,
    },
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      cell: (row) => (
        <StatusBadge status={row.status_display || row.status} className="text-[10px] h-[24px]" />
      ),
      // Server-side status filter via the clickable header (?status=<value>).
      filter: {
        value: statusFilter,
        options: STATUS_FILTER_OPTIONS,
        onChange: onStatusFilter,
      },
    },
  ];
}
