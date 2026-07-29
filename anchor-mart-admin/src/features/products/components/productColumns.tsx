import {
  actionsColumn,
  badgeColumn,
  currencyColumn,
  statusColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { MESSAGES } from "@/lib/messages";
import { IconDeviceSpeaker, IconStar } from "@tabler/icons-react";
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
  /** Opens the SKU manager for the product. */
  onManageVariants: (e: React.MouseEvent, product: Product) => void;
  /** Opens the catalog-move dialog. */
  onChangeCatalog: (e: React.MouseEvent, product: Product) => void;
  /** Opens the availability-broadcast confirmation. */
  onAnnounce: (e: React.MouseEvent, product: Product) => void;
  /** Flips the merchandising top-rated flag. */
  onToggleTopRated: (product: Product, next: boolean) => void;
  /** Flips the product-level sourceable master switch. */
  onToggleSourceable: (product: Product, next: boolean) => void;
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
  onManageVariants,
  onChangeCatalog,
  onAnnounce,
  onToggleTopRated,
  onToggleSourceable,
}: UseProductColumnsOptions): Column<Product>[] {
  return [
    {
      id: "image",
      header: "",
      cell: (row) => <div className="prod-thumb">{getProductImage(row.images)}</div>,
      className: "w-12",
    },
    twoLineColumn({
      id: "name",
      header: MESSAGES.PRODUCTS.COLUMNS.PRODUCT,
      primary: (row) => row.name,
      secondary: (row) => row.description,
    }),
    badgeColumn({
      id: "category",
      header: MESSAGES.PRODUCTS.COLUMNS.CATEGORY,
      get: (row) => row.category_name,
      variant: "navy",
    }),
    currencyColumn({
      id: "price",
      header: MESSAGES.PRODUCTS.COLUMNS.PRICE,
      get: (row) => row.base_price,
    }),
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
      id: "topRated",
      header: MESSAGES.PRODUCT_FLAGS.COLUMNS.TOP_RATED,
      cell: (row) => (
        <Switch
          checked={row.is_top_rated === true}
          onCheckedChange={(next) => onToggleTopRated(row, next)}
          // The row itself opens the edit modal — the toggle must not.
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: "sourceable",
      header: MESSAGES.PRODUCT_FLAGS.COLUMNS.SOURCEABLE,
      cell: (row) => (
        <Switch
          checked={row.admin_sourceable !== false}
          onCheckedChange={(next) => onToggleSourceable(row, next)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    statusColumn({
      id: "status",
      header: MESSAGES.PRODUCTS.COLUMNS.STATUS,
      get: (row) => row.is_active,
      badgeClassName: "text-[10px] h-[24px]",
      // Server-side status filter via the clickable header (?is_active=True|False).
      filter: {
        value: statusFilter,
        options: STATUS_FILTER_OPTIONS,
        onChange: onStatusFilter,
      },
    }),
    actionsColumn({
      header: MESSAGES.PRODUCTS.COLUMNS.ACTIONS,
      actions: () => ({
        edit: {
          title: MESSAGES.PRODUCTS.ACTION_EDIT,
          onClick: (e, r) => onEdit(e, r),
        },
        variants: { onClick: (e, r) => onManageVariants(e, r) },
        catalog: { onClick: (e, r) => onChangeCatalog(e, r) },
        announce: { onClick: (e, r) => onAnnounce(e, r) },
        delete: {
          title: MESSAGES.PRODUCTS.ACTION_REMOVE,
          onClick: (e, r) => onDelete(e, r.id),
        },
      }),
    }),
  ];
}
