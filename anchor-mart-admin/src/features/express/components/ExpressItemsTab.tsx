import { TableActions } from "@/components/common/TableActions";
import { Thumbnail } from "@/components/common/Thumbnail";
import { textColumn, truncatedColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { SetVariantExpressDialog } from "@/features/variants";
import { getApiStatus } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconBolt, IconBoltOff, IconPackage, IconPencil } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetExpressCatalogQuery } from "../api/expressApi";
import type { ExpressItem } from "../types/expressItem.types";

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

/**
 * The three boolean filters live on their own column headers, not in the
 * toolbar — each one narrows exactly the column it sits above, so the control
 * belongs there. `ColumnFilterHeader` prepends its own "all" entry from
 * `allLabel`, which is why none of these lists carries one.
 */

/** Effective sourceable — product AND variant, per Flow 09 API 3. */
const SOURCEABLE_OPTIONS = [
  { value: "true", label: C.FILTERS.SOURCEABLE_YES },
  { value: "false", label: C.FILTERS.SOURCEABLE_NO },
];

const ACTIVE_OPTIONS = [
  { value: "true", label: C.FILTERS.ACTIVE_YES },
  { value: "false", label: C.FILTERS.ACTIVE_NO },
];

/**
 * The variant's own express flag. `false` isolates variants of express products
 * that nobody has flagged, which is precisely the set no sailor can see: the
 * actionable worklist for a screen whose job is enabling express.
 */
const EXPRESS_OPTIONS = [
  { value: "true", label: C.FILTERS.EXPRESS_YES },
  { value: "false", label: C.FILTERS.EXPRESS_NO },
];

/**
 * The express **variant** catalog (Flow 09 API 3) — the SKU-level view beneath
 * Express Products.
 *
 * It is the only surface that can show an *unflagged* variant of an express
 * product, which is exactly the set no sailor can see — so it stays the flagging
 * screen even though the product list now sits above it.
 *
 * Reads its filters straight from the URL: the toolbar lives in the parent's
 * page header (matching Products) and writes the same params this reads.
 */
export function ExpressItemsTab() {
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

  const { data, isLoading, isError, error, refetch } = useGetExpressCatalogQuery(
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

  // Flow 29a §6 — the variant-level express switch. Opens a form, not a
  // confirmation: the express price travels with the flag.
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
    {
      id: "sku",
      header: C.COLUMNS.SKU,
      // The primary is the SKU a product-level express-price edit writes to, so
      // it is worth knowing which one you are looking at.
      cell: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="mono text-[12px]">{r.sku}</span>
          {r.isPrimary && (
            <Badge variant="neutral" className="w-fit">
              {C.PRIMARY}
            </Badge>
          )}
        </div>
      ),
    },
    truncatedColumn({ id: "attributes", header: C.COLUMNS.ATTRIBUTES, get: (r) => r.attributes }),
    textColumn({ id: "price", header: C.COLUMNS.PRICE, get: (r) => r.price, className: "td-p" }),
    {
      id: "express",
      header: C.COLUMNS.EXPRESS,
      /**
       * Three states, not two — express became a second price list on
       * 2026-08-18.
       *
       * **Ready** = flagged *and* priced: the only combination a sailor can buy,
       * and the express price is what they are charged. **Pending** = flagged
       * with no price, or on an express product and never flagged: on the shelf,
       * refused by the express cart and again at the till. Collapsing the two
       * into one "Express" badge would call an unsellable SKU sold.
       */
      // Clickable here too, and styled to say so — this is the screen where a
      // pending SKU gets priced, so the badge is the fix as well as the symptom.
      cell: (r) => {
        const isReady = r.isExpress && r.expressPrice !== null;
        return (
          <button
            type="button"
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setExpressTarget(r);
            }}
            title={isReady ? C.EXPRESS_RETITLE : C.EXPRESS_SET_TITLE}
          >
            {isReady ? (
              <span className="tabular-nums font-semibold">
                {C.EXPRESS_PRICE(r.expressPrice ?? 0)}
              </span>
            ) : (
              <Badge variant="warning" title={C.EXPRESS_PENDING_HINT}>
                {C.EXPRESS_PENDING}
              </Badge>
            )}
            <IconPencil size={13} style={{ color: "var(--t4)" }} />
          </button>
        );
      },
      // Server-side, via `?is_express=` — the variant's own flag, not the
      // parent's catalog type. "Product only" is the actionable view.
      filter: {
        value: express,
        options: EXPRESS_OPTIONS,
        onChange: (value) => setFilterParam("express", value),
        allLabel: C.FILTERS.EXPRESS_ALL,
      },
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
      // Filters on the **effective** value (product AND variant), matching what
      // the cell renders — so "No" here means "either flag is off".
      filter: {
        value: sourceable,
        options: SOURCEABLE_OPTIONS,
        onChange: (value) => setFilterParam("sourceable", value),
        allLabel: C.FILTERS.SOURCEABLE_ALL,
      },
    },
    {
      id: "active",
      header: C.COLUMNS.ACTIVE,
      cell: (r) => (
        <Badge variant={r.isActive ? "success" : "neutral"}>
          {r.isActive ? C.ACTIVE : C.INACTIVE}
        </Badge>
      ),
      filter: {
        value: active,
        options: ACTIVE_OPTIONS,
        onChange: (value) => setFilterParam("active", value),
        allLabel: C.FILTERS.ACTIVE_ALL,
      },
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

      {/*
        Flagging a SKU carries its price, so this is a form rather than a
        confirmation — see the dialog. Un-flagging warns that it clears the
        price and may take the product off the express shelf.
      */}
      <SetVariantExpressDialog
        isOpen={!!expressTarget}
        onClose={() => setExpressTarget(null)}
        variant={expressTarget}
      />
    </>
  );
}
