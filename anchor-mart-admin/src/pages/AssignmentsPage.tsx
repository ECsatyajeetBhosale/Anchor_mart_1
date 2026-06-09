import { useState } from "react";
import {
  IconPlus,
  IconTransfer,
  IconMessage,
  IconBell,
  IconCheck,
  IconX,
  IconClock,
  IconAnchor,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { OrderDetailDrawer, type OrderDetail } from "@/components/common/OrderDetailDrawer";

interface AssignmentData {
  e: string;
  p: string;
  o: string;
  sh: string;
  d: string;
  s: string;
  sc: "teal" | "warning" | "info" | "success" | "neutral" | "danger";
  t: string;
}

interface UnassignedOrder {
  id: string;
  s: string;
  it: string;
  p: string;
  pr: "High" | "Normal";
}

export function AssignmentsPage() {
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const initialAssignments: AssignmentData[] = [
    { e: "ENQ-0042", p: "Rahul Singh", o: "#AM2461", sh: "Wegmans PSA", d: "MSC Marvela·B7", s: "Delivering", sc: "teal", t: "12:02 PM" },
    { e: "ENQ-0047", p: "Pita Havili", o: "#AM2463", sh: "EuroSpar Keppel", d: "Evergreen·Brani", s: "Verifying", sc: "warning", t: "3:00 PM" },
    { e: "ENQ-0039", p: "Marco Reyes", o: "#AM2458", sh: "Port Marine", d: "APL Vanda·B14", s: "Delivering", sc: "teal", t: "11:45 AM" },
    { e: "ENQ-0051", p: "Rahul Singh", o: "#AM2467", sh: "Wegmans PSA", d: "IMO 0123456", s: "New", sc: "info", t: "1:30 PM" },
  ];

  const [assignments, setAssignments] = useState<AssignmentData[]>(initialAssignments);

  const initialUnassigned: UnassignedOrder[] = [
    { id: "#AM2467", s: "Ravi Patel", it: "Express items ×6", p: "PSA Terminal", pr: "High" },
    { id: "#AM2469", s: "Omar Karim", it: "Water Bottle, Tablets ×2", p: "Keppel", pr: "Normal" },
  ];

  const [unassigned, setUnassigned] = useState<UnassignedOrder[]>(initialUnassigned);

  const handleOpenAssignModal = (orderId: string) => {
    setAssignOrderId(orderId);
    setSelectedPartner("");
    setIsAssignOpen(true);
  };

  const handleConfirmAssignment = () => {
    if (!selectedPartner) {
      toast.error("Please select a partner");
      return;
    }

    // Move from unassigned list if present
    const isUnassigned = unassigned.some((u) => u.id === assignOrderId);
    if (isUnassigned) {
      const uOrder = unassigned.find((u) => u.id === assignOrderId)!;
      setUnassigned(unassigned.filter((u) => u.id !== assignOrderId));
      const newAssignment: AssignmentData = {
        e: `ENQ-00${Math.floor(Math.random() * 90 + 10)}`,
        p: selectedPartner,
        o: uOrder.id,
        sh: "Wegmans PSA",
        d: `${uOrder.s}·B7`,
        s: "New",
        sc: "info",
        t: "ASAP",
      };
      setAssignments([newAssignment, ...assignments]);
    } else {
      setAssignments(
        assignments.map((a) => (a.o === assignOrderId ? { ...a, p: selectedPartner } : a))
      );
    }

    toast.success(`Partner ${selectedPartner} assigned successfully to ${assignOrderId}`);
    setIsAssignOpen(false);
  };

  const handleRowClick = (a: AssignmentData) => {
    setSelectedOrder({
      id: a.o,
      sailor: "Sailor",
      ship: "IMO 0123456",
      terminal: a.d.split("·")[0],
      partner: a.p,
      payment: "Card · Paid",
      total: "$70.00",
      status: a.s,
      items: [
        { name: "Order items", qty: 3, price: "$70.00" },
      ],
    });
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Order Assignments"
        subtitle="Assign, reassign and monitor active delivery operations"
        actions={
          <Button variant="primary" size="sm" onClick={() => handleOpenAssignModal("new")}>
            <IconPlus size={15} style={{ marginRight: "4px" }} />
            New Assignment
          </Button>
        }
      />

      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: "20px",
        }}
      >
        {/* Left Side: Table & Live Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Active Assignments */}
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
              Active Assignments
            </div>
            <div className="tbl-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>ENQ</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Partner</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Order</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Shop</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Deliver To</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                    <th style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>ETA</th>
                    <th style={{ padding: "12px 18px", width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, idx) => (
                    <tr
                      key={idx}
                      className="tr-click"
                      onClick={() => handleRowClick(a)}
                      style={{
                        borderBottom: "1px solid var(--border-xs)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <td className="td-id" style={{ padding: "14px 18px", fontWeight: 700, color: "var(--teal-600)" }}>{a.e}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <div className="av av-sm av-teal" style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
                            {a.p[0]}
                          </div>
                          <span style={{ fontSize: "13px", color: "var(--t1)", fontWeight: 700 }}>{a.p.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="td-id xs" style={{ padding: "14px 18px", fontWeight: 700 }}>{a.o}</td>
                      <td className="td-m" style={{ padding: "14px 18px", color: "var(--t4)" }}>{a.sh}</td>
                      <td className="td-m" style={{ padding: "14px 18px", color: "var(--t3)" }}>{a.d}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <Badge variant={a.sc}>{a.s}</Badge>
                      </td>
                      <td className="td-m" style={{ padding: "14px 18px", color: "var(--t4)" }}>{a.t}</td>
                      <td style={{ padding: "14px 18px" }} onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="xs" onClick={() => handleOpenAssignModal(a.o)}>
                          <IconTransfer size={15} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Steps Tracking */}
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
                marginBottom: "20px",
              }}
            >
              <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)" }}>
                ENQ-0042 — Live Steps
              </div>
              <Badge variant="teal">Delivering</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="dstep done" style={{ display: "flex", gap: "12px", opacity: 0.85 }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--green-bg)", color: "var(--green-icon)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconCheck size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Items verified at shop</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>2 available · 1 substituted · 10:04 AM</div>
                </div>
                <Badge variant="success">Done</Badge>
              </div>

              <div className="dstep done" style={{ display: "flex", gap: "12px", opacity: 0.85 }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--green-bg)", color: "var(--green-icon)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconCheck size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Payment confirmed — $70.45</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>Via payment link · 10:52 AM</div>
                </div>
                <Badge variant="success">Done</Badge>
              </div>

              <div className="dstep active" style={{ display: "flex", gap: "12px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--amber-bg)", color: "var(--amber-icon)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconClock size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Items picked up from shop</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>Rahul Singh en route to Berth 7</div>
                </div>
                <Badge variant="warning">Active</Badge>
              </div>

              <div className="dstep pending" style={{ display: "flex", gap: "12px", opacity: 0.5 }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--neutral-bg)", color: "var(--t4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconAnchor size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Deliver to ship</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>Handover to Ali Mahmoud · Berth 7</div>
                </div>
                <Badge variant="neutral">Pending</Badge>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <Button variant="secondary" size="sm" onClick={() => toast.success("Chat window opened with Rahul")}>
                  <IconMessage size={15} style={{ marginRight: "4px" }} />
                  Chat Partner
                </Button>
                <Button variant="teal" size="sm" onClick={() => toast.success("Sailor notified of partner status")}>
                  <IconBell size={15} style={{ marginRight: "4px" }} />
                  Notify Sailor
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Unassigned & Drivers List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Unassigned Orders */}
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
              <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)" }}>
                Unassigned Orders
              </div>
              <Badge variant="danger">2 urgent</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {unassigned.map((u) => (
                <div
                  key={u.id}
                  className="ecard"
                  style={{
                    padding: "12px",
                    border: "1px solid var(--border-xs)",
                    borderLeft: "3.5px solid var(--danger-icon)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--surface-alt)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--teal-600)" }}>{u.id}</span>
                      <Badge variant={u.pr === "High" ? "danger" : "info"} style={{ fontSize: "10px", padding: "1px 6px" }}>{u.pr}</Badge>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>{u.s}</div>
                    <div style={{ fontSize: "11px", color: "var(--t4)" }}>
                      {u.it} · {u.p}
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => handleOpenAssignModal(u.id)}>
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Available Partners */}
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
              <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)" }}>
                Available Partners
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="av av-green" style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--green-bg)", color: "var(--green-icon)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                  A
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Aisha Karimi</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>DP-00056 · Singapore</div>
                </div>
                <Badge variant="success">Free</Badge>
                <Button variant="ghost" size="xs" onClick={() => handleOpenAssignModal("new")}>Assign</Button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="av av-green" style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--green-bg)", color: "var(--green-icon)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                  D
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>David Lim</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>DP-00033 · Jurong</div>
                </div>
                <Badge variant="success">Free</Badge>
                <Button variant="ghost" size="xs" onClick={() => handleOpenAssignModal("new")}>Assign</Button>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "10px 0" }} />
              <div className="sec-label" style={{ fontSize: "10px", color: "var(--t4)", fontWeight: 800, textTransform: "uppercase" }}>Busy (can take more)</div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="av av-teal" style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>
                  P
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Pita Havili</div>
                  <div style={{ fontSize: "11px", color: "var(--t4)" }}>DP-00087 · 2 active orders</div>
                </div>
                <Badge variant="warning">Busy</Badge>
                <Button variant="ghost" size="xs" onClick={() => handleOpenAssignModal("new")}>Assign</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />

      {/* Reassign Partner Modal */}
      {isAssignOpen && (
        <div
          className="overlay show"
          onClick={() => setIsAssignOpen(false)}
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
                <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Assign Delivery Partner</span>
                <div className="modal-sub" style={{ fontSize: "12px", color: "var(--t3)" }}>Order ID: {assignOrderId}</div>
              </div>
              <button
                onClick={() => setIsAssignOpen(false)}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label className="fg-label" style={{ fontSize: "12px", fontWeight: 700, color: "var(--t3)" }}>Select Partner</label>
                {[
                  { n: "Aisha Karimi", id: "DP-00056", p: "Singapore", s: "Free", sc: "success" as const },
                  { n: "David Lim", id: "DP-00033", p: "Jurong", s: "Free", sc: "success" as const },
                  { n: "Pita Havili", id: "DP-00087", p: "Singapore", s: "2 active", sc: "warning" as const },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPartner(p.n)}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--border-sm)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      background: selectedPartner === p.n ? "var(--navy-25)" : "var(--surface)",
                      borderColor: selectedPartner === p.n ? "var(--navy-300)" : "var(--border-sm)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="av av-teal" style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
                        {p.n[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--t1)" }}>{p.n}</div>
                        <div style={{ fontSize: "10.5px", color: "var(--t4)" }}>{p.id} · {p.p}</div>
                      </div>
                      <Badge variant={p.sc}>{p.s}</Badge>
                    </div>
                  </div>
                ))}
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
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmAssignment}>
                Assign Partner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AssignmentsPage;
