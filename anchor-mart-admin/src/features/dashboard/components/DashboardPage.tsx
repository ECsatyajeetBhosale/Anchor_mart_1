import {
  IconAlertCircle,
  IconArrowRight,
  IconAward,
  IconBuildingStore,
  IconChartBar,
  IconCircleX,
  IconClock,
  IconCup,
  IconDeviceSpeaker,
  IconDeviceWatch,
  IconDownload,
  IconDroplet,
  IconEye,
  IconFileInvoice,
  IconLoader2,
  IconMapPin,
  IconMotorbike,
  IconPackage,
  IconPackageOff,
  IconPill,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DashboardOrderDrawer } from "@/components/common/DashboardOrderDrawer";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import type { OrderDetail } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApiMessage } from "@/lib/apiError";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { skipToken } from "@reduxjs/toolkit/query";
import { toast } from "sonner";
import { useGetLiveOrderDetailsQuery } from "../api/dashboardApi";
import { useDashboard } from "../hooks/useDashboard";
import type {
  ActionItem,
  ActivePartner,
  LiveOrder,
  LiveOrderDetailsResponse,
  TopProduct,
} from "../types/dashboard.types";

/* ─── Mock data for the remaining non-stats sections (chart, lists) ───────── */
const CHART_VALS = [48, 62, 55, 80, 70, 95, 84, 110, 88, 102, 114, 98, 128, 112];
const CHART_DAYS = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
const CHART_MAX = Math.max(...CHART_VALS);

const TOP_PRODUCTS: TopProduct[] = [
  {
    name: "Echo Dot 5th Gen",
    category: "Electronics",
    orders: 34,
    icon: <IconDeviceSpeaker size={15} />,
  },
  { name: "Lavazza Coffee", category: "Beverages", orders: 28, icon: <IconCup size={15} /> },
  { name: "Cureskin Tablets", category: "Beauty", orders: 22, icon: <IconPill size={15} /> },
  { name: "Bisleri Water 1L", category: "Express", orders: 19, icon: <IconDroplet size={15} /> },
  {
    name: "Titan Quartz Watch",
    category: "Accessories",
    orders: 16,
    icon: <IconDeviceWatch size={15} />,
  },
];

const ACTIVE_PARTNERS: ActivePartner[] = [
  { name: "Rahul Singh", id: "DP-00124", active: 3, status: "Delivering", variant: "teal" },
  { name: "Pita Havili", id: "DP-00087", active: 2, status: "Verifying", variant: "warning" },
  { name: "Marco Reyes", id: "DP-00201", active: 1, status: "Delivering", variant: "teal" },
  { name: "Aisha Karimi", id: "DP-00056", active: 0, status: "Available", variant: "success" },
];

const ACTION_ITEMS: ActionItem[] = [
  {
    icon: <IconClock size={16} />,
    bg: "var(--warning-bg)",
    color: "var(--warning-icon)",
    title: "12 orders awaiting payment",
    sub: "48hr window expiring soon",
    route: APP_ROUTES.ORDERS,
    label: "Review",
  },
  {
    icon: <IconPackageOff size={16} />,
    bg: "var(--danger-bg)",
    color: "var(--danger-icon)",
    title: "3 items out of stock",
    sub: "Admin substitution needed",
    route: APP_ROUTES.PRODUCTS,
    label: "Fix",
  },
  {
    icon: <IconMapPin size={16} />,
    bg: "var(--info-bg)",
    color: "var(--info-icon)",
    title: "2 location changes post-payment",
    sub: "Additional charges required",
    route: APP_ROUTES.ORDERS,
    label: "Review",
  },
  {
    icon: <IconBuildingStore size={16} />,
    bg: "var(--purple-bg)",
    color: "var(--purple-icon)",
    title: "4 seller applications pending",
    sub: "Review required",
    route: APP_ROUTES.SELLERS,
    label: "Open",
  },
  {
    icon: <IconFileInvoice size={16} />,
    bg: "var(--success-bg)",
    color: "var(--success-icon)",
    title: "8 new intent requests",
    sub: "Awaiting availability check",
    route: APP_ROUTES.INTENTS,
    label: "Review",
  },
];

