import {
  IconCalendarClock,
  IconCircleCheck,
  IconCircleOff,
  IconDiscount2,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SectionCard } from "@/components/common/SectionCard";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import {
  useDeleteDealMutation,
  useGetDealStatsQuery,
  useGetDealsOfDayQuery,
  useGetDealsQuery,
  useToggleDealMutation,
} from "../api/promotionApi";
import type { Deal } from "../types/reward.types";
import { DealFormDrawer } from "./DealFormDrawer";

const M = MESSAGES.PROMOTION.DEALS;
const DASH = MESSAGES.PROMOTION.DASH;
const LIMIT = 10;

/** Deal of the Day management — schedule, activate and price daily offers. */
export function DealsTab() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [toDelete, setToDelete] = useState<Deal | null>(null);

  const { data, isLoading, isError, refetch } = useGetDealsQuery({ page, limit: LIMIT });
  const { data: stats, isLoading: statsLoading } = useGetDealStatsQuery();
  // The live set is a different question from the schedule, so it gets its own
  // strip above the table rather than a filter on it.
  const { data: liveDeals = [] } = useGetDealsOfDayQuery();

  const [toggleDeal] = useToggleDealMutation();
  const [deleteDeal, { isLoading: isDeleting }] = useDeleteDealMutation();

  const deals = data?.deals ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const statItems = [
    {
      id: "total",
      label: M.STATS.TOTAL,
      footer: M.STATS.TOTAL_FOOTER,
      value: statsLoading ? DASH : (stats?.total ?? 0).toLocaleString(),
      icon: <IconDiscount2 size={20} />,
      variant: "navy" as const,
    },
    {
      id: "active",
      label: M.STATS.ACTIVE,
      footer: M.STATS.ACTIVE_FOOTER,
      value: statsLoading ? DASH : (stats?.active ?? 0).toLocaleString(),
      icon: <IconCircleCheck size={20} />,
      variant: "green" as const,
    },
    {
      id: "upcoming",
      label: M.STATS.UPCOMING,
      footer: M.STATS.UPCOMING_FOOTER,
      value: statsLoading ? DASH : (stats?.upcoming ?? 0).toLocaleString(),
      icon: <IconCalendarClock size={20} />,
      variant: "amber" as const,
    },
    {
      id: "expired",
      label: M.STATS.EXPIRED,
      footer: M.STATS.EXPIRED_FOOTER,
      value: statsLoading ? DASH : (stats?.expired ?? 0).toLocaleString(),
      icon: <IconCircleOff size={20} />,
      variant: "red" as const,
    },
  ];

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setFormOpen(true);
  };

  const handleToggle = async (deal: Deal, next: boolean) => {
    try {
      await toggleDeal({ id: deal.id, isActive: next }).unwrap();
      toast.success(M.TOAST.TOGGLED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.TOGGLE_ERROR);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteDeal(toDelete.id).unwrap();
      toast.success(M.TOAST.DELETED);
      setToDelete(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.DELETE_ERROR);
    }
  };

  const columns: Column<Deal>[] = [
    { id: "product", header: M.COLUMNS.PRODUCT, cell: (d) => d.productName },
    { id: "variant", header: M.COLUMNS.VARIANT, className: "td-id", cell: (d) => d.variantSku },
    { id: "price", header: M.COLUMNS.PRICE, className: "td-p", cell: (d) => d.dealPrice },
    {
      id: "window",
      header: M.COLUMNS.WINDOW,
      className: "td-m",
      cell: (d) => (d.startTime || d.endTime ? `${d.startTime || DASH} → ${d.endTime || DASH}` : DASH),
    },
    {
      id: "active",
      header: M.COLUMNS.ACTIVE,
      cell: (d) => (
        <Switch
          checked={d.isActive}
          onCheckedChange={(next) => handleToggle(d, next)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-24 text-right",
      headerClassName: "text-right",
      cell: (d) => (
        <div className="td-acts">
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(d);
            }}
          >
            <IconEdit size={15} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              setToDelete(d);
            }}
          >
            <IconTrash size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <StatsGrid items={statItems} />

      <SectionCard
        icon={<IconDiscount2 size={18} />}
        title={M.TODAY_TITLE}
        bodyPadding="sm"
        className="mb-5"
      >
        {liveDeals.length === 0 ? (
          <p className="text-[12.5px] text-[var(--t4)]">{M.TODAY_EMPTY}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {liveDeals.map((d) => (
              <span
                key={d.id}
                className="rounded-[var(--radius-sm)] bg-[var(--navy-25)] px-3 py-1.5 text-[12px] font-semibold text-[var(--t1)]"
              >
                {d.productName} · {d.dealPrice}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<IconDiscount2 size={18} />}
        title={M.TITLE}
        bodyPadding="none"
        actions={
          <Button variant="primary" size="sm" onClick={openAdd}>
            <IconPlus size={15} className="mr-1" />
            {M.ADD}
          </Button>
        }
      >
        <DataTable
          columns={columns}
          data={deals}
          rowKey="id"
          page={page}
          pages={totalPages}
          isLoading={isLoading}
          isError={isError}
          error={isError ? M.FETCH_ERROR : null}
          onRetry={refetch}
          onPageChange={setPage}
          showPagination
          emptyMessage={M.EMPTY}
          onRowClick={openEdit}
          bare
        />
      </SectionCard>

      <DealFormDrawer deal={editing} isOpen={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={M.CONFIRM_DELETE.TITLE}
        description={toDelete ? M.CONFIRM_DELETE.MESSAGE(toDelete.productName) : ""}
        confirmText={M.CONFIRM_DELETE.CONFIRM}
      />
    </>
  );
}

export default DealsTab;
