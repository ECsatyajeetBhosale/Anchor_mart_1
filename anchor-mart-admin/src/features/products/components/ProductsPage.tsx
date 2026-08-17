import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { useGetCategoriesQuery } from "@/features/catalog";
import { ProductVariantsDrawer } from "@/features/variants";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import {
  IconAlertTriangle,
  IconAnchor,
  IconBolt,
  IconBoxSeam,
  IconCategory,
  IconCategory2,
  IconCircleCheck,
  IconClock,
  IconFlame,
  IconPlus,
  IconStar,
  IconTag,
} from "@tabler/icons-react";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useAnnounceProductAvailabilityMutation,
  useDeleteProductMutation,
  useGetProductStatsQuery,
  useGetProductsQuery,
  useSetProductActiveMutation,
  useSetProductSourceableMutation,
  useSetProductTopRatedMutation,
} from "../api/productApi";
import type { Product } from "../types/product.types";
import { ProductFormModal } from "./ProductFormModal";
import { SetCatalogTypeDialog } from "./SetCatalogTypeDialog";
import { useProductColumns } from "./productColumns";

const productTabs = [
  { label: MESSAGES.PRODUCTS.TABS.ALL, value: "all" },
  { label: MESSAGES.PRODUCTS.TABS.DEAL, value: "deal" },
  { label: MESSAGES.PRODUCTS.TABS.TOP_RATED, value: "top_rated" },
];

const PS = MESSAGES.PRODUCTS.STATS;

/**
 * Catalog scopes this list can serve. `marine_emergency` is deliberately absent:
 * `get-products/` 400s on it, since the emergency catalog has its own endpoint
 * and its own screen.
 */
const catalogOptions = [
  { value: "all", label: MESSAGES.PRODUCTS.ALL_CATALOGS },
  { value: "regular", label: MESSAGES.COMMON.PRODUCT_PICKER.CATALOG_TYPE.regular },
  { value: "express", label: MESSAGES.COMMON.PRODUCT_PICKER.CATALOG_TYPE.express },
];

