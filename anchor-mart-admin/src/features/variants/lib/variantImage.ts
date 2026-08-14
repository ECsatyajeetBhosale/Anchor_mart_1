/**
 * Picking a variant's display image.
 *
 * The API returns `images: [{ id, image, is_primary, display_order }]` — an
 * absolute URL per row, with one flagged primary. Two callers need the same
 * answer (the variants list and the product drawer's Variants tab), so the rule
 * lives here rather than being re-derived by each.
 *
 * The URL is kept **intact**, unlike the write payload's `images`, which is
 * normalised back to media-root relative paths because the serializer rejects a
 * full URL. Normalising here would only break the `<img>`.
 */

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** The URL off one image row, whichever key it uses. `""` when there is none. */
function urlOf(row: unknown): string {
  if (typeof row === "string") return row.trim();
  for (const key of ["image", "image_url", "url"]) {
    const found = getProp(row, key);
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return "";
}

/**
 * Absolute URL of the primary image, falling back to the first listed. `""`
 * when the variant carries none — the caller renders its placeholder.
 */
export function primaryImageUrl(value: unknown): string {
  const rows = Array.isArray(value) ? value : null;
  if (!rows?.length) return "";
  const primary = rows.find((row) => getProp(row, "is_primary") === true) ?? rows[0];
  return urlOf(primary);
}

/**
 * Every image the variant has, **primary first, then `display_order`** — the
 * order the sailor-facing gallery uses, so an admin reviewing a variant sees
 * what a customer would.
 *
 * `display_order` is compared numerically; a row missing it sorts last rather
 * than as `0`, which would put an unordered image ahead of a deliberate first.
 */
export function allImageUrls(value: unknown): string[] {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((row, index) => {
      const order = Number(getProp(row, "display_order"));
      return {
        url: urlOf(row),
        isPrimary: getProp(row, "is_primary") === true,
        order: Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER,
        index,
      };
    })
    .filter((row) => row.url !== "")
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.order !== b.order) return a.order - b.order;
      return a.index - b.index;
    })
    .map((row) => row.url);
}
