import type { BadgeProps } from "@/components/ui/badge";

/** Badge colour variant used for a spare-product status pill. */
export type SpareProductBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * UI row model consumed by the marine-emergency products table. Built from a
 * `SpareProductApi` row by the API transform; display strings are already
 * "-"-guarded so columns render the raw value directly.
 */
export interface SpareProduct {
  /** Product id (UUID). */
  id: string;
  /** Product name. */
  name: string;
  /** Product image URL (empty string when none). */
  image: string;
  /** Category display name. */
  category: string;
  /** Formatted base price (e.g. "$4750.00"), or "-" when absent. */
  price: string;
  /** Number of variants (number, or "-" when absent). */
  variants: number | string;
  /** Average rating (number, or "-" when absent). */
  rating: number | string;
  /** Catalog type label (e.g. "Marine Emergency"). */
  type: string;
  /** Whether the product is active. */
  active: boolean;
  /** Created-at label. */
  created: string;
}

/**
 * Raw marine-emergency product row from
 * `GET /superadmin/emergency-spares/products/` (`results.data[]`). Fields are
 * optional/nullable so a partial payload degrades gracefully to "-".
 */
export interface SpareProductApi {
  id: string;
  name?: string | null;
  image?: string | null;
  category?: string | null;
  category_name?: string | null;
  base_price?: string | number | null;
  variant_count?: number | null;
  catalog_type?: string | null;
  is_express?: boolean | null;
  on_deal?: boolean | null;
  is_top_rated?: boolean | null;
  average_rating?: number | null;
  admin_sourceable?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Query params for the products list (search omitted when empty). */
export interface GetSpareProductsParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface SpareProductListResult {
  count: number;
  products: SpareProduct[];
}

/**
 * Marine-emergency statistics returned by
 * `GET /superadmin/emergency-spares/products/stats/`. Every field is optional so
 * a partial/empty payload degrades gracefully to 0. Only `total` is surfaced on
 * the page (the "Total Products" card).
 */
export interface SpareStats {
  total?: number;
  active?: number;
  inactive?: number;
}