const LIMIT = 10;

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  // Variant manager, catalog-move dialog and announce confirmation each track
  // the product they were opened for.
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [catalogProduct, setCatalogProduct] = useState<Product | null>(null);
  const [announceProduct, setAnnounceProduct] = useState<Product | null>(null);

  // Creating and deleting a product is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  const [setTopRated] = useSetProductTopRatedMutation();
  const [setSourceable] = useSetProductSourceableMutation();
  const [setActive] = useSetProductActiveMutation();
  const [announceAvailability, { isLoading: isAnnouncing }] =
    useAnnounceProductAvailabilityMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all"; // category id, or "all"
  const catalogFilter = searchParams.get("catalog") ?? ""; // "", "regular", "express"
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  // The "deal"/"top_rated" tabs are server-side filters (on_deal / is_top_rated).
  const onDeal = activeTab === "deal" ? true : undefined;
  const isTopRated = activeTab === "top_rated" ? true : undefined;

  /**
   * All six filters the endpoint offers, in one object.
   *
   * They AND together server-side, and each is a no-op when blank — so "all"
   * is expressed by omitting the key, never by sending an empty string. Bad
   * input is a 400 rather than a silent fallback, which is why the two enum
   * filters are driven by fixed option lists rather than free text.
   */
  const listFilters = {
    search: searchTerm,
    isActive,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    catalogType: catalogFilter || undefined,
    onDeal,
    isTopRated,
  };
  const { data, isLoading, isError, error, refetch } = useGetProductsQuery(
    {
      page,
      limit: LIMIT,
      ...listFilters,
    },
    /**
     * `on_deal` is an EXISTS against a deal's live start/end window, so a row
     * can enter or leave the Deal Products tab with no write to the product and
     * nothing to invalidate the cache. Re-fetching on mount keeps a returning
     * operator from acting on a deal state that expired while they were away.
     */
    { refetchOnMountOrArgChange: true },
  );

  /**
   * KPI counts, given **the table's own filters** — one object, so the cards
   * cannot drift from the list they head.
   *
   * The endpoint took no query params until 2026-08-14: filtering the table to
   * eight express rows left every card showing the unfiltered totals.
   */
  const { data: productStats } = useGetProductStatsQuery(listFilters, {
    // Same live-deal reasoning as the list: the on-deal counts are computed per
    // request, so a cached card can outlive the window it counted.
    refetchOnMountOrArgChange: true,
  });

  // Category options for the filter dropdown (value = id, label = name).
  const { data: categoriesData } = useGetCategoriesQuery({ limit: API_MAX_PAGE_SIZE });
  const categories = categoriesData?.results?.data ?? [];
  const categoryOptions = React.useMemo(
    () => [
      { value: "all", label: MESSAGES.PRODUCTS.ALL_CATEGORIES },
      ...(categoriesData?.results?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categoriesData],
  );

  const productsData: Product[] = data?.results?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  /**
   * A page past the end is a **404**, not an empty page and not a 400.
   *
   * Reachable without doing anything wrong: delete the last row on the last
   * page, or open a bookmarked `?page=4` after the catalog shrank. The table
   * would otherwise show "Failed to fetch products" with a Retry button that
   * retries the same doomed request forever.
   *
   * Recovering to page 1 rather than surfacing the error — the operator asked
   * for a list of products, and page 1 of that list is a truthful answer to it.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  React.useEffect(() => {
    if (!isPageOutOfRange || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isPageOutOfRange, page, searchParams, setSearchParams]);

  // Client-side refinement: a category fallback that still works if the backend
  // ignores the `?category=` filter. (Deal/top-rated are now server-side.)
  const selectedCategoryName = categories.find((c) => c.id === categoryFilter)?.name;
  const filteredProducts = React.useMemo(() => {
    let result = productsData;
    if (categoryFilter !== "all" && selectedCategoryName) {
      result = result.filter((p) => p.category_name === selectedCategoryName);
    }
    return result;
  }, [productsData, categoryFilter, selectedCategoryName]);

  // --- Handlers ---
  // Update one URL param and reset to page 1; an empty value clears the param.
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
   * Drop every filter param at once and return to page 1.
   *
   * Rebuilt from scratch rather than deleted key by key, so a filter added later
   * cannot survive a Reset by being forgotten here.
   */
  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams({ page: "1" }));
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  };

  // Switching tabs changes a server-side filter, so reset to page 1.
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
  };

  const handleEdit = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_CREATE_DENIED);
      return;
    }
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    // Belt and braces: the row action is already hidden for a sub-admin, but a
    // stale dialog left open across a role change must not fire the call.
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_DELETE_DENIED);
      setProductToDelete(null);
      return;
    }
    try {
      await deleteProduct(productToDelete).unwrap();
      toast.success(MESSAGES.PRODUCTS.TOAST.DELETE_SUCCESS);
      setProductToDelete(null);
    } catch (_error) {
      toast.error(MESSAGES.PRODUCTS.TOAST.DELETE_ERROR);
    }
  };

  const handleToggleTopRated = async (product: Product, next: boolean) => {
    try {
      await setTopRated({ id: product.id, isTopRated: next }).unwrap();
      toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_UPDATED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_ERROR);
    }
  };

  /**
   * Activate / deactivate from the row — via `set-active/`, so all three row
   * toggles now share one shape: strict bool in, one column written, small
   * response out. It replaces a single-key `PATCH update-product`, which was
   * correct but re-serialised the whole product behind a re-fetch per click.
   *
   * The endpoint's own copy is preferred when it sends some; the fallback for
   * deactivating spells out the consequence, because "updated" understates a
   * change that takes the product off sale.
   */
  const handleToggleActive = async (product: Product, next: boolean) => {
    try {
      const res = await setActive({ id: product.id, isActive: next }).unwrap();
      toast.success(
        getApiMessage(res) ??
          (next ? MESSAGES.PRODUCTS.TOAST.ACTIVATED : MESSAGES.PRODUCTS.TOAST.DEACTIVATED),
      );
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCTS.TOAST.ACTIVE_ERROR);
    }
  };

  const handleToggleSourceable = async (product: Product, next: boolean) => {
    try {
      await setSourceable({ id: product.id, adminSourceable: next }).unwrap();
      toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_UPDATED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_ERROR);
    }
  };

  const handleConfirmAnnounce = async () => {
    if (!announceProduct) return;
    try {
      const res = await announceAvailability(announceProduct.id).unwrap();
      // Branch on `announced`, not the status code: a repeat inside the 120s
      // dedupe window returns 200 with `announced: false` and nothing was sent.
      // An older payload omits the flag entirely, which means it did send.
      const sent = res?.announced !== false;
      if (sent) {
        toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.ANNOUNCED(announceProduct.name));
      } else {
        // Its own copy distinguishes "you" from "another admin" — prefer it.
        toast.info(
          getApiMessage(res) ?? MESSAGES.PRODUCT_FLAGS.TOAST.ANNOUNCE_DEDUPED(announceProduct.name),
        );
      }
      setAnnounceProduct(null);
    } catch (error) {
      // The API 400s when the product isn't orderable — surface its own message,
      // which tells the admin to make it sourceable first.
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCT_FLAGS.TOAST.ANNOUNCE_ERROR);
    }
  };

  const columns = useProductColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onManageVariants: (e, product) => {
      e.stopPropagation();
      setVariantsProduct(product);
    },
    onChangeCatalog: (e, product) => {
      e.stopPropagation();
      setCatalogProduct(product);
    },
    onAnnounce: (e, product) => {
      e.stopPropagation();
      setAnnounceProduct(product);
    },
    onToggleTopRated: handleToggleTopRated,
    onToggleSourceable: handleToggleSourceable,
    onToggleActive: handleToggleActive,
    canDelete: canManageCatalog,
  });

  /**
   * One card per figure the product-stats endpoint returns — all eleven, flat.
   *
   * They were three cards with the other eight folded in as sub-lines; a
   * breakdown row renders at 11.5px against the card's own number, so eight of
   * the eleven counts were the hardest ones on the page to read. Flat, each
   * figure gets the same weight, and `cols-4` wraps them 4 + 4 + 3 at one width.
   *
   * Colour carries the grouping the nesting used to: navy/green for the totals,
   * blue → purple → red across the catalog types, amber/teal for merchandising,
   * then the category trio echoing teal/blue/red.
   *
   * A missing stats response leaves every value at "-" rather than 0 — an
   * unanswered call must not read as "you have none".
   */
  const statItems = [
    {
      id: "total-products",
      /**
       * **This total spans all three catalogs; the table below serves two.**
       * Unfiltered it reads 50 over a list of 36 — the 14 marine-emergency
       * products have their own screen and their own endpoint. The three
       * catalog-type cards below say where the difference goes; hiding it by
       * narrowing the count would under-report the catalog.
       */
      label: PS.TOTAL_PRODUCTS,
      // Prefer the stats API total; fall back to the paginated list count.
      value: productStats?.total ?? totalCount,
      icon: <IconBoxSeam size={19} />,
      variant: "navy" as const,
    },
    {
      id: "active-products",
      label: PS.ACTIVE,
      value: productStats?.active ?? "-",
      icon: <IconCircleCheck size={19} />,
      variant: "green" as const,
    },
    {
      id: "regular-products",
      label: PS.REGULAR,
      value: productStats?.regular ?? "-",
      icon: <IconClock size={19} />,
      variant: "blue" as const,
    },
    {
      id: "express-products",
      label: PS.EXPRESS,
      value: productStats?.express ?? "-",
      icon: <IconBolt size={19} />,
      variant: "purple" as const,
    },
    {
      id: "emergency-products",
      label: PS.EMERGENCY,
      value: productStats?.emergency ?? "-",
      icon: <IconAlertTriangle size={19} />,
      variant: "red" as const,
    },
    {
      id: "top-rated-products",
      label: PS.TOP_RATED,
      value: productStats?.top_rated ?? "-",
      icon: <IconStar size={19} />,
      variant: "amber" as const,
    },
    {
      id: "on-deal-products",
      label: PS.ON_DEAL,
      value: productStats?.on_deal ?? "-",
      icon: <IconTag size={19} />,
      variant: "teal" as const,
    },
    {
      id: "deal-of-the-day-products",
      label: PS.DEAL_OF_THE_DAY,
      value: productStats?.deal_of_the_day ?? "-",
      icon: <IconFlame size={19} />,
      variant: "amber" as const,
    },
    {
      id: "total-categories",
      // The category **taxonomy**, not products — these three are the figures
      // that do not follow the filter bar, because a product filter has no
      // meaning for them. Labelled so numbers that stay put don't read as stuck.
      label: PS.TOTAL_CATEGORIES,
      value: productStats?.total_categories ?? categoriesData?.count ?? categories.length,
      icon: <IconCategory size={19} />,
      variant: "teal" as const,
    },
    {
      id: "general-categories",
      label: PS.GENERAL_CATEGORIES,
      value: productStats?.general_categories ?? "-",
      icon: <IconCategory2 size={19} />,
      variant: "blue" as const,
    },
    {
      id: "emergency-categories",
      label: PS.EMERGENCY_CATEGORIES,
      value: productStats?.marine_emergency_categories ?? "-",
      icon: <IconAnchor size={19} />,
      variant: "red" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title={MESSAGES.PRODUCTS.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder={MESSAGES.PRODUCTS.SEARCH_PLACEHOLDER}
            searchDebounceMs={180}
            searchLoading={isLoading}
            filters={[
              {
                id: "category",
                value: categoryFilter,
                placeholder: MESSAGES.PRODUCTS.ALL_CATEGORIES,
                options: categoryOptions,
                width: "160px",
                // Both dropdowns say "not filtering" with "all", not "" — without
                // this the Reset button would offer itself on a pristine toolbar.
                emptyValue: "all",
                onValueChange: (val) => setFilterParam("category", val === "all" ? "" : val),
              },
              {
                /**
                 * Catalog scope. The endpoint has always accepted
                 * `?catalog_type=`; nothing sent it, so the Catalog column was
                 * visible and unfilterable.
                 *
                 * Two values only — this list is the general catalog, and
                 * `marine_emergency` is a 400 here rather than an empty page,
                 * because those products are served by the Spares screen.
                 */
                id: "catalog",
                value: catalogFilter || "all",
                placeholder: MESSAGES.PRODUCTS.ALL_CATALOGS,
                options: catalogOptions,
                width: "140px",
                emptyValue: "all",
                onValueChange: (val) => setFilterParam("catalog", val === "all" ? "" : val),
              },
            ]}
            /**
             * Clears **every** filter, the Status one in the column header
             * included. Status lives outside this toolbar, but it is the same
             * URL state on the same screen and an operator thinks of the set as
             * one thing — a Reset that left one narrowing in place would be the
             * exact confusion the button exists to prevent. `isFiltered` reports
             * it upward so Reset appears when only Status is set.
             */
            isFiltered={!!statusFilter}
            onReset={handleResetFilters}
          >
            {canManageCatalog && (
              <button type="button" className="btn btn-primary" onClick={handleAddProduct}>
                <IconPlus size={16} />
                {MESSAGES.PRODUCTS.ADD_PRODUCT}
              </button>
            )}
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} className="cols-4" />

      <DynamicTabs
        tabs={productTabs}
        value={activeTab}
        onTabChange={handleTabChange}
        triggerClassName="data-[state=active]:!text-black data-[state=active]:!border-black"
      />

      <DataTable
        columns={columns}
        data={filteredProducts}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? MESSAGES.PRODUCTS.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={MESSAGES.PRODUCTS.EMPTY}
        onRowClick={(row) => {
          setEditingProduct(row);
          setIsModalOpen(true);
        }}
      />

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
      />

      <ProductVariantsDrawer
        productId={variantsProduct?.id ?? null}
        productName={variantsProduct?.name ?? ""}
        isOpen={!!variantsProduct}
        onClose={() => setVariantsProduct(null)}
      />

      <SetCatalogTypeDialog
        product={catalogProduct}
        isOpen={!!catalogProduct}
        onClose={() => setCatalogProduct(null)}
      />

      <ConfirmDialog
        isOpen={!!announceProduct}
        onClose={() => setAnnounceProduct(null)}
        onConfirm={handleConfirmAnnounce}
        isLoading={isAnnouncing}
        title={MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.TITLE}
        description={
          announceProduct
            ? `${MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.MESSAGE(announceProduct.name)} ${MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.NOTE}`
            : ""
        }
        confirmText={MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.CONFIRM}
      />

      {/*
        Typed confirmation, which nothing else in this app asks for. Warranted
        here: the delete cascades to every variant, runs without checking for
        open orders or live deals, and has no restore endpoint — recovery is a
        database edit. The phrase makes confirming an act of reading.
      */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.PRODUCTS.DELETE_CONFIRM.TITLE}
        description={MESSAGES.PRODUCTS.DELETE_CONFIRM.MESSAGE}
        confirmText={MESSAGES.PRODUCTS.DELETE_CONFIRM.CONFIRM}
        confirmPhrase={MESSAGES.PRODUCTS.DELETE_CONFIRM.PHRASE}
        isLoading={isDeleting}
      />
    </>
  );
}
