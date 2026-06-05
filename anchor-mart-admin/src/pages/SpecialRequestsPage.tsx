import { useState } from "react";
import {
  IconSearch,
  IconEye,
  IconClipboardText,
  IconClock,
  IconLoader,
  IconCheck,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SpecialRequest {
  r: string;
  n: string;
  e: string;
  ph: string;
  prod: string;
  brand: string;
  qty: number;
  desc: string;
  ship: string;
  dt: string;
  img: boolean;
  st: string;
  sc: "warning" | "info" | "success" | "danger";
}

export function SpecialRequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const initialRequests: SpecialRequest[] = [
    {
      r: "#SRQ-0091",
      n: "Lois Becket",
      e: "lois.becket@maersk.com",
      ph: "+65 8123 4471",
      prod: "Sennheiser HD 450BT Headphones",
      brand: "Sennheiser",
      qty: 1,
      desc: "Wireless noise-cancelling headphones, black colour preferred. Needed before next sailing.",
      ship: "MSC Marvela · Berth 7",
      dt: "02 Jun 2026 · 09:14",
      img: true,
      st: "Pending",
      sc: "warning",
    },
    {
      r: "#SRQ-0090",
      n: "Ali Mahmoud",
      e: "ali.mahmoud@apl.com",
      ph: "+65 9034 1182",
      prod: "Omega-3 Fish Oil Capsules",
      brand: "Nordic Naturals",
      qty: 3,
      desc: "1000mg softgels, 120 count bottles. Required for crew health supplies.",
      ship: "APL Vanda · PSA",
      dt: "01 Jun 2026 · 17:42",
      img: false,
      st: "Sourcing",
      sc: "info",
    },
    {
      r: "#SRQ-0089",
      n: "James Wren",
      e: "j.wren@evergreen-line.com",
      ph: "+65 8890 2245",
      prod: "Casio G-Shock GA-2100 Watch",
      brand: "Casio",
      qty: 1,
      desc: "Carbon core guard, black resin band. Gift for end of contract.",
      ship: "Evergreen Ace · Brani",
      dt: "01 Jun 2026 · 11:08",
      img: true,
      st: "Approved",
      sc: "success",
    },
    {
      r: "#SRQ-0088",
      n: "Sara Chen",
      e: "sara.chen@oocl.com",
      ph: "+65 9112 7763",
      prod: "Korean Skincare Set (COSRX)",
      brand: "COSRX",
      qty: 2,
      desc: "Snail mucin essence + acne patches. Any variant acceptable.",
      ship: "OOCL Tokyo · Anch. 2",
      dt: "31 May 2026 · 20:31",
      img: false,
      st: "Pending",
      sc: "warning",
    },
    {
      r: "#SRQ-0087",
      n: "Ravi Patel",
      e: "ravi.patel@anglo-eastern.com",
      ph: "+65 8456 9920",
      prod: "Bose SoundLink Flex Speaker",
      brand: "Bose",
      qty: 1,
      desc: "Portable bluetooth speaker, waterproof. Blue or black.",
      ship: "IMO 0123456 · PSA",
      dt: "31 May 2026 · 08:55",
      img: false,
      st: "Rejected",
      sc: "danger",
    },
  ];

  const [requests] = useState<SpecialRequest[]>(initialRequests);

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.prod.toLowerCase().includes(search.toLowerCase()) ||
      r.n.toLowerCase().includes(search.toLowerCase()) ||
      r.r.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || r.st === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case "Approved":
        return "success";
      case "Sourcing":
        return "info";
      case "Rejected":
        return "danger";
      default:
        return "warning";
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Special Request Items"
        subtitle="Custom item requests submitted by sailors from the app"
        actions={
          <>
            <div className="input-wrap" style={{ position: "relative" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "200px",
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
              <option>Pending</option>
              <option>Approved</option>
              <option>Sourcing</option>
              <option>Rejected</option>
            </select>
            <Button variant="secondary" size="sm" onClick={() => toast.success("Exported requests CSV")}>
              Export
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
            <div className="stat-lbl">Total Requests</div>
            <div className="stat-icon">
              <IconClipboardText size={18} />
            </div>
          </div>
          <div className="stat-val">28</div>
          <div className="stat-foot">This month</div>
        </div>

        <div className="stat-card sc-amber">
          <div className="stat-stripe" />
          <div className="stat-top">
            <div className="stat-lbl">Pending Review</div>
            <div className="stat-icon">
              <IconClock size={18} />
            </div>
          </div>
          <div className="stat-val">5</div>
          <div className="stat-foot">Awaiting action</div>
        </div>

        <div className="stat-card sc-blue">
          <div className="stat-stripe" />
          <div className="stat-top">
            <div className="stat-lbl">Sourcing</div>
            <div className="stat-icon">
              <IconLoader size={18} className="animate-spin" />
            </div>
          </div>
          <div className="stat-val">6</div>
          <div className="stat-foot">Being procured</div>
        </div>

        <div className="stat-card sc-green">
          <div className="stat-stripe" />
          <div className="stat-top">
            <div className="stat-lbl">Approved</div>
            <div className="stat-icon">
              <IconCheck size={18} />
            </div>
          </div>
          <div className="stat-val">14</div>
          <div className="stat-foot">Added to catalog</div>
        </div>
      </div>

      {/* Requests Table */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Reference</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Sailor</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Phone</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Product</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Brand</th>
                <th style={{ padding: "12px 20px", textAlign: "center", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Qty</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Requested</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "center" }} />
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => toast.info(`Viewing details of request ${r.r}`)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: "var(--teal-600)" }}>{r.r}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "var(--teal-50)",
                          color: "var(--teal-600)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {r.n[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--t1)" }}>{r.n}</div>
                        <div style={{ fontSize: "11px", color: "var(--t4)" }}>{r.e}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--t3)" }}>{r.ph}</td>
                  <td style={{ padding: "14px 20px", color: "var(--t1)", fontWeight: 600, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.prod}
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--t3)" }}>{r.brand}</td>
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>{r.qty}</td>
                  <td style={{ padding: "14px 20px", color: "var(--t4)", fontSize: "12px" }}>{r.dt}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={getStatusBadgeVariant(r.st)}>{r.st}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => toast.info(`Viewing details of request ${r.r}`)}
                    >
                      <IconEye size={15} />
                    </Button>
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
export default SpecialRequestsPage;
