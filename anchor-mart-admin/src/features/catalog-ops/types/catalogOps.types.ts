/**
 * Catalog operations — the port directory.
 *
 * These endpoints live under `/superadmin/catalog/` and are **not covered by
 * any flow document**, so the shapes below are taken from the API collection's
 * request bodies and the models the customer-facing catalog flow (Flow 03)
 * describes. Read them defensively.
 */

/** A port in the directory. */
export interface Port {
  id: string;
  /** UN/LOCODE-style code, e.g. "INMUM". */
  port_code: string;
  port_name: string;
  country: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Create/update body for a port. Both verbs are partial. */
export interface PortPayload {
  port_code: string;
  port_name: string;
  country: string;
  region: string;
  is_active?: boolean;
}
