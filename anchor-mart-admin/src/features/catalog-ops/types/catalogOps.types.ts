/**
 * Catalog operations — the port directory and its anchorages.
 *
 * These endpoints live under `/superadmin/catalog/`. The anchorage half follows
 * the *Anchorage Admin API — Frontend Integration Guide* (rev. 2026-09-01); the
 * port half is still taken from the API collection's request bodies and the
 * models the customer-facing catalog flow (Flow 03) describes, so it stays read
 * defensively.
 *
 * **A port and its default anchorage are one unit.** `add-port/` requires a
 * `default_anchorage` object and writes both rows in one transaction, exactly
 * one anchorage per port is default (a database constraint), and the default
 * can only ever be *replaced* by promoting another — never unset, deactivated,
 * or deleted while siblings exist. Those three refusals are the reason several
 * of the shapes below are narrower than the endpoint technically accepts.
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

/**
 * The default anchorage, as sent **inside** a port create.
 *
 * Deliberately not an `AnchorageCreatePayload`: there is no `port` to name yet
 * (the port is being created in the same request) and no `is_default` to send —
 * this one *is* the default by construction.
 */
export interface DefaultAnchoragePayload {
  /** Max 100 chars. */
  anchorage_name: string;
  /** Max 20 chars. Optional, and **not** generated — omitted means empty. */
  anchorage_code?: string;
  /** Hours to reach a vessel at this mooring; feeds the delivery SLA / ETA. */
  estimated_delivery_hours?: number;
  /** Defaults to `true`. */
  is_active?: boolean;
}

/**
 * Create body for a port — `POST add-port/`.
 *
 * **`default_anchorage` is required.** The backend will not invent one, on the
 * grounds that a fabricated delivery location is worse than a rejected request,
 * so a body carrying only port fields is a `400`. Both rows are written in one
 * transaction: if either fails, neither exists.
 */
export interface PortCreatePayload {
  port_code: string;
  port_name: string;
  country: string;
  region: string;
  is_active?: boolean;
  default_anchorage: DefaultAnchoragePayload;
}

/**
 * Update body for a port — partial.
 *
 * No `default_anchorage`: the port create is the only call that takes one. Once
 * a port exists its default changes by *promoting* one of its anchorages, which
 * is an anchorage write.
 */
export interface PortUpdatePayload {
  port_code?: string;
  port_name?: string;
  country?: string;
  region?: string;
  is_active?: boolean;
}

/**
 * The parent port, as embedded in an anchorage row.
 *
 * The list and details payloads nest the **whole port object** here rather than
 * the bare `port_code` the older revision returned. The panel reads a port from
 * its own row when it has one, so only the identifying fields are typed; the
 * rest of the object is present on the wire and simply unused.
 */
export interface AnchoragePortRef {
  id: string;
  port_code: string;
  port_name: string;
}

/** A mooring inside a port. */
export interface Anchorage {
  /**
   * Primary key, returned on every read. Details, update and delete all address
   * the anchorage by this value **in the URL path**.
   */
  id: string;
  /** The parent port, nested. Never editable — an anchorage cannot be moved. */
  port: AnchoragePortRef;
  anchorage_name: string;
  /**
   * The mooring's own short code, e.g. `"OA-1"`.
   *
   * **Frequently empty.** It is optional on create and is *not* generated, so a
   * row that was created without one carries `""` — a missing code is normal
   * data here, not a failed read.
   */
  anchorage_code: string;
  /**
   * Hours to reach a vessel at this mooring, feeding the delivery SLA / ETA.
   * `null` when never set — distinct from `0`, which would promise immediate
   * delivery.
   */
  estimated_delivery_hours: number | null;
  /**
   * The port's primary anchorage. Exactly one per port, by database constraint.
   *
   * It is the one row in the list that cannot be deactivated, cannot be
   * deleted while siblings exist, and cannot be demoted — the only way it stops
   * being the default is another anchorage being promoted over it.
   *
   * **Ports created before 2026-09-01 have none.** Nothing was backfilled, so a
   * list where no row carries this flag is expected rather than broken, and the
   * fix is an operator promoting one.
   */
  is_default: boolean;
  is_active: boolean;
  /**
   * **Pre-formatted display strings**, e.g. `"August 14, 2026, 07:09 AM"` —
   * not ISO-8601. Render verbatim; parsing them yields Invalid Date.
   */
  created_at: string;
  updated_at: string;
}

/**
 * Create body — `POST create-anchorage/`.
 *
 * `port` is the parent's **UUID**, not its `port_code`, and the port must be
 * active (`400 {"port": ["Port not found"]}` otherwise). Note the read side
 * disagrees with it twice over: the list is *queried* by `port_id`, and each
 * row comes back carrying a nested `port` object.
 */
export interface AnchorageCreatePayload {
  /** The parent port's UUID. Must be an **active** port. */
  port: string;
  /** Max 100 chars. Unique per port among non-deleted rows. */
  anchorage_name: string;
  /** Max 20 chars. Optional, and **not** generated — omitted means empty. */
  anchorage_code?: string;
  estimated_delivery_hours?: number;
  /**
   * `true` promotes this anchorage on creation, demoting the port's incumbent
   * default in the same transaction. Defaults to `false`.
   */
  is_default?: boolean;
  /** Defaults to `true`. */
  is_active?: boolean;
}

/**
 * Update body — `PATCH update-anchorage/<anchorage_id>/`.
 *
 * Every field optional, and `PUT` is partial too, so only what the form
 * actually changed is sent.
 *
 * Two fields are narrower than the endpoint's signature, because two of its
 * three states are refused:
 *
 * - **`is_default` is `true` or absent.** `false` is a `400` — "A port must
 *   have a default anchorage" — since demotion only happens as the side effect
 *   of promoting a sibling. Typing the literal keeps that call unwritable.
 * - **`is_active` cannot be `false` on the default.** That one is a value the
 *   type cannot express, so it is the caller's job not to offer the toggle on
 *   the default row.
 *
 * `port` is absent entirely: an anchorage cannot be moved between ports.
 */
export interface AnchorageUpdatePayload {
  anchorage_name?: string;
  anchorage_code?: string;
  /**
   * `null` clears a previously-set estimate.
   *
   * The guide types this as an integer and says nothing about clearing one, but
   * the read side returns `null` for "never set", so `null` is the only value
   * that can mean it. The alternative — dropping the key when the operator
   * empties the box — silently discards an edit and then reports success, which
   * is the worse failure: a rejected `null` at least says so.
   */
  estimated_delivery_hours?: number | null;
  /** Promotion only — see above. */
  is_default?: true;
  is_active?: boolean;
}
