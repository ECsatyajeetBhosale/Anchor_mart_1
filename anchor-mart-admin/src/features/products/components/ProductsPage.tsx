import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { useGetCategoriesQuery } from "@/features/catalog";
import { IconBoxSeam, IconCategory, IconPlus, IconStar } from "@tabler/icons-react";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteProductMutation, useGetProductsQuery } from "../api/productApi";
import type { Product } from "../types/product.types";
import { ProductFormModal } from "./ProductFormModal";
import { useProductColumns } from "./productColumns";

const productTabs = [
  { label: "All Products", value: "all" },
  { label: "Deal Products", value: "deal" },
  { label: "Special Requests", value: "special" },
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
      { value: "all", label: "All Categories" },
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
      toast.success("Product deleted successfully");
      setProductToDelete(null);
    } catch (_error) {
      toast.error("Failed to delete product");
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
      label: "Total Products",
      value: totalCount,
      icon: <IconBoxSeam size={19} />,
      variant: "navy" as const,
    },
    {
      id: "total-categories",
      label: "Total Categories",
      value: categoriesData?.count ?? categories.length,
      icon: <IconCategory size={19} />,
      variant: "teal" as const,
    },
    {
      // The API doesn't return a featured/deals count yet — show a placeholder.
      id: "featured-deals",
      label: "Featured / Deals",
      value: "-",
      icon: <IconStar size={19} />,
      variant: "amber" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="Products & Catalog"
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder="Search products…"
            searchDebounceMs={180}
            searchLoading={isLoading}
            filters={[
              {
                id: "category",
                value: categoryFilter,
                placeholder: "All Categories",
                options: categoryOptions,
                width: "160px",
                onValueChange: (val) => setFilterParam("category", val === "all" ? "" : val),
              },
            ]}
          >
            <button type="button" className="btn btn-primary" onClick={handleAddProduct}>
              <IconPlus size={16} />
              Add Product
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
        error={isError ? "Failed to fetch products" : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage="No products found."
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
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
