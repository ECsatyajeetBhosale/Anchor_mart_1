export interface Category {
  id: string;
  name: string;
  description: string;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryListResponseData {
  message: string;
  data: Category[];
}

export interface CategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CategoryListResponseData;
}
