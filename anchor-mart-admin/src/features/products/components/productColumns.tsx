import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconDeviceSpeaker, IconEdit, IconStar, IconTrash } from "@tabler/icons-react";
import type React from "react";
import type { Product } from "../types/product.types";

const STATUS_FILTER_OPTIONS = [
  { label: MESSAGES.PRODUCTS.STATUS_FILTER.ACTIVE, value: "active" },
  { label: MESSAGES.PRODUCTS.STATUS_FILTER.INACTIVE, value: "inactive" },
];

function getProductImage(images: Product["images"]) {
  if (!images || images.length === 0) {
    return <IconDeviceSpeaker size={18} />;
  }
  const primary = images.find((img) => img.is_primary);
  const imageUrl = primary ? primary.image_url : images[0].image_url;
  return (
    <img
      src={imageUrl}
      alt={MESSAGES.PRODUCTS.IMAGE_ALT}
      className="h-8 w-8 rounded object-cover"
    />
  );
}

export interface UseProductColumnsOptions {
  /** Current status filter value ("", "active", "inactive") for the header dropdown. */
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onEdit: (e: React.MouseEvent, product: Product) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

/**
 * Column definitions for the products table. Kept out of the page component so
 * the page stays focused on data/state wiring and the columns stay reusable.
 */
export function useProductColumns({
  statusFilter,
  onStatusFilter,
  onEdit,
  onDelete,
}: UseProductColumnsOptions): Column<Product>[] {
  return [
    {
      id: "image",
      header: "",
      cell: (row) => <div className="prod-thumb">{getProductImage(row.images)}</div>,
      className: "w-12",
    },
    {
      id: "name",
      header: MESSAGES.PRODUCTS.COLUMNS.PRODUCT,
      cell: (row) => (
        <div className="max-w-[180px]">
          <div className="td-p trunc" title={row.name}>
            {row.name}
          </div>
          <div className="td-m trunc" title={row.description}>
            {row.description}
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: MESSAGES.PRODUCTS.COLUMNS.CATEGORY,
      cell: (row) => (
        <Badge variant="navy" className="text-[10px] h-[24px]">
          {row.category_name}
        </Badge>
      ),
    },
    {
      id: "price",
      header: MESSAGES.PRODUCTS.COLUMNS.PRICE,
      cell: (row) => `$${Number(row.base_price).toFixed(2)}`,
      className: "td-p w7",
    },
    {
      id: "featured",
      header: MESSAGES.PRODUCTS.COLUMNS.FEATURED,
      cell: (row) => {
        const isFeatured = row.is_featured || row.average_rating >= 4.5;
        return isFeatured ? (
          <Badge variant="amber" className="gap-1 h-[24px]">
            <IconStar size={12} fill="currentColor" />
            {MESSAGES.PRODUCTS.FEATURED_YES}
          </Badge>
        ) : (
          <span className="td-m">—</span>
        );
      },
    },
    {
      id: "status",
      header: MESSAGES.PRODUCTS.COLUMNS.STATUS,
      cell: (row) => <StatusBadge status={row.is_active} className="text-[10px] h-[24px]" />,
      // Server-side status filter via the clickable header (?is_active=True|False).
      filter: {
        value: statusFilter,
        options: STATUS_FILTER_OPTIONS,
        onChange: onStatusFilter,
      },
    },
    {
      id: "actions",
      header: MESSAGES.PRODUCTS.COLUMNS.ACTIONS,
      cell: (row) => (
        <TableActions
          row={row}
          actions={[
            {
              icon: <IconEdit size={16} />,
              title: MESSAGES.PRODUCTS.ACTION_EDIT,
              onClick: (e, r) => onEdit(e, r),
            },
            {
              icon: <IconTrash size={16} />,
              title: MESSAGES.PRODUCTS.ACTION_REMOVE,
              variant: "danger",
              onClick: (e, r) => onDelete(e, r.id),
            },
          ]}
        />
      ),
      className: "w-24 text-right",
    },
  ];
}
