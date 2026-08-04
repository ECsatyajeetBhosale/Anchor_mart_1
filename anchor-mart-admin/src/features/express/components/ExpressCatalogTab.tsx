import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SearchFilters } from "@/components/common/SearchFilters";
import { TableActions } from "@/components/common/TableActions";
import { idColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useSetVariantExpressMutation } from "@/features/variants";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconBolt, IconBoltOff, IconPackage } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetExpressCatalogQuery } from "../api/expressApi";
import type { ExpressItem } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS.CATALOG;
const LIMIT = 10;

/**
 * Sort options. The values are the literal phrases the API validates against —
 * "low to high" / "high to low" for price and popularity, `newest_first` /
 * `oldest_first` for relevance — so they are passed through verbatim, not
 * normalised. Price and popularity share the same two phrases, so the option
 * value carries a prefix naming which query param it belongs to.
 */
const SORT_OPTIONS = [
  { value: "relevance:newest_first", label: M.SORT.NEWEST },
  { value: "relevance:oldest_first", label: M.SORT.OLDEST },
  { value: "price:low to high", label: M.SORT.PRICE_ASC },
  { value: "price:high to low", label: M.SORT.PRICE_DESC },
  { value: "popularity:high to low", label: M.SORT.POPULARITY_DESC },
  { value: "popularity:low to high", label: M.SORT.POPULARITY_ASC },
];

/**
 * Splits `"price:low to high"` into the query param it targets and the literal
 * phrase to send. Unprefixed values are treated as relevance, so an old
 * bookmarked `?sort=newest_first` still resolves instead of silently dropping.
 */
function splitSort(sort: string): { price?: string; popularity?: string; relevance?: string } {
  if (!sort) return {};
  const [kind, phrase] = sort.includes(":") ? sort.split(":") : ["relevance", sort];
  if (kind === "price") return { price: phrase };
  if (kind === "popularity") return { popularity: phrase };
  return { relevance: phrase };
}

/** Effective sourceable — product AND variant, per Flow 09 API 3. */
const SOURCEABLE_OPTIONS = [
  { value: "", label: M.FILTERS.SOURCEABLE_ALL },
  { value: "true", label: M.FILTERS.SOURCEABLE_YES },
  { value: "false", label: M.FILTERS.SOURCEABLE_NO },
];

const ACTIVE_OPTIONS = [
  { value: "", label: M.FILTERS.ACTIVE_ALL },
  { value: "true", label: M.FILTERS.ACTIVE_YES },
  { value: "false", label: M.FILTERS.ACTIVE_NO },
];

export interface ExpressCatalogTabProps {
  page: number;
  search: string;
  sort: string;
  sourceable: string;
  active: string;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onSourceableChange: (value: string) => void;
  onActiveChange: (value: string) => void;
}

/**
 * The express **variant** catalog (Flow 09 API 3) — what sailors can actually
 * buy on the express surface, as opposed to the orders they have already placed.
 */
