import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { useGetCategoriesQuery } from "@/features/catalog";
import { MESSAGES } from "@/lib/messages";
import { IconBoxSeam, IconCategory, IconPlus, IconStar } from "@tabler/icons-react";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteProductMutation, useGetProductsQuery } from "../api/productApi";
import type { Product } from "../types/product.types";
import { ProductFormModal } from "./ProductFormModal";
import { useProductColumns } from "./productColumns";

const productTabs = [
  { label: MESSAGES.PRODUCTS.TABS.ALL, value: "all" },
  { label: MESSAGES.PRODUCTS.TABS.DEAL, value: "deal" },
  { label: MESSAGES.PRODUCTS.TABS.SPECIAL, value: "special" },
];

const LIMIT = 10;

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all"; // category id, or "all"
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  // Products list — search, status, and category all filter server-side.
  const { data, isLoading, isError, refetch } = useGetProductsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    isActive,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
  });

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

  // Client-side refinements: the "deal" tab heuristic, plus a category fallback
  // that still works if the backend ignores the `?category=` filter.
  const selectedCategoryName = categories.find((c) => c.id === categoryFilter)?.name;
  const filteredProducts = React.useMemo(() => {
    let result = productsData;
    if (activeTab === "deal") {
      result = result.filter((p) => p.is_featured || p.average_rating >= 4.5);
    }
    if (categoryFilter !== "all" && selectedCategoryName) {
      result = result.filter((p) => p.category_name === selectedCategoryName);
    }
    return result;
  }, [productsData, activeTab, categoryFilter, selectedCategoryName]);

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
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete).unwrap();
      toast.success(MESSAGES.PRODUCTS.TOAST.DELETE_SUCCESS);
      setProductToDelete(null);
    } catch (_error) {
      toast.error(MESSAGES.PRODUCTS.TOAST.DELETE_ERROR);
    }
  };

  const columns = useProductColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  });

  const statItems = [
    {
      id: "total-products",
      label: MESSAGES.PRODUCTS.STATS.TOTAL_PRODUCTS,
      value: totalCount,
      icon: <IconBoxSeam size={19} />,
      variant: "navy" as const,
    },
    {
      id: "total-categories",
      label: MESSAGES.PRODUCTS.STATS.TOTAL_CATEGORIES,
      value: categoriesData?.count ?? categories.length,
      icon: <IconCategory size={19} />,
      variant: "teal" as const,
    },
    {
      // The API doesn't return a featured/deals count yet — show a placeholder.
      id: "featured-deals",
      label: MESSAGES.PRODUCTS.STATS.FEATURED_DEALS,
      value: "-",
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
            <button type="button" className="btn btn-primary" onClick={handleAddProduct}>
              <IconPlus size={16} />
              {MESSAGES.PRODUCTS.ADD_PRODUCT}
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DynamicTabs
        tabs={productTabs}
        value={activeTab}
        onTabChange={setActiveTab}
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
