/**
 * Flow 31 §7 — user provisioning.
 *
 * Moved here from the settings feature when provisioning joined the deletion
 * queue on one screen: creating an account and erasing one are two ends of the
 * same lifecycle, and they now share a page, a feature module and a types file.
 */

/**
 * Every role `create-user` accepts. Verified against the endpoint: an unknown
 * value returns `{"errors":{"role":["… is not a valid choice."]}}`.
 */
export type UserRole = "customer" | "seller" | "admin" | "super_admin" | "delivery_partner";

/** Request body for POST /superadmin/admin/create-user/. */
export interface CreateUserPayload {
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  country_code: string;
  whatsapp_number: string;
}
