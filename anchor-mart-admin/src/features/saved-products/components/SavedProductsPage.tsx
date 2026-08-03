import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { idColumn, textColumn } from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetSavedProductsQuery } from "../api/savedProductApi";
import type { SavedProduct } from "../types/savedProduct.types";

const M = MESSAGES.SAVED_PRODUCTS;

const LIMIT = 10;

/**
 * `is_active` is parsed loosely server-side (`true`/`1`/`yes`/`t`, and their
 * negatives) but anything else is a 400 — so only these three states exist here,
 * with "" meaning "don't send the filter at all".
 */
const ACTIVE_OPTIONS = [
  { value: "all", label: M.ALL_ACTIVE },
  { value: "true", label: M.ACTIVE_ONLY },
  { value: "false", label: M.INACTIVE_ONLY },
];

/**
 * Flow 29c §5 — saved / wishlisted products.
 *
 * Read-only: a wishlist belongs to the sailor who made it, so there is nothing
 * to edit here. It reads as a demand signal — which products sailors are
 * watching — rather than as catalog administration.
 */
export function SavedProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const activeRaw = searchParams.get("is_active") ?? "all";
  const isActive = ACTIVE_OPTIONS.some((o) => o.value === activeRaw) ? activeRaw : "all";

  const { data, isLoading, isFetching, isError, refetch } = useGetSavedProductsQuery({
    page,
    limit: LIMIT,
    search,
    isActive: isActive !== "all" ? isActive : undefined,
  });

  const rows = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const columns: Column<SavedProduct>[] = [
    {
      id: "product",
      header: M.COLUMNS.PRODUCT,
      // The API returns a resolved image URL, but only when the product has one
      // — fall back to an initial rather than a broken <img>.
      cell: (r) => (
        <div className="flex items-center gap-2">
          {r.image ? (
            <div className="av av-sm av-img">
              <img src={r.image} alt={r.productName} loading="lazy" />
            </div>
          ) : (
            <div className="av av-sm av-navy">{r.productName.charAt(0)}</div>
          )}
          <span className="td-p">{r.productName}</span>
        </div>
      ),
    },
    textColumn({ id: "sailor", header: M.COLUMNS.SAILOR, get: (r) => r.userName }),
    idColumn({ id: "product-id", header: M.COLUMNS.PRODUCT_ID, get: (r) => r.productId }),
    textColumn({
      id: "saved",
      header: M.COLUMNS.SAVED,
      get: (r) => r.createdAt,
      className: "td-m",
    }),
    textColumn({
      id: "updated",
      header: M.COLUMNS.UPDATED,
      get: (r) => r.updatedAt,
      className: "td-m",
    }),
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        subtitle={M.SUBTITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "is_active",
                value: isActive,
                placeholder: M.ALL_ACTIVE,
                options: ACTIVE_OPTIONS,
                width: "170px",
                onValueChange: (val) => setParam("is_active", val),
              },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY}
        hasActiveFilters={!!search || isActive !== "all"}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
      />
    </div>
  );
}

export default SavedProductsPage;
