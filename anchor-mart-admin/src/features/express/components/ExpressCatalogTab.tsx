import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SearchFilters } from "@/components/common/SearchFilters";
import { TableActions } from "@/components/common/TableActions";
import { Thumbnail } from "@/components/common/Thumbnail";
import { idColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useSetVariantExpressMutation } from "@/features/variants";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconBolt, IconBoltOff, IconPackage } from "@tabler/icons-react";
import { useEffect, useState } from "react";
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
  /**
   * Only phrases the API actually recognises are forwarded.
   *
   * An unrecognised sort value is **silently ignored** — no 400 — and the list
   * falls back to `-created_at`. So a stale bookmark carrying `price_asc` would
   * show a sort selection in the toolbar while the rows ignored it, which is
   * worse than not sorting. Anything unknown is dropped here so the toolbar and
   * the rows agree.
   */
  if (!SORT_OPTIONS.some((o) => o.value === `${kind}:${phrase}`)) return {};
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

/**
 * The variant's own express flag — the filter this tab most needed and did not
 * have. `false` isolates variants of express products that nobody has flagged,
 * which is precisely the set no sailor can see: the actionable worklist for a
 * screen whose job is enabling express.
 */
const EXPRESS_OPTIONS = [
  { value: "", label: M.FILTERS.EXPRESS_ALL },
  { value: "true", label: M.FILTERS.EXPRESS_YES },
  { value: "false", label: M.FILTERS.EXPRESS_NO },
];

export interface ExpressCatalogTabProps {
  page: number;
  search: string;
  sort: string;
  sourceable: string;
  active: string;
  /** The variant's own express flag: "" | "true" | "false". */
  express: string;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onSourceableChange: (value: string) => void;
  onActiveChange: (value: string) => void;
  onExpressChange: (value: string) => void;
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
  express,
  onPageChange,
  onSearchChange,
  onSortChange,
  onSourceableChange,
  onActiveChange,
  onExpressChange,
}: ExpressCatalogTabProps) {
  const sortParams = splitSort(sort);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetExpressCatalogQuery({
    page,
    limit: LIMIT,
    search,
    adminSourceable: sourceable,
    isActive: active,
    isExpress: express,
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
   * A page past the end is a **404**, not an empty page — the same
   * `CustomPagination` as every other catalog list, so the same recovery. Most
   * reachable here of anywhere: flagging the last unflagged variant while
   * filtered to "not flagged express" empties the page you are standing on.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  useEffect(() => {
    if (isPageOutOfRange && page !== 1) onPageChange(1);
  }, [isPageOutOfRange, page, onPageChange]);

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
      /**
       * The mutation is typed, so no cast: it returns the message, the resulting
       * flag, the product's resulting catalog **and** whether this call is what
       * moved it. The old inline `as { product_catalog_type?: string }` hid the
       * last of those, so the toast announced a catalog move on every toggle —
       * including the majority that move nothing, because the product was
       * already on the express shelf with other flagged variants.
       */
      const res = await setExpress({ id: expressTarget.id, isExpress: next }).unwrap();
      toast.success(
        res.productCascaded
          ? M.EXPRESS_TOGGLE.DONE(expressTarget.sku, next, res.productCatalogType ?? "")
          : M.EXPRESS_TOGGLE.DONE_NO_MOVE(expressTarget.sku, next),
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
          <Thumbnail
            src={r.imageUrl}
            alt={M.IMAGE_ALT}
            placeholder={<IconPackage size={16} />}
            className="h-8 w-8"
          />
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
      id: "visibility",
      header: M.COLUMNS.VISIBILITY,
      headerClassName: "whitespace-nowrap",
      /**
       * **The answer this screen exists to give.** Everything else here reports
       * a flag; this reports the consequence — whether a sailor can find the
       * item at all.
       *
       * Server-computed, and deliberately not derived here: three of its inputs
       * are not on this payload, so any client-side rule would be confidently
       * wrong. The blockers are listed rather than summarised because each one
       * has a different fix, and an unmapped key is printed raw — the contract
       * is add-only, so a new blocker should look unpolished, never absent.
       *
       * Visible-but-not-orderable is its own state: sourcing switched off leaves
       * an item browsable with an unavailable badge, so it is not a blocker.
       */
      cell: (r) => {
        if (!r.isSailorVisible) {
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="danger" className="w-fit">
                {M.NOT_VISIBLE}
              </Badge>
              {r.visibilityBlockers.length > 0 && (
                <span className="td-m">
                  {r.visibilityBlockers.map((b) => M.VISIBILITY_BLOCKER[b] ?? b).join(" · ")}
                </span>
              )}
            </div>
          );
        }
        return (
          <Badge variant={r.isSailorOrderable ? "success" : "warning"} className="w-fit">
            {r.isSailorOrderable ? M.VISIBLE : M.NOT_ORDERABLE}
          </Badge>
        );
      },
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
              id: "express",
              value: express,
              placeholder: M.FILTERS.EXPRESS_ALL,
              options: EXPRESS_OPTIONS,
              width: "180px",
              onValueChange: onExpressChange,
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
