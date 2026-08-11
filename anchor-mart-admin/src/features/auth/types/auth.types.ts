/**
 * Auth types for AnchorMart Admin.
 * Aligns with Django REST Framework Token Auth.
 */

/**
 * A named business capability, mirroring the backend `Feature` enum in
 * `admin_panel/permissions/registry.py`. Names are `<domain>.<capability>` and
 * describe the business, not the URL — so a route rename never reaches here.
 *
 * Tier lives in the backend's `ROLE_FEATURES` map and nowhere else. Never infer
 * a capability from `role`: that is the second source of truth the backend
 * registry exists to prevent, and it drifts the moment a feature moves tiers.
 */
export type AdminFeature =
  // ── Order operations ──
  | "order.fulfil"
  | "order.own"
  | "order.bill"
  | "order.refund"
  | "order.surcharge"
  // ── Catalog ──
  | "catalog.manage"
  | "catalog.availability"
  | "catalog.announce"
  // ── Delivery ──
  | "delivery.roster"
  | "delivery.assign"
  // ── Support ──
  | "support.customer"
  | "support.seller"
  | "support.request"
  // ── Content & directory ──
  | "content.faq"
  | "directory.ship_agent"
  // ── Promotions ──
  | "promo.deal"
  | "promo.gift"
  | "promo.notify"
  // ── Everything else operational ──
  | "identity.provision_user"
  | "media.upload"
  | "platform.gift_config"
  // ── Governance (super_admin only today) ──
  | "finance.credit"
  | "promo.coupon"
  | "governance.admin_users"
  | "governance.audit_integrity"
  | "platform.port_config"
  | "finance.config"
  | "finance.refund_override"
  | "finance.credit_override"
  | "comms.service_broadcast"
  | "data.account_erasure";

/**
 * The signed-in admin, as returned by `admin_identity()` on the backend — one
 * shape from all three auth endpoints (login, verify-otp, and GET /admin/me/).
 */
export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  /**
   * What this account may do. Sorted server-side, so it is stable across
   * requests.
   *
   * Optional because a session persisted by an older build of this panel
   * rehydrates from localStorage without it — those sessions read as holding
   * nothing until the next sign-in or `getMe`, which fails closed rather than
   * briefly widening the UI.
   *
   * ⚠️ A **UX hint only**. Every capability is enforced server-side on every
   * request regardless of what this list says; hiding a button is not access
   * control.
   */
  features?: AdminFeature[];
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
