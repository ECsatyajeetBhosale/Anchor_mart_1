/**
 * Auth types for AnchorMart Admin.
 * Aligns with Django REST Framework Token Auth.
 */

export interface AdminUser {
  email: string;
  role: string;
}

export interface AuthState {
  token: string | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AdminUser;
}
