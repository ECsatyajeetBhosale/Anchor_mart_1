import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { useGetCategoriesQuery } from "@/features/catalog";
import { ProductVariantsDrawer } from "@/features/variants";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { IconBoxSeam, IconCategory, IconPlus, IconStar } from "@tabler/icons-react";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useAnnounceProductAvailabilityMutation,
  useDeleteProductMutation,
  useGetProductStatsQuery,
  useGetProductsQuery,
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
  const [announceAvailability, { isLoading: isAnnouncing }] =
    useAnnounceProductAvailabilityMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all"; // category id, or "all"
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  // The "deal"/"top_rated" tabs are server-side filters (on_deal / is_top_rated).
  const onDeal = activeTab === "deal" ? true : undefined;
  const isTopRated = activeTab === "top_rated" ? true : undefined;

  // Products list — search, status, category, deal, and top-rated all filter server-side.
  const { data, isLoading, isError, refetch } = useGetProductsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    isActive,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    onDeal,
    isTopRated,
  });

  // Aggregate KPI counts from the product-stats API.
  const { data: productStats } = useGetProductStatsQuery();

  // Category options for the filter dropdown (value = id, label = name).
  const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
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
    canDelete: canManageCatalog,
  });

  const statItems = [
    {
      id: "total-products",
      label: MESSAGES.PRODUCTS.STATS.TOTAL_PRODUCTS,
      // Prefer the stats API total; fall back to the paginated list count.
      value: productStats?.total ?? totalCount,
      icon: <IconBoxSeam size={19} />,
      variant: "navy" as const,
    },
    {
      id: "total-categories",
      label: MESSAGES.PRODUCTS.STATS.TOTAL_CATEGORIES,
      value: productStats?.total_categories ?? categoriesData?.count ?? categories.length,
      icon: <IconCategory size={19} />,
      variant: "teal" as const,
    },
    {
      id: "featured-deals",
      label: MESSAGES.PRODUCTS.STATS.FEATURED_DEALS,
      // Top-rated ("featured") count from the stats API.
      value: productStats?.top_rated ?? "-",
      icon: <IconStar size={19} />,
      variant: "amber" as const,
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
                onValueChange: (val) => setFilterParam("category", val === "all" ? "" : val),
              },
            ]}
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

      <StatsGrid items={statItems} />

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

      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.PRODUCTS.DELETE_CONFIRM.TITLE}
        description={MESSAGES.PRODUCTS.DELETE_CONFIRM.MESSAGE}
        confirmText={MESSAGES.PRODUCTS.DELETE_CONFIRM.CONFIRM}
        isLoading={isDeleting}
      />
    </>
  );
}
