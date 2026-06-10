export interface ExpressItemImage {
  id?: string;
  // Stored relative path and/or full url (primary image is used for the thumbnail).
  image?: string;
  image_url?: string;
  is_primary?: boolean;
}

export interface ExpressItemMaterial {
  primary?: string;
  secondary?: string;
  elastane?: string;
}

/** Denormalized product attributes carried on an express variant. */
export interface ExpressItemAttributes {
  category?: string;
  brand?: string;
  color?: string;
  gender?: string;
  fit?: string;
  length?: string;
  rise?: string;
  closure_type?: string;
  care_instructions?: string;
  season?: string;
  material?: ExpressItemMaterial;
}

export interface ExpressItem {
  id: string;
  product_name: string;
  sku: string;
  price: number;
  is_active: boolean;
  is_express_item: boolean;
  admin_sourceable: boolean;
  sales_count: number;
  created_at: string;
  updated_at: string;
  images: ExpressItemImage[];
  attributes: ExpressItemAttributes;
  // Parent product reference (id/name), shape may vary by backend.
  product?: string | { id?: string; name?: string };
}

export interface ExpressItemListResponseData {
  message: string;
  data: ExpressItem[];
}

export interface ExpressItemListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ExpressItemListResponseData;
}
