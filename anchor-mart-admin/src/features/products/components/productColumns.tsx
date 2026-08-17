import { Thumbnail } from "@/components/common/Thumbnail";
import {
  actionsColumn,
  badgeColumn,
  currencyColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { MESSAGES } from "@/lib/messages";
import { IconDeviceSpeaker, IconStar, IconTag } from "@tabler/icons-react";
import type React from "react";
import { CATALOG_BADGE_VARIANT, catalogTypeLabel } from "../lib/catalogTypeFilters";
import type { Product } from "../types/product.types";

const STATUS_FILTER_OPTIONS = [
  { label: MESSAGES.PRODUCTS.STATUS_FILTER.ACTIVE, value: "active" },
  { label: MESSAGES.PRODUCTS.STATUS_FILTER.INACTIVE, value: "inactive" },
];

const DASH = MESSAGES.PRODUCTS.DASH;

/**
 * Product thumbnail: the primary image, else the first, else the list
 * serializer's single `image` field, else a glyph.
 *
 * Both `image_url` and `image` are read because the two serializers disagree —
 * the detail payload carries `image_url` while the list rows carry the absolute
 * URL under `image`. Reading only the former left every row on the glyph even
 * though images were being returned.
 */
function getProductImageUrl(row: Product): string {
  const images = row.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  return primary?.image_url || primary?.image || row.image || "";
}

export interface UseProductColumnsOptions {
  /** Current status filter value ("", "active", "inactive") for the header dropdown. */
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onEdit: (e: React.MouseEvent, product: Product) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  /**
   * Whether to render the delete action at all. False for a sub-admin — the
   * server refuses the call, so offering the button only produces a failure the
   * operator cannot act on. Editing stays available to both tiers.
   */
  canDelete?: boolean;
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
  /**
   * Activates / deactivates the product — the reversible alternative to delete.
   * Unlike the other two toggles this has no dedicated endpoint yet, so it goes
   * through update-product; see the handler.
   */
  onToggleActive: (product: Product, next: boolean) => void;
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
  onToggleActive,
  canDelete = true,
}: UseProductColumnsOptions): Column<Product>[] {
  return [
    {
      id: "image",
      header: "",
      cell: (row) => (
        <Thumbnail
          src={getProductImageUrl(row)}
          alt={MESSAGES.PRODUCTS.IMAGE_ALT}
          placeholder={<IconDeviceSpeaker size={18} />}
        />
      ),
      className: "w-12",
    },
    twoLineColumn({
      id: "name",
      header: MESSAGES.PRODUCTS.COLUMNS.PRODUCT,
      primary: (row) => row.name,
      /**
       * Created date, not `description`: the list serializer omits description
       * entirely (it is a detail-only field), so this second line rendered blank
       * on every row of the table it was written for.
       */
      secondary: (row) => row.created_at ?? DASH,
    }),
    badgeColumn({
      id: "category",
      header: MESSAGES.PRODUCTS.COLUMNS.CATEGORY,
      get: (row) => row.category_name,
      variant: "navy",
    }),
    {
      id: "catalog",
      header: MESSAGES.PRODUCTS.COLUMNS.CATALOG,
      /*
        `catalog_type` alone. There is no companion `is_express` chip because
        there is nothing for it to add: the serializer defines `is_express` as
        `catalog_type === "express"`, so a chip conditioned on the two
        disagreeing is a branch that can never be taken.
      */
      cell: (row) => (
        <Badge
          variant={CATALOG_BADGE_VARIANT[row.catalog_type ?? ""] ?? "neutral"}
          className="text-[10px] h-[24px]"
        >
          {catalogTypeLabel(row.catalog_type) ?? DASH}
        </Badge>
      ),
    },
    currencyColumn({
      id: "price",
      header: MESSAGES.PRODUCTS.COLUMNS.PRICE,
      get: (row) => row.base_price,
    }),
    {
      id: "variants",
      header: MESSAGES.PRODUCTS.COLUMNS.VARIANTS,
      // The SKU count the row menu's variant manager opens onto.
      cell: (row) => <span className="td-p">{row.variant_count ?? 0}</span>,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "purchases",
      header: MESSAGES.PRODUCTS.COLUMNS.PURCHASES,
      cell: (row) => <span className="td-p">{row.purchase_count ?? 0}</span>,
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "rating",
      header: MESSAGES.PRODUCTS.COLUMNS.RATING,
      /**
       * Replaces the old Featured column, which read `is_featured || rating >=
       * 4.5` — but `is_featured` is not on the list payload, so the pill turned
       * on the rating alone and every row without one showed a dash that looked
       * like a flag being off. The number is the honest version of the same
       * signal; it still goes amber past the 4.5 the pill used, and an unrated
       * product shows a dash rather than 0.0, which would read as "rated badly".
       */
      cell: (row) => {
        const rating = Number(row.average_rating ?? 0);
        if (!rating) return <span className="td-m">{DASH}</span>;
        return (
          <span
            className={`td-p inline-flex items-center gap-1 tabular-nums ${
              rating >= 4.5 ? "text-[var(--amber-700)]" : ""
            }`}
          >
            <IconStar size={12} fill="currentColor" />
            {rating.toFixed(1)}
          </span>
        );
      },
      className: "text-center",
      headerClassName: "text-center",
    },
    {
      id: "deal",
      header: MESSAGES.PRODUCTS.COLUMNS.DEAL,
      // Read-only: the flag is part of the update contract, so it is edited in
      // the drawer. On the row it exists to explain the "Deal Products" tab.
      cell: (row) =>
        row.on_deal ? (
          <Badge variant="amber" className="gap-1 h-[24px]">
            <IconTag size={12} />
            {MESSAGES.PRODUCTS.DEAL_YES}
          </Badge>
        ) : (
          <span className="td-m">{DASH}</span>
        ),
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
    {
      id: "status",
      header: MESSAGES.PRODUCTS.COLUMNS.STATUS,
      /**
       * A switch, not a badge — deactivating is the action operators actually
       * want and it had no control anywhere in the admin.
       *
       * The asymmetry this fixes: delete was a one-click row icon, is terminal
       * (soft-delete with no restore endpoint, and every admin queryset filters
       * deleted rows out, so it hides its own evidence), and runs with no check
       * for open orders or running deals. Deactivating does the job people mean
       * — `is_orderable()` ANDs product liveness, so it blocks add-to-cart and
       * checkout — and is reversible. The safe action now sits where the
       * destructive one used to, and delete has moved behind the overflow menu.
       */
      cell: (row) => (
        <Switch
          checked={row.is_active !== false}
          onCheckedChange={(next) => onToggleActive(row, next)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      // Server-side status filter via the clickable header (?is_active=True|False).
      filter: {
        value: statusFilter,
        options: STATUS_FILTER_OPTIONS,
        onChange: onStatusFilter,
      },
    },
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
        ...(canDelete
          ? {
              delete: {
                title: MESSAGES.PRODUCTS.ACTION_REMOVE,
                // Behind the overflow menu: irreversible, unguarded server-side
                // (no check for open orders, carts or running deals), and almost
                // never the intent — the Active switch is.
                overflow: true,
                onClick: (e: React.MouseEvent, r: Product) => onDelete(e, r.id),
              },
            }
          : {}),
      }),
    }),
  ];
}
