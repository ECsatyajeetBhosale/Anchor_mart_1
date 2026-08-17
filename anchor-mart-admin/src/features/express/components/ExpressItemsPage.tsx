import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TableActions } from "@/components/common/TableActions";
import { Thumbnail } from "@/components/common/Thumbnail";
import { idColumn, textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useSetVariantExpressMutation } from "@/features/variants";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconBolt, IconBoltOff, IconPackage, IconStack2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useGetExpressCatalogQuery, useGetExpressStatsQuery } from "../api/expressApi";
import type { ExpressItem } from "../types/expressItem.types";

const M = MESSAGES.EXPRESS;
const C = MESSAGES.EXPRESS.CATALOG;
const LIMIT = 10;

/**
 * Sort options. The values are the literal phrases the API validates against —
 * "low to high" / "high to low" for price and popularity, `newest_first` /
 * `oldest_first` for relevance — so they are passed through verbatim, not
 * normalised. Price and popularity share the same two phrases, so the option
 * value carries a prefix naming which query param it belongs to.
 */
const SORT_OPTIONS = [
  { value: "relevance:newest_first", label: C.SORT.NEWEST },
  { value: "relevance:oldest_first", label: C.SORT.OLDEST },
  { value: "price:low to high", label: C.SORT.PRICE_ASC },
  { value: "price:high to low", label: C.SORT.PRICE_DESC },
  { value: "popularity:high to low", label: C.SORT.POPULARITY_DESC },
  { value: "popularity:low to high", label: C.SORT.POPULARITY_ASC },
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
  { value: "", label: C.FILTERS.SOURCEABLE_ALL },
  { value: "true", label: C.FILTERS.SOURCEABLE_YES },
  { value: "false", label: C.FILTERS.SOURCEABLE_NO },
];

const ACTIVE_OPTIONS = [
  { value: "", label: C.FILTERS.ACTIVE_ALL },
  { value: "true", label: C.FILTERS.ACTIVE_YES },
  { value: "false", label: C.FILTERS.ACTIVE_NO },
];

/**
 * The variant's own express flag. `false` isolates variants of express products
 * that nobody has flagged, which is precisely the set no sailor can see: the
 * actionable worklist for a screen whose job is enabling express.
 */
const EXPRESS_OPTIONS = [
  { value: "", label: C.FILTERS.EXPRESS_ALL },
  { value: "true", label: C.FILTERS.EXPRESS_YES },
  { value: "false", label: C.FILTERS.EXPRESS_NO },
];

/** Thousands-separated count; `undefined` degrades to 0, not a blank card. */
function count(value: number | undefined): string {
  return (value ?? 0).toLocaleString();
}

/**
 * The express **variant** catalog (Flow 09 API 3) — what sailors can actually
 * buy on the express surface.
 *
 * Laid out like Products and every other catalog screen: filters in the page
 * header beside the title, KPI cards under it, then the table. Express orders
 * used to sit here behind a second tab; they were a second view of records the
 * Orders screen already owns, so this screen answers one question now.
 */
