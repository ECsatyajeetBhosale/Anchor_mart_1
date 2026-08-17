import {
  IconCheck,
  IconClipboardText,
  IconDiscount2,
  IconEdit,
  IconEngine,
  IconEye,
  IconPlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TableActions } from "@/components/common/TableActions";
import { avatarColumn, textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { useGetEmergencyCategoriesQuery } from "@/features/emergency-categories";
import {
  useSetProductActiveMutation,
  useSetProductSourceableMutation,
  useSetProductTopRatedMutation,
} from "@/features/products";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { clearParams } from "@/lib/utils";
import {
  useDeleteSpareProductMutation,
  useGetSpareProductsQuery,
  useGetSpareStatsQuery,
} from "../api/spareApi";
import type { SpareProduct, SpareStats } from "../types/spare.types";
import { SpareProductDetailDrawer } from "./SpareProductDetailDrawer";
import { SpareProductFormModal } from "./SpareProductFormModal";

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

const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  { value: "true", label: M.STATUS_FILTER.ACTIVE },
  { value: "false", label: M.STATUS_FILTER.INACTIVE },
];

export function SparesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // `null` id with the form open = the add flow; a set id = edit.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SpareProduct | null>(null);

  // URL-driven filter state (shareable, refresh-safe) — mirrors the other pages.
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";
  const statusRaw = searchParams.get("status") ?? "all";
  const statusFilter = statusRaw === "true" || statusRaw === "false" ? statusRaw : "all";

  /**
   * The list's filters, in one object shared with the stats call so the cards
   * cannot describe a different population than the table. Both run the same
   * server-side filter function and both 400 on bad input.
   */
  const listFilters = {
    search,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "true",
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

  const products = data?.products ?? [];
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

  const handleToggleActive = async (row: SpareProduct, next: boolean) => {
    try {
      const res = await setActive({ id: row.id, isActive: next }).unwrap();
      toast.success(getApiMessage(res) ?? (next ? M.TOAST.ACTIVATED : M.TOAST.DEACTIVATED));
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.ACTIVE_ERROR);
    }
  };

  const handleToggleTopRated = async (row: SpareProduct, next: boolean) => {
    try {
      await setTopRated({ id: row.id, isTopRated: next }).unwrap();
      toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_UPDATED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_ERROR);
    }
  };

  const handleToggleSourceable = async (row: SpareProduct, next: boolean) => {
    try {
      await setSourceable({ id: row.id, adminSourceable: next }).unwrap();
      toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_UPDATED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_ERROR);
    }
  };

  const openDetail = (product: SpareProduct) => {
    setSelectedId(product.id);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  const openAdd = () => {
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_CREATE_DENIED);
      return;
    }
    setEditingId(null);
    setIsFormOpen(true);
  };
  /** Edit closes the detail drawer first — both are Sheets and would stack. */
  const openEdit = (id: string) => {
    setIsDetailOpen(false);
    setEditingId(id);
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

  const columns: Column<SpareProduct>[] = [
    avatarColumn({
      id: "product",
      header: M.COLUMNS.PRODUCT,
      name: (r) => r.name,
      // A spare is a part, not a person — with no image the old
      // `getFallbackAvatar(name)` drew a generated human face on every newly
      // created spare, which read as a user row.
      image: (r) => r.image,
      placeholder: <IconEngine size={15} />,
    }),
    textColumn({
      id: "category",
      header: M.COLUMNS.CATEGORY,
      get: (r) => r.category,
      className: "td-m",
    }),
    textColumn({ id: "price", header: M.COLUMNS.PRICE, get: (r) => r.price, className: "td-p" }),
    {
      id: "variants",
      header: M.COLUMNS.VARIANTS,
      /**
       * Zero is the number that matters, so it gets a warning rather than a "0".
       *
       * `browsable_products_qs` requires at least one live variant, so a spare
       * with none is not badly configured — it is **absent**: it never appears in
       * any sailor-facing list, cannot be added to a cart, and produces no error
       * anywhere. An admin sees it here and assumes the stock exists. This badge
       * is the only signal that it does not.
       */
      cell: (r) =>
        r.variantCount === 0 ? (
          <Badge variant="warning" className="h-[22px] text-[10px]">
            {M.NO_VARIANTS}
          </Badge>
        ) : (
          <span className="td-m">{r.variantCount}</span>
        ),
      className: "text-center",
      headerClassName: "text-center",
    },
    textColumn({
      id: "rating",
      header: M.COLUMNS.RATING,
      get: (r) => r.rating,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    {
      id: "topRated",
      header: MESSAGES.PRODUCT_FLAGS.COLUMNS.TOP_RATED,
      cell: (r) => (
        <Switch
          checked={r.isTopRated}
          onCheckedChange={(next) => handleToggleTopRated(r, next)}
          // The row opens the detail drawer — the toggle must not.
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: "sourceable",
      header: MESSAGES.PRODUCT_FLAGS.COLUMNS.SOURCEABLE,
      cell: (r) => (
        <Switch
          checked={r.adminSourceable}
          onCheckedChange={(next) => handleToggleSourceable(r, next)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      // A switch, matching the products table: deactivating is the reversible
      // action, and this screen previously offered no way to do it from the row.
      cell: (r) => (
        <Switch
          checked={r.active}
          onCheckedChange={(next) => handleToggleActive(r, next)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-28 text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="td-acts">
          <Button
            variant="ghost"
            size="xs"
            title={M.ACTIONS.VIEW}
            onClick={(e) => {
              e.stopPropagation();
              openDetail(r);
            }}
          >
            <IconEye size={15} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            title={M.ACTIONS.EDIT}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r.id);
            }}
          >
            <IconEdit size={15} />
          </Button>
          {/*
            Delete sits behind the overflow menu here as it does on Products and
            Categories — C6 parity. A spare is a Product, so the same terminal
            soft-delete applies: no restore endpoint, and every admin queryset
            filters deleted rows, so it hides its own evidence. The Status switch
            beside it is the reversible action operators actually want.
          */}
          {canManageCatalog && (
            <TableActions
              row={r}
              actions={[
                {
                  icon: <IconTrash size={15} />,
                  title: M.ACTIONS.DELETE,
                  variant: "danger",
                  overflow: true,
                  onClick: (e, row) => {
                    e.stopPropagation();
                    setPendingDelete(row);
                  },
                },
              ]}
            />
          )}
        </div>
      ),
    },
  ];

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
              {
                id: "status",
                value: statusFilter,
                placeholder: M.ALL_STATUS,
                options: STATUS_OPTIONS,
                width: "140px",
                onValueChange: (val) => setParam("status", val),
                emptyValue: "all",
              },
            ]}
            onReset={() =>
              setSearchParams(clearParams(searchParams, ["search", "category", "status", "page"]))
            }
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

      <StatsGrid items={statItems} />

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
        onRowClick={openDetail}
      />

      <SpareProductDetailDrawer
        productId={selectedId}
        isOpen={isDetailOpen}
        onClose={closeDetail}
        onEdit={openEdit}
      />

      {/* Add / edit — one switch, two self-contained drawers */}
      <SpareProductFormModal isOpen={isFormOpen} onClose={closeForm} productId={editingId} />

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
