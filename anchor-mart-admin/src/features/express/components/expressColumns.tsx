import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { IconDeviceSpeaker, IconEye } from "@tabler/icons-react";
import type React from "react";
import type { ExpressItem } from "../types/expressItem.types";

const STATUS_FILTER_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

function getThumbnail(images: ExpressItem["images"]) {
  const primary = images?.find((img) => img.is_primary) ?? images?.[0];
  const src = primary?.image_url || primary?.image;
  return (
    <div className="prod-thumb">
      {src ? (
        <img src={src} alt="Express item" className="h-8 w-8 rounded object-cover" />
      ) : (
        <IconDeviceSpeaker size={18} />
      )}
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export interface UseExpressColumnsOptions {
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onView: (e: React.MouseEvent, item: ExpressItem) => void;
}

/**
 * Column definitions for the express items table. Mirrors the products table
 * patterns: thumbnail, truncation + tooltip, currency, status badges, header filter.
 */
export function useExpressColumns({
  statusFilter,
  onStatusFilter,
  onView,
}: UseExpressColumnsOptions): Column<ExpressItem>[] {
  return [
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {getThumbnail(row.images)}
          <div className="max-w-[200px]">
            <div className="td-p trunc" title={row.product_name}>
              {row.product_name}
            </div>
            <div className="td-m trunc mono" title={row.sku}>
              {row.sku}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) =>
        row.attributes?.category ? (
          <Badge variant="navy" className="text-[10px] h-[24px]">
            {row.attributes.category}
          </Badge>
        ) : (
          <span className="td-m">—</span>
        ),
    },
    {
      id: "price",
      header: "Price",
      cell: (row) => `$${Number(row.price).toFixed(2)}`,
      className: "td-p",
    },
    {
      id: "sales_count",
      header: "Sales",
      cell: (row) => <span className="td-p">{(row.sales_count ?? 0).toLocaleString()}</span>,
    },
    {
      id: "sourceable",
      header: "Sourceable",
      cell: (row) => (
        <Badge
          variant={row.admin_sourceable ? "success" : "neutral"}
          className="text-[10px] h-[24px]"
        >
          {row.admin_sourceable ? "Sourceable" : "Not Sourceable"}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active} className="text-[10px] h-[24px]" />,
      // Server-side status filter via the clickable header (?is_active=True|False).
      filter: {
        value: statusFilter,
        options: STATUS_FILTER_OPTIONS,
        onChange: onStatusFilter,
      },
    },
    {
      id: "express",
      header: "Express",
      cell: (row) => (
        <Badge variant={row.is_express_item ? "teal" : "neutral"} className="text-[10px] h-[24px]">
          {row.is_express_item ? "Express" : "Non-Express"}
        </Badge>
      ),
    },
    {
      id: "created_at",
      header: "Created",
      cell: (row) => <span className="td-m">{formatDate(row.created_at)}</span>,
    },
    {
      id: "updated_at",
      header: "Updated",
      cell: (row) => <span className="td-m">{formatDate(row.updated_at)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <TableActions
          row={row}
          actions={[
            {
              icon: <IconEye size={16} />,
              title: "View details",
              onClick: (e, r) => onView(e, r),
            },
          ]}
        />
      ),
      className: "w-16 text-right",
    },
  ];
}
