/** Query keys that position a list rather than narrow it. */
const NON_FILTER_KEYS = new Set(["page", "page_size", "tab", "id"]);

/**
 * Whether the URL narrows the list — so an empty table can say "no X match your
 * filters" only when that is true, and "no X yet" otherwise (BUG-028). Every
 * list screen keeps its filters in the query string; `"all"` and `""` mean
 * unfiltered.
 */
export function hasActiveFilters(params: URLSearchParams): boolean {
  for (const [key, value] of params) {
    if (NON_FILTER_KEYS.has(key)) continue;
    const v = value.trim();
    if (v && v !== "all") return true;
  }
  return false;
}
