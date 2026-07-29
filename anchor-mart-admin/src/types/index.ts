/**
 * Shared global types used across multiple features.
 * Feature-specific types should live in their own feature's types/ folder.
 */

/** Generic API paginated response shape */
export interface PaginatedResponse<T> {
  results: T[];
  total_pages: number;
  total_items: number;
}

/** Generic API error shape from DRF */
export interface ApiError {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}
