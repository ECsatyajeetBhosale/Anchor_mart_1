import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import {
  IconCategory,
  IconCircleCheck,
  IconCircleOff,
  IconPackageOff,
  IconPlus,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useDeleteEmergencyCategoryMutation,
  useGetEmergencyCategoriesQuery,
  useGetEmergencyCategoryStatsQuery,
  useUpdateEmergencyCategoryMutation,
} from "../api/emergencyCategoryApi";
import type { EmergencyCategory } from "../types/emergencyCategory.types";
import { EmergencyCategoryFormModal } from "./EmergencyCategoryFormModal";
import { useEmergencyCategoryColumns } from "./emergencyCategoryColumns";

const LIMIT = 10;

/** The server's own `page_size` ceiling — the most one request can return. */
const PAGE_SIZE_MAX = 50;

export function EmergencyCategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EmergencyCategory | null>(null);
  /**
   * The whole row, not just its id — the confirm dialog needs the name and
   * `product_count`, both of which are on the list rows already.
   */
  const [categoryToDelete, setCategoryToDelete] = useState<EmergencyCategory | null>(null);
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteEmergencyCategoryMutation();
  const [updateCategory] = useUpdateEmergencyCategoryMutation();
  // Creating and deleting a category is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  /**
   * The list's two filters, shared with the stats call so the cards cannot
   * describe a different population than the table. Both endpoints run the same
   * server-side filter function and both 400 on a junk boolean.
   */
  const listFilters = { search: searchTerm, isActive };

  const { data, isLoading, isError, error, refetch } = useGetEmergencyCategoriesQuery({
    page,
    limit: LIMIT,
    ...listFilters,
  });

  const categories: EmergencyCategory[] = data?.results?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // KPI counts { total, active, inactive, empty }, scoped to the marine
  // taxonomy and following the filters above.
  const { data: stats } = useGetEmergencyCategoryStatsQuery(listFilters);

  /**
   * A page past the end is a **404**, not an empty page — same pagination class
   * as every other catalog list, so the same recovery to page 1.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  useEffect(() => {
    if (!isPageOutOfRange || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isPageOutOfRange, page, searchParams, setSearchParams]);

  /**
   * The whole marine taxonomy, unfiltered — the set that distinguishes a live
   * parent from a deleted one. `null` when it may be incomplete, because an
   * incomplete set would mark every off-page parent as deleted.
   */
  const { data: allCategoriesData } = useGetEmergencyCategoriesQuery({ limit: PAGE_SIZE_MAX });
  const liveCategoryIds = useMemo(() => {
    const rows = allCategoriesData?.results?.data ?? [];
    return allCategoriesData && (allCategoriesData.count ?? 0) <= PAGE_SIZE_MAX
      ? new Set(rows.map((c) => c.id))
      : null;
  }, [allCategoriesData]);

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

  const handleDeleteClick = (e: React.MouseEvent, category: EmergencyCategory) => {
    e.stopPropagation();
    setCategoryToDelete(category);
  };

  /**
   * Activate / deactivate from the row — safe as a one-click control because,
   * unlike delete, it does **not** cascade to the category's spares.
   *
   * The copy stays narrow for the same reason as the general screen: the
   * sailor's category list filters on `is_active` so the tile disappears, but
   * their product list never joins category liveness, so the spares themselves
   * stay findable. See C9 in the conflicts log.
   */
  const handleToggleActive = async (category: EmergencyCategory, next: boolean) => {
    try {
      await updateCategory({ id: category.id, body: { is_active: next } }).unwrap();
      toast.success(
        next
          ? MESSAGES.EMERGENCY_CATEGORIES.TOAST.ACTIVATED
          : MESSAGES.EMERGENCY_CATEGORIES.TOAST.DEACTIVATED,
      );
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.EMERGENCY_CATEGORIES.TOAST.ACTIVE_ERROR);
    }
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
      const res = await deleteCategory(categoryToDelete.id).unwrap();
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
    onToggleActive: handleToggleActive,
    liveCategoryIds,
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
    {
      /**
       * `empty` was in the response from the start and rendered nowhere. It is
       * the figure that names work to do — an emergency category with nothing
       * filed under it is a shelf a sailor can open mid-emergency and find bare.
       */
      id: "empty-emergency-categories",
      label: MESSAGES.EMERGENCY_CATEGORIES.STATS.EMPTY_CATEGORIES,
      value: stats?.empty ?? "-",
      icon: <IconPackageOff size={19} />,
      variant: "amber" as const,
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

      <StatsGrid items={statItems} className="cols-4" />

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

      {/*
        Typed confirmation, as on the general categories screen and for the same
        reason: the spares it deactivates can each be switched back on, but the
        category itself cannot be restored, so undoing means re-creating it and
        re-homing everything. "Up to N" because `product_count` counts
        already-inactive spares that the cascade will not touch.
      */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.TITLE}
        description={
          categoryToDelete
            ? MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.MESSAGE(
                categoryToDelete.name,
                categoryToDelete.product_count ?? 0,
              )
            : ""
        }
        confirmText={MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.CONFIRM}
        confirmPhrase={MESSAGES.EMERGENCY_CATEGORIES.DELETE_CONFIRM.PHRASE}
        isLoading={isDeleting}
      />
    </>
  );
}