/** Compose the "Ship / Port" cell from the live-order ship + port name. */
function shipPort(order: LiveOrder): string {
  return order.port?.name ? `${order.ship} · ${order.port.name}` : order.ship;
}

/**
 * Adapt a list row to the {@link OrderDetail} the detail drawer expects. The
 * list endpoint omits items/payment, so those are left empty — the drawer still
 * opens with the order's summary fields.
 */
function toOrderDetail(order: LiveOrder): OrderDetail {
  return {
    id: order.order_number,
    sailor: order.sailor.name,
    ship: order.ship,
    terminal: shipPort(order),
    partner: order.partner?.name ?? "Unassigned",
    status: order.status_display,
    total: `$${Number(order.total_amount).toFixed(2)}`,
    payment: "—",
    items: [],
  };
}

/** Map the full details payload to the drawer's {@link OrderDetail} shape. */
function detailsToOrderDetail(d: LiveOrderDetailsResponse): OrderDetail {
  const info = d.information;
  return {
    id: d.order_number,
    sailor: info.sailor?.name ?? "—",
    ship: info.ship ? `${info.ship.vessel_name} · IMO ${info.ship.imo}` : "—",
    terminal: info.terminal ?? "—",
    partner: info.delivery_partner?.name ?? "Unassigned",
    status: d.status_display,
    total: `$${d.totals.total_amount.toFixed(2)}`,
    payment: info.payment ? `${info.payment.method} · ${info.payment.status}` : "—",
    coupon: info.coupon ?? undefined,
    items: d.items.map((it) => ({
      name: it.name,
      qty: it.quantity,
      price: `$${it.subtotal.toFixed(2)}`,
    })),
  };
}

