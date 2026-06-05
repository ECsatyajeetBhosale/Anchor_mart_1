import { useState } from "react";
import {
  IconFileInvoice,
  IconClock,
  IconRefresh,
  IconCheck,
  IconSearch,
  IconEye,
  IconX,
  IconSend,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface IntentData {
  r: string;
  s: string;
  it: string;
  sh: string;
  ar: string;
  sy: string;
  cm: string;
  sb: string;
  st: string;
  sc: "warning" | "info" | "teal" | "danger" | "neutral";
  imo: string;
  terminal: string;
}

export function IntentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [selectedIntent, setSelectedIntent] = useState<IntentData | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Modal item states
  const [itemsAvailability, setItemsAvailability] = useState<Record<string, boolean | null>>({
    "Titan Quartz Analog Watch": true,
    "Brown Leather Card Holder": true,
    "Bombay Shaving Kit": null,
  });

  const [estimatedPrice, setEstimatedPrice] = useState("84.00");
  const [expiryHours, setExpiryHours] = useState("48 hours");
  const [adminNotes, setAdminNotes] = useState("");

  const initialIntents: IntentData[] = [
    { r: "#INT-0047", s: "Lois Becket", it: "Titan Watch, Card Holder (2)", sh: "0123456 · Anch.1", ar: "24 Apr", sy: ">5 days", cm: "WhatsApp", sb: "22 Apr 14:32", st: "Awaiting Payment", sc: "warning", imo: "0123456", terminal: "Anchorage 2" },
    { r: "#INT-0048", s: "Ali Mahmoud", it: "Nu Republic, Protein Bar, Shaving Kit (3)", sh: "MSC Marvela · B7", ar: "22 Apr", sy: "3 days", cm: "Email", sb: "22 Apr 11:20", st: "Under Review", sc: "info", imo: "0998765", terminal: "Berth 7" },
    { r: "#INT-0049", s: "James Wren", it: "Coffee, Organizer, Tablets (4)", sh: "Evergreen · Brani", ar: "23 Apr", sy: "2 days", cm: "WhatsApp", sb: "22 Apr 10:05", st: "Items Confirmed", sc: "teal", imo: "0554321", terminal: "Brani Terminal" },
    { r: "#INT-0050", s: "Sara Chen", it: "Echo Dot 5th Gen, Echo Buds (2)", sh: "APL Vanda · PSA", ar: "24 Apr", sy: "1 day", cm: "Email", sb: "22 Apr 09:41", st: "Substitution Needed", sc: "danger", imo: "0332211", terminal: "PSA Terminal" },
    { r: "#INT-0051", s: "Ravi Patel", it: "Shaving Kit, Water Bottle ×2 (3)", sh: "IMO 0123456", ar: "25 Apr", sy: "3 days", cm: "WhatsApp", sb: "22 Apr 08:15", st: "New", sc: "neutral", imo: "0123456", terminal: "Anchorage 1" },
  ];

  const [intents, setIntents] = useState<IntentData[]>(initialIntents);

  const handleOpenReview = (intent: IntentData) => {
    setSelectedIntent(intent);
    setEstimatedPrice(intent.r === "#INT-0047" ? "84.00" : "65.50");
    setExpiryHours("48 hours");
    setAdminNotes("");
    setIsReviewOpen(true);
  };

  const handleConfirmIntent = () => {
    if (!selectedIntent) return;

    setIntents(
      intents.map((i) =>
        i.r === selectedIntent.r ? { ...i, st: "Awaiting Payment", sc: "warning" as const } : i
      )
    );
    toast.success(`Intent ${selectedIntent.r} confirmed & payment link sent to ${selectedIntent.s}`);
    setIsReviewOpen(false);
  };

  const handleRejectIntent = () => {
    if (!selectedIntent) return;

    setIntents(
      intents.map((i) =>
        i.r === selectedIntent.r ? { ...i, st: "Rejected", sc: "danger" as const } : i
      )
    );
    toast.error(`Intent ${selectedIntent.r} rejected and sailor notified`);
    setIsReviewOpen(false);
  };

  // Filter list
  const filteredIntents = intents.filter((i) => {
    const matchesSearch =
      i.r.toLowerCase().includes(search.toLowerCase()) ||
      i.s.toLowerCase().includes(search.toLowerCase()) ||
      i.it.toLowerCase().includes(search.toLowerCase()) ||
      i.sh.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All Status" || i.st.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Intent Requests"
        subtitle="Sailor order intents pending review & confirmation"
        actions={
          <>
            <div className="relative flex items-center" style={{ width: "200px" }}>
              <IconSearch size={16} style={{ position: "absolute", left: "12px", color: "var(--t4)" }} />
              <Input
                type="text"
                placeholder="Search intents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "36px", height: "36px" }}
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
              <option>New</option>
              <option>Under Review</option>
              <option>Awaiting Payment</option>
              <option>Substitution Needed</option>
            </select>
          </>
        }
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
          label="Total Intents"
          value="23"
          icon={<IconFileInvoice size={20} />}
          variant="navy"
          footer="8 pending review"
        />
        <StatCard
          label="Awaiting Payment"
          value="7"
          icon={<IconClock size={20} />}
          variant="amber"
          footer="48hr window active"
        />
        <StatCard
          label="Substitutions Needed"
          value="4"
          icon={<IconRefresh size={20} />}
          variant="red"
          footer="Items unavailable"
        />
        <StatCard
          label="Confirmed Today"
          value="12"
          icon={<IconCheck size={20} />}
          variant="green"
          footer="Moved to orders"
        />
      </div>

      {/* Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Items Requested</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Ship</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Arrival</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Stay</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Comm.</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Submitted</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIntents.map((i, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => handleOpenReview(i)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td className="td-id xs" style={{ padding: "14px 20px", fontWeight: 700, color: "var(--teal-600)" }}>{i.r}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="av av-sm av-teal" style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                        {i.s[0]}
                      </div>
                      <span className="td-p" style={{ fontWeight: 600, color: "var(--t1)" }}>{i.s}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className="trunc" style={{ maxWidth: "190px", display: "block", color: "var(--t3)", fontWeight: 500 }}>
                      {i.it}
                    </span>
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{i.sh}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t3)" }}>{i.ar}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t3)" }}>{i.sy}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={i.cm === "WhatsApp" ? "success" : "info"}>{i.cm}</Badge>
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{i.sb}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={i.sc}>{i.st}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <Button variant="ghost" size="xs" onClick={() => handleOpenReview(i)}>
                        <IconEye size={15} />
                      </Button>
                      <Button variant="primary" size="xs" onClick={() => handleOpenReview(i)}>
                        Review
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIntents.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--t4)", fontWeight: 600 }}>
                    No intents match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Intent Modal Overlay */}
      {isReviewOpen && selectedIntent && (
        <div
          className="overlay show"
          onClick={() => setIsReviewOpen(false)}
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
            className="modal lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-sm)",
              boxShadow: "var(--sh-lg)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
              overflow: "hidden",
              animation: "zoomIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Modal Header */}
            <div className="modal-hd" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-xs)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Review Intent Request</span>
                <div className="modal-sub" style={{ fontSize: "12px", color: "var(--t3)" }}>{selectedIntent.r}</div>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
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

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: "20px 24px", overflowY: "auto" }}>
              <div
                style={{
                  background: "var(--navy-25)",
                  border: "1px solid var(--border-sm)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "10px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)" }}>{selectedIntent.s}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--t4)", textTransform: "uppercase", fontWeight: 700, marginTop: "2px" }}>Sailor</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal-600)", fontFamily: "monospace" }}>{selectedIntent.imo}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--t4)", textTransform: "uppercase", fontWeight: 700, marginTop: "2px" }}>IMO Number</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)" }}>{selectedIntent.terminal}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--t4)", textTransform: "uppercase", fontWeight: 700, marginTop: "2px" }}>Terminal</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--t1)" }}>{selectedIntent.ar}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--t4)", textTransform: "uppercase", fontWeight: 700, marginTop: "2px" }}>Arrival Date</div>
                  </div>
                </div>
              </div>

              {/* Requested Items */}
              <div className="sec-label" style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                Requested Items
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {[
                  "Titan Quartz Analog Watch",
                  "Brown Leather Card Holder",
                  "Bombay Shaving Kit",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex aic jb ecard"
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--border-xs)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>{item}</div>
                      <div style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 500 }}>Qty: 1</div>
                    </div>
                    <div>
                      <select
                        value={
                          itemsAvailability[item] === true
                            ? "available"
                            : itemsAvailability[item] === false
                            ? "unavailable"
                            : "checking"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemsAvailability({
                            ...itemsAvailability,
                            [item]: val === "available" ? true : val === "unavailable" ? false : null,
                          });
                        }}
                        style={{
                          height: "28px",
                          padding: "0 8px",
                          borderRadius: "var(--radius-sm)",
                          border: "1.5px solid var(--border-md)",
                          fontSize: "12px",
                          fontWeight: 700,
                          color:
                            itemsAvailability[item] === true
                              ? "var(--green-text)"
                              : itemsAvailability[item] === false
                              ? "var(--danger-text)"
                              : "var(--t3)",
                          background: "var(--surface)",
                        }}
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                        <option value="checking">Checking...</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin Response Fields */}
              <div className="sec-label" style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                Admin Response
              </div>
              <div
                className="form-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  marginBottom: "14px",
                }}
              >
                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Estimated Price ($)</label>
                  <Input type="number" step="0.01" value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} />
                </div>
                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Payment Link Expiry</label>
                  <select
                    className="form-select"
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
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
                    <option>48 hours</option>
                    <option>24 hours</option>
                    <option>72 hours</option>
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Notes to Sailor</label>
                <textarea
                  className="form-input"
                  placeholder="Optional notes for the sailor..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{
                    width: "100%",
                    height: "70px",
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

            {/* Modal Footer */}
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
              <Button variant="danger" size="sm" onClick={handleRejectIntent}>
                <IconX size={15} style={{ marginRight: "4px" }} />
                Reject
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmIntent}>
                <IconSend size={15} style={{ marginRight: "4px" }} />
                Confirm & Send Payment Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
