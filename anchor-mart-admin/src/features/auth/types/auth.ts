/**
 * Auth types for AnchorMart Admin.
 * Aligns with Django REST Framework Token Auth.
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
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
  token: string;
  user: AdminUser;
}
