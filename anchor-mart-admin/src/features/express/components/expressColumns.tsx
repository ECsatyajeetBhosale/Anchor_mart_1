import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconEye } from "@tabler/icons-react";
import type React from "react";
import type { ExpressOrder } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS;

const STATUS_FILTER_OPTIONS = [
  { label: M.STATUS_FILTER.PENDING, value: "pending" },
  { label: M.STATUS_FILTER.CONFIRMED, value: "confirmed" },
  { label: M.STATUS_FILTER.PROCESSING, value: "processing" },
  { label: M.STATUS_FILTER.DELIVERING, value: "delivering" },
  { label: M.STATUS_FILTER.DELIVERED, value: "delivered" },
  { label: M.STATUS_FILTER.CANCELLED, value: "cancelled" },
];

const DASH = M.DASH;

export interface UseExpressColumnsOptions {
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onView: (e: React.MouseEvent, order: ExpressOrder) => void;
}

/**
 * Column definitions for the express orders table. Follows the products table
 * patterns: two-line primary cells, truncation + tooltip, currency, status
 * badges, boolean-flag badges, and a header status filter.
 */
export function useExpressColumns({
  statusFilter,
  onStatusFilter,
  onView,
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
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      cell: (row) => (
        <TableActions
          row={row}
          actions={[
            {
              icon: <IconEye size={16} />,
              title: M.ACTION_VIEW,
              onClick: (e, r) => onView(e, r),
            },
          ]}
        />
      ),
      className: "w-16 text-right",
    },
  ];
}