export function ExpressItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const sourceable = searchParams.get("sourceable") ?? "";
  const active = searchParams.get("active") ?? "";
  /** The variant's own express flag: "" | "true" | "false". */
  const express = searchParams.get("express") ?? "";

  const sortParams = splitSort(sort);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetExpressCatalogQuery(
    {
      page,
      limit: LIMIT,
      search,
      adminSourceable: sourceable,
      isActive: active,
      isExpress: express,
      sortByPrice: sortParams.price,
      sortByPopularity: sortParams.popularity,
      sortByRelevance: sortParams.relevance,
    },
    /**
     * Rows here carry server-computed sailor visibility, which depends on
     * product-level state this screen never writes — another admin deactivating
     * the parent changes what these rows should say, with nothing local to
     * invalidate. Re-fetching on mount is the same C8 mitigation the products
     * and spares lists use, for the same reason: a stale answer to "can a sailor
     * see this" is the one answer worth being sure of.
     */
    { refetchOnMountOrArgChange: true },
  );

  const { data: stats, isLoading: statsLoading } = useGetExpressStatsQuery();
  const statsItems = stats?.items;

  // Flow 29a §6 — the variant-level express switch. Confirmed rather than
  // toggled inline because it cascades to the parent product (see the dialog).
  const [setExpress, { isLoading: isTogglingExpress }] = useSetVariantExpressMutation();
  const [expressTarget, setExpressTarget] = useState<ExpressItem | null>(null);

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setFilterParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  };

  /**
   * A page past the end is a **404**, not an empty page — the same
   * `CustomPagination` as every other catalog list, so the same recovery. Most
   * reachable here of anywhere: flagging the last unflagged variant while
   * filtered to "not flagged express" empties the page you are standing on.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  useEffect(() => {
    if (!isPageOutOfRange || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isPageOutOfRange, page, searchParams, setSearchParams]);

  /**
   * **Whole-catalog figures, not the filtered table's.** `express/stats/`
   * deliberately takes no query params, so the cards cannot follow the toolbar
   * below them. The labels say "All …" so unchanged cards over a filtered table
   * read as intended rather than stale.
   */
  const statItems = [
    {
      id: "products",
      label: M.STATS.PRODUCTS,
      value: statsLoading ? M.DASH : count(statsItems?.total_products),
      icon: <IconPackage size={19} />,
      variant: "navy" as const,
    },
    {
      id: "variants",
      label: M.STATS.VARIANTS,
      value: statsLoading ? M.DASH : count(statsItems?.total_variants),
      icon: <IconStack2 size={19} />,
      variant: "purple" as const,
    },
    {
      id: "sourceable",
      label: M.STATS.SOURCEABLE,
      value: statsLoading ? M.DASH : count(statsItems?.sourceable_variants),
      icon: <IconBolt size={19} />,
      variant: "teal" as const,
    },
  ];

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
      const res = await setExpress({ id: expressTarget.id, isExpress: next }).unwrap();
      toast.success(
        res.productCascaded
          ? C.EXPRESS_TOGGLE.DONE(expressTarget.sku, next, res.productCatalogType ?? "")
          : C.EXPRESS_TOGGLE.DONE_NO_MOVE(expressTarget.sku, next),
      );
      setExpressTarget(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? C.EXPRESS_TOGGLE.FAILED);
    }
  };

  const columns: Column<ExpressItem>[] = [
    {
      id: "name",
      header: C.COLUMNS.PRODUCT,
      // The endpoint returns a full `images` array with a primary flag; the
      // Category column this replaces was permanently "-", since the express
      // variant serializer carries no category at all (express products use
      // general-scope categories — there is no express category bucket).
      cell: (r) => (
        <div className="flex aic g8">
          <Thumbnail
            src={r.imageUrl}
            alt={C.IMAGE_ALT}
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
    idColumn({ id: "sku", header: C.COLUMNS.SKU, get: (r) => r.sku }),
    truncatedColumn({ id: "attributes", header: C.COLUMNS.ATTRIBUTES, get: (r) => r.attributes }),
    textColumn({ id: "price", header: C.COLUMNS.PRICE, get: (r) => r.price, className: "td-p" }),
    {
      id: "express",
      header: C.COLUMNS.EXPRESS,
      cell: (r) => (
        <Badge
          variant={r.isExpress ? "success" : "neutral"}
          title={r.isExpress ? undefined : C.EXPRESS_OFF_HINT}
        >
          {r.isExpress ? C.EXPRESS_ON : C.EXPRESS_OFF}
        </Badge>
      ),
    },
    {
      id: "visibility",
      header: C.COLUMNS.VISIBILITY,
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
                {C.NOT_VISIBLE}
              </Badge>
              {r.visibilityBlockers.length > 0 && (
                <span className="td-m">
                  {r.visibilityBlockers.map((b) => C.VISIBILITY_BLOCKER[b] ?? b).join(" · ")}
                </span>
              )}
            </div>
          );
        }
        return (
          <Badge variant={r.isSailorOrderable ? "success" : "warning"} className="w-fit">
            {r.isSailorOrderable ? C.VISIBLE : C.NOT_ORDERABLE}
          </Badge>
        );
      },
    },
    {
      id: "sourceable",
      header: C.COLUMNS.SOURCEABLE,
      cell: (r) => (
        <Badge variant={r.adminSourceable ? "success" : "danger"}>
          {r.adminSourceable ? C.YES : C.NO}
        </Badge>
      ),
    },
    {
      id: "active",
      header: C.COLUMNS.ACTIVE,
      cell: (r) => (
        <Badge variant={r.isActive ? "success" : "neutral"}>
          {r.isActive ? C.ACTIVE : C.INACTIVE}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: C.COLUMNS.ACTIONS,
      // Previously the express desk could see a "Product only" row but had to
      // leave for Products → the parent product → its variants drawer to fix it.
      cell: (r) => (
        <TableActions
          row={r}
          actions={[
            {
              icon: r.isExpress ? <IconBoltOff size={16} /> : <IconBolt size={16} />,
              title: r.isExpress ? C.EXPRESS_TOGGLE.OFF : C.EXPRESS_TOGGLE.ON,
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
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder={C.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "sourceable",
                value: sourceable,
                placeholder: C.FILTERS.SOURCEABLE_ALL,
                options: SOURCEABLE_OPTIONS,
                width: "175px",
                onValueChange: (val) => setFilterParam("sourceable", val),
              },
              {
                id: "active",
                value: active,
                placeholder: C.FILTERS.ACTIVE_ALL,
                options: ACTIVE_OPTIONS,
                width: "150px",
                onValueChange: (val) => setFilterParam("active", val),
              },
              {
                id: "express",
                value: express,
                placeholder: C.FILTERS.EXPRESS_ALL,
                options: EXPRESS_OPTIONS,
                width: "180px",
                onValueChange: (val) => setFilterParam("express", val),
              },
              {
                id: "sort",
                value: sort,
                placeholder: C.SORT_PLACEHOLDER,
                options: SORT_OPTIONS,
                width: "190px",
                onValueChange: (val) => setFilterParam("sort", val),
              },
            ]}
          />
        }
      />

      <StatsGrid items={statItems} className="cols-4" />

      <DataTable
        columns={columns}
        data={items}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? C.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={C.EMPTY}
      />

      {/* Flow 29a §6 — the cascade is spelled out because a variant-level
          switch here can move the parent product between catalogs. */}
      <ConfirmDialog
        isOpen={!!expressTarget}
        onClose={() => setExpressTarget(null)}
        onConfirm={confirmExpressToggle}
        title={expressTarget?.isExpress ? C.EXPRESS_TOGGLE.OFF_TITLE : C.EXPRESS_TOGGLE.ON_TITLE}
        description={
          expressTarget?.isExpress
            ? C.EXPRESS_TOGGLE.OFF_DESCRIPTION(expressTarget?.sku ?? "")
            : C.EXPRESS_TOGGLE.ON_DESCRIPTION(expressTarget?.sku ?? "")
        }
        confirmText={expressTarget?.isExpress ? C.EXPRESS_TOGGLE.OFF : C.EXPRESS_TOGGLE.ON}
        loadingText={C.EXPRESS_TOGGLE.SAVING}
        isLoading={isTogglingExpress}
      />
    </>
  );
}
