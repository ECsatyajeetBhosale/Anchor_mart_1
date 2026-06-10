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
export function getApiMessage(source: unknown): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  // RTK Query errors nest the payload under `data`; success responses are flat.
  const payload = "data" in source ? (source as { data?: unknown }).data : source;
  return extractMessage(payload);
}

function extractMessage(value: unknown, keyPath = ""): string | undefined {
  if (typeof value === "string") {
    return keyPath ? `${keyPath}: ${value}` : value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = extractMessage(item, keyPath);
      if (msg) return msg;
    }
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  // Prefer explicit top-level message keys.
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;

  // Otherwise walk field errors (including nested objects), labelling by field.
  for (const [key, child] of Object.entries(record)) {
    const label = key === "non_field_errors" ? keyPath : keyPath ? `${keyPath}.${key}` : key;
    const msg = extractMessage(child, label);
    if (msg) return msg;
  }
  return undefined;
}
