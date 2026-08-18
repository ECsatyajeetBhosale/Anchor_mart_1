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
import { IconDeviceSpeaker, IconTag } from "@tabler/icons-react";
import type React from "react";
import { CATALOG_BADGE_VARIANT, catalogTypeLabel } from "../lib/catalogTypeFilters";
import type { Product } from "../types/product.types";

const STATUS_FILTER_OPTIONS = [
  { label: MESSAGES.PRODUCTS.STATUS_FILTER.ACTIVE, value: "active" },
  { label: MESSAGES.PRODUCTS.STATUS_FILTER.INACTIVE, value: "inactive" },
];

/**
 * The two flag columns filter server-side, same as Status: `?is_top_rated=` and
 * `?admin_sourceable=`, both accepted by all three product catalogs since
 * 2026-08-17. `"true"` / `"false"`; `""` is "not filtering".
 */
const TOP_RATED_FILTER_OPTIONS = [
  { label: MESSAGES.PRODUCT_FLAGS.FILTERS.TOP_RATED_YES, value: "true" },
  { label: MESSAGES.PRODUCT_FLAGS.FILTERS.TOP_RATED_NO, value: "false" },
];

const SOURCEABLE_FILTER_OPTIONS = [
  { label: MESSAGES.PRODUCT_FLAGS.FILTERS.SOURCEABLE_YES, value: "true" },
  { label: MESSAGES.PRODUCT_FLAGS.FILTERS.SOURCEABLE_NO, value: "false" },
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
  /** `""` | `"true"` | `"false"` — the Top Rated header dropdown. */
  topRatedFilter?: string;
  onTopRatedFilter?: (value: string) => void;
  /** `""` | `"true"` | `"false"` — the Sourceable header dropdown. */
  sourceableFilter?: string;
  onSourceableFilter?: (value: string) => void;
  /**
   * Show the product's express price beside its regular one.
   *
   * Express is a **second price list**, not a surcharge: `base_price` is the
   * regular-flow figure and `express_base_price` is what the express shelf
   * shows. Only the express catalog has both, so the column is opt-in — on
   * Products and Spares it would be a column of dashes.
   */
  showExpressPrice?: boolean;
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
  /**
   * Opens the availability-broadcast confirmation.
   *
   * Optional because `announce-availability/` sits on the **general** products
   * base, and the map does not put it among the catalog-wide toggles the marine
   * surface borrows. A catalog that cannot reach it omits the handler and the
   * action is not rendered — better than a button that 404s.
   */
  onAnnounce?: (e: React.MouseEvent, product: Product) => void;
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
  topRatedFilter = "",
  onTopRatedFilter,
  sourceableFilter = "",
  onSourceableFilter,
  showExpressPrice = false,
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
    ...(showExpressPrice
      ? [
          {
            id: "expressPrice",
            header: MESSAGES.PRODUCTS.COLUMNS.EXPRESS_PRICE,
            className: "td-p",
            /**
             * The product-level express figure — the "from" price the express
             * catalog shows. What a sailor is actually charged is the
             * **variant's** `express_price`, which this one seeds on the primary
             * SKU; per-SKU figures live on the Express Items tab.
             *
             * A dash means the product carries no express price at all, which on
             * this screen is worth seeing: it is the express catalog.
             */
            cell: (row: Product) => {
              const value = Number(row.express_base_price);
              return row.express_base_price == null || !Number.isFinite(value) ? (
                <span className="td-m">{DASH}</span>
              ) : (
                <span className="td-p tabular-nums">{`$${value.toFixed(2)}`}</span>
              );
            },
          },
        ]
      : []),
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
      ...(onTopRatedFilter
        ? {
            filter: {
              value: topRatedFilter,
              options: TOP_RATED_FILTER_OPTIONS,
              onChange: onTopRatedFilter,
              allLabel: MESSAGES.PRODUCT_FLAGS.FILTERS.TOP_RATED_ALL,
            },
          }
        : {}),
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
      ...(onSourceableFilter
        ? {
            filter: {
              value: sourceableFilter,
              options: SOURCEABLE_FILTER_OPTIONS,
              onChange: onSourceableFilter,
              allLabel: MESSAGES.PRODUCT_FLAGS.FILTERS.SOURCEABLE_ALL,
            },
          }
        : {}),
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
      // Up to five inline icons now that delete left the overflow menu — the
      // default `w-24` was sized for a couple of buttons and a "…".
      className: "w-44 text-right",
      actions: () => ({
        edit: {
          title: MESSAGES.PRODUCTS.ACTION_EDIT,
          onClick: (e, r) => onEdit(e, r),
        },
        variants: { onClick: (e, r) => onManageVariants(e, r) },
        catalog: { onClick: (e, r) => onChangeCatalog(e, r) },
        ...(onAnnounce ? { announce: { onClick: onAnnounce } } : {}),
        ...(canDelete
          ? {
              delete: {
                title: MESSAGES.PRODUCTS.ACTION_REMOVE,
                // Inline red trash rather than the overflow menu (product
                // decision) — the same call the category tables made. The delete
                // is still irreversible and unguarded server-side (no check for
                // open orders, carts or running deals), so the typed confirm
                // stays as the thing standing between a click and a cascade.
                onClick: (e: React.MouseEvent, r: Product) => onDelete(e, r.id),
              },
            }
          : {}),
      }),
    }),
  ];
}
