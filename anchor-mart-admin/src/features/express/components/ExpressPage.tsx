import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { useGetCategoriesQuery } from "@/features/catalog";
import { ProductFormModal } from "@/features/products";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { IconBolt, IconPackage, IconPlus, IconStack2 } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetExpressStatsQuery } from "../api/expressApi";
import { ExpressItemsTab } from "./ExpressItemsTab";
import { ExpressProductsTab } from "./ExpressProductsTab";

const M = MESSAGES.EXPRESS;
const C = MESSAGES.EXPRESS.CATALOG;

const TAB_PRODUCTS = "products";
const TAB_ITEMS = "items";

/**
 * Sort options for the items tab. The values are the literal phrases the API
 * validates against, prefixed with the query param they belong to because price
 * and popularity share the same two phrases.
 */
const SORT_OPTIONS = [
  { value: "relevance:newest_first", label: C.SORT.NEWEST },
  { value: "relevance:oldest_first", label: C.SORT.OLDEST },
  { value: "price:low to high", label: C.SORT.PRICE_ASC },
  { value: "price:high to low", label: C.SORT.PRICE_DESC },
  { value: "popularity:high to low", label: C.SORT.POPULARITY_DESC },
  { value: "popularity:low to high", label: C.SORT.POPULARITY_ASC },
];

/** Thousands-separated count; `undefined` degrades to 0, not a blank card. */
function count(value: number | undefined): string {
  return (value ?? 0).toLocaleString();
}

/**
 * The express catalog, at both grains.
 *
 * **Products** leads, because that is the unit the rest of Catalog works in and
 * the unit an admin thinks in. **Items** is the SKU view underneath it: the only
 * surface that can show a variant of an express product that nobody has flagged
 * — which is precisely the set no sailor can see, so it cannot be folded away.
 *
 * The two tabs are the same catalog seen at two grains, not two screens: one
 * page header, one set of KPI cards, one URL.
 */
