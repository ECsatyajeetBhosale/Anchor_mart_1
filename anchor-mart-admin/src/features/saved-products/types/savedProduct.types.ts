/**
 * Flow 29c §5 — customer wishlist rows (`SavedProduct`).
 *
 * Filed under the catalog URLs but it is an engagement read: what sailors have
 * saved, not what the catalog contains. Rows are already scoped to
 * `is_deleted=False` server-side and ordered newest first.
 */

/** Raw row from `GET /superadmin/catalog/get-saved-products/`. */
export interface SavedProductApi {
  id: string;
  /** The sailor's **display name**, not their id — the API resolves it. */
  user?: string | null;
  /** The product's UUID. */
  product?: string | null;
  /**
   * Product name. Added alongside `image` so a row is renderable without a
   * second lookup — the endpoint lets you search by product name, so returning
   * only the UUID made the result unusable.
   */
  product_name?: string | null;
  /** Absolute product image URL, resolved through the product's image rows. */
  image?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Flat UI row the table renders. */
export interface SavedProduct {
  id: string;
  userName: string;
  productId: string;
  productName: string;
  /** Empty string when the product has no image — the cell falls back to an initial. */
  image: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query params. `search` matches the **product name** only (not the sailor),
 * and a malformed `user`/`product` UUID or an unrecognised `is_active` value is
 * a 400 rather than an ignored filter.
 */
export interface GetSavedProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** `"true"` / `"false"`; omit for both. */
  isActive?: string;
  /** Exact `user_id` match. */
  user?: string;
  /** Exact `product_id` match. */
  product?: string;
}

export interface SavedProductListResult {
  count: number;
  items: SavedProduct[];
}
