import {
  IconCheck,
  IconClipboardText,
  IconDiscount2,
  IconPlus,
  IconStar,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useGetEmergencyCategoriesQuery } from "@/features/emergency-categories";
import {
  type Product,
  ProductFormModal,
  SetCatalogTypeDialog,
  useProductColumns,
  useSetProductActiveMutation,
  useSetProductSourceableMutation,
  useSetProductTopRatedMutation,
} from "@/features/products";
import { ProductVariantsDrawer } from "@/features/variants";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import {
  useDeleteSpareProductMutation,
  useGetSpareProductsQuery,
  useGetSpareStatsQuery,
} from "../api/spareApi";
import type { SpareStats } from "../types/spare.types";

const M = MESSAGES.SPARES;

const LIMIT = 10;

type StatVariant = "navy" | "teal" | "amber" | "red" | "green" | "purple" | "blue";

// KPI cards — each maps 1:1 to a field on the emergency-spare stats response.
const STAT_CONFIG: {
  id: string;
  label: string;
  key: keyof SpareStats;
  icon: ReactNode;
  variant: StatVariant;
}[] = [
  {
    id: "total",
    label: M.STATS.TOTAL,
    key: "total",
    icon: <IconClipboardText size={20} />,
    variant: "navy",
  },
  {
    id: "active",
    label: M.STATS.ACTIVE,
    key: "active",
    icon: <IconCheck size={20} />,
    variant: "green",
  },
  {
    id: "top_rated",
    label: M.STATS.TOP_RATED,
    key: "top_rated",
    icon: <IconStar size={20} />,
    variant: "amber",
  },
  {
    id: "on_deal",
    label: M.STATS.ON_DEAL,
    key: "on_deal",
    icon: <IconDiscount2 size={20} />,
    variant: "teal",
  },
];

