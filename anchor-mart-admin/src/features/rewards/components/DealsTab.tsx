import { IconDiscount2, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PillToggle } from "@/components/common/PillToggle";
import { Search } from "@/components/common/Search";
import { SectionCard } from "@/components/common/SectionCard";
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
import type { Deal, DealStatus } from "../types/reward.types";
import { DealFormDrawer } from "./DealFormDrawer";

const M = MESSAGES.PROMOTION.DEALS;
const DASH = MESSAGES.PROMOTION.DASH;
const LIMIT = 10;

/** Deal of the Day management — schedule, activate and price daily offers. */
export function DealsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DealStatus | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [toDelete, setToDelete] = useState<Deal | null>(null);

  const { data, isLoading, isError, refetch } = useGetDealsQuery({
    page,
    limit: LIMIT,
    search,
    status,
  });
  const { data: stats, isLoading: statsLoading } = useGetDealStatsQuery();
  // The live set is a different question from the schedule, so it gets its own
  // strip above the table rather than a filter on it.
  const { data: liveDeals = [] } = useGetDealsOfDayQuery();

  const [toggleDeal] = useToggleDealMutation();
  const [deleteDeal, { isLoading: isDeleting }] = useDeleteDealMutation();

  const deals = data?.deals ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  /**
   * The status buckets, as a **filter strip rather than stat cards**.
   *
   * They are not a partition of `total` and must not look like one: `expired`
   * and `inactive` overlap (a switched-off deal whose dates have passed is in
   * both), and an inactive deal still inside its window is in neither
   * `active_now` nor `scheduled`. On the backend's own current data that is
   * 3 + 2 + 2 + 2 = 9 against a total of 7.
   *
   * A `StatsGrid` would have implied otherwise — everywhere else in this console
   * it heads a set of mutually exclusive counts that do sum (Orders' six
   * statuses, Intents' six funnel stages). This is the same shape as the Orders
   * order-type filter, whose counts also overlap by design, so it gets the same
   * control.
   *
   * Two of these were reading keys the API does not send — `active` and
   * `upcoming` against its `active_now` and `scheduled` — so both showed 0
   * however many deals were running; `inactive` was not read at all.
   */
  const statusOptions: { label: string; value: DealStatus | "all" }[] = [
    { label: `${M.STATS.TOTAL} · ${statsLoading ? DASH : (stats?.total ?? 0)}`, value: "all" },
    {
      label: `${M.STATS.ACTIVE} · ${statsLoading ? DASH : (stats?.active_now ?? 0)}`,
      value: "active_now",
    },
    {
      label: `${M.STATS.UPCOMING} · ${statsLoading ? DASH : (stats?.scheduled ?? 0)}`,
      value: "scheduled",
    },
    {
      label: `${M.STATS.EXPIRED} · ${statsLoading ? DASH : (stats?.expired ?? 0)}`,
      value: "expired",
    },
    {
      label: `${M.STATS.INACTIVE} · ${statsLoading ? DASH : (stats?.inactive ?? 0)}`,
      value: "inactive",
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
    // The variant's own price, struck through beside the deal price — a deal
    // row without it states a number and leaves the discount to be guessed.
    {
      id: "original",
      header: M.COLUMNS.ORIGINAL,
      className: "td-m",
      cell: (d) => <span className="line-through text-[var(--t4)]">{d.originalPrice}</span>,
    },
    { id: "price", header: M.COLUMNS.PRICE, className: "td-p", cell: (d) => d.dealPrice },
    {
      // The backend's own figure — computed from `variant.price` and
      // `deal_price` when the create call omits it, so it is never re-derived
      // here.
      id: "discount",
      header: M.COLUMNS.DISCOUNT,
      className: "td-p",
      cell: (d) => d.discountPercentage,
    },
    {
      id: "window",
      header: M.COLUMNS.WINDOW,
      className: "td-m",
      cell: (d) =>
        d.startTime || d.endTime ? `${d.startTime || DASH} → ${d.endTime || DASH}` : DASH,
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
      {/* Each option is a `?status=` value the list accepts; "All" clears it.
          The counts overlap — see `statusOptions`. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="sec-label !mb-0">{M.STATUS_FILTER_LABEL}</span>
        <PillToggle
          options={statusOptions}
          value={status === "" ? "all" : status}
          onChange={(value) => {
            setStatus(value === "all" ? "" : value);
            setPage(1);
          }}
        />
      </div>

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
          <div className="flex items-center gap-2">
            {/* Server-side, over variant SKU and product name. */}
            <Search
              value={search}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={M.SEARCH_PLACEHOLDER}
              debounceMs={300}
              style={{ width: "240px" }}
            />
            <Button variant="primary" size="sm" onClick={openAdd}>
              <IconPlus size={15} className="mr-1" />
              {M.ADD}
            </Button>
          </div>
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