export function ExpressCatalogTab({
  page,
  search,
  sort,
  sourceable,
  active,
  onPageChange,
  onSearchChange,
  onSortChange,
  onSourceableChange,
  onActiveChange,
}: ExpressCatalogTabProps) {
  const sortParams = splitSort(sort);

  const { data, isLoading, isFetching, isError, refetch } = useGetExpressCatalogQuery({
    page,
    limit: LIMIT,
    search,
    adminSourceable: sourceable,
    isActive: active,
    sortByPrice: sortParams.price,
    sortByPopularity: sortParams.popularity,
    sortByRelevance: sortParams.relevance,
  });

  // Flow 29a §6 — the variant-level express switch. Confirmed rather than
  // toggled inline because it cascades to the parent product (see the dialog).
  const [setExpress, { isLoading: isTogglingExpress }] = useSetVariantExpressMutation();
  const [expressTarget, setExpressTarget] = useState<ExpressItem | null>(null);

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  /**
   * Flip the variant's express flag. The cascade is the reason this confirms:
   * turning it **on** moves the parent product into the express catalog if it
   * isn't already there, and turning off the **last** express variant moves the
   * product back out — to `marine_emergency` or `regular`, derived from its
   * category. The response reports where the product landed, so the toast says
   * so rather than leaving the admin to re-read the list.
   */
  const confirmExpressToggle = async () => {
    if (!expressTarget) return;
    const next = !expressTarget.isExpress;
    try {
      const res = (await setExpress({ id: expressTarget.id, isExpress: next }).unwrap()) as {
        product_catalog_type?: string;
      };
      toast.success(
        M.EXPRESS_TOGGLE.DONE(expressTarget.sku, next, res?.product_catalog_type ?? ""),
      );
      setExpressTarget(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.EXPRESS_TOGGLE.FAILED);
    }
  };

  const columns: Column<ExpressItem>[] = [
    {
      id: "name",
      header: M.COLUMNS.PRODUCT,
      // The endpoint returns a full `images` array with a primary flag; the
      // Category column this replaces was permanently "-", since the express
      // variant serializer carries no category at all (express products use
      // general-scope categories — there is no express category bucket).
      cell: (r) => (
        <div className="flex aic g8">
          {r.imageUrl ? (
            <img src={r.imageUrl} alt={M.IMAGE_ALT} className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="prod-thumb h-8 w-8">
              <IconPackage size={16} />
            </div>
          )}
          <span
            className="trunc block max-w-[200px] text-[12.5px] font-medium"
            title={r.about || r.name}
          >
            {r.name}
          </span>
        </div>
      ),
    },
    idColumn({ id: "sku", header: M.COLUMNS.SKU, get: (r) => r.sku }),
    truncatedColumn({ id: "attributes", header: M.COLUMNS.ATTRIBUTES, get: (r) => r.attributes }),
    textColumn({ id: "price", header: M.COLUMNS.PRICE, get: (r) => r.price, className: "td-p" }),
    {
      id: "express",
      header: M.COLUMNS.EXPRESS,
      cell: (r) => (
        <Badge
          variant={r.isExpress ? "success" : "neutral"}
          title={r.isExpress ? undefined : M.EXPRESS_OFF_HINT}
        >
          {r.isExpress ? M.EXPRESS_ON : M.EXPRESS_OFF}
        </Badge>
      ),
    },
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
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      // Previously the express desk could see a "Product only" row but had to
      // leave for Products → the parent product → its variants drawer to fix it.
      cell: (r) => (
        <TableActions
          row={r}
          actions={[
            {
              icon: r.isExpress ? <IconBoltOff size={16} /> : <IconBolt size={16} />,
              title: r.isExpress ? M.EXPRESS_TOGGLE.OFF : M.EXPRESS_TOGGLE.ON,
              onClick: (e, row) => {
                e.stopPropagation();
                setExpressTarget(row);
              },
            },
          ]}
        />
      ),
      className: "w-16 text-right",
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
              id: "sourceable",
              value: sourceable,
              placeholder: M.FILTERS.SOURCEABLE_ALL,
              options: SOURCEABLE_OPTIONS,
              width: "175px",
              onValueChange: onSourceableChange,
            },
            {
              id: "active",
              value: active,
              placeholder: M.FILTERS.ACTIVE_ALL,
              options: ACTIVE_OPTIONS,
              width: "150px",
              onValueChange: onActiveChange,
            },
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

      {/* Flow 29a §6 — the cascade is spelled out because a variant-level
          switch here can move the parent product between catalogs. */}
      <ConfirmDialog
        isOpen={!!expressTarget}
        onClose={() => setExpressTarget(null)}
        onConfirm={confirmExpressToggle}
        title={expressTarget?.isExpress ? M.EXPRESS_TOGGLE.OFF_TITLE : M.EXPRESS_TOGGLE.ON_TITLE}
        description={
          expressTarget?.isExpress
            ? M.EXPRESS_TOGGLE.OFF_DESCRIPTION(expressTarget?.sku ?? "")
            : M.EXPRESS_TOGGLE.ON_DESCRIPTION(expressTarget?.sku ?? "")
        }
        confirmText={expressTarget?.isExpress ? M.EXPRESS_TOGGLE.OFF : M.EXPRESS_TOGGLE.ON}
        loadingText={M.EXPRESS_TOGGLE.SAVING}
        isLoading={isTogglingExpress}
      />
    </>
  );
}

export default ExpressCatalogTab;
