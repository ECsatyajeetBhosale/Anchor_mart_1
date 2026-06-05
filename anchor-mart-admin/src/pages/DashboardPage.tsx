import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconUsers,
  IconMotorbike,
  IconPackage,
  IconCurrencyDollar,
  IconLoader2,
  IconCircleX,
  IconActivity,
  IconChartBar,
  IconChartDonut,
  IconAward,
  IconAlertCircle,
  IconArrowRight,
  IconEye,
  IconRefresh,
  IconDownload,
  IconDeviceSpeaker,
  IconCup,
  IconPill,
  IconDroplet,
  IconDeviceWatch,
  IconClock,
  IconPackageOff,
  IconMapPin,
  IconBuildingStore,
  IconFileInvoice,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/constants";
import { OrderDetailDrawer, type OrderDetail } from "@/components/shared/OrderDetailDrawer";
import { toast } from "sonner";

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"Today" | "Week" | "Month">("Today");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  // Stats values depending on range (mock change)
  const stats = {
    Today: {
      sailors: "2,847",
      partners: "38",
      orders: "184",
      revenue: "$12.4k",
      inProgress: "47",
      cancelled: "6",
    },
    Week: {
      sailors: "2,912",
      partners: "42",
      orders: "1,148",
      revenue: "$78.2k",
      inProgress: "56",
      cancelled: "24",
    },
    Month: {
      sailors: "3,204",
      partners: "45",
      orders: "4,820",
      revenue: "$324.5k",
      inProgress: "72",
      cancelled: "92",
    },
  }[activeTab];

  const liveOrders: OrderDetail[] = [
    {
      id: "#AM2458",
      sailor: "Lois Becket",
      ship: "IMO 0123456",
      terminal: "Anchorage 2 · PSA",
      partner: "Rahul Singh",
      status: "In Progress",
      total: "$84.00",
      payment: "Card · Paid",
      coupon: "SHIP10",
      items: [
        { name: "Titan Watch", qty: 1, price: "$75.00" },
        { name: "Card Holder", qty: 1, price: "$12.00" },
      ],
    },
    {
      id: "#AM2461",
      sailor: "Ali Mahmoud",
      ship: "MSC Marvela",
      terminal: "MSC Marvela · Berth 7",
      partner: "Rahul Singh",
      status: "Verifying",
      total: "$70.45",
      payment: "Card · Paid",
      items: [
        { name: "Nu Republic Powerbank", qty: 2, price: "$60.00" },
        { name: "Protein Bar", qty: 1, price: "$10.45" },
      ],
    },
    {
      id: "#AM2463",
      sailor: "James Wren",
      ship: "Evergreen Faith",
      terminal: "Evergreen · Brani",
      partner: "Pita Havili",
      status: "Delivering",
      total: "$48.00",
      payment: "Card · Paid",
      coupon: "FREESHIP",
      items: [
        { name: "Coffee Powder", qty: 1, price: "$18.00" },
        { name: "Coastal Charger", qty: 1, price: "$30.00" },
      ],
    },
    {
      id: "#AM2465",
      sailor: "Sara Chen",
      ship: "APL Vanda",
      terminal: "APL Vanda · PSA",
      partner: "Marco Reyes",
      status: "Delivered",
      total: "$94.99",
      payment: "Card · Paid",
      items: [
        { name: "Echo Dot 5th Gen", qty: 1, price: "$59.99" },
        { name: "Echo Buds", qty: 1, price: "$35.00" },
      ],
    },
    {
      id: "#AM2467",
      sailor: "Ravi Patel",
      ship: "IMO 0123456",
      terminal: "IMO 0123456 · PSA",
      partner: "Unassigned",
      status: "New",
      total: "$32.00",
      payment: "Pending",
      items: [
        { name: "Water Bottle 1L", qty: 6, price: "$12.00" },
        { name: "Gillette Shaving Kit", qty: 1, price: "$20.00" },
      ],
    },
  ];

  const activityFeed = [
    { t: "Order #AM2468 placed — 3 items", s: "Maria Santos · MSC Marvela", tm: "1m", bg: "var(--teal-500)", pg: APP_ROUTES.ORDERS },
    { t: "Payment confirmed $70.45 · ENQ-0042", s: "Sailor: Ali Mahmoud", tm: "4m", bg: "var(--green-icon)", pg: APP_ROUTES.ORDERS },
    { t: "ENQ-0042 delivered successfully", s: "Rahul Singh · Berth 7", tm: "8m", bg: "var(--green-icon)", pg: APP_ROUTES.ASSIGNMENTS },
    { t: "Substitute approved — Gillette Fusion", s: "Ali Mahmoud approved", tm: "14m", bg: "var(--amber-400)", pg: APP_ROUTES.VERIFICATION },
    { t: "Order #AM2451 cancelled by sailor", s: "Reason: Ordered by mistake", tm: "21m", bg: "var(--danger-icon)", pg: APP_ROUTES.ORDERS },
    { t: "New sailor registered", s: "Vikram Singh · Singapore", tm: "28m", bg: "var(--info-icon)", pg: APP_ROUTES.SAILORS },
  ];

  const chartVals = [48, 62, 55, 80, 70, 95, 84, 110, 88, 102, 114, 98, 128, 112];
  const chartDays = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

  const statusData = [
    { l: "Delivered", v: 129, p: 70, c: "var(--teal-500)", pg: APP_ROUTES.ORDERS },
    { l: "In Transit", v: 38, p: 21, c: "var(--amber-400)", pg: APP_ROUTES.ASSIGNMENTS },
    { l: "Verifying", v: 11, p: 6, c: "var(--info-icon)", pg: APP_ROUTES.VERIFICATION },
    { l: "Cancelled", v: 6, p: 3, c: "var(--danger-icon)", pg: APP_ROUTES.ORDERS },
  ];

  const products = [
    { n: "Echo Dot 5th Gen", c: "Electronics", o: 34, icon: <IconDeviceSpeaker size={15} /> },
    { n: "Lavazza Coffee", c: "Beverages", o: 28, icon: <IconCup size={15} /> },
    { n: "Cureskin Tablets", c: "Beauty", o: 22, icon: <IconPill size={15} /> },
    { n: "Bisleri Water 1L", c: "Express", o: 19, icon: <IconDroplet size={15} /> },
    { n: "Titan Quartz Watch", c: "Accessories", o: 16, icon: <IconDeviceWatch size={15} /> },
  ];

  const partners = [
    { n: "Rahul Singh", id: "DP-00124", d: 3, st: "Delivering", sc: "teal" as const },
    { n: "Pita Havili", id: "DP-00087", d: 2, st: "Verifying", sc: "warning" as const },
    { n: "Marco Reyes", id: "DP-00201", d: 1, st: "Delivering", sc: "teal" as const },
    { n: "Aisha Karimi", id: "DP-00056", d: 0, st: "Available", sc: "success" as const },
  ];

  const actions = [
    { icon: <IconClock size={16} />, bg: "var(--warning-bg)", c: "var(--warning-icon)", t: "12 orders awaiting payment", s: "48hr window expiring soon", pg: APP_ROUTES.ORDERS, bl: "Review" },
    { icon: <IconPackageOff size={16} />, bg: "var(--danger-bg)", c: "var(--danger-icon)", t: "3 items out of stock", s: "Admin substitution needed", pg: APP_ROUTES.PRODUCTS, bl: "Fix" },
    { icon: <IconMapPin size={16} />, bg: "var(--info-bg)", c: "var(--info-icon)", t: "2 location changes post-payment", s: "Additional charges required", pg: APP_ROUTES.ORDERS, bl: "Review" },
    { icon: <IconBuildingStore size={16} />, bg: "var(--purple-bg)", c: "var(--purple-icon)", t: "4 seller applications pending", s: "Review required", pg: APP_ROUTES.SELLERS, bl: "Open" },
    { icon: <IconFileInvoice size={16} />, bg: "var(--success-bg)", c: "var(--success-icon)", t: "8 new intent requests", s: "Awaiting availability check", pg: APP_ROUTES.INTENTS, bl: "Review" },
  ];

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Operations Dashboard"
        subtitle={
          <p className="pg-sub">
            <span className="sdot on">Live monitoring</span>
            <span className="sep">·</span>
            <span>Friday, 29 May 2026</span>
          </p>
        }
        actions={
          <>
            <div className="pill-toggle">
              {(["Today", "Week", "Month"] as const).map((t) => (
                <div
                  key={t}
                  className={`pill-btn ${activeTab === t ? "active" : ""}`}
                  onClick={() => setActiveTab(t)}
                  style={{ cursor: "pointer" }}
                >
                  {t}
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast.success("Refreshed operational stats")}>
              <IconRefresh size={14} style={{ marginRight: "4px" }} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={() => toast.success("Exported operational report")}>
              <IconDownload size={14} style={{ marginRight: "4px" }} />
              Export
            </Button>
          </>
        }
      />

      {/* Stats Row */}
      <div
        className="stats-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <StatCard
          label="Total Sailors"
          value={stats.sailors}
          icon={<IconUsers size={20} />}
          variant="navy"
          delta={{ value: "14.2%", direction: "up" }}
          footer="vs last month"
          onClick={() => navigate(APP_ROUTES.SAILORS)}
        />
        <StatCard
          label="Active Partners"
          value={stats.partners}
          icon={<IconMotorbike size={20} />}
          variant="teal"
          footer={<span className="sdot on xs w6 csuccess">28 on duty now</span>}
          onClick={() => navigate(APP_ROUTES.PARTNERS)}
        />
        <StatCard
          label="Orders Today"
          value={stats.orders}
          icon={<IconPackage size={20} />}
          variant="blue"
          delta={{ value: "8.1%", direction: "up" }}
          footer="vs yesterday"
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
        <StatCard
          label="Revenue Today"
          value={stats.revenue}
          icon={<IconCurrencyDollar size={20} />}
          variant="green"
          delta={{ value: "6.2%", direction: "up" }}
          footer="vs yesterday"
          onClick={() => navigate(APP_ROUTES.ANALYTICS)}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={<IconLoader2 size={20} className="animate-spin" />}
          variant="amber"
          footer="12 awaiting payment"
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<IconCircleX size={20} />}
          variant="red"
          footer="3 pending refund"
          onClick={() => navigate(APP_ROUTES.ORDERS)}
        />
      </div>

      {/* Grid 2 - Live Orders and Activity Feed */}
      <div
        className="grid-2 mb20"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Live Orders Table */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            overflow: "hidden",
          }}
        >
          <div
            className="card-hd"
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-xs)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconPackage size={18} />
              Live Orders
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="sdot on sm w6 csuccess">Real-time</span>
              <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.ORDERS)}>
                View all <IconArrowRight size={14} style={{ marginLeft: "4px" }} />
              </Button>
            </div>
          </div>
          <div className="tbl-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Order ID</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Sailor</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Ship / Port</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Partner</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Total</th>
                  <th style={{ padding: "12px 18px", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {liveOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="tr-click"
                    onClick={() => setSelectedOrder(o)}
                    style={{
                      borderBottom: "1px solid var(--border-xs)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    <td className="td-id" style={{ padding: "14px 18px", fontWeight: 700, color: "var(--teal-600)" }}>{o.id}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <div className="flex aic g8" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="av av-sm av-navy" style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--navy-50)", color: "var(--navy-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                          {o.sailor[0]}
                        </div>
                        <span className="td-p" style={{ fontWeight: 600, color: "var(--t1)" }}>{o.sailor}</span>
                      </div>
                    </td>
                    <td className="td-m" style={{ padding: "14px 18px", color: "var(--t3)" }}>{o.terminal}</td>
                    <td style={{ padding: "14px 18px", color: o.partner === "Unassigned" ? "var(--danger-text)" : "var(--t2)", fontSize: "12.5px", fontWeight: 600 }}>
                      {o.partner}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <Badge variant={getStatusVariant(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="td-p w7" style={{ padding: "14px 18px", fontWeight: 700 }}>{o.total}</td>
                    <td style={{ padding: "14px 18px" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="View detail"
                        onClick={() => setSelectedOrder(o)}
                        style={{ background: "transparent", border: "none", color: "var(--t3)", cursor: "pointer" }}
                      >
                        <IconEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="card-hd"
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-xs)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconActivity size={18} />
              Activity Feed
            </div>
            <span className="sdot on sm w6 csuccess">Live</span>
          </div>
          <div
            className="card-body-sm live-feed-wrap"
            style={{
              padding: "12px 20px",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {activityFeed.map((f, i) => (
              <div
                key={i}
                className="feed-row"
                onClick={() => navigate(f.pg)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom: i < activityFeed.length - 1 ? "1px dashed var(--border-xs)" : "none",
                  cursor: "pointer",
                }}
              >
                <div
                  className="feed-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: f.bg,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="feed-txt" style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.t}</div>
                  <div className="feed-sub" style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 500 }}>{f.s}</div>
                </div>
                <div className="feed-time" style={{ fontSize: "11.5px", color: "var(--t4)", fontWeight: 600 }}>{f.tm}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 3 - Charts */}
      <div
        className="grid-3 mb20"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Revenue chart */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "20px",
          }}
        >
          <div
            className="card-hd"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconChartBar size={18} />
              Revenue — Last 14 Days
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="pill-toggle">
                <div className="pill-btn active">Daily</div>
                <div className="pill-btn" onClick={() => toast.info("Weekly view loading...")}>Weekly</div>
              </div>
              <Button variant="ghost" size="xs" onClick={() => toast.success("Exported revenue CSV")}>
                <IconDownload size={14} />
              </Button>
            </div>
          </div>
          <div
            className="metric-row"
            style={{
              display: "flex",
              gap: "24px",
              marginBottom: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid var(--border-xs)",
            }}
          >
            <div className="metric-item">
              <div className="metric-lbl" style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Total</div>
              <div className="metric-val" style={{ fontSize: "20px", fontWeight: 800, color: "var(--teal-700)" }}>$168.2k</div>
            </div>
            <div className="metric-sep" style={{ borderLeft: "1px solid var(--border-sm)" }} />
            <div className="metric-item">
              <div className="metric-lbl" style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Avg / Day</div>
              <div className="metric-val" style={{ fontSize: "20px", fontWeight: 800, color: "var(--t1)" }}>$12.0k</div>
            </div>
            <div className="metric-sep" style={{ borderLeft: "1px solid var(--border-sm)" }} />
            <div className="metric-item">
              <div className="metric-lbl" style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Peak Day</div>
              <div className="metric-val" style={{ fontSize: "20px", fontWeight: 800, color: "var(--t1)" }}>$18.4k</div>
            </div>
            <div className="metric-sep" style={{ borderLeft: "1px solid var(--border-sm)" }} />
            <div className="metric-item">
              <div className="metric-lbl" style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Growth</div>
              <div className="metric-val" style={{ fontSize: "20px", fontWeight: 800, color: "var(--green-text)" }}>+18.3%</div>
            </div>
          </div>
          <div className="bar-chart" style={{ height: "120px", display: "flex", alignItems: "end", gap: "8px", position: "relative" }}>
            {chartVals.map((val, idx) => {
              const cls = idx >= 7 ? "hi" : "amber";
              const isHi = cls === "hi";
              return (
                <div
                  key={idx}
                  className={`chart-bar ${cls}`}
                  title={`May ${chartDays[idx]}: $${(val * 145).toLocaleString()}`}
                  onClick={() => toast.info(`May ${chartDays[idx]}: $${(val * 145).toLocaleString()}`)}
                  style={{
                    flex: 1,
                    height: `${(val / 1.3).toFixed(1)}%`,
                    background: isHi ? "var(--teal-500)" : "var(--amber-400)",
                    borderRadius: "4px 4px 0 0",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                />
              );
            })}
          </div>
          <div
            className="chart-labels"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
              fontSize: "10px",
              color: "var(--t4)",
              fontWeight: 600,
            }}
          >
            {chartDays.map((d) => (
              <div key={d} className="chart-label">May {d}</div>
            ))}
          </div>
        </div>

        {/* Order status */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "20px",
          }}
        >
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconChartDonut size={18} />
              Order Status
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {statusData.map((s, idx) => (
              <div
                key={idx}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(s.pg)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--t3)" }}>{s.l}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: s.c }}>{s.v}</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--t4)" }}>{s.p}%</span>
                  </div>
                </div>
                <div className="progress" style={{ height: "6px", background: "var(--border-xs)", borderRadius: "3px", overflow: "hidden" }}>
                  <div className="progress-fill" style={{ height: "100%", width: `${s.p}%`, background: s.c }} />
                </div>
              </div>
            ))}
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11.5px", color: "var(--t4)", fontWeight: 700 }}>Delivery success rate</span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--teal-700)" }}>96.8%</span>
          </div>
        </div>
      </div>

      {/* Grid 3 - Products, Partners, Action Items */}
      <div
        className="grid-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Top Products */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "20px",
          }}
        >
          <div
            className="card-hd"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconAward size={18} />
              Top Products
            </div>
            <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.PRODUCTS)}>
              View all <IconArrowRight size={14} />
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {products.map((p, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => navigate(APP_ROUTES.PRODUCTS)}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", width: "16px" }}>{i + 1}</span>
                <div
                  className="prod-thumb"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border-xs)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--t2)",
                  }}
                >
                  {p.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.n}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)" }}>{p.c}</div>
                </div>
                <Badge variant="teal">{p.o}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Active Partners */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "20px",
          }}
        >
          <div
            className="card-hd"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconMotorbike size={18} />
              Active Partners
            </div>
            <Button variant="ghost" size="xs" onClick={() => navigate(APP_ROUTES.PARTNERS)}>
              View all <IconArrowRight size={14} />
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {partners.map((p, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => navigate(APP_ROUTES.PARTNERS)}
              >
                <div className="av av-teal" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                  {p.n[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--t1)" }}>{p.n}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)" }}>
                    {p.id} {p.d > 0 ? `· ${p.d} active` : "· free"}
                  </div>
                </div>
                <Badge variant={p.sc}>{p.st}</Badge>
              </div>
            ))}
          </div>
          <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "14px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
            <span style={{ color: "var(--t4)", fontWeight: 700 }}>Weekly partner earnings</span>
            <span style={{ fontWeight: 800, color: "var(--amber-700)" }}>$3,400</span>
          </div>
        </div>

        {/* Action Required */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "20px",
          }}
        >
          <div
            className="card-hd"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconAlertCircle size={18} />
              Action Required
            </div>
            <Badge variant="danger">7 open</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {actions.map((a, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "10px", alignItems: "start" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    background: a.bg,
                    color: a.c,
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--t1)", lineHeight: 1.2 }}>{a.t}</div>
                  <div style={{ fontSize: "10px", color: "var(--t4)", marginTop: "2px" }}>{a.s}</div>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => navigate(a.pg)}
                  style={{ flexShrink: 0 }}
                >
                  {a.bl}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}

// Helper function to map order statuses to badge variants
function getStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "delivered":
      return "success";
    case "in progress":
    case "delivering":
      return "teal";
    case "verifying":
      return "info";
    case "new":
      return "neutral";
    case "cancelled":
      return "danger";
    default:
      return "warning";
  }
}
