export interface ApiMessageOptions {
  /**
   * Prefix a DRF field error with its field name (`"sku: already exists."`).
   *
   * Useful next to a form, where the label says *which* input is wrong.
   * Counter-productive in a toast, where the backend's sentence usually reads
   * fine on its own and `delivery_partner_id: …` is just noise. Defaults to
   * `true` so existing call sites are unchanged.
   */
  labelFields?: boolean;
}

/**
 * Pull a human-readable message out of a success response or an RTK Query error.
 *
 * Handles, in order of preference:
 *   - { message } / { detail }
 *   - DRF non_field_errors: ["..."]
 *   - DRF field errors, flat or nested, e.g.
 *       { sku: ["product with this sku already exists."] }
 *       { attributes: { price: { amount: ["..."] } } }
 *
 * Returns undefined when nothing usable is found so callers can fall back.
 */
export function getApiMessage(source: unknown, options?: ApiMessageOptions): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  // RTK Query errors nest the payload under `data`; success responses are flat.
  const payload = "data" in source ? (source as { data?: unknown }).data : source;
  return extractMessage(payload, "", options?.labelFields !== false);
}

/**
 * HTTP status of an RTK Query error, when it has one.
 *
 * Several endpoints in this API distinguish "wrong request" from "right request,
 * wrong moment" by status alone — a `409` on partner delete means the partner
 * still holds an order, a `403` on assign-order means a capability violation
 * slipped past the serializer. Those need branching on the code, not on the
 * prose, which is free to be reworded server-side.
 *
 * Returns undefined for a fetch/parse failure, which carries a string `status`
 * (`"FETCH_ERROR"`, `"PARSING_ERROR"`) rather than a numeric one.
 */
export function getApiStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/**
 * Pull **per-field** validation errors out of a 400 body, keyed by field name.
 *
 * Provisioning endpoints (`POST /partner/create/`, `POST /admin/create-user/`)
 * returned `{"errors": {"email": ["…"]}}` until 2026-07-30 and return bare field
 * keys — `{"email": ["…"]}` — since. Both shapes are read here, so the same call
 * site works either way and the change cannot silently drop a message: without a
 * mapping like this the failure is invisible, because the request fails
 * identically and only the rendering differs.
 *
 * Keys carrying a whole sentence rather than a field (`message`, `detail`,
 * `error`, `non_field_errors`) are skipped — they belong in a toast via
 * {@link getApiMessage}, not pinned to an input.
 */
export function getFieldErrors(source: unknown): Record<string, string> {
  if (!source || typeof source !== "object") return {};
  const payload = "data" in source ? (source as { data?: unknown }).data : source;
  if (!payload || typeof payload !== "object") return {};

  const record = payload as Record<string, unknown>;
  // The legacy envelope, when present, holds the field map itself.
  const fields =
    record.errors && typeof record.errors === "object"
      ? (record.errors as Record<string, unknown>)
      : record;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === "message" || key === "detail" || key === "error" || key === "non_field_errors") {
      continue;
    }
    const message = extractMessage(value, "", false);
    if (message) out[key] = message;
  }
  return out;
}

function extractMessage(value: unknown, keyPath: string, labelFields: boolean): string | undefined {
  if (typeof value === "string") {
    return keyPath && labelFields ? `${keyPath}: ${value}` : value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = extractMessage(item, keyPath, labelFields);
      if (msg) return msg;
    }
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  // The provisioning endpoints used to wrap field errors one level deeper:
  // {"errors": {"role": [...]}}. They send bare field keys since 2026-07-30, but
  // the envelope is still unwrapped here so an older deployment (or a cached
  // response) reads "role: …" rather than "errors.role: …".
  if (record.errors && typeof record.errors === "object") {
    const msg = extractMessage(record.errors, keyPath, labelFields);
    if (msg) return msg;
  }
  // Prefer explicit top-level message keys. `error` is what most of this
  // backend's failure bodies use ({"error": "Email is required"}); without it
  // the field-walker below would label the value and render "error: ...".
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  if (typeof record.error === "string") return record.error;

  // Otherwise walk field errors (including nested objects), labelling by field.
  for (const [key, child] of Object.entries(record)) {
    // `message`/`detail` carry a whole sentence even when they arrive as an
    // array (create-user does this), so labelling them reads as noise.
    const unlabelled = key === "non_field_errors" || key === "message" || key === "detail";
    const label = unlabelled ? keyPath : keyPath ? `${keyPath}.${key}` : key;
    const msg = extractMessage(child, label, labelFields);
    if (msg) return msg;
  }
  return undefined;
}