/* ─── Status → badge variant map ─────────────────────── */
function getStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "delivered":
      return "success" as const;
    case "in progress":
    case "delivering":
      return "teal" as const;
    case "verifying":
      return "info" as const;
    case "new":
      return "neutral" as const;
    case "cancelled":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}

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
  } = useDashboard();

  // Fetch live-order details only while the drawer is open; refetch when the id
  // changes; skip (and reset) when closed. RTK Query caches per id.
  const orderDetails = useGetLiveOrderDetailsQuery(selectedOrderId ?? skipToken);

  // Show the row summary instantly, then swap to the full details once loaded.
  const drawerOrder = orderDetails.data ? detailsToOrderDetail(orderDetails.data) : selectedOrder;

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
      toast.error(getApiMessage(error) ?? MESSAGES.DASHBOARD.ERROR);
    }
  }, [isError, error]);

  // Keep the drawer usable even if the details request fails.
  useEffect(() => {
    if (orderDetails.isError) {
      toast.error(getApiMessage(orderDetails.error) ?? MESSAGES.DASHBOARD.ERROR);
    }
  }, [orderDetails.isError, orderDetails.error]);

  return (
    <div className="page-enter">
      {/* ── Page Header ───────────────────────────────── */}
      <PageHeader
        title="Operations Dashboard"
        actions={
          <>
            {/* Time range toggle */}
            <div className="pill-toggle">
              {(["Today", "Week", "Month"] as const).map((t) => (
                <div
                  key={t}
                  className={`pill-btn${activeTab === t ? " active" : ""}`}
                  onClick={() => selectPeriod(t)}
                  style={{ cursor: "pointer" }}
                >
                  {t}
                </div>
              ))}
            </div>

            <DateRangePicker value={dateRange} onChange={setDateRange} />

            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              <IconRefresh size={14} />
              Refresh
            </Button>

            <Button variant="primary" size="sm" onClick={() => toast.success("Report exported")}>
              <IconDownload size={14} />
              Export
            </Button>
          </>
        }
      />

      {/* ── Stats Row (7 cards) ────────────────────────── */}
      <div className="stats-row cols-7">
        <StatCard
          label="Total Sailors"
          value={stats.totalSailors}
          icon={<IconUsers size={19} />}
          variant="navy"
          onClick={() => navigate(APP_ROUTES.SAILORS)}
        />
        <StatCard
          label="Active Partners"
          value={stats.activePartners}
          icon={<IconMotorbike size={19} />}
          variant="teal"
          onClick={() => navigate(APP_ROUTES.PARTNERS)}
        />
        <StatCard
          label="Orders"
          value={stats.ordersPlaced}
          icon={<IconPackage size={19} />}
          variant="blue"
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
        <StatCard
          label="Intents Received"
          value={stats.intentReceived}
          icon={<IconFileInvoice size={19} />}
          variant="green"
          onClick={() => navigate(APP_ROUTES.INTENTS)}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<IconLoader2 size={19} className="animate-spin" />}
          variant="amber"
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<IconCircleX size={19} />}
          variant="red"
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
        <StatCard
          label="Pending Intents"
          value={stats.pendingIntents}
          icon={<IconFileInvoice size={19} />}
          variant="purple"
          onClick={() => navigate(APP_ROUTES.INTENTS)}
        />
      </div>

      {/* ── Row 1: Live Orders ── */}
      <div className="mb20">
        {/* Live Orders table */}
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl">
              <IconPackage size={17} style={{ color: "var(--t4)" }} />
              Live Orders
            </div>
            <div className="card-acts">
              <span
                className="sdot on sm"
                style={{ color: "var(--success-text)", fontSize: "12px", fontWeight: 600 }}
              >
                Real-time
              </span>
              <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.ORDERS)}>
                View all <IconArrowRight size={13} />
              </Button>
            </div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Sailor</th>
                  <th>Ship / Port</th>
                  <th>Partner</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th style={{ width: "40px" }} />
                </tr>
              </thead>
              <tbody>
                {liveOrders.isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="td-m"
                      style={{ textAlign: "center", padding: "28px" }}
                    >
                      {MESSAGES.DASHBOARD.LOADING}
                    </td>
                  </tr>
                ) : liveOrders.isError ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                        }}
                      >
                        <span className="td-m" style={{ color: "var(--danger-text)" }}>
                          {MESSAGES.DASHBOARD.ERROR}
                        </span>
                        <Button variant="ghost" size="xs" onClick={() => liveOrders.refetch()}>
                          <IconRefresh size={13} />
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : liveOrders.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="td-m"
                      style={{ textAlign: "center", padding: "28px" }}
                    >
                      {MESSAGES.DASHBOARD.LIVE_ORDERS_EMPTY}
                    </td>
                  </tr>
                ) : (
                  liveOrders.items.map((order) => (
                    <tr key={order.id} className="tr-click" onClick={() => openOrder(order)}>
                      <td className="td-id">{order.order_number}</td>
                      <td>
                        <div className="flex aic g8">
                          <div className="av av-sm av-navy">{order.sailor.name[0]}</div>
                          <span className="td-p">{order.sailor.name}</span>
                        </div>
                      </td>
                      <td className="td-m">{shipPort(order)}</td>
                      <td
                        style={{
                          color: order.partner ? "var(--t3)" : "var(--danger-text)",
                          fontSize: "12.5px",
                          fontWeight: 600,
                        }}
                      >
                        {order.partner?.name ?? "Unassigned"}
                      </td>
                      <td>
                        <Badge variant={getStatusVariant(order.status_display)}>
                          {order.status_display}
                        </Badge>
                      </td>
                      <td className="td-p w7">${Number(order.total_amount).toFixed(2)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="View detail"
                          onClick={() => openOrder(order)}
                        >
                          <IconEye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            className="card-foot"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--t4)" }}>
              Showing {liveOrders.items.length} of {liveOrders.count} orders
            </span>
            <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.ORDERS)}>
              View all orders <IconArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Row 2: Revenue Chart ───────────────────────── */}
      <div className="mb20">
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl">
              <IconChartBar size={17} style={{ color: "var(--t4)" }} />
              Revenue — Last 14 Days
            </div>
            <div className="card-acts">
              <div className="pill-toggle">
                <div className="pill-btn active">Daily</div>
                <div
                  className="pill-btn"
                  style={{ cursor: "pointer" }}
                  onClick={() => toast.info("Weekly view loading…")}
                >
                  Weekly
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => toast.success("Revenue CSV exported")}
              >
                <IconDownload size={14} />
              </Button>
            </div>
          </div>

          {/* Metrics summary row */}
          <div className="metric-row">
            <div className="metric-item">
              <div className="metric-lbl">Total</div>
              <div className="metric-val" style={{ color: "var(--teal-700)" }}>
                $168.2k
              </div>
            </div>
            <div className="metric-sep" />
            <div className="metric-item">
              <div className="metric-lbl">Avg / Day</div>
              <div className="metric-val">$12.0k</div>
            </div>
            <div className="metric-sep" />
            <div className="metric-item">
              <div className="metric-lbl">Peak Day</div>
              <div className="metric-val">$18.4k</div>
            </div>
            <div className="metric-sep" />
            <div className="metric-item">
              <div className="metric-lbl">Growth</div>
              <div className="metric-val" style={{ color: "var(--green-text)" }}>
                +18.3%
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card-body">
            <div className="bar-chart">
              {CHART_VALS.map((val, idx) => (
                <div
                  key={idx}
                  className={`chart-bar ${idx >= 7 ? "hi" : "amber"}`}
                  title={`May ${CHART_DAYS[idx]}: $${(val * 145).toLocaleString()}`}
                  onClick={() =>
                    toast.info(`May ${CHART_DAYS[idx]}: $${(val * 145).toLocaleString()}`)
                  }
                  style={{ height: `${Math.round((val / CHART_MAX) * 100)}%` }}
                />
              ))}
            </div>
            <div className="chart-labels">
              {CHART_DAYS.map((d) => (
                <div key={d} className="chart-label">
                  May {d}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Top Products · Active Partners · Action Required ── */}
      <div className="grid-3">
        {/* Top Products */}
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl">
              <IconAward size={17} style={{ color: "var(--t4)" }} />
              Top Products
            </div>
            <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.PRODUCTS)}>
              View all <IconArrowRight size={13} />
            </Button>
          </div>
          <div
            className="card-body-sm"
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {TOP_PRODUCTS.map((p, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => navigate(APP_ROUTES.PRODUCTS)}
              >
                {/* Rank */}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "var(--t4)",
                    width: "16px",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>

                {/* Thumbnail */}
                <div
                  className="prod-thumb"
                  style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)" }}
                >
                  {p.icon}
                </div>

                {/* Name + category */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "var(--t1)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)" }}>{p.category}</div>
                </div>

                <Badge variant="teal">{p.orders}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Active Partners */}
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl">
              <IconMotorbike size={17} style={{ color: "var(--t4)" }} />
              Active Partners
            </div>
            <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.PARTNERS)}>
              View all <IconArrowRight size={13} />
            </Button>
          </div>
          <div
            className="card-body-sm"
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {ACTIVE_PARTNERS.map((p, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => navigate(APP_ROUTES.PARTNERS)}
              >
                <div
                  className="av av-teal"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "var(--teal-50)",
                    color: "var(--teal-700)",
                    flexShrink: 0,
                  }}
                >
                  {p.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--t1)" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)" }}>
                    {p.id} · {p.active > 0 ? `${p.active} active` : "free"}
                  </div>
                </div>
                <Badge variant={p.variant}>{p.status}</Badge>
              </div>
            ))}
          </div>

          {/* Earnings footer */}
          <div
            className="card-foot"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--t4)" }}>
              Weekly partner earnings
            </span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--amber-700)" }}>
              $3,400
            </span>
          </div>
        </div>

        {/* Action Required */}
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl">
              <IconAlertCircle size={17} style={{ color: "var(--t4)" }} />
              Action Required
            </div>
            <Badge variant="danger">7 open</Badge>
          </div>
          <div
            className="card-body-sm"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {ACTION_ITEMS.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                {/* Icon box */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    background: a.bg,
                    color: a.color,
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--t1)",
                      lineHeight: 1.3,
                    }}
                  >
                    {a.title}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)", marginTop: "2px" }}>
                    {a.sub}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => navigate(a.route)}
                  style={{ flexShrink: 0 }}
                >
                  {a.label}
                </Button>
              </div>
            ))}
          </div>
        </div>
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
