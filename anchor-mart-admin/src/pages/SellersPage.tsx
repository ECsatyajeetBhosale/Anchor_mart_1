import { useState } from "react";
import {
  IconBuildingStore,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SellerApplication {
  n: string;
  e: string;
  b: string;
  p: string;
  d: string;
  dt: string;
  s: string;
  sc: "warning" | "info" | "success" | "danger";
}

export function SellersPage() {
  const initialSellers: SellerApplication[] = [
    { n: "James Wren", e: "jwren@shipco.net", b: "Marine Supplies Co.", p: "Marine equipment, safety gear", d: "Uploaded", dt: "Apr 22", s: "Pending", sc: "warning" },
    { n: "Sara Chen", e: "sara.c@marine.io", b: "Blue Ocean Supplies", p: "Electronics, accessories", d: "Uploaded", dt: "Apr 20", s: "Reviewing", sc: "info" },
    { n: "Omar Karim", e: "omar@porttrader.com", b: "Port Trader Ltd.", p: "Beverages, snacks", d: "Missing", dt: "Apr 18", s: "Pending", sc: "warning" },
    { n: "Maria Santos", e: "msantos@seafarer.ph", b: "—", p: "Fashion, accessories", d: "Uploaded", dt: "Apr 15", s: "Approved", sc: "success" },
  ];

  const [sellers, setSellers] = useState<SellerApplication[]>(initialSellers);
  const [selectedSeller, setSelectedSeller] = useState<SellerApplication | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // Form states
  const [rejectReason, setRejectReason] = useState("Incomplete documentation");
  const [rejectMessage, setRejectMessage] = useState("");

  const handleApprove = (seller: SellerApplication) => {
    const confirmApprove = window.confirm(
      `Approve ${seller.n} (${seller.b}) as a seller on the platform? They will receive an onboarding email.`
    );
    if (confirmApprove) {
      setSellers(
        sellers.map((s) =>
          s.e === seller.e ? { ...s, s: "Approved", sc: "success" as const } : s
        )
      );
      toast.success("Seller approved — onboarding email sent");
    }
  };

  const handleOpenReject = (seller: SellerApplication) => {
    setSelectedSeller(seller);
    setRejectReason("Incomplete documentation");
    setRejectMessage("");
    setIsRejectOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedSeller) return;

    setSellers(
      sellers.map((s) =>
        s.e === selectedSeller.e ? { ...s, s: "Rejected", sc: "danger" as const } : s
      )
    );
    toast.error(`Application for ${selectedSeller.n} rejected. Applicant notified.`);
    setIsRejectOpen(false);
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Seller Applications"
        subtitle="Review and manage seller applications from sailors"
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
          label="Pending Applications"
          value="4"
          icon={<IconClock size={20} />}
          variant="amber"
          footer="Awaiting review"
        />
        <StatCard
          label="Approved (Month)"
          value="12"
          icon={<IconCheck size={20} />}
          variant="green"
          footer="Now active"
        />
        <StatCard
          label="Rejected"
          value="3"
          icon={<IconX size={20} />}
          variant="red"
          footer="This month"
        />
        <StatCard
          label="Active Sellers"
          value="48"
          icon={<IconBuildingStore size={20} />}
          variant="navy"
          footer="On platform"
        />
      </div>

      {/* Sellers List Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Applicant</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Email</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Business</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Products</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Documents</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Submitted</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((s, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="av av-purple" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--purple-bg)", color: "var(--purple-icon)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>
                        {s.n[0]}
                      </div>
                      <span className="td-p" style={{ fontWeight: 700, color: "var(--t1)" }}>{s.n}</span>
                    </div>
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{s.e}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: "var(--t1)" }}>{s.b}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t3)" }}>
                    <span className="trunc" style={{ maxWidth: "150px", display: "block" }}>
                      {s.p}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={s.d === "Uploaded" ? "success" : "danger"}>{s.d}</Badge>
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{s.dt}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={s.sc}>{s.s}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {s.s !== "Approved" && s.s !== "Rejected" ? (
                      <div className="td-acts" style={{ display: "flex", gap: "6px" }}>
                        <Button variant="teal" size="xs" onClick={() => handleApprove(s)}>
                          <IconCheck size={14} style={{ marginRight: "3px" }} />
                          Approve
                        </Button>
                        <Button variant="danger" size="xs" onClick={() => handleOpenReject(s)}>
                          <IconX size={14} style={{ marginRight: "3px" }} />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 600 }}>Decision made</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Application Modal Overlay */}
      {isRejectOpen && selectedSeller && (
        <div
          className="overlay show"
          onClick={() => setIsRejectOpen(false)}
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
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Reject Seller Application</span>
              <button
                onClick={() => setIsRejectOpen(false)}
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
                    background: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    color: "var(--danger-text)",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "4px" }}>
                    <IconAlertTriangle size={14} />
                    Application Review
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{selectedSeller.n} — {selectedSeller.b}</div>
                  <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>{selectedSeller.p}</div>
                </div>

                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Rejection Reason</label>
                  <select
                    className="form-select"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{
                      width: "100%",
                      height: "40px",
                      padding: "0 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-md)",
                      background: "var(--surface)",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      outline: "none",
                    }}
                  >
                    <option>Incomplete documentation</option>
                    <option>Products not eligible</option>
                    <option>Duplicate account</option>
                    <option>Policy violation</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Message to Applicant</label>
                  <textarea
                    className="form-input"
                    placeholder="Provide a detailed message explaining the issue..."
                    value={rejectMessage}
                    onChange={(e) => setRejectMessage(e.target.value)}
                    style={{
                      width: "100%",
                      height: "80px",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border-md)",
                      background: "var(--surface-input)",
                      fontSize: "13.5px",
                      outline: "none",
                    }}
                  />
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
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmReject}>
                Reject & Notify
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SellersPage;
