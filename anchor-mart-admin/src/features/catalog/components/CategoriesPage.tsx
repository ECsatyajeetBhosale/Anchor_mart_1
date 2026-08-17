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
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useGetCategoryStatsQuery,
  useUpdateCategoryMutation,
} from "../api/categoryApi";
import type { Category } from "../types/category.types";
import { CategoryFormModal } from "./CategoryFormModal";
import { useCategoryColumns } from "./categoryColumns";

const LIMIT = 10;

/**
 * The server's own `page_size` ceiling. Asking for more is silently clamped to
 * this, so it is the largest set one request can return.
 */
const PAGE_SIZE_MAX = 50;

export function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  /**
   * The whole row, not just its id — the confirm dialog needs the name and
   * `product_count` to say what the delete will actually do, and `product_count`
   * is on the list rows, so no extra fetch is required.
   */
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  // Creating and deleting a category is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  /**
   * The list's two filters, in one object shared with the stats call below so
   * the cards cannot describe a different population than the table. Both
   * endpoints run the same server-side filter function, and both 400 on a junk
   * boolean — passing one validated object to both is what keeps them agreeing.
   */
  const listFilters = { search: searchTerm, isActive };

  const { data, isLoading, isError, error, refetch } = useGetCategoriesQuery({
    page,
    limit: LIMIT,
    ...listFilters,
  });

  const categories: Category[] = data?.results?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // KPI counts { total, active, inactive, empty }, scoped to this taxonomy and
  // following the filters above.
  const { data: stats } = useGetCategoryStatsQuery(listFilters);

  /**
   * The whole taxonomy, unfiltered — the parent picker's options, and the set
   * that tells a live parent from a deleted one.
   *
   * `PAGE_SIZE_MAX` is the server's clamp, so one request is the most that can
   * be fetched at a time. Beyond that the set is incomplete, and an incomplete
   * set must not be used to claim a parent was deleted — hence the `null`.
   */
  const { data: allCategoriesData } = useGetCategoriesQuery({ limit: PAGE_SIZE_MAX });
  const allCategories: Category[] = allCategoriesData?.results?.data ?? [];
  const liveCategoryIds = useMemo(
    () =>
      allCategoriesData && (allCategoriesData.count ?? 0) <= PAGE_SIZE_MAX
        ? new Set(allCategories.map((c) => c.id))
        : null,
    [allCategoriesData, allCategories],
  );

  /**
   * A page past the end is a **404**, not an empty page — same `CustomPagination`
   * as the products list, so the same recovery. Reachable by deleting the last
   * row on the last page, or opening a bookmarked `?page=4` after the taxonomy
   * shrank; without this the table shows a permanent error with a Retry that
   * retries the same doomed request.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  useEffect(() => {
    if (!isPageOutOfRange || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isPageOutOfRange, page, searchParams, setSearchParams]);

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

  const handleDeleteClick = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setCategoryToDelete(category);
  };

  /**
   * Activate / deactivate from the row.
   *
   * Safe to offer as a one-click toggle: unlike delete, this **does not cascade**
   * — the category's products keep their own `is_active`. It is also the only
   * write path, since categories have no `set-active/` endpoint, so it goes
   * through the partial PATCH with a single key.
   *
   * The copy is careful for a reason. Deactivating hides the category from the
   * sailor's browse list, but their *product* list never joins category
   * liveness — so the products stay visible and purchasable through search,
   * product listings and saved items. "Hidden from browse" is the honest claim;
   * "off sale" would be a lie. See C9 in the conflicts log.
   */
  const handleToggleActive = async (category: Category, next: boolean) => {
    try {
      await updateCategory({ id: category.id, body: { is_active: next } }).unwrap();
      toast.success(
        next ? MESSAGES.CATEGORIES.TOAST.ACTIVATED : MESSAGES.CATEGORIES.TOAST.DEACTIVATED,
      );
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.CATEGORIES.TOAST.ACTIVE_ERROR);
    }
  };

  const handleEdit = (e: React.MouseEvent, category: Category) => {
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
      // The delete cascades: live products in the category are deactivated.
      // `deactivated_products` is always present, so a non-zero count is a real
      // side effect the admin has to be told about, not an optional detail.
      const deactivated = res?.deactivated_products ?? 0;
      toast.success(
        deactivated > 0
          ? MESSAGES.CATEGORIES.TOAST.DELETE_SUCCESS_CASCADE(deactivated)
          : MESSAGES.CATEGORIES.TOAST.DELETE_SUCCESS,
      );
      setCategoryToDelete(null);
    } catch (error) {
      // Prefer the server's own sentence — a 403 from the capability gate and a
      // 404 for an already-deleted category each say something the fixed string
      // cannot, and the admin has no other way to learn which one happened.
      toast.error(getApiMessage(error) ?? MESSAGES.CATEGORIES.TOAST.DELETE_ERROR);
    }
  };

  const columns = useCategoryColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
    /**
     * Ids of every live category, so the Parent column can tell a live parent
     * from a deleted one.
     *
     * Deleting a parent does nothing to its children: they stay live and listed,
     * still pointing at it, and `parent_name` keeps rendering the deleted
     * category's name. The row looks entirely healthy and its parent is gone.
     *
     * Passed as `null` unless the lookup below holds the **complete** taxonomy —
     * an incomplete set would mark every off-page parent as deleted, which is a
     * worse lie than the one being fixed.
     */
    liveCategoryIds,
    canDelete: canManageCatalog,
  });

  const statItems = [
    {
      id: "total-categories",
      label: MESSAGES.CATEGORIES.STATS.TOTAL_CATEGORIES,
      value: stats?.total ?? totalCount,
      icon: <IconCategory size={19} />,
      variant: "navy" as const,
    },
    {
      id: "active-categories",
      label: MESSAGES.CATEGORIES.STATS.ACTIVE_CATEGORIES,
      value: stats?.active ?? "-",
      icon: <IconCircleCheck size={19} />,
      variant: "teal" as const,
    },
    {
      id: "inactive-categories",
      label: MESSAGES.CATEGORIES.STATS.INACTIVE_CATEGORIES,
      value: stats?.inactive ?? "-",
      icon: <IconCircleOff size={19} />,
      variant: "red" as const,
    },
    {
      /**
       * `empty` was in the stats response from the start and rendered nowhere.
       * It is the one figure here that identifies work to do — a category with
       * nothing filed under it is a shelf a sailor can open and find bare.
       *
       * Labelled "no products filed" rather than "empty": it counts direct
       * assignments regardless of whether those products are active, so a
       * category can be non-empty and still show a sailor nothing.
       */
      id: "empty-categories",
      label: MESSAGES.CATEGORIES.STATS.EMPTY_CATEGORIES,
      value: stats?.empty ?? "-",
      icon: <IconPackageOff size={19} />,
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
            {canManageCatalog && (
              <button type="button" className="btn btn-primary" onClick={handleAddCategory}>
                <IconPlus size={16} />
                {MESSAGES.CATEGORIES.ADD_CATEGORY}
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

      {/*
        Typed confirmation, as on product delete, and for a sharper reason.
        The category cannot be restored — there is no restore endpoint — while
        each product it deactivates *can* be switched back on individually. So
        the irreversible half is the category row, and the copy leads with that
        rather than with the product count, which is the number that looks
        alarming but is the recoverable part.

        The count is an upper bound by construction: `product_count` includes
        already-inactive products, while the cascade only touches live ones.
        Hence "up to" — otherwise the dialog and the success toast will
        legitimately disagree and read as a bug.
      */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.CATEGORIES.DELETE_CONFIRM.TITLE}
        description={
          categoryToDelete
            ? MESSAGES.CATEGORIES.DELETE_CONFIRM.MESSAGE(
                categoryToDelete.name,
                categoryToDelete.product_count ?? 0,
              )
            : ""
        }
        confirmText={MESSAGES.CATEGORIES.DELETE_CONFIRM.CONFIRM}
        confirmPhrase={MESSAGES.CATEGORIES.DELETE_CONFIRM.PHRASE}
        isLoading={isDeleting}
      />
    </>
  );
}