export function SparesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [catalogProduct, setCatalogProduct] = useState<Product | null>(null);
  // `null` id with the form open = the add flow; a set id = edit.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  // URL-driven filter state (shareable, refresh-safe) — mirrors the other pages.
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";
  const statusRaw = searchParams.get("status") ?? "all";
  const statusFilter = statusRaw === "true" || statusRaw === "false" ? statusRaw : "all";
  const topRatedFilter = searchParams.get("top_rated") ?? "";
  const sourceableFilter = searchParams.get("sourceable") ?? "";

  /**
   * The list's filters, in one object shared with the stats call so the cards
   * cannot describe a different population than the table. Both run the same
   * server-side filter function and both 400 on bad input.
   */
  const listFilters = {
    search,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "true",
    isTopRated: topRatedFilter === "" ? undefined : topRatedFilter === "true",
    adminSourceable: sourceableFilter === "" ? undefined : sourceableFilter === "true",
  };

  const { data, isLoading, isFetching, isError, error, refetch } = useGetSpareProductsQuery(
    {
      page,
      limit: LIMIT,
      ...listFilters,
    },
    /**
     * `on_deal` is an EXISTS against a deal's live start/end window, so a row can
     * enter or leave it when a clock passes — with no write to the product and
     * nothing for the cache to invalidate. Re-fetching on mount keeps a
     * returning operator from acting on deal state that expired while they were
     * away. Mitigation, not a fix: a tab left open still goes stale (C8).
     */
    { refetchOnMountOrArgChange: true },
  );

  const products: Product[] = data?.results?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  /**
   * A page past the end is a **404**, not an empty page — the same
   * `CustomPagination` as every other catalog list, so the same recovery to
   * page 1 rather than a permanent error with a Retry that cannot succeed.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  useEffect(() => {
    if (!isPageOutOfRange || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isPageOutOfRange, page, searchParams, setSearchParams]);

  /**
   * Category filter options — the marine-emergency categories these are filed
   * under. Capped at the server's own `page_size` ceiling: asking for more is
   * silently clamped, so a larger number would just be a bigger lie about how
   * many were fetched.
   */
  const { data: categoriesData } = useGetEmergencyCategoriesQuery({ limit: API_MAX_PAGE_SIZE });
  const categoryOptions = [
    { value: "all", label: M.ALL_CATEGORIES },
    ...(categoriesData?.results?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  // Live KPI stats, scoped to marine and following the filters above.
  const { data: stats, isLoading: statsLoading } = useGetSpareStatsQuery(listFilters, {
    // Same live-deal reasoning as the list — the `on_deal` card is computed per
    // request, so a cached one can outlive the window it counted.
    refetchOnMountOrArgChange: true,
  });
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const [deleteSpare, { isLoading: isDeleting }] = useDeleteSpareProductMutation();
  /**
   * The three row toggles, from the **products** feature.
   *
   * `set-top-rated/`, `set-admin-sourceable/` and `set-active/` are catalog-wide
   * — the marine surface has no toggle routes of its own, and all three are
   * confirmed reachable with a marine product id. This screen offered none of
   * them until now, so a spare could only be activated or flagged by opening the
   * edit form, while the general catalog did it in one click.
   */
  const [setTopRated] = useSetProductTopRatedMutation();
  const [setSourceable] = useSetProductSourceableMutation();
  const [setActive] = useSetProductActiveMutation();
  // Creating and deleting a spare is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  const handleToggleActive = async (row: Product, next: boolean) => {
    try {
      const res = await setActive({ id: row.id, isActive: next }).unwrap();
      toast.success(getApiMessage(res) ?? (next ? M.TOAST.ACTIVATED : M.TOAST.DEACTIVATED));
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.ACTIVE_ERROR);
    }
  };

  const handleToggleTopRated = async (row: Product, next: boolean) => {
    try {
      await setTopRated({ id: row.id, isTopRated: next }).unwrap();
      toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_UPDATED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_ERROR);
    }
  };

  const handleToggleSourceable = async (row: Product, next: boolean) => {
    try {
      await setSourceable({ id: row.id, adminSourceable: next }).unwrap();
      toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_UPDATED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_ERROR);
    }
  };

  const openAdd = () => {
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_CREATE_DENIED);
      return;
    }
    setEditingProduct(null);
    setIsFormOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingProduct(products.find((p) => p.id === id) ?? null);
    setIsFormOpen(true);
  };
  const closeForm = () => setIsFormOpen(false);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    // A spare is a Product (catalog_type = marine_emergency), so it sits behind
    // the same super-admin gate as the general catalog.
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_DELETE_DENIED);
      setPendingDelete(null);
      return;
    }
    try {
      await deleteSpare(pendingDelete.id).unwrap();
      setPendingDelete(null);
      toast.success(M.TOAST.DELETED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.TOAST.DELETE_ERROR);
    }
  };

  // Update one URL param; filter/search changes reset to page 1. "all"/empty clears it.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  /**
   * The **products** feature's columns, not a parallel set.
   *
   * Marine spares share a view and serializer class with `get-products/`, so
   * the rows are `Product`s and there is nothing for a second column set to do
   * except drift from the first. This screen previously rendered its own nine
   * columns over a display-mapped row, which is why it showed neither the
   * variants manager nor the catalog move.
   *
   * `onAnnounce` is deliberately not passed — `announce-availability/` sits on
   * the general products base and is not among the catalog-wide toggles the
   * marine surface is documented to borrow, so the action is omitted rather
   * than offered and left to 404. Everything else here is confirmed reachable
   * with a marine id.
   */
  const columns = useProductColumns({
    statusFilter: statusFilter === "all" ? "" : statusFilter === "true" ? "active" : "inactive",
    onStatusFilter: (value) =>
      setParam("status", value === "active" ? "true" : value === "inactive" ? "false" : ""),
    topRatedFilter,
    onTopRatedFilter: (value) => setParam("top_rated", value),
    sourceableFilter,
    onSourceableFilter: (value) => setParam("sourceable", value),
    onEdit: (e, product) => {
      e.stopPropagation();
      openEdit(product.id);
    },
    onDelete: (e, id) => {
      e.stopPropagation();
      const row = products.find((p) => p.id === id) ?? null;
      setPendingDelete(row);
    },
    canDelete: canManageCatalog,
    onManageVariants: (e, product) => {
      e.stopPropagation();
      setVariantsProduct(product);
    },
    onChangeCatalog: (e, product) => {
      e.stopPropagation();
      setCatalogProduct(product);
    },
    onToggleTopRated: handleToggleTopRated,
    onToggleSourceable: handleToggleSourceable,
    onToggleActive: handleToggleActive,
  });

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "category",
                value: categoryFilter,
                placeholder: M.ALL_CATEGORIES,
                options: categoryOptions,
                width: "190px",
                onValueChange: (val) => setParam("category", val),
                emptyValue: "all",
              },
            ]}
            /**
             * Rebuilt from scratch rather than cleared key by key, as on
             * Products: the old list named four params explicitly, so the two
             * column filters added on 2026-08-18 would have survived a Reset
             * simply by not being listed. A filter added later cannot outlive
             * this one.
             */
            onReset={() => setSearchParams(new URLSearchParams({ page: "1" }))}
          >
            {canManageCatalog && (
              <Button variant="primary" size="default" onClick={openAdd}>
                <IconPlus size={15} className="mr-1" />
                {M.ADD_PRODUCT}
              </Button>
            )}
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} className="cols-4" />

      <DataTable
        columns={columns}
        data={products}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY}
        /**
         * Straight to Edit, as on Products.
         *
         * A read-only detail drawer used to sit in front of it, showing the same
         * fields the edit form shows and then offering an Edit button — a screen
         * whose only purpose was to lead to the next one. The edit drawer's
         * Variants tab already carries everything it added.
         */
        onRowClick={(row) => openEdit(row.id)}
      />

      <ProductVariantsDrawer
        productId={variantsProduct?.id ?? null}
        productName={variantsProduct?.name ?? ""}
        productAdminSourceable={variantsProduct?.admin_sourceable !== false}
        isOpen={!!variantsProduct}
        onClose={() => setVariantsProduct(null)}
      />

      {/* Moving a spare out of marine emergency drops it off this list — the
          dialog warns before a move that changes screens (C5). */}
      <SetCatalogTypeDialog
        product={catalogProduct}
        isOpen={!!catalogProduct}
        onClose={() => setCatalogProduct(null)}
      />

      {/*
        The **shared** product form, pointed at the marine catalog.

        All three catalogs share one serializer, so this is the general form
        minus the express price, with the marine category set and the marine
        create/update routes. It replaced a parallel pair of spare-specific
        drawers that had already drifted — no free-form attributes, no image
        previews, no field-keyed error pinning.
      */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        product={editingProduct}
        catalogType="marine_emergency"
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title={M.DELETE_DIALOG.TITLE}
        description={M.DELETE_DIALOG.DESCRIPTION(pendingDelete?.name ?? "")}
        confirmText={isDeleting ? M.DELETE_DIALOG.DELETING : M.DELETE_DIALOG.CONFIRM}
        // Typed confirmation, as on Products and Categories: irreversible, and
        // it cascades to every variant of the spare.
        confirmPhrase={M.DELETE_DIALOG.PHRASE}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default SparesPage;
