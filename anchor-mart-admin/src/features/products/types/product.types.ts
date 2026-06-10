export interface ProductImage {
  id?: string;
  // Stored relative path used by the update payload, e.g. "product_images/x.png"
  image?: string;
  image_url?: string;
  is_primary?: boolean;
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
  images: ProductImage[];
  is_featured?: boolean;
}

export interface ProductListResponseData {
  message: string;
  data: Product[];
}

/**
 * Payload contract for PUT update-product/{id}/.
 * Only these fields are accepted by the API — nothing else is submitted.
 */
export interface UpdateProductPayload {
  category: string;
  shop: string;
  name: string;
  description: string;
  images: string[];
  base_price: number;
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
