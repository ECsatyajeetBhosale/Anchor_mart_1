import { SearchFilters } from "@/components/common/SearchFilters";
import { idColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetExpressCatalogQuery } from "../api/expressApi";
import type { ExpressItem } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS.CATALOG;
const LIMIT = 10;

/**
 * Sort options. The values are the literal phrases the API validates against —
 * "low to high" / "high to low" for price, `newest_first` / `oldest_first` for
 * relevance — so they are passed through verbatim, not normalised.
 */
const SORT_OPTIONS = [
  { value: "newest_first", label: M.SORT.NEWEST },
  { value: "oldest_first", label: M.SORT.OLDEST },
  { value: "low to high", label: M.SORT.PRICE_ASC },
  { value: "high to low", label: M.SORT.PRICE_DESC },
];

/** Price sorts and relevance sorts go to different query params. */
const PRICE_SORTS = new Set(["low to high", "high to low"]);

export interface ExpressCatalogTabProps {
  page: number;
  search: string;
  sort: string;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}

/**
 * The express **variant** catalog (Flow 09 API 3) — what sailors can actually
 * buy on the express surface, as opposed to the orders they have already placed.
 */
export function ExpressCatalogTab({
  page,
  search,
  sort,
  onPageChange,
  onSearchChange,
  onSortChange,
}: ExpressCatalogTabProps) {
  const isPriceSort = PRICE_SORTS.has(sort);

  const { data, isLoading, isFetching, isError, refetch } = useGetExpressCatalogQuery({
    page,
    limit: LIMIT,
    search,
    sortByPrice: isPriceSort ? sort : undefined,
    sortByRelevance: !isPriceSort && sort ? sort : undefined,
  });

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const columns: Column<ExpressItem>[] = [
    textColumn({ id: "name", header: M.COLUMNS.PRODUCT, get: (r) => r.name }),
    idColumn({ id: "sku", header: M.COLUMNS.SKU, get: (r) => r.sku }),
    textColumn({ id: "category", header: M.COLUMNS.CATEGORY, get: (r) => r.category }),
    truncatedColumn({ id: "attributes", header: M.COLUMNS.ATTRIBUTES, get: (r) => r.attributes }),
    textColumn({ id: "price", header: M.COLUMNS.PRICE, get: (r) => r.price, className: "td-p" }),
    {
      id: "sourceable",
      header: M.COLUMNS.SOURCEABLE,
      cell: (r) => (
        <Badge variant={r.adminSourceable ? "success" : "danger"}>
          {r.adminSourceable ? M.YES : M.NO}
        </Badge>
      ),
    },
    {
      id: "active",
      header: M.COLUMNS.ACTIVE,
      cell: (r) => (
        <Badge variant={r.isActive ? "success" : "neutral"}>
          {r.isActive ? M.ACTIVE : M.INACTIVE}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SearchFilters
          searchValue={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={M.SEARCH_PLACEHOLDER}
          searchDebounceMs={300}
          searchLoading={isFetching}
          filters={[
            {
              id: "sort",
              value: sort,
              placeholder: M.SORT_PLACEHOLDER,
              options: SORT_OPTIONS,
              width: "190px",
              onValueChange: onSortChange,
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={onPageChange}
        showPagination
        emptyMessage={M.EMPTY}
      />
    </>
  );
}

export default ExpressCatalogTab;
