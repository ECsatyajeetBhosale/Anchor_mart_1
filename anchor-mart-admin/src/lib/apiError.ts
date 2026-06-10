/**
 * Pull a human-readable message out of a success response or an RTK Query error.
 * Handles { message }, { detail }, and DRF's { non_field_errors: [...] }.
 * Returns undefined when nothing usable is found so callers can fall back.
 */
export function getApiMessage(source: unknown): string | undefined {
  if (!source || typeof source !== "object") return undefined;
  // RTK Query errors nest the payload under `data`; success responses are flat.
  const payload = "data" in source ? (source as { data?: unknown }).data : source;
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.detail === "string") return record.detail;
  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === "string") {
    return record.non_field_errors[0];
  }
  return undefined;
}
