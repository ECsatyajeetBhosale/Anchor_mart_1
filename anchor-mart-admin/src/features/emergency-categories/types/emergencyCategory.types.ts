/**
 * A marine-emergency category row as returned by
 * GET /superadmin/emergency-spares/categories/.
 * The list is wrapped in the shared DRF envelope (`results: { message, data }`),
 * matching the regular categories contract.
 *
 * **The taxonomy is flat** (Build A, 2026-08-17) — see the general twin. Both
 * doors lost `parent` / `parent_name` in the same change, because they are one
 * serializer.
 */
export interface EmergencyCategory {
  id: string;
  name: string;
  description: string;
  /** Full image URL from the backend (may be null when no image is set). */
  image: string | null;
  /** Catalog scope — always "marine_emergency" for this catalog. */
  scope: string;
  /** Number of products assigned to this category. */
  product_count: number;
  is_active: boolean;
  /** Pre-formatted timestamp, e.g. "June 01, 2026, 10:12 AM". */
  created_at: string;
  updated_at: string;
}

export interface EmergencyCategoryListResponseData {
  message: string;
  data: EmergencyCategory[];
}

/** DRF paginated envelope for the emergency categories list (wrapped `results`). */
export interface EmergencyCategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: EmergencyCategoryListResponseData;
}

/**
 * Aggregate KPI counts for the emergency categories page, e.g.
 * `{ total: 26, active: 25, inactive: 1, empty: 8 }`. Plain object, not the DRF
 * wrapped envelope.
 *
 * **Scoped to the marine taxonomy and follows the list's filters.** This door and
 * the general one now share one `BaseCategoryStatsView` running the same
 * `_apply_category_filters` as their lists — they were two implementations until
 * 2026-08-17, and the general one was the broken copy. Accepts exactly `search`
 * + `is_active`, and 400s on a junk boolean as the list does.
 */
export interface EmergencyCategoryStats {
  total: number;
  active: number;
  inactive: number;
  /**
   * Categories with **no products assigned** — counting inactive ones and
   * ignoring soft-deleted ones.
   */
  empty: number;
}

/**
 * Request body for `POST emergency-spares/categories/add/`.
 *
 * **Only `name` is required.** `scope` is never writable — this door always
 * creates in the marine taxonomy — and `is_active` is not on the create
 * serializer, so every category is born active. Unknown keys are dropped
 * silently, so a 201 does not mean the body was understood.
 */
export interface AddEmergencyCategoryPayload {
  name: string;
  description?: string;
  /** Stored image path/key — must start `category_images/`, enforced server-side. */
  image?: string;
}

/**
 * Request body for `PATCH emergency-spares/categories/{id}/update/`.
 *
 * A true partial, so **only changed fields are sent** — the underlying `save()`
 * is a full-row write and unknown keys are dropped without error, so neither
 * over-sending nor an unsupported key would surface as a failure.
 *
 * `parent` is absent because the taxonomy is flat — unwritable in both
 * directions, so `null` would not clear a legacy value either.
 */
export type UpdateEmergencyCategoryPayload = Partial<{
  name: string;
  description: string;
  /** Sending `null` or `""` clears the image. */
  image: string | null;
  is_active: boolean;
}>;
