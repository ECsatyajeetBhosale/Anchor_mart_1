export interface ProductImage {
  id?: string;
  image_url?: string;
  is_primary?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category_name: string;
  base_price: number;
  average_rating: number;
  is_active: boolean;
  created_at: string;
  images: ProductImage[];
}

export interface ProductListResponseData {
  message: string;
  data: Product[];
}

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListResponseData;
}
