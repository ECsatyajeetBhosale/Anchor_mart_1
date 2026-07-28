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

/** Query params for the products list (empty filters are omitted). */
export interface GetSpareProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Marine-emergency category id to filter by. */
  category?: string;
  /** Active/inactive filter; omit for both. */
  isActive?: boolean;
}

/** One image row on a spare-product detail (the list sends a single URL instead). */
export interface SpareProductImage {
  id: string;
  image: string;
  is_primary: boolean;
  display_order: number;
}

/**
 * Full detail from `GET /superadmin/emergency-spares/products/<id>/`.
 *
 * Note the shape differs from the list row in two ways: `images` is an array of
 * objects here (the list sends one `image` URL), and there is no `variant_count`.
 * `sku` and `attributes` are accepted by add/update but are **not** returned
 * here, so they cannot be prefilled and are deliberately not surfaced.
 */
export interface SpareProductDetail {
  id: string;
  name?: string | null;
  description?: string | null;
  base_price?: string | number | null;
  /** Category id — matches an emergency (marine_emergency scope) category. */
  category?: string | null;
  category_name?: string | null;
  images?: SpareProductImage[] | null;
  catalog_type?: string | null;
  admin_sourceable?: boolean | null;
  is_top_rated?: boolean | null;
  is_active?: boolean | null;
  average_rating?: number | null;
  purchase_count?: number | null;
  /** Port ids this spare is stocked at. */
  ports?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Body for `POST …/products/add/`.
 *
 * `category`, `name`, `description` and `base_price` are the four the API
 * rejects as "This field is required."; the category must be a
 * **marine_emergency**-scope one or the call 400s with an explicit message.
 * `images` are stored paths/keys, not uploads.
 */
export interface AddSpareProductPayload {
  category: string;
  name: string;
  description: string;
  base_price: number;
  images?: string[];
  admin_sourceable?: boolean;
  is_top_rated?: boolean;
}

/** Body for `PATCH …/products/<id>/update/` — same fields plus `is_active`. */
export interface UpdateSpareProductPayload extends AddSpareProductPayload {
  is_active?: boolean;
}

/** Transformed list result the page consumes: total count + UI rows. */
export interface SpareProductListResult {
  count: number;
  products: SpareProduct[];
}

/**
 * Marine-emergency statistics returned by
 * `GET /superadmin/emergency-spares/products/stats/`, verified against the live
 * response (`{"total":14,"active":14,"top_rated":5,"on_deal":0}`). Every field
 * is optional so a partial/empty payload degrades gracefully to 0.
 */
export interface SpareStats {
  total?: number;
  active?: number;
  top_rated?: number;
  on_deal?: number;
}
