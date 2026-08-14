import { useEffect, useState } from "react";

import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { useGetAllProductsQuery } from "../api/productApi";

export interface ProductPickerOption {
  value: string;
  label: string;
  /** `catalog_type` — regular / express / marine_emergency. */
  catalogType?: string;
}

/**
 * The whole-catalog product picker, shared by every screen that has to choose
 * one product out of all of them.
 *
 * It reads **`get-all-products/`**, not `get-products/`. That distinction is the
 * reason this hook exists: the latter serves the *general* catalog only, so the
 * 14 marine-emergency products are absent from a perfectly ordinary 200 and
 * cannot be selected at all. Every picker that used it was quietly missing a
 * third of the catalog.
 *
 * **Paging is not optional.** `CustomPagination` caps a page at 50 and silently
 * ignores a larger `limit`, so a picker that asks for "everything" gets 50 rows
 * and no indication there are more. Pages accumulate here so "Load more"
 * extends the list; a new search term or type filter starts a fresh one,
 * because the accumulated pages belong to the previous query.
 *
 * Search and the catalog-type filter both run **server-side** — filtering a
 * capped page in the browser looks like it works while still hiding everything
 * past the cap.
 */
export function useProductPicker(enabled = true) {
  const [search, setSearchTerm] = useState("");
  /** Narrows to one catalog type; `""` is all three. */
  const [catalogType, setCatalogTypeValue] = useState("");
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<ProductPickerOption[]>([]);

  const { data, isFetching } = useGetAllProductsQuery(
    {
      page,
      limit: API_MAX_PAGE_SIZE,
      search: search || undefined,
      catalogType: catalogType || undefined,
    },
    { skip: !enabled },
  );

  const rows = data?.results?.data;
  useEffect(() => {
    if (!rows) return;
    const mapped = rows.map((p) => ({
      value: p.id,
      label: p.name,
      catalogType: p.catalog_type,
    }));
    setLoaded((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
  }, [rows, page]);

  /** A new term starts a fresh list rather than appending to the old results. */
  const setSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  /** Same for a type change — the accumulated pages belong to the old filter. */
  const setCatalogType = (value: string) => {
    setCatalogTypeValue(value);
    setPage(1);
  };

  // `count` is on the envelope, not on `results` — `results` is the
  // `{ message, data }` wrapper this backend nests its rows in.
  const totalCount = data?.count ?? 0;

  return {
    options: loaded,
    isFetching,
    search,
    setSearch,
    catalogType,
    setCatalogType,
    hasMore: loaded.length < totalCount,
    loadMore: () => setPage((p) => p + 1),
  };
}
