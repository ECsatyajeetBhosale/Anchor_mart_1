/**
 * Helpers for reading this backend's list/detail payloads defensively.
 *
 * The API is not uniform about envelopes — the same conceptual "list" arrives as
 * any of these depending on which view built it:
 *
 *   [ … ]                                        (bare array)
 *   { data: [ … ] }                              ({ message, data } wrapper)
 *   { count, next, previous, results: [ … ] }    (plain DRF pagination)
 *   { count, next, previous, results: { message, data: [ … ] } }
 *                                                (DRF pagination over a dict)
 *
 * Rather than repeat a four-way fallback in every `transformResponse`, read
 * lists through {@link unwrapList} and single objects through {@link unwrapData}.
 * Branching on shape here also means a backend that tightens an envelope later
 * doesn't blank a screen.
 */

/** Safe property read off an unknown value. */
export function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
export function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** Unwraps a `{ data }` envelope. A payload without one is returned as-is. */
export function unwrapData<T>(res: unknown): T {
  const data = getProp(res, "data");
  return (data === undefined ? res : data) as T;
}

/** A list plus its server-side total, normalised out of any of the envelopes above. */
export interface ListResult<T> {
  count: number;
  items: T[];
}

/**
 * Pulls the rows and total out of whichever envelope the endpoint used.
 *
 * `count` falls back to the number of rows on the page, which is correct for the
 * unpaginated shapes and a harmless approximation for a single-page response.
 * Pass a `map` to convert each raw row in the same step.
 */
export function unwrapList<T>(res: unknown, map?: (row: unknown) => T): ListResult<T> {
  const results = getProp(res, "results");
  const rows =
    asArray(res) ??
    asArray(results) ??
    asArray(getProp(results, "data")) ??
    asArray(getProp(res, "data")) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  return {
    count: typeof countRaw === "number" ? countRaw : rows.length,
    items: map ? rows.map(map) : (rows as T[]),
  };
}

/** Reads a value as a string, falling back to `""` for null/undefined/objects. */
export function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

/** Reads a value as a finite number, falling back to `fallback` (default 0). */
export function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}
