/**
 * A category row as returned by GET /superadmin/categories/get-categories/.
 * The list is wrapped in the shared DRF envelope (`results: { message, data }`).
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
  /** Parent category id (null for top-level categories). */
  parent: string | null;
  /** Parent category display name (null for top-level categories). */
  parent_name: string | null;
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
 * Aggregate KPI counts for the categories page.
 * Plain object (not the DRF wrapped envelope), e.g.
 * `{ total: 26, active: 25, inactive: 1, empty: 8 }`.
 */
export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  /** Categories that have no products assigned. */
  empty: number;
}

/** Request body for POST /superadmin/catalog/add-category/. */
export interface AddCategoryPayload {
  name: string;
  description: string;
  /** Stored image path/key (e.g. "category_images/example.jpg"), not a file upload. */
  image: string;
}

/** Request body for PATCH /superadmin/catalog/update-category/{id}/ (partial). */
export interface UpdateCategoryPayload {
  name: string;
  description: string;
  image: string;
  is_active: boolean;
}
