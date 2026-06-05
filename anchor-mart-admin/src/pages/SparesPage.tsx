import { useState } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEngine,
  IconRefresh,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SparePart {
  n: string;
  d: string;
  c: string;
  pn: string;
  p: string;
  sk: number;
  s: string;
  sc: "success" | "warning" | "danger";
}

export function SparesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const initialSpares: SparePart[] = [
    {
      n: "SOLAS Life Jacket",
      d: "Adult, 150N buoyancy, approved",
      c: "Safety",
      pn: "SP-SAF-001",
      p: "$48.00",
      sk: 120,
      s: "In Stock",
      sc: "success",
    },
    {
      n: "CO₂ Fire Extinguisher 5kg",
      d: "Marine grade, wall mount",
      c: "Fire Safety",
      pn: "SP-FIR-014",
      p: "$96.50",
      sk: 34,
      s: "In Stock",
      sc: "success",
    },
    {
      n: "Emergency Flare Kit",
      d: "4 red parachute + 2 smoke",
      c: "Signaling",
      pn: "SP-SIG-007",
      p: "$120.00",
      sk: 8,
      s: "Low Stock",
      sc: "warning",
    },
    {
      n: "Engine Oil Filter (MAN B&W)",
      d: "Spin-on, fits 6S60MC",
      c: "Engine",
      pn: "SP-ENG-022",
      p: "$32.75",
      sk: 0,
      s: "Out of Stock",
      sc: "danger",
    },
    {
      n: "Bilge Pump 12V",
      d: "2000 GPH submersible",
      c: "Engine",
      pn: "SP-ENG-031",
      p: "$74.00",
      sk: 16,
      s: "In Stock",
      sc: "success",
    },
    {
      n: "EPIRB Distress Beacon",
      d: "406 MHz, GPS enabled",
      c: "Navigation",
      pn: "SP-NAV-003",
      p: "$340.00",
      sk: 5,
      s: "Low Stock",
      sc: "warning",
    },
    {
      n: "Marine First Aid Kit",
      d: "SOLAS category C, 50+ items",
      c: "Medical",
      pn: "SP-MED-009",
      p: "$58.00",
      sk: 42,
      s: "In Stock",
      sc: "success",
    },
    {
      n: "Immersion / Survival Suit",
      d: "Insulated, one size, SOLAS",
      c: "Safety",
      pn: "SP-SAF-018",
      p: "$185.00",
      sk: 0,
      s: "Out of Stock",
      sc: "danger",
    },
  ];

  const [spares, setSpares] = useState<SparePart[]>(initialSpares);

  const filteredSpares = spares.filter((sp) => {
    const matchesSearch =
      sp.n.toLowerCase().includes(search.toLowerCase()) ||
      sp.pn.toLowerCase().includes(search.toLowerCase()) ||
      sp.d.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All Types" || sp.c === categoryFilter;
    const matchesStatus =
      statusFilter === "All Status" ||
      (statusFilter === "In Stock" && sp.s === "In Stock") ||
      (statusFilter === "Low Stock" && sp.s === "Low Stock") ||
      (statusFilter === "Out of Stock" && sp.s === "Out of Stock");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDeleteSpare = (pn: string, name: string) => {
    const confirmDel = window.confirm(`Remove spare part "${name}"?`);
    if (confirmDel) {
      setSpares(spares.filter((sp) => sp.pn !== pn));
      toast.error(`"${name}" has been removed`);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Marine Emergency Spares"
        subtitle="Critical emergency spare parts available to sailors"
        actions={
          <>
            <div className="input-wrap" style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search spare parts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "180px",
                  height: "36px",
                  padding: "0 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--border-md)",
                  background: "var(--surface)",
                  fontSize: "13px",
                  fontWeight: 600,
                  outline: "none",
                }}
              />
            </div>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                height: "36px",
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--border-md)",
                background: "var(--surface)",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "var(--t1)",
                outline: "none",
              }}
            >
              <option>All Types</option>
              <option>Engine</option>
              <option>Safety</option>
              <option>Fire Safety</option>
              <option>Navigation</option>
              <option>Signaling</option>
              <option>Medical</option>
              <option>Deck</option>
            </select>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: "36px",
                padding: "0 12px",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--border-md)",
                background: "var(--surface)",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "var(--t1)",
                outline: "none",
              }}
            >
              <option>All Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => toast.success("Add Spare product dialog initiated")}>
              <IconPlus size={15} style={{ marginRight: "4px" }} />
              Add Product
            </Button>
          </>
        }
      />

      {/* Stats Cards Row */}
      <div
        className="stats-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <div className="stat-card sc-navy">
          <div className="stat-stripe" />
          <div className="stat-top">
            <div className="stat-lbl">Total Spare Parts</div>
            <div className="stat-icon">
              <IconEngine size={18} />
            </div>
          </div>
          <div className="stat-val">86</div>
          <div className="stat-foot">7 types</div>
        </div>
      </div>

      {/* Spares Table Card */}
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
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                <th style={{ padding: "12px 20px", width: "48px" }} />
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Spare Part</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Type</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Part No.</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Price</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "center" }} />
              </tr>
            </thead>
            <tbody>
              {filteredSpares.map((s, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => toast.info(`Viewing details for spare ${s.n}`)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--surface-alt)",
                        border: "1px solid var(--border-xs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--t3)",
                      }}
                    >
                      <IconEngine size={16} />
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 700, color: "var(--t1)" }}>{s.n}</div>
                    <div style={{ fontSize: "11.5px", color: "var(--t4)" }}>{s.d}</div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className="tag" style={{ background: "var(--navy-50)", color: "var(--navy-700)", border: "1px solid var(--navy-100)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                      {s.c}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontFamily: "monospace", color: "var(--t3)" }}>{s.pn}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>{s.p}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={s.sc}>{s.s}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(ev) => ev.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                      <Button variant="ghost" size="xs" title="Edit" onClick={() => toast.success(`Edit spare: ${s.n}`)}>
                        <IconEdit size={15} />
                      </Button>
                      <Button variant="danger" size="xs" title="Remove" onClick={() => handleDeleteSpare(s.pn, s.n)}>
                        <IconTrash size={15} />
                      </Button>
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
export default SparesPage;
