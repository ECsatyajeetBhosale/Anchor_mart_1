/**
 * Product types for catalog management.
 */

export interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}
