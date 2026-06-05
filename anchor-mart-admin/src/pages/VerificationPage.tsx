import { useState } from "react";
import {
  IconCheck,
  IconX,
  IconRefresh,
  IconDownload,
  IconSend,
  IconListCheck,
  IconPackage,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface VerificationReport {
  e: string;
  p: string;
  s: string;
  t: number;
  a: number | null;
  u: number | null;
  r: string;
  sc: "success" | "info" | "warning" | "danger" | "neutral";
}

interface ItemDetail {
  n: string;
  q: string;
  a: string;
  st: string;
  sc: "success" | "danger";
}

export function VerificationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subItemName, setSubItemName] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [priceDiff, setPriceDiff] = useState<"Same Price" | "Price Increase" | "Price Decrease">("Same Price");

  const initialVerifications: VerificationReport[] = [
    { e: "ENQ-0042", p: "Rahul Singh", s: "Wegmans PSA", t: 3, a: 2, u: 1, r: "Submitted", sc: "warning" },
    { e: "ENQ-0047", p: "Pita Havili", s: "EuroSpar Keppel", t: 5, a: 5, u: 0, r: "Submitted", sc: "success" },
    { e: "ENQ-0039", p: "Marco Reyes", s: "Port Marine JNPT", t: 2, a: 2, u: 0, r: "Submitted", sc: "success" },
    { e: "ENQ-0051", p: "Rahul Singh", s: "Wegmans PSA", t: 4, a: null, u: null, r: "In Progress", sc: "info" },
  ];

  const [verifications, setVerifications] = useState<VerificationReport[]>(initialVerifications);

  const initialItems: ItemDetail[] = [
    { n: "Nu Republic Powerpo X1 Power Bank", q: "×1", a: "—", st: "Available", sc: "success" },
    { n: "21g Protein Bar Variety Pack", q: "×2", a: "Aisle 4", st: "Available", sc: "success" },
    { n: "Bombay Shaving Company 5 Piece Kit", q: "×1", a: "Aisle 2", st: "Unavailable", sc: "danger" },
  ];

  const [items, setItems] = useState<ItemDetail[]>(initialItems);

  const handleOpenSubstitute = (itemName: string) => {
    setSubItemName(itemName);
    setSubSearch("");
    setPriceDiff("Same Price");
    setIsModalOpen(true);
  };

  const handleSendSuggestion = () => {
    if (!subSearch) {
      toast.error("Please enter a substitute product name");
      return;
    }

    toast.success(`Substitute suggestion "${subSearch}" sent to sailor`);
    setIsModalOpen(false);

    // Mock update: change unavailable item to available with substitute description
    setItems(
      items.map((it) =>
        it.n === subItemName
          ? {
              ...it,
              n: `${it.n} (Sub suggested: ${subSearch})`,
              st: "Sub suggested",
              sc: "success",
            }
          : it
      )
    );

    // Mock update: set ENQ-0042 report status as resolved
    setVerifications(
      verifications.map((v) =>
        v.e === "ENQ-0042" ? { ...v, u: 0, r: "Resolved", sc: "success" as const } : v
      )
    );
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Product Verifications"
        subtitle="Partner in-store checks, availability reports, substitutions"
      />

      {/* Stats Row */}
      <div
        className="stats-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "22px",
        }}
      >
        <StatCard
          label="In Verification"
          value="8"
          icon={<IconListCheck size={20} />}
          variant="navy"
          footer="Currently active"
        />
        <StatCard
          label="Verified Today"
          value="34"
          icon={<IconCheck size={20} />}
          variant="green"
          footer="Reports submitted"
        />
        <StatCard
          label="Unavailable Items"
          value="6"
          icon={<IconX size={20} />}
          variant="red"
          footer="Action needed"
        />
        <StatCard
          label="Substitutions"
          value="4"
          icon={<IconRefresh size={20} />}
          variant="amber"
          footer="Awaiting approval"
        />
      </div>

      {/* Verification Reports List */}
      <div
        className="card mb20"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-sm)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--sh-xs)",
          overflow: "hidden",
          marginBottom: "20px",
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
          Verification Reports
        </div>
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>ENQ</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Partner</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Shop</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Total Items</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Available</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Unavailable</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {verifications.map((v, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => {
                    if (v.u && v.u > 0) handleOpenSubstitute("Bombay Shaving Kit");
                  }}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: v.u && v.u > 0 ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  <td className="td-id" style={{ padding: "14px 18px", fontWeight: 700, color: "var(--teal-600)" }}>{v.e}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="av av-sm av-teal" style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
                        {v.p[0]}
                      </div>
                      <span className="td-p" style={{ fontWeight: 600, color: "var(--t1)" }}>{v.p.split(" ")[0]}</span>
                    </div>
                  </td>
                  <td className="td-m" style={{ padding: "14px 18px", color: "var(--t3)" }}>{v.s}</td>
                  <td className="td-p w7" style={{ padding: "14px 18px", fontWeight: 700 }}>{v.t}</td>
                  <td className="w7 csuccess" style={{ padding: "14px 18px", color: "var(--green-text)", fontWeight: 700 }}>
                    {v.a !== null ? v.a : "—"}
                  </td>
                  <td className="w7" style={{ padding: "14px 18px", color: v.u && v.u > 0 ? "var(--danger-text)" : "var(--t4)", fontWeight: 700 }}>
                    {v.u !== null ? v.u : "—"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <Badge variant={v.sc}>{v.r}</Badge>
                  </td>
                  <td style={{ padding: "14px 18px" }} onClick={(e) => e.stopPropagation()}>
                    {v.u && v.u > 0 ? (
                      <Button
                        variant="primary"
                        size="xs"
                        style={{ fontSize: "11.5px" }}
                        onClick={() => handleOpenSubstitute("Bombay Shaving Kit")}
                      >
                        Suggest Substitute
                      </Button>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 600 }}>No action needed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item details card for active check (ENQ-0042) */}
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
            ENQ-0042 — Item Detail
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" size="sm" onClick={() => toast.success("PDF report downloaded")}>
              <IconDownload size={14} style={{ marginRight: "4px" }} />
              PDF Report
            </Button>
            <Button variant="primary" size="sm" onClick={() => toast.success("Sailor notified of item checks")}>
              <IconSend size={14} style={{ marginRight: "4px" }} />
              Notify Sailor
            </Button>
          </div>
        </div>
        <div className="card-body" style={{ padding: "20px" }}>
          <div
            className="grid-3 g16"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                className="ecard"
                style={{
                  padding: "14px",
                  border: "1px solid var(--border-xs)",
                  borderLeft: `3.5px solid ${item.sc === "success" ? "var(--green-icon)" : "var(--danger-icon)"}`,
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-alt)",
                }}
              >
                <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--t1)", marginBottom: "8px" }}>{item.n}</div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <span className="tag" style={{ background: "var(--surface)", border: "1px solid var(--border-md)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600 }}>
                    {item.q}
                  </span>
                  {item.a !== "—" && (
                    <span className="tag" style={{ background: "var(--surface)", border: "1px solid var(--border-md)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600 }}>
                      {item.a}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant={item.sc === "success" ? "success" : "danger"}>{item.st}</Badge>
                  {item.st === "Unavailable" && (
                    <Button variant="secondary" size="xs" onClick={() => handleOpenSubstitute(item.n)}>
                      Find Alt
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suggest Substitute Modal Overlay */}
      {isModalOpen && (
        <div
          className="overlay show"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5, 14, 28, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="modal md"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-sm)",
              boxShadow: "var(--sh-lg)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
              width: "480px",
              overflow: "hidden",
              animation: "zoomIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <div className="modal-hd" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-xs)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Suggest Substitute</span>
                <div className="modal-sub" style={{ fontSize: "12px", color: "var(--t3)" }}>Item: {subItemName}</div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "var(--t4)",
                }}
              >
                <IconX size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    background: "var(--warning-bg)",
                    border: "1px solid var(--warning-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    color: "var(--warning-text)",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                    <IconAlertTriangle size={14} />
                    Unavailable Item
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{subItemName}</div>
                  <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>Partner confirmed out of stock at Wegmans PSA</div>
                </div>

                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Substitute Product Name</label>
                  <Input
                    type="text"
                    placeholder="Search substitute product..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                  />
                </div>

                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Price Difference</label>
                  <div className="pill-toggle" style={{ display: "flex" }}>
                    {(["Same Price", "Price Increase", "Price Decrease"] as const).map((diff) => (
                      <div
                        key={diff}
                        className={`pill-btn ${priceDiff === diff ? "active" : ""}`}
                        onClick={() => setPriceDiff(diff)}
                        style={{ flex: 1, textAlign: "center", cursor: "pointer" }}
                      >
                        {diff}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div
              className="modal-foot"
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-xs)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "var(--surface-alt)",
              }}
            >
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSendSuggestion}>
                <IconSend size={15} style={{ marginRight: "4px" }} />
                Send Suggestion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default VerificationPage;
