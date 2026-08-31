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

/**
 * A mooring inside a port.
 *
 * ⚠️ **The list payload carries no `id`.** The documented row is
 * `{ port_code, anchorage_name, is_active, created_at, updated_at }` — the
 * primary key is absent, and the details endpoint omits it too. Only the update
 * response returns one. Since update and delete both key on an `anchorage_id`
 * UUID, **neither can be driven from a row**, which is why this feature ships
 * with list and create only. `id` is typed optional so the moment the serializer
 * starts sending it, the row actions can be wired without a type change.
 */
export interface Anchorage {
  /** Absent from every documented read payload — see the note above. */
  id?: string;
  /** The parent port's code, e.g. "INMUM". The list is fetched by port **UUID**. */
  port_code: string;
  anchorage_name: string;
  /**
   * The mooring's own short code, e.g. `"EA1"` or `"AEFJR-A1"`.
   *
   * Absent from the admin integration guide's example rows but present on the
   * customer-facing anchorage list (Flow 03 API 11), and required on create —
   * so it is read defensively here rather than assumed.
   */
  anchorage_code: string;
  is_active: boolean;
  /**
   * **Pre-formatted display strings**, e.g. `"August 14, 2026, 07:09 AM"` —
   * not ISO-8601. Render verbatim; parsing them yields Invalid Date.
   */
  created_at: string;
  updated_at: string;
}

/**
 * Create body.
 *
 * `port` is the port's **UUID**, not its code — the plain FK field name, which
 * DRF resolves against the primary key. The read side disagrees with it twice
 * over and both are worth holding in mind: the list is *queried* by `port_id`,
 * and each row comes back carrying `port_code`. Three names for the same
 * relationship across three calls.
 */
export interface AnchoragePayload {
  /** The parent port's UUID. */
  port: string;
  anchorage_name: string;
  /** The mooring's own short code. Required on create. */
  anchorage_code: string;
  /**
   * Optional, defaulting to the model's `true`. Kept on the payload — the guide
   * lists it as accepted, and the form's Active toggle is what writes it.
   */
  is_active?: boolean;
}
