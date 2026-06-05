import {
  IconRefresh,
  IconClipboardList,
  IconAlertTriangle,
  IconMapPin,
  IconLayersIntersect,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InventoryPage() {
  const stockByLocation = [
    { loc: "Bayview Warehouse", available: 624, reserved: 34, updated: "5m ago" },
    { loc: "Harbor Fulfillment", available: 318, reserved: 12, updated: "12m ago" },
    { loc: "Portside Retail", available: 176, reserved: 8, updated: "18m ago" },
    { loc: "Express Locker", available: 130, reserved: 4, updated: "2h ago" },
  ];

  const alertItems = [
    { sku: "AM-01234", product: "OceanWave Speaker", available: 9, threshold: 15 },
    { sku: "AM-04567", product: "Coastal Charger", available: 6, threshold: 10 },
    { sku: "AM-08901", product: "Port Pro Headphones", available: 3, threshold: 8 },
  ];

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Inventory Dashboard"
        subtitle="Track stock, locations, and low inventory alerts."
        actions={
          <Button variant="secondary" size="sm" onClick={() => toast.success("Inventory cache refreshed")}>
            <IconRefresh size={14} style={{ marginRight: "4px" }} />
            Refresh
          </Button>
        }
      />

      {/* Stats Cards Grid */}
      <div
        className="grid-2 mt16"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase" }}>In Stock</span>
            <IconClipboardList size={18} style={{ color: "var(--teal-600)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>1,248</div>
          <div style={{ fontSize: "12px", color: "var(--t4)" }}>Products ready for fulfillment</div>
        </div>

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase" }}>Low Stock</span>
            <IconAlertTriangle size={18} style={{ color: "var(--amber-600)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>87</div>
          <div style={{ fontSize: "12px", color: "var(--t4)" }}>Items below re-order threshold</div>
        </div>

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase" }}>Locations</span>
            <IconMapPin size={18} style={{ color: "var(--navy-600)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>8</div>
          <div style={{ fontSize: "12px", color: "var(--t4)" }}>Active storage & pickup points</div>
        </div>

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase" }}>Backordered</span>
            <IconLayersIntersect size={18} style={{ color: "var(--danger-icon)" }} />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>14</div>
          <div style={{ fontSize: "12px", color: "var(--t4)" }}>Products awaiting replenishment</div>
        </div>
      </div>

      {/* Layout Grid - Stock by Location and Alerts */}
      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        {/* Stock by Location */}
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
              fontSize: "14.5px",
              fontWeight: 800,
              color: "var(--t1)",
            }}
          >
            Stock by Location
          </div>
          <div className="card-body" style={{ padding: "12px 20px" }}>
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-sm)", textAlign: "left" }}>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Location</th>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Available</th>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Reserved</th>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Last update</th>
                  </tr>
                </thead>
                <tbody>
                  {stockByLocation.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-xs)" }}>
                      <td style={{ padding: "12px 0", fontWeight: 700, color: "var(--t1)" }}>{row.loc}</td>
                      <td style={{ padding: "12px 0", fontWeight: 500 }}>{row.available}</td>
                      <td style={{ padding: "12px 0", color: "var(--t3)" }}>{row.reserved}</td>
                      <td style={{ padding: "12px 0", color: "var(--t4)", fontSize: "12px" }}>{row.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Alert Items */}
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
              fontSize: "14.5px",
              fontWeight: 800,
              color: "var(--t1)",
            }}
          >
            Alert Items (Low Stock)
          </div>
          <div className="card-body" style={{ padding: "12px 20px" }}>
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-sm)", textAlign: "left" }}>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>SKU</th>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Product</th>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Available</th>
                    <th style={{ padding: "10px 0", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {alertItems.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-xs)" }}>
                      <td style={{ padding: "12px 0", fontFamily: "monospace", color: "var(--teal-600)", fontWeight: 700 }}>{row.sku}</td>
                      <td style={{ padding: "12px 0", fontWeight: 700, color: "var(--t1)" }}>{row.product}</td>
                      <td style={{ padding: "12px 0", color: "var(--danger-text)", fontWeight: 800 }}>{row.available}</td>
                      <td style={{ padding: "12px 0", color: "var(--t3)" }}>{row.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default InventoryPage;
