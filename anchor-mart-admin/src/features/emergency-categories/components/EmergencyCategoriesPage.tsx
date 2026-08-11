import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { IconCategory, IconCircleCheck, IconCircleOff, IconPlus } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useDeleteEmergencyCategoryMutation,
  useGetEmergencyCategoriesQuery,
  useGetEmergencyCategoryStatsQuery,
} from "../api/emergencyCategoryApi";
import type { EmergencyCategory } from "../types/emergencyCategory.types";
import { EmergencyCategoryFormModal } from "./EmergencyCategoryFormModal";
import { useEmergencyCategoryColumns } from "./emergencyCategoryColumns";

const LIMIT = 10;

export function EmergencyCategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EmergencyCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteEmergencyCategoryMutation();
  // Creating and deleting a category is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  // Categories list — search and status filter server-side.
  const { data, isLoading, isError, refetch } = useGetEmergencyCategoriesQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    isActive,
  });

  const categories: EmergencyCategory[] = data?.results?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Aggregate KPI counts { total, active, inactive, empty } from the stats API.
  const { data: stats } = useGetEmergencyCategoryStatsQuery();

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

  const handleEdit = (e: React.MouseEvent, category: EmergencyCategory) => {
    e.stopPropagation();
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAddCategory = () => {
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_CREATE_DENIED);
      return;
    }
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_DELETE_DENIED);
      setCategoryToDelete(null);
      return;
    }
    try {
      const res = await deleteCategory(categoryToDelete).unwrap();
      // The delete cascades: live spares in the category are deactivated, and
      // `deactivated_products` is the only place that is reported.
      const deactivated = res?.deactivated_products ?? 0;
      toast.success(
        deactivated > 0
          ? MESSAGES.EMERGENCY_CATEGORIES.TOAST.DELETE_SUCCESS_CASCADE(deactivated)
          : MESSAGES.EMERGENCY_CATEGORIES.TOAST.DELETE_SUCCESS,
      );
      setCategoryToDelete(null);
    } catch (error) {
      // The server's reason beats the fixed string — see CategoriesPage.
      toast.error(getApiMessage(error) ?? MESSAGES.EMERGENCY_CATEGORIES.TOAST.DELETE_ERROR);
    }
  };

  const columns = useEmergencyCategoryColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    canDelete: canManageCatalog,
  });

  const statItems = [
    {
      id: "total-emergency-categories",
      label: MESSAGES.EMERGENCY_CATEGORIES.STATS.TOTAL_CATEGORIES,
      value: stats?.total ?? totalCount,
      icon: <IconCategory size={19} />,
      variant: "navy" as const,
    },
    {
      id: "active-emergency-categories",
      label: MESSAGES.EMERGENCY_CATEGORIES.STATS.ACTIVE_CATEGORIES,
      value: stats?.active ?? "-",
      icon: <IconCircleCheck size={19} />,
      variant: "teal" as const,
    },
    {
      id: "inactive-emergency-categories",
      label: MESSAGES.EMERGENCY_CATEGORIES.STATS.INACTIVE_CATEGORIES,
      value: stats?.inactive ?? "-",
      icon: <IconCircleOff size={19} />,
      variant: "red" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title={MESSAGES.EMERGENCY_CATEGORIES.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder={MESSAGES.EMERGENCY_CATEGORIES.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isLoading}
          >
            {canManageCatalog && (
              <button type="button" className="btn btn-primary" onClick={handleAddCategory}>
                <IconPlus size={16} />
                {MESSAGES.EMERGENCY_CATEGORIES.ADD_CATEGORY}
              </button>
            )}
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
        error={isError ? MESSAGES.EMERGENCY_CATEGORIES.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={MESSAGES.EMERGENCY_CATEGORIES.EMPTY}
        onRowClick={(row) => {
          setEditingCategory(row);
          setIsModalOpen(true);
        }}
      />

      <EmergencyCategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={editingCategory}
      />

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.TITLE}
        description={MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.MESSAGE}
        confirmText={MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.CONFIRM}
        isLoading={isDeleting}
      />
    </>
  );
}
