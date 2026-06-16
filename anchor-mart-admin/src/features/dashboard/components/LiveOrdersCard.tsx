import { IconArrowRight, IconEye, IconPackage } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

import { shipPort } from "../lib/orderAdapters";
import type { LiveOrder } from "../types/dashboard.types";

const M = MESSAGES.DASHBOARD;

export interface LiveOrdersCardProps {
  orders: LiveOrder[];
  count: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRowClick: (order: LiveOrder) => void;
  onViewAll: () => void;
}

/**
 * Live Orders preview — a capped, real-time table of recent orders rendered with
 * the shared {@link DataTable} (bare) inside a {@link SectionCard}. Rows and the
 * eye action open the order detail drawer via `onRowClick`.
 */
export function LiveOrdersCard({
  orders,
  count,
  isLoading,
  isError,
  onRetry,
  onRowClick,
  onViewAll,
}: LiveOrdersCardProps) {
  const columns: Column<LiveOrder>[] = [
    {
      id: "order",
      header: M.LIVE_ORDERS_COLUMNS.ORDER_ID,
      className: "td-id",
      cell: (o) => o.order_number,
    },
    {
      id: "sailor",
      header: M.LIVE_ORDERS_COLUMNS.SAILOR,
      cell: (o) => (
        <div className="flex aic g8">
          <div className="av av-sm av-navy">{o.sailor.name[0]}</div>
          <span className="td-p">{o.sailor.name}</span>
        </div>
      ),
    },
    {
      id: "shipport",
      header: M.LIVE_ORDERS_COLUMNS.SHIP_PORT,
      className: "td-m",
      cell: (o) => shipPort(o),
    },
    {
      id: "partner",
      header: M.LIVE_ORDERS_COLUMNS.PARTNER,
      cell: (o) => (
        <span
          className={cn(
            "text-[12.5px] font-semibold",
            o.partner ? "text-[var(--t3)]" : "text-[var(--danger-text)]",
          )}
        >
          {o.partner?.name ?? M.UNASSIGNED}
        </span>
      ),
    },
    {
      id: "status",
      header: M.LIVE_ORDERS_COLUMNS.STATUS,
      cell: (o) => <StatusBadge status={o.status_display} />,
    },
    {
      id: "total",
      header: M.LIVE_ORDERS_COLUMNS.TOTAL,
      className: "td-p",
      cell: (o) => `$${Number(o.total_amount).toFixed(2)}`,
    },
    {
      id: "actions",
      header: "",
      headerClassName: "w-12",
      className: "w-12 text-right",
      cell: (o) => (
        <TableActions
          row={o}
          actions={[
            {
              icon: <IconEye size={14} />,
              title: M.VIEW_DETAIL,
              onClick: (e, row) => {
                e.stopPropagation();
                onRowClick(row);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconPackage size={17} className="text-[var(--t4)]" />}
      title={M.LIVE_ORDERS}
      actions={
        <>
          <span className="sdot on sm text-[var(--success-text)]">{M.REALTIME}</span>
          <Button variant="ghost" size="xs" onClick={onViewAll}>
            {M.VIEW_ALL} <IconArrowRight size={13} />
          </Button>
        </>
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--t4)]">
            {M.SHOWING_ORDERS(orders.length, count)}
          </span>
          <Button variant="ghost" size="xs" onClick={onViewAll}>
            {M.VIEW_ALL_ORDERS} <IconArrowRight size={13} />
          </Button>
        </div>
      }
    >
      <DataTable<LiveOrder>
        bare
        columns={columns}
        data={orders}
        isLoading={isLoading}
        isError={isError}
        error={M.ERROR}
        onRetry={onRetry}
        emptyMessage={M.LIVE_ORDERS_EMPTY}
        showPagination={false}
        onRowClick={onRowClick}
        rowKey="id"
      />
    </SectionCard>
  );
}

export default LiveOrdersCard;
