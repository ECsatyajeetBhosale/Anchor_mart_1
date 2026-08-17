/**
 * A category row as returned by GET /superadmin/categories/get-categories/.
 * The list is wrapped in the shared DRF envelope (`results: { message, data }`).
 *
 * **The taxonomy is flat** (Build A, 2026-08-17): every category is a root, and
 * neither `parent` nor `parent_name` is returned by any of the nine admin
 * category endpoints. The model column survives dormant for Build B, so nesting
 * returns as a backend serializer change plus the mirror of this commit.
 */
export interface Category {
  id: string;
  name: string;
  description: string;
  /** Full image URL from the backend (may be null when no image is set). */
  image: string | null;
  /** Catalog scope, e.g. "general". */
  scope: string;
  /** Number of products assigned to this category. */
  product_count: number;
  is_active: boolean;
  /** Pre-formatted timestamp, e.g. "June 01, 2026, 10:12 AM". */
  created_at: string;
  updated_at: string;
}

export interface CategoryListResponseData {
  message: string;
  data: Category[];
}

/** DRF paginated envelope for the categories list (wrapped `results` object). */
export interface CategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CategoryListResponseData;
}

/**
 * Aggregate KPI counts for the categories page, e.g.
 * `{ total: 26, active: 25, inactive: 1, empty: 8 }`. Plain object, not the DRF
 * wrapped envelope.
 *
 * **Scoped to this screen's taxonomy and follows the list's filters** — the
 * endpoint runs the same `_apply_category_filters` the list does, so the two
 * cannot drift. It accepts exactly `search` + `is_active`, and 400s on a junk
 * boolean exactly as the list does: pass both the same validated values or the
 * cards will error on a filter the table accepted.
 */
export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  /**
   * Categories with **no products assigned**. Counts a product whether or not it
   * is active, and ignores soft-deleted ones — so "empty" means nothing is filed
   * here, not "nothing here is on sale".
   */
  empty: number;
}

/**
 * Request body for `POST add-category/`.
 *
 * **Only `name` is required.** `scope` is never writable — posting one is
 * silently ignored and the category is born in the endpoint's own taxonomy — and
 * `is_active` is not on the create serializer at all, so every category is born
 * active.
 *
 * Unknown keys are dropped without an error, so a 201 does not mean the body was
 * understood. The response is the full category; diff it if a field matters.
 */
export interface AddCategoryPayload {
  name: string;
  description?: string;
  /** Stored image path/key — must start `category_images/`, enforced server-side. */
  image?: string;
}

/**
 * Request body for `PATCH update-category/{id}/`.
 *
 * A true partial — `update()` writes only the keys present — so **only changed
 * fields are sent**. Same reasoning as `update-product`: the underlying `save()`
 * is a full-row write, and unknown keys are dropped silently, so neither
 * over-sending nor an unsupported key would surface as an error.
 *
 * `scope` is absent because a category cannot change taxonomy, and `parent`
 * because the taxonomy is flat — it is unwritable in **both** directions, so
 * sending `null` would not clear a legacy value either.
 */
export type UpdateCategoryPayload = Partial<{
  name: string;
  description: string;
  /** Sending `null` or `""` clears the image. */
  image: string | null;
  is_active: boolean;
}>;
