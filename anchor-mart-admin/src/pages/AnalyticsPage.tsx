import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconCurrencyDollar,
  IconPackage,
  IconCircleCheck,
  IconUsers,
  IconReceipt,
  IconCircleX,
  IconCalendar,
  IconDownload,
  IconMapPin,
  IconTrophy,
  IconBolt,
  IconChartBar,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_ROUTES } from "@/lib/constants";
import { toast } from "sonner";

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"7 Days" | "30 Days" | "Quarter" | "Year">("7 Days");

  const sales = [55, 42, 70, 88, 60, 95, 78, 90, 65, 88, 95, 72, 100, 84];
  const salesDays = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

  const categories = [
    { n: "Fashion", v: 85 },
    { n: "Beauty", v: 70 },
    { n: "Fitness", v: 60 },
    { n: "Elec.", v: 95 },
    { n: "Marine", v: 50 },
    { n: "Living", v: 75 },
    { n: "Games", v: 40 },
    { n: "Express", v: 88 },
    { n: "Special", v: 65 },
  ];

  const ports = [
    { p: "PSA Pasir Panjang", o: 842, pc: 30, c: "var(--teal-500)" },
    { p: "Keppel Terminal", o: 621, pc: 22, c: "var(--navy-400)" },
    { p: "Brani Terminal", o: 518, pc: 18, c: "var(--amber-400)" },
    { p: "Jurong Port", o: 392, pc: 14, c: "var(--purple-icon)" },
    { p: "Port of Charleston", o: 280, pc: 10, c: "var(--green-icon)" },
    { p: "Others", o: 168, pc: 6, c: "var(--t4)" },
  ];

  const cancellations = [
    { r: "Ordered by mistake", n: 42, p: 34 },
    { r: "Found better price", n: 33, p: 27 },
    { r: "Delivery too long", n: 26, p: 21 },
    { r: "Changed my mind", n: 15, p: 12 },
    { r: "Other", n: 8, p: 6 },
  ];

  const leaders = [
    { n: "Rahul Singh", d: 124, r: "4.9", e: "$842", rk: 1 },
    { n: "Pita Havili", d: 98, r: "4.7", e: "$661", rk: 2 },
    { n: "Marco Reyes", d: 87, r: "4.8", e: "$589", rk: 3 },
    { n: "Aisha Karimi", d: 76, r: "4.6", e: "$514", rk: 4 },
    { n: "David Lim", d: 52, r: "4.4", e: "$351", rk: 5 },
  ];

  const perfRows = [
    { name: "Bisleri Water 1L", category: "Beverages", units: "1,284", revenue: "$2,568", growth: "↑ 22%", spark: [3, 5, 4, 8, 7, 9, 8] },
    { name: "Lay's Classic", category: "Snacks", units: "986", revenue: "$2,958", growth: "↑ 17%", spark: [5, 4, 6, 7, 6, 8, 9] },
    { name: "Tetley Green Tea", category: "Beverages", units: "742", revenue: "$2,226", growth: "↑ 31%", spark: [2, 4, 5, 6, 8, 9, 10] },
    { name: "Dettol Antiseptic", category: "Personal Care", units: "621", revenue: "$3,726", growth: "↑ 14%", spark: [6, 7, 6, 8, 7, 9, 8] },
    { name: "Amul Taaza Milk", category: "Beverages", units: "584", revenue: "$2,920", growth: "↑ 8%", spark: [7, 8, 7, 8, 8, 9, 8] },
  ];

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Analytics & Insights"
        subtitle="Sales · Delivery · Users · Products · Ports"
        actions={
          <>
            <div className="pill-toggle">
              {(["7 Days", "30 Days", "Quarter", "Year"] as const).map((t) => (
                <div
                  key={t}
                  className={`pill-btn ${range === t ? "active" : ""}`}
                  onClick={() => setRange(t)}
                  style={{ cursor: "pointer" }}
                >
                  {t}
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => toast.info("Opening Calendar...")}>
              <IconCalendar size={14} style={{ marginRight: "4px" }} />
              Date Range
            </Button>
            <Button variant="primary" size="sm" onClick={() => toast.success("Exporting CSV...")}>
              <IconDownload size={14} style={{ marginRight: "4px" }} />
              Export CSV
            </Button>
          </>
        }
      />

      {/* Stats Row */}
      <div
        className="stats-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <StatCard
          label="Monthly Revenue"
          value="$284k"
          icon={<IconCurrencyDollar size={20} />}
          variant="teal"
          delta={{ value: "18.3%", direction: "up" }}
          footer="vs last month"
        />
        <StatCard
          label="Total Orders"
          value="3,421"
          icon={<IconPackage size={20} />}
          variant="navy"
          delta={{ value: "12.1%", direction: "up" }}
          footer="this month"
        />
        <StatCard
          label="Delivery Success"
          value="96.8%"
          icon={<IconCircleCheck size={20} />}
          variant="green"
          footer="124 failed this month"
        />
        <StatCard
          label="Active Sailors"
          value="1,204"
          icon={<IconUsers size={20} />}
          variant="amber"
          delta={{ value: "220", direction: "up" }}
          footer="new signups"
        />
        <StatCard
          label="Avg Order Value"
          value="$83.05"
          icon={<IconReceipt size={20} />}
          variant="purple"
          delta={{ value: "4.2%", direction: "up" }}
          footer="per order avg"
        />
        <StatCard
          label="Cancellation Rate"
          value="3.3%"
          icon={<IconCircleX size={20} />}
          variant="red"
          delta={{ value: "0.8%", direction: "down" }}
          footer="improved vs last month"
        />
      </div>

      {/* Charts Grid */}
      <div
        className="grid-2 mb20"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Sales Trend (Daily) */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--sh-xs)",
          }}
        >
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconChartBar size={18} />
              Sales Trend (Daily)
            </div>
          </div>
          <div className="bar-chart" style={{ height: "130px", display: "flex", alignItems: "end", gap: "6px" }}>
            {sales.map((val, i) => (
              <div
                key={i}
                className="chart-bar hi"
                title={`May ${salesDays[i]}: $${(val * 3200).toLocaleString()}`}
                onClick={() => toast.info(`May ${salesDays[i]}: $${(val * 3200).toLocaleString()}`)}
                style={{
                  flex: 1,
                  height: `${val}%`,
                  background: "var(--teal-500)",
                  borderRadius: "4px 4px 0 0",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <div className="chart-labels" style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: "var(--t4)", fontWeight: 600 }}>
            {salesDays.map((d) => (
              <div key={d} className="chart-label">May {d}</div>
            ))}
          </div>
        </div>

        {/* Orders by Category */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--sh-xs)",
          }}
        >
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconChartBar size={18} />
              Orders by Category
            </div>
          </div>
          <div className="bar-chart" style={{ height: "130px", display: "flex", alignItems: "end", gap: "12px" }}>
            {categories.map((c, i) => (
              <div
                key={i}
                className="chart-bar teal"
                title={`${c.n}: ${c.v} orders`}
                onClick={() => toast.info(`${c.n}: ${c.v} orders`)}
                style={{
                  flex: 1,
                  height: `${c.v}%`,
                  background: "var(--teal-400)",
                  borderRadius: "4px 4px 0 0",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <div className="chart-labels" style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: "var(--t4)", fontWeight: 600 }}>
            {categories.map((c) => (
              <div key={c.n} className="chart-label">{c.n}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 3 - Port Analytics, Cancellation Reasons, Leaderboard */}
      <div
        className="grid-3 mb20"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Port Analytics */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--sh-xs)",
          }}
        >
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconMapPin size={18} />
              Port Analytics
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {ports.map((p, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12.5px" }}>
                  <span style={{ fontWeight: 600, color: "var(--t3)" }}>{p.p}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontWeight: 700, color: "var(--t1)" }}>{p.o}</span>
                    <span style={{ color: "var(--t4)", fontSize: "11px", fontWeight: 600 }}>{p.pc}%</span>
                  </div>
                </div>
                <div className="progress" style={{ height: "6px", background: "var(--border-xs)", borderRadius: "3px", overflow: "hidden" }}>
                  <div className="progress-fill" style={{ height: "100%", width: `${p.pc}%`, background: p.c }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cancellation Reasons */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--sh-xs)",
          }}
        >
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconCircleX size={18} />
              Cancellation Reasons
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {cancellations.map((c, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12.5px" }}>
                  <span style={{ fontWeight: 600, color: "var(--t3)" }}>{c.r}</span>
                  <span style={{ fontWeight: 700, color: "var(--t1)" }}>{c.n} ({c.p}%)</span>
                </div>
                <div className="progress" style={{ height: "6px", background: "var(--border-xs)", borderRadius: "3px", overflow: "hidden" }}>
                  <div className="progress-fill" style={{ height: "100%", width: `${c.p}%`, background: "var(--danger-icon)", opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Leaderboard */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            boxShadow: "var(--sh-xs)",
          }}
        >
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconTrophy size={18} />
              Partner Leaderboard
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {leaders.map((l, i) => (
              <div
                key={i}
                className="flex aic g10"
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => navigate(APP_ROUTES.PARTNERS)}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", width: "16px" }}>{l.rk}</span>
                <div className="av av-teal" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                  {l.n[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--t1)" }}>{l.n}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)" }}>
                    {l.d} deliveries · <span style={{ color: "var(--amber-700)", fontWeight: 700 }}>★ {l.r}</span>
                  </div>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--teal-700)" }}>{l.e}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Express Item Performance Table */}
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
            <IconBolt size={18} />
            Express Item Performance
          </div>
          <Button variant="ghost" size="xs" onClick={() => toast.success("Exported performance report")}>
            <IconDownload size={14} style={{ marginRight: "4px" }} />
            Export
          </Button>
        </div>
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)", width: "40px" }}>#</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Product</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Category</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Units Sold</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Revenue</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Growth</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {perfRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => navigate(APP_ROUTES.EXPRESS)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 18px", color: "var(--t4)", fontWeight: 700 }}>{idx + 1}</td>
                  <td className="td-p" style={{ padding: "14px 18px", fontWeight: 700, color: "var(--t1)" }}>{row.name}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <Badge variant="navy">{row.category}</Badge>
                  </td>
                  <td className="td-p" style={{ padding: "14px 18px", fontWeight: 500 }}>{row.units}</td>
                  <td className="td-p w7" style={{ padding: "14px 18px", fontWeight: 700 }}>{row.revenue}</td>
                  <td className="w7 csuccess" style={{ padding: "14px 18px", color: "var(--green-text)", fontWeight: 700 }}>{row.growth}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <div className="sparkline" style={{ display: "flex", gap: "2px", alignItems: "end", height: "25px" }}>
                      {row.spark.map((val, sIdx) => (
                        <div
                          key={sIdx}
                          className="spark-bar"
                          style={{
                            width: "4px",
                            height: `${val * 2.5}px`,
                            background: "var(--teal-400)",
                            opacity: 0.7,
                          }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
