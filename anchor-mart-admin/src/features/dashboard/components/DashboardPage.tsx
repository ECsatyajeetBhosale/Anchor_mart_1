import { skipToken } from "@reduxjs/toolkit/query";
import {
  IconCircleX,
  IconDownload,
  IconFileInvoice,
  IconMotorbike,
  IconPackage,
  IconProgress,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DashboardOrderDrawer } from "@/components/common/DashboardOrderDrawer";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import type { OrderDetail } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { PillToggle } from "@/components/common/PillToggle";
import { StatsGrid, type StatsGridItem } from "@/components/common/StatsGrid";
import { Button } from "@/components/ui/button";
import { getApiMessage } from "@/lib/apiError";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

import { useGetLiveOrderDetailsQuery } from "../api/dashboardApi";
import { useDashboard } from "../hooks/useDashboard";
import { detailsToOrderDetail, toOrderDetail } from "../lib/orderAdapters";
import type { LiveOrder, TimeRange } from "../types/dashboard.types";
import { ActionRequiredCard } from "./ActionRequiredCard";
import { ActivePartnersCard } from "./ActivePartnersCard";
import { LiveOrdersCard } from "./LiveOrdersCard";
import { RevenueChartCard } from "./RevenueChartCard";
import { TopProductsCard } from "./TopProductsCard";

const M = MESSAGES.DASHBOARD;

/** Period toggle options (values map 1:1 to {@link TimeRange}). */
const PERIOD_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: M.PERIOD.TODAY, value: "Today" },
  { label: M.PERIOD.WEEK, value: "Week" },
  { label: M.PERIOD.MONTH, value: "Month" },
];

