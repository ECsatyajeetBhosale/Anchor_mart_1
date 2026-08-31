import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { useGetCategoriesQuery } from "@/features/catalog";
import { ProductFormModal } from "@/features/products";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { statText, statsError, statsState } from "@/lib/stats";
import { IconBolt, IconPackage, IconPlus, IconStack2 } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetExpressStatsQuery } from "../api/expressApi";
import { ExpressProductsTab } from "./ExpressProductsTab";

const M = MESSAGES.EXPRESS;

/**
 * The express catalog, at product grain.
 *
 * This used to be two tabs — Products and Items, the same catalog at two grains
 * — and the Items (SKU) tab has been removed. With one grain left there is no
 * tab strip: a single tab is chrome that names the only thing on screen.
 *
 * `ExpressItemsTab` is still in the folder, unreferenced, so the view can be
 * restored without rebuilding it. What has to come back with it: the `?tab=`
 * key, the sort/sourceable/active/express URL params it filtered on, and the
 * items branch of the stats call — `express/stats/` takes the **items** filter
 * set, and the page now only ever sends `search`.
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

  const search = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";

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

  /** Express products use **general-scope** categories — there is no express bucket. */
  const { data: categoriesData } = useGetCategoriesQuery({ limit: API_MAX_PAGE_SIZE });
  const categoryOptions = [
    { value: "all", label: MESSAGES.PRODUCTS.ALL_CATEGORIES },
    ...(categoriesData?.results?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  /**
   * Only `search` is sent, and that is deliberate rather than a leftover.
   *
   * `express/stats/` takes the **items** filter set, and the products bar's
   * filters are not forwarded even though most share a name: `is_express` is
   * the legacy "the product is express" alias on the product list but the SKU's
   * own flag here, and the bar's `sourceable` is the product master while
   * `admin_sourceable` here is the effective product-AND-variant rule. Passing
   * either would narrow the cards to a different population than the one the
   * operator filtered.
   */
  const statsQuery = useGetExpressStatsQuery({ search });
  // The `items` half only — catalog counts. The `orders` half of this payload
  // belongs to the Express Orders screen and is never mixed in here.
  const items = statsQuery.data?.items;
  // Loading / error / ready, so a failed request reads as "unknown" rather than
  // as an empty catalog. See `lib/stats.ts`.
  const cardsState = statsState(statsQuery);

  const statItems = [
    {
      id: "products",
      label: M.STATS.PRODUCTS,
      /**
       * The list's own row count, not `items.total_products`.
       *
       * That figure counts the distinct products of the filtered **variant**
       * rows, so a product created without a SKU is missing from it while
       * sitting right there in the table. Sourcing it from the list is right by
       * construction, and carries its own loading state because it does not
       * arrive with the rest of this payload.
       */
      value: statText(productsCount === undefined ? "loading" : "ready", productsCount),
      icon: <IconPackage size={19} />,
      variant: "navy" as const,
    },
    {
      id: "variants",
      label: M.STATS.VARIANTS,
      value: statText(cardsState, items?.total_variants),
      icon: <IconStack2 size={19} />,
      variant: "purple" as const,
    },
    {
      id: "sourceable",
      label: M.STATS.SOURCEABLE,
      value: statText(cardsState, items?.sourceable_variants),
      icon: <IconBolt size={19} />,
      variant: "teal" as const,
    },
  ];

  const filters = [
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
            searchPlaceholder={MESSAGES.PRODUCTS.SEARCH_PLACEHOLDER}
            searchDebounceMs={180}
            filters={filters}
          >
            {canManageCatalog && (
              <button type="button" className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
                <IconPlus size={16} />
                {MESSAGES.PRODUCTS.ADD_PRODUCT}
              </button>
            )}
          </SearchFilters>
        }
      />

      <StatsGrid
        items={statItems}
        className="cols-4"
        error={statsError(cardsState)}
        onRetry={statsQuery.refetch}
      />

      {/* Rendered directly rather than as the sole tab of a `DynamicTabs`: with
          Items gone there is one grain left, and a tab strip with a single tab
          labels the only thing on screen and offers nowhere to go. */}
      <ExpressProductsTab onCountChange={handleProductsCount} />

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
