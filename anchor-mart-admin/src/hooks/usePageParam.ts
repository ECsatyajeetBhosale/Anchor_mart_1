import { getApiStatus } from "@/lib/apiError";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/** `?page=` as a page number; junk, `0` or a missing value reads as page 1. */
export function pageFromParams(params: URLSearchParams): number {
  const n = Number.parseInt(params.get("page") ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * Sends a list back to page 1 when the backend answers its page with a 404.
 *
 * DRF's paginator rejects a page past the end with `{"detail": "Invalid page."}`
 * rather than returning an empty one, and `DataTable` hides the pager on error —
 * so deleting the last row on the last page, or narrowing a filter that keeps
 * the page, left a Retry that repeated the same doomed request forever.
 */
export function useFirstPageOnOutOfRange(error: unknown, page: number, toFirstPage: () => void) {
  const outOfRange = page > 1 && getApiStatus(error) === 404;
  const toFirstPageRef = useRef(toFirstPage);
  toFirstPageRef.current = toFirstPage;
  useEffect(() => {
    if (outOfRange) toFirstPageRef.current();
  }, [outOfRange]);
}

/** {@link useFirstPageOnOutOfRange} for the lists that keep `?page=` in the URL. */
export function useUrlPageReset(error: unknown, page: number) {
  const [, setSearchParams] = useSearchParams();
  useFirstPageOnOutOfRange(error, page, () =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", "1");
        return next;
      },
      { replace: true },
    ),
  );
}
