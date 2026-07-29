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

/** Step 1 — POST /superadmin/admin/login-with-otp/ */
export interface RequestOtpRequest {
  email: string;
}

export interface RequestOtpResponse {
  message: string;
}

/** Step 2 — POST /superadmin/admin/verify-otp/ */
export interface VerifyOtpRequest {
  email: string;
  otp: string;
  /**
   * Human-readable client string (browser + OS). Accepted but NOT persisted by
   * this endpoint — sent for parity with the customer/partner flows. Omitted
   * when it cannot be reliably detected rather than sent as a placeholder.
   */
  device?: string;
}

/** Identical shape to LoginResponse — the admin token never expires. */
export type VerifyOtpResponse = LoginResponse;