/* ═══════════════════════════════════════════════════════
   DashboardPage
════════════════════════════════════════════════════════ */
export function DashboardPage() {
  const navigate = useNavigate();
  // Row summary feeds the drawer's static fields; the UUID drives the details fetch.
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    activeTab,
    selectPeriod,
    dateRange,
    setDateRange,
    stats,
    isError,
    error,
    refetch,
    liveOrders,
    topProducts,
    activePartners,
    actionRequired,
  } = useDashboard();

  // Fetch live-order details only while the drawer is open; refetch when the id
  // changes; skip (and reset) when closed. RTK Query caches per id.
  const orderDetails = useGetLiveOrderDetailsQuery(selectedOrderId ?? skipToken);

  // Drawer visibility is driven solely by `selectedOrder`, so closing always
  // wins even if RTK Query still holds the previous order's cached details.
  // While open, swap the row summary for the full details once they load.
  const drawerOrder = selectedOrder
    ? orderDetails.data
      ? detailsToOrderDetail(orderDetails.data)
      : selectedOrder
    : null;

  // Open the drawer with the row summary + its id for the details fetch.
  const openOrder = (order: LiveOrder) => {
    setSelectedOrder(toOrderDetail(order));
    setSelectedOrderId(order.id);
  };

  const closeOrder = () => {
    setSelectedOrder(null);
    setSelectedOrderId(null);
  };

  // Surface load failures through the shared toast convention.
  useEffect(() => {
    if (isError) {
      toast.error(getApiMessage(error) ?? M.ERROR);
    }
  }, [isError, error]);

  // Keep the drawer usable even if the details request fails.
  useEffect(() => {
    if (orderDetails.isError) {
      toast.error(getApiMessage(orderDetails.error) ?? M.ERROR);
    }
  }, [orderDetails.isError, orderDetails.error]);

  const statCards: StatsGridItem[] = [
    {
      id: "sailors",
      label: M.STATS.TOTAL_SAILORS,
      value: stats.totalSailors,
      icon: <IconUsers size={19} />,
      variant: "navy",
      onClick: () => navigate(APP_ROUTES.SAILORS),
    },
    {
      id: "partners",
      label: M.STATS.ACTIVE_PARTNERS,
      value: stats.activePartners,
      icon: <IconMotorbike size={19} />,
      variant: "teal",
      onClick: () => navigate(APP_ROUTES.PARTNERS),
    },
    {
      id: "orders",
      label: M.STATS.ORDERS,
      value: stats.ordersPlaced,
      icon: <IconPackage size={19} />,
      variant: "blue",
      onClick: () => navigate(APP_ROUTES.ORDERS),
    },
    {
      id: "intents",
      label: M.STATS.INTENTS_RECEIVED,
      value: stats.intentReceived,
      icon: <IconFileInvoice size={19} />,
      variant: "green",
      onClick: () => navigate(APP_ROUTES.INTENTS),
    },
    {
      id: "in-progress",
      label: M.STATS.IN_PROGRESS,
      value: stats.inProgress,
      icon: <IconProgress size={19} />,
      variant: "amber",
      onClick: () => navigate(APP_ROUTES.ORDERS),
    },
    {
      id: "cancelled",
      label: M.STATS.CANCELLED,
      value: stats.cancelled,
      icon: <IconCircleX size={19} />,
      variant: "red",
      onClick: () => navigate(APP_ROUTES.ORDERS),
    },
    {
      id: "pending-intents",
      label: M.STATS.PENDING_INTENTS,
      value: stats.pendingIntents,
      icon: <IconFileInvoice size={19} />,
      variant: "purple",
      onClick: () => navigate(APP_ROUTES.INTENTS),
    },
  ];

  return (
    <div className="page-enter">
      {/* ── Page Header ───────────────────────────────── */}
      <PageHeader
        title={M.TITLE}
        actions={
          <>
            <PillToggle<TimeRange>
              options={PERIOD_OPTIONS}
              value={activeTab}
              onChange={selectPeriod}
            />

            <DateRangePicker value={dateRange} onChange={setDateRange} />

            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <IconRefresh size={14} />
              {M.REFRESH}
            </Button>

            <Button variant="primary" size="sm" onClick={() => toast.success(M.REPORT_EXPORTED)}>
              <IconDownload size={14} />
              {M.EXPORT}
            </Button>
          </>
        }
      />

      {/* ── Stats Row (7 cards) ────────────────────────── */}
      <StatsGrid className="cols-7" items={statCards} />

      {/* ── Row 1: Live Orders ─────────────────────────── */}
      <div className="mb20">
        <LiveOrdersCard
          orders={liveOrders.items}
          count={liveOrders.count}
          isLoading={liveOrders.isLoading}
          isError={liveOrders.isError}
          onRetry={liveOrders.refetch}
          onRowClick={openOrder}
          onViewAll={() => navigate(APP_ROUTES.ORDERS)}
        />
      </div>

      {/* ── Row 2: Revenue Chart ───────────────────────── */}
      <div className="mb20">
        <RevenueChartCard dateRange={dateRange} />
      </div>

      {/* ── Row 3: Top Products · Active Partners · Action Required ── */}
      <div className="grid-3">
        <TopProductsCard
          items={topProducts.items}
          isLoading={topProducts.isLoading}
          isError={topProducts.isError}
          onRetry={topProducts.refetch}
          onViewAll={() => navigate(APP_ROUTES.PRODUCTS)}
          onSelect={() => navigate(APP_ROUTES.PRODUCTS)}
        />
        <ActivePartnersCard
          items={activePartners.items}
          isLoading={activePartners.isLoading}
          isError={activePartners.isError}
          onRetry={activePartners.refetch}
          onViewAll={() => navigate(APP_ROUTES.PARTNERS)}
          onSelect={() => navigate(APP_ROUTES.PARTNERS)}
        />
        <ActionRequiredCard
          items={actionRequired.items}
          total={actionRequired.total}
          isLoading={actionRequired.isLoading}
          isError={actionRequired.isError}
          onRetry={actionRequired.refetch}
        />
      </div>

      {/* ── Order Detail Drawer ────────────────────────── */}
      <DashboardOrderDrawer
        order={drawerOrder}
        onClose={closeOrder}
        timeline={orderDetails.data?.timeline}
        timelineLoading={orderDetails.isFetching}
      />
    </div>
  );
}
