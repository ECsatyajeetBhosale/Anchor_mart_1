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
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { avatarColumn, statusColumn, textColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useGetEmergencyCategoriesQuery } from "@/features/emergency-categories";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
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

  const { data, isLoading, isFetching, isError, refetch } = useGetSpareProductsQuery({
    page,
    limit: LIMIT,
    search,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "true",
  });

  const products = data?.products ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Category filter options — the marine-emergency categories these are filed under.
  const { data: categoriesData } = useGetEmergencyCategoriesQuery({ limit: 100 });
  const categoryOptions = [
    { value: "all", label: M.ALL_CATEGORIES },
    ...(categoriesData?.results?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  // Live KPI stats from the API; cards show "—" while loading and 0 when absent.
  const { data: stats, isLoading: statsLoading } = useGetSpareStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    value: statsLoading ? "—" : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const [deleteSpare, { isLoading: isDeleting }] = useDeleteSpareProductMutation();

  const openDetail = (product: SpareProduct) => {
    setSelectedId(product.id);
    setIsDetailOpen(true);
  };
  const closeDetail = () => setIsDetailOpen(false);

  const openAdd = () => {
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
    textColumn({
      id: "variants",
      header: M.COLUMNS.VARIANTS,
      get: (r) => r.variants,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    textColumn({
      id: "rating",
      header: M.COLUMNS.RATING,
      get: (r) => r.rating,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    statusColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.active,
      activeLabel: M.DETAIL.ACTIVE,
      inactiveLabel: M.DETAIL.INACTIVE,
    }),
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
          <Button
            variant="ghost"
            size="xs"
            title={M.ACTIONS.DELETE}
            onClick={(e) => {
              e.stopPropagation();
              setPendingDelete(r);
            }}
          >
            <IconTrash size={15} className="text-[var(--danger-text)]" />
          </Button>
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
            <Button variant="primary" size="default" onClick={openAdd}>
              <IconPlus size={15} className="mr-1" />
              {M.ADD_PRODUCT}
            </Button>
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
        isLoading={isDeleting}
      />
    </div>
  );
}

export default SparesPage;
