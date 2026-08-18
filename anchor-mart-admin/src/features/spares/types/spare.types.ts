import type { BadgeProps } from "@/components/ui/badge";

/** Badge colour variant used for a spare-product status pill. */
export type SpareProductBadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Query params for the marine products list (empty filters are omitted).
 *
 * The endpoint takes the **same filter set as the general list**. Two of them
 * are not offered here, deliberately:
 * - `catalog_type` is a **400** on this endpoint for anything but
 *   `marine_emergency`, which is already forced — there is nothing to choose.
 * - `is_express` is accepted but meaningless: it filters `catalog_type=express`,
 *   which this endpoint excludes, so `is_express=true` always returns nothing.
 *
 * Pagination is the shared `CustomPagination` — `limit` is mapped to `page_size`
 * below (the raw name does nothing), default 10, clamped to 50, and a page past
 * the end is a 404.
 */
export interface GetSpareProductsParams {
  page?: number;
  limit?: number;
  /** Matches `name` only, case-insensitively — not description or SKU. */
  search?: string;
  /** Marine-emergency category id to filter by. */
  category?: string;
  /** Active/inactive filter; omit for both. */
  isActive?: boolean;
  /** Live-deal filter — computed per request, same as the general list. */
  onDeal?: boolean;
  isTopRated?: boolean;
  /** The product-level sourceable master switch (`?admin_sourceable=`). */
  adminSourceable?: boolean;
}

/**
 * Query params for `…/products/stats/` — **the same filters the list takes**, so
 * the cards describe the rows beneath them.
 *
 * The endpoint ignored query params until 2026-08-17 (the third instance of this
 * defect, after products and categories) and now runs the same
 * `_apply_product_filters` over the same marine-scoped queryset. Bad filter
 * input is a 400 here too, so both calls must get the same validated values.
 */
export type GetSpareStatsParams = Omit<GetSpareProductsParams, "page" | "limit">;

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
 * This is `AddProductSerializer` with `CATALOG_TYPES = (marine_emergency,)` — the
 * **same serializer as `add-product/`**, so it takes the same fields.
 *
 * `category`, `name`, `description` and `base_price` are required. The category
 * must be a live **marine_emergency**-scope one: a general id 400s with an
 * explicit scope message, and an inactive one reads as "Category not found".
 * `images` are stored paths/keys, not uploads. `catalog_type` is forced by the
 * endpoint and silently dropped if sent.
 */
export interface AddSpareProductPayload {
  category: string;
  name: string;
  description: string;
  base_price: number;
  images?: string[];
  admin_sourceable?: boolean;
  is_top_rated?: boolean;
  /**
   * **Creates the spare's first variant, inline, in the same transaction.**
   *
   * Optional server-side, and omitting it was this client's most consequential
   * bug: a spare created without one has zero variants, and
   * `browsable_products_qs` requires at least one live variant — so the spare
   * appears in the admin table and is **invisible to every sailor**. Nothing
   * breaks and nothing errors; the stock simply never exists for the people who
   * need it. For emergency stock that is the worst kind of failure, so the form
   * requires it even though the API does not.
   */
  sku?: string;
  /** Free-form attribute map copied onto the variant created from `sku`. */
  attributes?: Record<string, unknown>;
}

/**
 * Body for `PATCH …/products/<id>/update/`.
 *
 * Literally `UpdateProductSerializer` — the same eight keys as `update-product/`,
 * the same partial semantics, and the same silent drop of anything unrecognised.
 * So **only changed fields are sent**, for exactly the reasons documented on
 * `UpdateProductPayload`: the underlying `save()` is a full-row write, and an
 * unsupported key returns 200 having done nothing.
 *
 * Note `sku` and `attributes` are absent — they belong to create only; variants
 * are managed through their own endpoints afterwards.
 */
export type UpdateSpareProductPayload = Partial<{
  category: string;
  name: string;
  description: string;
  images: string[];
  base_price: number;
  admin_sourceable: boolean;
  is_active: boolean;
  is_top_rated: boolean;
}>;

/**
 * Marine-emergency statistics from `GET …/products/stats/`.
 *
 * **Exactly these four, deliberately** — and pinned by a backend test so the set
 * cannot drift. It is narrower than `product-stats/`'s eleven on purpose:
 * `catalog_type` is fixed on this surface, so the regular/express/emergency
 * breakdown would be one number and three zeros, and the category counts belong
 * to the category screens.
 *
 * Every field is optional so a partial/empty payload degrades to 0.
 */
export interface SpareStats {
  total?: number;
  active?: number;
  top_rated?: number;
  on_deal?: number;
}
