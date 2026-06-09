import { useState } from "react";
import {
  IconSearch,
  IconCalendar,
  IconDownload,
  IconEye,
  IconTransfer,
  IconMessage,
  IconX,
  IconCheck,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OrderDetailDrawer, type OrderDetail } from "@/components/common/OrderDetailDrawer";
import { toast } from "sonner";

interface OrderData {
  id: string;
  s: string;
  it: string;
  sh: string;
  pt: string;
  pay: string;
  cp: string;
  t: string;
  st: string;
  sc: "warning" | "info" | "teal" | "success" | "neutral" | "danger";
  shipName: string;
  terminalName: string;
}

export function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [activeChip, setActiveChip] = useState("All (184)");

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [eta, setEta] = useState("12:30");

  const initialOrders: OrderData[] = [
    { id: "#AM2458", s: "Lois Becket", it: "Titan Watch, Card Holder", sh: "0123456 · Anch.2", pt: "Rahul Singh", pay: "Card ✓", cp: "SHIP10", t: "$84.00", st: "In Progress", sc: "warning", shipName: "IMO 0123456", terminalName: "Anchorage 2" },
    { id: "#AM2461", s: "Ali Mahmoud", it: "Nu Republic ×2, Protein Bar", sh: "MSC Marvela · B7", pt: "Rahul Singh", pay: "Card ✓", cp: "—", t: "$70.45", st: "Verifying", sc: "info", shipName: "MSC Marvela", terminalName: "Berth 7" },
    { id: "#AM2463", s: "James Wren", it: "Coffee, Tablets, Side table", sh: "Evergreen · Brani", pt: "Pita Havili", pay: "Card ✓", cp: "FREESHIP", t: "$48.00", st: "Delivering", sc: "teal", shipName: "Evergreen Faith", terminalName: "Brani Terminal" },
    { id: "#AM2465", s: "Sara Chen", it: "Echo Dot 5th Gen, Echo Buds", sh: "APL Vanda · PSA", pt: "Marco Reyes", pay: "Card ✓", cp: "—", t: "$94.99", st: "Delivered", sc: "success", shipName: "APL Vanda", terminalName: "PSA Terminal" },
    { id: "#AM2467", s: "Ravi Patel", it: "Express items ×6", sh: "IMO 0123456", pt: "Unassigned", pay: "Pending", cp: "—", t: "$32.00", st: "New", sc: "neutral", shipName: "IMO 0123456", terminalName: "PSA Terminal" },
    { id: "#AM2451", s: "Maria Santos", it: "KILLER Running Shoes", sh: "MSC Marvela", pt: "—", pay: "Refund", cp: "—", t: "$67.00", st: "Cancelled", sc: "danger", shipName: "MSC Marvela", terminalName: "Keppel Terminal" },
  ];

  const [orders, setOrders] = useState<OrderData[]>(initialOrders);

  const handleOpenAssignModal = (orderId: string) => {
    setAssignOrderId(orderId);
    const order = orders.find((o) => o.id === orderId);
    setSelectedPartner(order?.pt || "");
    setSpecialInstructions("");
    setIsAssignOpen(true);
  };

  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const handleSaveAssignment = () => {
    if (!selectedPartner) {
      toast.error("Please select a partner");
      return;
    }

    setOrders(
      orders.map((o) =>
        o.id === assignOrderId
          ? {
              ...o,
              pt: selectedPartner,
              st: o.st === "New" ? "In Progress" : o.st,
              sc: o.st === "New" ? "warning" : o.sc,
            }
          : o
      )
    );
    toast.success(`Partner ${selectedPartner} assigned to order ${assignOrderId}`);
    setIsAssignOpen(false);
  };

  const handleCancelOrder = (orderId: string) => {
    const confirmCancel = window.confirm(`Cancel order ${orderId}? A refund will be processed.`);
    if (confirmCancel) {
      setOrders(
        orders.map((o) =>
          o.id === orderId
            ? { ...o, st: "Cancelled", sc: "danger" as const, pay: "Refund" }
            : o
        )
      );
      toast.error(`Order ${orderId} has been cancelled`);
    }
  };

  const viewOrderDetails = (o: OrderData) => {
    setSelectedOrder({
      id: o.id,
      sailor: o.s,
      ship: o.shipName,
      terminal: o.terminalName,
      partner: o.pt,
      payment: o.pay === "Card ✓" ? "Card · Paid" : o.pay === "Refund" ? "Cancelled · Refunded" : "Pending Payment",
      coupon: o.cp === "—" ? "" : o.cp,
      total: o.t,
      status: o.st,
      items: [
        { name: o.it.split(", ")[0], qty: 1, price: o.t },
      ],
    });
  };

  // Filter lists based on Search input and Filters
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.s.toLowerCase().includes(search.toLowerCase()) ||
      o.it.toLowerCase().includes(search.toLowerCase()) ||
      o.sh.toLowerCase().includes(search.toLowerCase()) ||
      o.pt.toLowerCase().includes(search.toLowerCase());

    const matchesStatusSelect = statusFilter === "All Status" || o.st.toLowerCase() === statusFilter.toLowerCase();

    // Map Active Chip to Status
    let matchesChip = true;
    if (activeChip === "New (12)") matchesChip = o.st === "New";
    else if (activeChip === "Verifying (8)") matchesChip = o.st === "Verifying";
    else if (activeChip === "Awaiting Payment (12)") matchesChip = o.pay === "Pending";
    else if (activeChip === "In Progress (47)") matchesChip = o.st === "In Progress";
    else if (activeChip === "Delivering (38)") matchesChip = o.st === "Delivering";
    else if (activeChip === "Delivered (129)") matchesChip = o.st === "Delivered";
    else if (activeChip === "Cancelled (6)") matchesChip = o.st === "Cancelled";

    return matchesSearch && matchesStatusSelect && matchesChip;
  });

  const getStatusVariant = (st: string) => {
    switch (st.toLowerCase()) {
      case "delivered":
        return "success";
      case "in progress":
        return "warning";
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
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Orders Management"
        subtitle={
          <p className="pg-sub">
            <span>184 orders today</span>
            <span className="sep">·</span>
            <span>Full lifecycle visibility</span>
          </p>
        }
        actions={
          <>
            <div className="relative flex items-center" style={{ width: "240px" }}>
              <IconSearch size={16} style={{ position: "absolute", left: "12px", color: "var(--t4)" }} />
              <Input
                type="text"
                placeholder="Search orders..."
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
              <option>Verifying</option>
              <option>In Progress</option>
              <option>Delivering</option>
              <option>Delivered</option>
              <option>Cancelled</option>
            </select>
            <Button variant="secondary" size="sm" onClick={() => toast.info("Opening calendar date picker...")}>
              <IconCalendar size={14} style={{ marginRight: "4px" }} />
              Date Range
            </Button>
            <Button variant="primary" size="sm" onClick={() => toast.success("Exported order records")}>
              <IconDownload size={14} style={{ marginRight: "4px" }} />
              Export
            </Button>
          </>
        }
      />

      {/* Filter chips */}
      <div className="filter-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
        {[
          "All (184)",
          "New (12)",
          "Verifying (8)",
          "Awaiting Payment (12)",
          "In Progress (47)",
          "Delivering (38)",
          "Delivered (129)",
          "Cancelled (6)",
        ].map((chip) => (
          <div
            key={chip}
            className={`fchip ${activeChip === chip ? "active" : ""}`}
            onClick={() => setActiveChip(chip)}
            style={{
              padding: "6px 12px",
              background: activeChip === chip ? "var(--teal-50)" : "var(--surface)",
              color: activeChip === chip ? "var(--teal-700)" : "var(--t3)",
              border: activeChip === chip ? "1px solid var(--teal-200)" : "1px solid var(--border-sm)",
              borderRadius: "20px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            {chip}
          </div>
        ))}
      </div>

      {/* Orders Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Order ID</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Sailor</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Items</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Ship / Terminal</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Partner</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Payment</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Coupon</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Total</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  className="tr-click"
                  onClick={() => viewOrderDetails(o)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td className="td-id" style={{ padding: "14px 20px", fontWeight: 700, color: "var(--teal-600)" }}>{o.id}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="av av-sm av-navy" style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--navy-50)", color: "var(--navy-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                        {o.s[0]}
                      </div>
                      <span className="td-p" style={{ fontWeight: 600, color: "var(--t1)" }}>{o.s}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className="sm c3 w5 trunc" style={{ maxWidth: "170px", display: "block", color: "var(--t3)", fontWeight: 500 }}>
                      {o.it}
                    </span>
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{o.sh}</td>
                  <td style={{ padding: "14px 20px", color: o.pt === "Unassigned" ? "var(--danger-text)" : "var(--t2)", fontSize: "12.5px", fontWeight: 600 }}>
                    {o.pt}
                  </td>
                  <td style={{ padding: "14px 20px", color: o.pay.includes("✓") ? "var(--green-text)" : o.pay === "Pending" ? "var(--warning-text)" : "var(--danger-text)", fontSize: "12.5px", fontWeight: 700 }}>
                    {o.pay}
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{o.cp}</td>
                  <td className="td-p w7" style={{ padding: "14px 20px", fontWeight: 700 }}>{o.t}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={getStatusVariant(o.st)}>{o.st}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "4px" }}>
                      <Button variant="ghost" size="xs" title="View" onClick={() => viewOrderDetails(o)}>
                        <IconEye size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Reassign Partner" onClick={() => handleOpenAssignModal(o.id)}>
                        <IconTransfer size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Message" onClick={() => toast.success(`Message sent to Sailor ${o.s}`)}>
                        <IconMessage size={15} />
                      </Button>
                      <Button variant="danger" size="xs" title="Cancel" onClick={() => handleCancelOrder(o.id)}>
                        <IconX size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "32px", textAlign: "center", color: "var(--t4)", fontWeight: 600 }}>
                    No orders match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="pagination"
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-xs)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-alt)",
          }}
        >
          <span style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 600 }}>
            Showing {filteredOrders.length} of {orders.length}
          </span>
          <div style={{ display: "flex", gap: "5px" }}>
            <Button variant="secondary" size="xs" disabled style={{ padding: "0 8px" }}>Prev</Button>
            <Button variant="primary" size="xs" style={{ padding: "0 8px" }}>1</Button>
            <Button variant="secondary" size="xs" disabled style={{ padding: "0 8px" }}>Next</Button>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onReassign={(id) => {
          setSelectedOrder(null);
          handleOpenAssignModal(id);
        }}
      />

      {/* Partner Assignment Modal Overlay */}
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
              width: "500px",
              overflow: "hidden",
              animation: "zoomIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <div className="modal-hd" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-xs)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Assign Delivery Partner</span>
                <div className="modal-sub" style={{ fontSize: "12px", color: "var(--t3)" }}>Order {assignOrderId}</div>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Select Partner</label>
                  {[
                    { n: "Aisha Karimi", id: "DP-00056", p: "Singapore", s: "Free", sc: "success" as const },
                    { n: "David Lim", id: "DP-00033", p: "Jurong", s: "Free", sc: "success" as const },
                    { n: "Pita Havili", id: "DP-00087", p: "Singapore", s: "2 active", sc: "warning" as const },
                    { n: "Rahul Singh", id: "DP-00124", p: "Singapore", s: "3 active", sc: "warning" as const },
                  ].map((p) => (
                    <div
                      key={p.id}
                      className="ecard mb10"
                      onClick={() => setSelectedPartner(p.n)}
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--border-sm)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        background: selectedPartner === p.n ? "var(--navy-25)" : "var(--surface)",
                        borderColor: selectedPartner === p.n ? "var(--navy-300)" : "var(--border-sm)",
                        marginBottom: "10px",
                        transition: "all 0.15s",
                      }}
                    >
                      <div className="flex aic g12" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="av av-teal" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                          {p.n[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>{p.n}</div>
                          <div style={{ fontSize: "11px", color: "var(--t4)" }}>
                            {p.id} · {p.p}
                          </div>
                        </div>
                        <Badge variant={p.sc}>{p.s}</Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="fg">
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Special Instructions</label>
                  <textarea
                    className="form-input"
                    placeholder="Instructions for the delivery partner..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
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
                  <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Target ETA</label>
                  <Input type="time" value={eta} onChange={(e) => setEta(e.target.value)} />
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
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAssignOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveAssignment}>
                <IconCheck size={15} style={{ marginRight: "4px" }} />
                Assign Partner
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
