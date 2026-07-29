/**
 * A marine-emergency category row as returned by
 * GET /superadmin/emergency-spares/categories/.
 * The list is wrapped in the shared DRF envelope (`results: { message, data }`),
 * matching the regular categories contract.
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
  /** Parent category id (null for top-level categories). */
  parent: string | null;
  /** Parent category display name (null for top-level categories). */
  parent_name: string | null;
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
 * Aggregate KPI counts for the emergency categories page.
 * Plain object (not the DRF wrapped envelope), e.g.
 * `{ total: 26, active: 25, inactive: 1, empty: 8 }`.
 */
export interface EmergencyCategoryStats {
  total: number;
  active: number;
  inactive: number;
  /** Categories that have no products assigned. */
  empty: number;
}

/** Request body for POST /superadmin/emergency-spares/categories/add/. */
export interface AddEmergencyCategoryPayload {
  name: string;
  description: string;
  /** Stored image path/key (e.g. "category_images/example.jpg"), not a file upload. */
  image: string;
}

/** Request body for PATCH /superadmin/emergency-spares/categories/{id}/update/. */
export interface UpdateEmergencyCategoryPayload {
  name: string;
  description: string;
  image: string;
  is_active: boolean;
}
