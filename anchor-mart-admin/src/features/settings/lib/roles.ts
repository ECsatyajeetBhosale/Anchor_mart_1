import { APP_ROUTES } from "@/lib/constants";
import type { UserRole } from "../types/settings.types";

/**
 * The five roles `create-user` accepts. Order runs from the most commonly
 * created (sailors) to the most privileged (super admin).
 */
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "customer", label: "Sailor (Customer)" },
  { value: "delivery_partner", label: "Delivery Partner" },
  { value: "seller", label: "Seller" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Sailor (Customer)",
  delivery_partner: "Delivery Partner",
  seller: "Seller",
  admin: "Admin",
  super_admin: "Super Admin",
};

/**
 * Where a newly created account shows up. `create-user` only creates the login
 * — role-specific records (a partner's port and vehicle, a seller's approval)
 * are managed on their own screens, so say so before the form is submitted.
 */
export const ROLE_NOTES: Record<UserRole, string> = {
  customer: "The account will appear in Sailors, where you can edit or suspend it.",
  delivery_partner:
    "Creates the login only. Assignments and partner details are managed on the Delivery Partners screen.",
  seller: "Creates the login only. Approval is handled from the Seller Requests screen.",
  admin: "Full console access. There is no API to list or remove admins once created.",
  super_admin: "Highest privilege level. There is no API to list or remove admins once created.",
};

/** Which screen manages each role after creation — null when none exists. */
export const ROLE_MANAGED_AT: Record<UserRole, { label: string; path: string } | null> = {
  customer: { label: "Sailors", path: APP_ROUTES.SAILORS },
  delivery_partner: { label: "Delivery Partners", path: APP_ROUTES.PARTNERS },
  seller: { label: "Seller Requests", path: APP_ROUTES.SELLERS },
  admin: null,
  super_admin: null,
};
