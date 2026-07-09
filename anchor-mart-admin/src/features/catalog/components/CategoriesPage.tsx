import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconBoxSeam, IconCategory, IconCircleCheck, IconPlus } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteCategoryMutation, useGetCategoriesQuery } from "../api/categoryApi";
import type { Category } from "../types/category.types";
import { CategoryFormModal } from "./CategoryFormModal";
import { useCategoryColumns } from "./categoryColumns";

const LIMIT = 10;

export function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  // Categories list — search and status filter server-side.
  const { data, isLoading, isError, refetch } = useGetCategoriesQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    isActive,
  });

  const categories: Category[] = data?.results?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // No aggregate stats endpoint yet — derive the secondary KPIs from the loaded
  // page so they stay honest (they reflect the current view, not the grand total).
  const activeOnPage = categories.filter((c) => c.is_active).length;
  const productsOnPage = categories.reduce((sum, c) => sum + (c.product_count ?? 0), 0);

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
    setCategoryToDelete(id);
  };

  const handleEdit = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete).unwrap();
      toast.success(MESSAGES.CATEGORIES.TOAST.DELETE_SUCCESS);
      setCategoryToDelete(null);
    } catch (_error) {
      toast.error(MESSAGES.CATEGORIES.TOAST.DELETE_ERROR);
    }
  };

  const columns = useCategoryColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  });

  const statItems = [
    {
      id: "total-categories",
      label: MESSAGES.CATEGORIES.STATS.TOTAL_CATEGORIES,
      value: totalCount,
      icon: <IconCategory size={19} />,
      variant: "navy" as const,
    },
    {
      id: "active-categories",
      label: MESSAGES.CATEGORIES.STATS.ACTIVE_CATEGORIES,
      value: activeOnPage,
      icon: <IconCircleCheck size={19} />,
      variant: "teal" as const,
    },
    {
      id: "products-in-categories",
      label: MESSAGES.CATEGORIES.STATS.PRODUCTS,
      value: productsOnPage,
      icon: <IconBoxSeam size={19} />,
      variant: "amber" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title={MESSAGES.CATEGORIES.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder={MESSAGES.CATEGORIES.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isLoading}
          >
            <button type="button" className="btn btn-primary" onClick={handleAddCategory}>
              <IconPlus size={16} />
              {MESSAGES.CATEGORIES.ADD_CATEGORY}
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={categories}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? MESSAGES.CATEGORIES.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={MESSAGES.CATEGORIES.EMPTY}
        onRowClick={(row) => {
          setEditingCategory(row);
          setIsModalOpen(true);
        }}
      />

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={editingCategory}
      />

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.CATEGORIES.DELETE_CONFIRM.TITLE}
        description={MESSAGES.CATEGORIES.DELETE_CONFIRM.MESSAGE}
        confirmText={MESSAGES.CATEGORIES.DELETE_CONFIRM.CONFIRM}
        isLoading={isDeleting}
      />
    </>
  );
}