export function ExpressPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  /**
   * The add flow lives here rather than in the tab, because the button that
   * opens it sits in this page header. The tab keeps its own modal for edit —
   * the two are never open together.
   */
  const [isAddOpen, setIsAddOpen] = useState(false);
  /**
   * The Products tab's own row count, reported up from the list.
   *
   * The card used to read `stats.items.total_products`, which counts the
   * distinct products of the filtered **variant** rows — so it tracks the Items
   * tab, and a product created without a SKU is missing from it while sitting
   * right there in the products table. Sourcing it from the list is right by
   * construction: that count already reflects this tab's own filter bar.
   */
  const [productsCount, setProductsCount] = useState<number | undefined>(undefined);
  // Creating a product is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  const tab = searchParams.get("tab") === TAB_ITEMS ? TAB_ITEMS : TAB_PRODUCTS;
  const isItems = tab === TAB_ITEMS;

  // Shared by both tabs — the same `?search=` param, sent to whichever list is
  // showing. Both accept it, so switching tabs keeps the search term meaningful.
  const search = searchParams.get("search") ?? "";
  // Products tab
  const categoryFilter = searchParams.get("category") ?? "all";
  // Items tab
  const sort = searchParams.get("sort") ?? "";
  const sourceable = searchParams.get("sourceable") ?? "";
  const active = searchParams.get("active") ?? "";
  const express = searchParams.get("express") ?? "";

  // Stable, so the tab's effect does not re-fire on every parent render.
  const handleProductsCount = useCallback((n: number) => setProductsCount(n), []);

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

  /**
   * Switching tabs drops the other tab's filters and returns to page 1.
   *
   * They are different vocabularies over different units — a `?sourceable=`
   * meant for variants would silently narrow the product list too, and a
   * `?category=` means nothing to the items endpoint. Only `search` survives,
   * because both lists take it and mean the same thing by it.
   */
  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    next.set("page", "1");
    for (const key of ["category", "status", "sort", "sourceable", "active", "express"]) {
      next.delete(key);
    }
    setSearchParams(next);
  };

  /** Express products use **general-scope** categories — there is no express bucket. */
  const { data: categoriesData } = useGetCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE },
    { skip: isItems },
  );
  const categoryOptions = [
    { value: "all", label: MESSAGES.PRODUCTS.ALL_CATEGORIES },
    ...(categoriesData?.results?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  /**
   * One stats call for both tabs.
   *
   * `express/stats/` takes the **items** filter set, so the cards narrow with
   * the items table. On the products tab only `search` is passed.
   *
   * ⚠️ The products bar's filters are deliberately **not** forwarded, even
   * though most share a name. Two of them mean different things on the two
   * sides: `is_express` is the legacy "the product is express" alias on the
   * product list but the SKU's own flag here, and the products bar's
   * `sourceable` is the product master while `admin_sourceable` here is the
   * effective product-AND-variant rule. Passing either would silently narrow the
   * variant cards to a different population than the one the operator filtered.
   */
  const { data: stats, isLoading: statsLoading } = useGetExpressStatsQuery(
    isItems
      ? { search, adminSourceable: sourceable, isActive: active, isExpress: express }
      : { search },
  );
  const items = stats?.items;

  const statItems = [
    {
      id: "products",
      label: M.STATS.PRODUCTS,
      /**
       * Products **represented in the filtered variant table**, so this is
       * bounded by the Variants card beside it — an express product with no live
       * variant is absent from both. The unbounded figure is the row count on
       * the Products tab, which comes from `express/products/`.
       */
      value: isItems
        ? statsLoading
          ? M.DASH
          : count(items?.total_products)
        : productsCount === undefined
          ? M.DASH
          : count(productsCount),
      icon: <IconPackage size={19} />,
      variant: "navy" as const,
    },
    {
      id: "variants",
      label: M.STATS.VARIANTS,
      value: statsLoading ? M.DASH : count(items?.total_variants),
      icon: <IconStack2 size={19} />,
      variant: "purple" as const,
    },
    {
      id: "sourceable",
      label: M.STATS.SOURCEABLE,
      value: statsLoading ? M.DASH : count(items?.sourceable_variants),
      icon: <IconBolt size={19} />,
      variant: "teal" as const,
    },
  ];

  /**
   * The toolbar belongs to whichever tab is showing — the two take different
   * filters over different units, so there is no shared set to hoist. Both keep
   * it in the page header, so the layout does not shift when you switch.
   */
  const filters = isItems
    ? [
        {
          id: "sort",
          value: sort,
          placeholder: C.SORT_PLACEHOLDER,
          options: SORT_OPTIONS,
          width: "190px",
          onValueChange: (val: string) => setFilterParam("sort", val),
        },
      ]
    : [
        {
          id: "category",
          value: categoryFilter,
          placeholder: MESSAGES.PRODUCTS.ALL_CATEGORIES,
          options: categoryOptions,
          width: "160px",
          // Says "not filtering" with "all", not "" — without this the Reset
          // button would offer itself on a pristine toolbar.
          emptyValue: "all",
          onValueChange: (val: string) => setFilterParam("category", val === "all" ? "" : val),
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
            searchPlaceholder={
              isItems ? C.SEARCH_PLACEHOLDER : MESSAGES.PRODUCTS.SEARCH_PLACEHOLDER
            }
            searchDebounceMs={isItems ? 300 : 180}
            filters={filters}
          >
            {/* Products only — "add" has no meaning on the variant tab, where a
                SKU is created from inside its parent product. */}
            {!isItems && canManageCatalog && (
              <button type="button" className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
                <IconPlus size={16} />
                {MESSAGES.PRODUCTS.ADD_PRODUCT}
              </button>
            )}
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} className="cols-4" />

      <DynamicTabs
        value={tab}
        onTabChange={handleTabChange}
        tabs={[
          {
            value: TAB_PRODUCTS,
            label: M.TABS.PRODUCTS,
            content: <ExpressProductsTab onCountChange={handleProductsCount} />,
          },
          { value: TAB_ITEMS, label: M.TABS.ITEMS, content: <ExpressItemsTab /> },
        ]}
      />

      {/*
        The shared add form, opened onto the express catalog.

        `catalog_type` is a **default, not a lock** — the picker stays editable,
        because the endpoint is `products/add-product/` either way and refusing a
        regular product here would be a rule the backend does not have. Express
        products use the general category set, so the form's category picker
        needs no change.
      */}
      <ProductFormModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        product={null}
        catalogType="express"
      />
    </>
  );
}
