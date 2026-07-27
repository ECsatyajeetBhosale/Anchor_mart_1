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
  // Prefer explicit top-level message keys. `error` is what most of this
  // backend's failure bodies use ({"error": "Email is required"}); without it
  // the field-walker below would label the value and render "error: ...".
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  if (typeof record.error === "string") return record.error;

  // Otherwise walk field errors (including nested objects), labelling by field.
  for (const [key, child] of Object.entries(record)) {
    const label = key === "non_field_errors" ? keyPath : keyPath ? `${keyPath}.${key}` : key;
    const msg = extractMessage(child, label, labelFields);
    if (msg) return msg;
  }
  return undefined;
}
