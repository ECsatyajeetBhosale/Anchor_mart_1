export interface ProductImage {
  id?: string;
  // Stored relative path used by the update payload, e.g. "product_images/x.png"
  image?: string;
  image_url?: string;
  is_primary?: boolean;
}

/**
 * A variant as nested on the **product-detail** payload (`get-product/<id>/`).
 *
 * Deliberately separate from `features/variants`' `ProductVariant`: this shape
 * carries `price` as a decimal string, and — importantly — has **no
 * `is_sourceable`**. That field is the effective product-AND-variant badge; its
 * absence here means orderability must be computed against the parent product's
 * own `admin_sourceable`, never read off the variant flag alone.
 */
export interface ProductDetailVariant {
  id: string;
  sku: string;
  /** Decimal string, e.g. "25.00". */
  price: string;
  attributes: Record<string, unknown>;
  images: unknown[];
  is_active: boolean;
  /** Variant half of the sourceable rule — only half. */
  admin_sourceable: boolean;
  is_express: boolean;
  about_product: string | null;
  catalog_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  // UUIDs needed to pre-populate / submit the update form
  category?: string;
  shop?: string;
  category_name: string;
  base_price: number;
  average_rating: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  images: ProductImage[];
  /** Single thumbnail URL returned by the list serializer (may be null). */
  image?: string | null;
  is_featured?: boolean;
  // Catalog + merchandising flags returned by get-products (used by the edit form).
  catalog_type?: string;
  is_express?: boolean;
  on_deal?: boolean;
  is_top_rated?: boolean;
  admin_sourceable?: boolean;
  variant_count?: number;
  purchase_count?: number;
  /**
   * Nested on the detail read only — the list serializer omits it. Saves the
   * edit drawer a second request to show a product's SKUs.
   */
  variants?: ProductDetailVariant[];
}

export interface ProductListResponseData {
  message: string;
  data: Product[];
}

/**
 * Payload contract for PATCH update-product/{id}/.
 * Only these fields are accepted by the API — nothing else is submitted.
 * (`shop` is NOT part of the update contract per the Postman collection.)
 */
export interface UpdateProductPayload {
  category: string;
  name: string;
  description: string;
  images: string[];
  base_price: number;
  is_express: boolean;
  on_deal: boolean;
  is_top_rated: boolean;
  admin_sourceable: boolean;
}

/**
 * Aggregate KPI counts for the products page from GET product-stats/.
 * Keys confirmed against a live response.
 */
export interface ProductStats {
  total: number;
  active: number;
  regular: number;
  express: number;
  emergency: number;
  top_rated: number;
  on_deal: number;
  deal_of_the_day: number;
  total_categories: number;
  general_categories: number;
  marine_emergency_categories: number;
}

/** Nested material composition inside a product's attributes. */
export interface ProductMaterial {
  primary: string;
  secondary: string;
  elastane: string;
}

/** Nested price details inside a product's attributes. */
export interface ProductPriceDetails {
  amount: number;
  currency: string;
  discounted: boolean;
}

/** Rich, denormalized product attributes (sent as a nested object). */
export interface ProductAttributes {
  id: string;
  product_name: string;
  category: string;
  subcategory: string;
  gender: string;
  brand: string;
  color: string;
  material: ProductMaterial;
  fit: string;
  rise: string;
  length: string;
  closure_type: string;
  pockets: string[];
  care_instructions: string;
  season: string;
  price: ProductPriceDetails;
}

/** Payload contract for POST add-product/. */
export interface AddProductPayload {
  category: string;
  name: string;
  description: string;
  images: string[];
  base_price: number;
  admin_sourceable: boolean;
  sku: string;
  attributes: ProductAttributes;
  is_express_item: boolean;
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListResponseData;
}
