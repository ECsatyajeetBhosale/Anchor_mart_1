import { useState } from "react";
import {
  IconLifebuoy,
  IconClock,
  IconCheck,
  IconListDetails,
  IconPlus,
  IconX,
  IconSend,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  from: string;
  issue: string;
  priority: "Low" | "High" | "Urgent";
  type: string;
  sc: "info" | "warning" | "danger";
  status: string;
  date: string;
}

interface ActivityLog {
  a: string;
  u: string;
  tm: string;
  c: string;
}

export function SupportPage() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  // New ticket form states
  const [newFrom, setNewFrom] = useState("");
  const [newType, setNewType] = useState("Sailor");
  const [newIssue, setNewIssue] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "High" | "Urgent">("High");

  // Reply drawer states
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("Open");
  const [replyPriority, setReplyPriority] = useState<"Low" | "High" | "Urgent">("High");

  const initialTickets: SupportTicket[] = [
    { id: "#SUP-084", from: "Lois Becket (Sailor)", issue: "Missing item in delivered order", priority: "Urgent", type: "Sailor", sc: "danger", status: "Open", date: "29 May 2026 · 09:14 AM" },
    { id: "#SUP-083", from: "Rahul Singh (Partner)", issue: "App not updating order status", priority: "High", type: "Partner", sc: "warning", status: "Open", date: "29 May 2026 · 08:45 AM" },
    { id: "#SUP-082", from: "Ali Mahmoud (Sailor)", issue: "Payment deducted, order not confirmed", priority: "Urgent", type: "Sailor", sc: "danger", status: "Open", date: "29 May 2026 · 08:12 AM" },
    { id: "#SUP-081", from: "Sara Chen (Sailor)", issue: "Coupon SHIP10 not applied", priority: "Low", type: "Sailor", sc: "info", status: "Open", date: "29 May 2026 · 07:30 AM" },
    { id: "#SUP-080", from: "Pita Havili (Partner)", issue: "Cannot mark item as picked up", priority: "High", type: "Partner", sc: "warning", status: "Open", date: "28 May 2026 · 18:24 PM" },
  ];

  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);

  const logs: ActivityLog[] = [
    { a: "Order #AM2468 placed", u: "Maria Santos", tm: "14:32:01", c: "var(--teal-500)" },
    { a: "ENQ-0042 marked delivered", u: "Rahul Singh (DP)", tm: "14:30:12", c: "var(--green-icon)" },
    { a: "Payment $84 processed", u: "Lois Becket", tm: "14:28:45", c: "var(--green-icon)" },
    { a: "Coupon SHIP10 redeemed", u: "Ali Mahmoud", tm: "14:25:10", c: "var(--amber-400)" },
    { a: "Intent #INT-0051 submitted", u: "Ravi Patel", tm: "14:20:03", c: "var(--info-icon)" },
    { a: "DP-00124 went on duty", u: "Rahul Singh", tm: "14:10:22", c: "var(--teal-500)" },
    { a: "Product Aquaminder flagged OOS", u: "System", tm: "14:02:11", c: "var(--danger-icon)" },
    { a: "Order #AM2451 cancelled", u: "Maria Santos", tm: "13:55:34", c: "var(--danger-icon)" },
    { a: "Seller application received", u: "Blue Ocean Supplies", tm: "13:45:00", c: "var(--purple-icon)" },
    { a: "Intent verified — ENQ-0047", u: "Admin", tm: "13:40:11", c: "var(--teal-500)" },
  ];

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyPriority(ticket.priority);
    setReplyStatus(ticket.status);
    setReplyText("");
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error("Please type a response");
      return;
    }

    setTickets(
      tickets.map((t) =>
        t.id === selectedTicket?.id
          ? {
              ...t,
              priority: replyPriority,
              status: replyStatus,
              sc: replyPriority === "Urgent" ? "danger" : replyPriority === "High" ? "warning" : "info",
            }
          : t
      )
    );
    toast.success("Reply sent successfully");
    setSelectedTicket(null);
  };

  const handleResolveTicket = () => {
    if (!selectedTicket) return;

    setTickets(
      tickets.map((t) =>
        t.id === selectedTicket.id ? { ...t, status: "Resolved", sc: "info" as const } : t
      )
    );
    toast.success("Ticket marked as resolved");
    setSelectedTicket(null);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrom || !newIssue) {
      toast.error("Please fill in applicant and issue fields");
      return;
    }

    const newTicket: SupportTicket = {
      id: `#SUP-0${Math.floor(Math.random() * 90 + 10)}`,
      from: `${newFrom} (${newType})`,
      issue: newIssue,
      priority: newPriority,
      type: newType,
      sc: newPriority === "Urgent" ? "danger" : newPriority === "High" ? "warning" : "info",
      status: "Open",
      date: new Date().toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    };

    setTickets([newTicket, ...tickets]);
    toast.success("Support ticket created");
    setIsNewTicketOpen(false);
    setNewFrom("");
    setNewIssue("");
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Support & Activity"
        subtitle="Tickets · delivery issues · activity logs"
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsNewTicketOpen(true)}>
            <IconPlus size={15} style={{ marginRight: "4px" }} />
            New Ticket
          </Button>
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
          label="Open Tickets"
          value="18"
          icon={<IconLifebuoy size={20} />}
          variant="red"
          footer="4 urgent"
        />
        <StatCard
          label="Avg Response"
          value="2.4h"
          icon={<IconClock size={20} />}
          variant="amber"
          footer="SLA: 4 hours"
        />
        <StatCard
          label="Resolved (Week)"
          value="47"
          icon={<IconCheck size={20} />}
          variant="green"
          footer="94% satisfaction"
        />
        <StatCard
          label="Activity Logs Today"
          value="1,284"
          icon={<IconListDetails size={20} />}
          variant="navy"
          footer="All systems normal"
        />
      </div>

      {/* Main Grid */}
      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: "20px",
        }}
      >
        {/* Left Side: Open Tickets List */}
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
              <IconLifebuoy size={18} />
              Open Tickets
            </div>
            <Button variant="primary" size="xs" onClick={() => setIsNewTicketOpen(true)}>
              <IconPlus size={14} style={{ marginRight: "3px" }} />
              New
            </Button>
          </div>
          <div className="tbl-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Ticket</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>From</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Issue</th>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Priority</th>
                  <th style={{ padding: "12px 18px", width: "80px" }}></th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="tr-click"
                    onClick={() => handleOpenTicket(t)}
                    style={{
                      borderBottom: "1px solid var(--border-xs)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    <td className="td-id" style={{ padding: "14px 18px", fontWeight: 700, color: "var(--teal-600)" }}>{t.id}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--t2)" }}>{t.from}</td>
                    <td className="sm c3 w5" style={{ padding: "14px 18px", color: "var(--t3)", fontWeight: 500 }}>{t.issue}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <Badge variant={t.sc}>{t.priority}</Badge>
                    </td>
                    <td style={{ padding: "14px 18px" }} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="xs" onClick={() => handleOpenTicket(t)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Activity Log Feed */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            display: "flex",
            flexDirection: "column",
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
              <IconLifebuoy size={18} />
              Live Activity Log
            </div>
            <span className="sdot on sm w6 csuccess">Live</span>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 20px",
              maxHeight: "420px",
            }}
          >
            {logs.map((l, i) => (
              <div
                key={i}
                className="feed-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 0",
                  borderBottom: i < logs.length - 1 ? "1px dashed var(--border-xs)" : "none",
                }}
              >
                <div
                  className="feed-dot"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: l.c,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="feed-txt" style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.a}</div>
                  <div className="feed-sub" style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 500 }}>{l.u}</div>
                </div>
                <div className="feed-time" style={{ fontSize: "11.5px", color: "var(--t4)", fontWeight: 600 }}>{l.tm}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ticket Drawer Overlay */}
      {selectedTicket && (
        <div
          className="drawer-overlay show"
          onClick={() => setSelectedTicket(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5, 14, 28, 0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
            display: "flex",
            justifyContent: "flex-end",
            transition: "opacity 0.2s ease",
          }}
        >
          <div
            className="drawer open lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              boxShadow: "-4px 0 24px rgba(5,14,28,0.15)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              animation: "slideLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            {/* Header */}
            <div className="drawer-hd" style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-xs)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="drawer-title" style={{ fontSize: "17px", fontWeight: 800 }}>Support Ticket {selectedTicket.id}</span>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="modal-close"
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "var(--t4)",
                  }}
                >
                  <IconX size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <Badge variant={selectedTicket.sc}>{selectedTicket.priority} Priority</Badge>
                <Badge variant="neutral">{selectedTicket.status}</Badge>
                <Badge variant="navy">{selectedTicket.type} Issue</Badge>
              </div>

              <div className="sec-label" style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                Ticket Details
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="detail-k" style={{ color: "var(--t3)" }}>Ticket ID</span>
                  <span className="detail-v mono cteal" style={{ fontWeight: 700, color: "var(--teal-600)" }}>{selectedTicket.id}</span>
                </div>
                <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="detail-k" style={{ color: "var(--t3)" }}>Submitted by</span>
                  <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>{selectedTicket.from}</span>
                </div>
                <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="detail-k" style={{ color: "var(--t3)" }}>Issue</span>
                  <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>{selectedTicket.issue}</span>
                </div>
                <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="detail-k" style={{ color: "var(--t3)" }}>Submitted</span>
                  <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>{selectedTicket.date}</span>
                </div>
                <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span className="detail-k" style={{ color: "var(--t3)" }}>Assigned To</span>
                  <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>Support Agent</span>
                </div>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "20px 0" }} />

              <div className="sec-label" style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                Conversation History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div
                  className="chat-bubble recv"
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border-sm)",
                    borderRadius: "12px",
                    fontSize: "13px",
                    lineHeight: 1.4,
                  }}
                >
                  <strong>{selectedTicket.from}:</strong> {selectedTicket.issue}. Please help me resolve this ASAP.
                </div>
                <div
                  className="chat-bubble sent"
                  style={{
                    padding: "10px 14px",
                    background: "var(--navy-600)",
                    color: "#fff",
                    borderRadius: "12px",
                    fontSize: "13px",
                    lineHeight: 1.4,
                    alignSelf: "flex-end",
                    maxWidth: "85%",
                  }}
                >
                  Hi, we've received your report and are investigating. We'll update you within 2 hours.
                </div>
              </div>

              {/* Form entries inside drawer */}
              <div className="fg" style={{ marginBottom: "14px" }}>
                <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Response Message</label>
                <textarea
                  className="form-input"
                  placeholder="Type your response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
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

              <div className="fg" style={{ marginBottom: "14px" }}>
                <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Ticket Status</label>
                <select
                  className="form-select"
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value)}
                  style={{
                    width: "100%",
                    height: "36px",
                    padding: "0 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1.5px solid var(--border-md)",
                    background: "var(--surface)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Awaiting User</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>

              <div className="fg">
                <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Priority</label>
                <div className="pill-toggle" style={{ display: "flex" }}>
                  {(["Low", "High", "Urgent"] as const).map((pr) => (
                    <div
                      key={pr}
                      className={`pill-btn ${replyPriority === pr ? "active" : ""}`}
                      onClick={() => setReplyPriority(pr)}
                      style={{ flex: 1, textAlign: "center", cursor: "pointer" }}
                    >
                      {pr}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="drawer-foot"
              style={{
                padding: "16px 20px",
                borderTop: "1px solid var(--border-xs)",
                display: "flex",
                gap: "8px",
                background: "var(--surface-alt)",
              }}
            >
              <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={handleResolveTicket}>
                Mark Resolved
              </Button>
              <Button variant="primary" size="sm" style={{ marginLeft: "auto" }} onClick={handleSendReply}>
                <IconSend size={15} style={{ marginRight: "4px" }} />
                Send Reply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div
          className="overlay show"
          onClick={() => setIsNewTicketOpen(false)}
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
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Create Support Ticket</span>
              <button
                onClick={() => setIsNewTicketOpen(false)}
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
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Applicant Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Lois Becket"
                      value={newFrom}
                      onChange={(e) => setNewFrom(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Applicant Type</label>
                    <select
                      className="form-select"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
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
                      <option>Sailor</option>
                      <option>Partner</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Issue Description</label>
                    <textarea
                      className="form-input"
                      placeholder="Describe the issue..."
                      value={newIssue}
                      onChange={(e) => setNewIssue(e.target.value)}
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
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Priority Level</label>
                    <div className="pill-toggle" style={{ display: "flex" }}>
                      {(["Low", "High", "Urgent"] as const).map((pr) => (
                        <div
                          key={pr}
                          className={`pill-btn ${newPriority === pr ? "active" : ""}`}
                          onClick={() => setNewPriority(pr)}
                          style={{ flex: 1, textAlign: "center", cursor: "pointer" }}
                        >
                          {pr}
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
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsNewTicketOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default SupportPage;
