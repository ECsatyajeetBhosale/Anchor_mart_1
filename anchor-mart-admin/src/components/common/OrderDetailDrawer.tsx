import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconBell,
  IconChecks,
  IconClock,
  IconCreditCard,
  IconFileInvoice,
  IconMotorbike,
  IconPackage,
  IconTransfer,
  IconUserCheck,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

export interface OrderItem {
  name: string;
  qty: number;
  price: string;
}

export interface OrderDetail {
  id: string;
  sailor: string;
  ship: string;
  terminal: string;
  items: OrderItem[];
  total: string;
  status: string;
  partner: string;
  payment: string;
  coupon?: string;
}

/** A step in the order progress timeline (from the live-order details API). */
export interface OrderTimelineItem {
  key: string;
  label: string;
  at: string | null;
  is_done: boolean;
  detail?: string | null;
}

/** Per-step icons, keyed by the timeline `key` (falls back to a generic icon). */
const TIMELINE_ICONS: Record<string, ReactNode> = {
  intent_submitted: <IconFileInvoice size={14} />,
  intent_confirmed: <IconChecks size={14} />,
  payment_confirmed: <IconCreditCard size={14} />,
  assigned: <IconUserCheck size={14} />,
  out_for_delivery: <IconMotorbike size={14} />,
  delivered: <IconPackage size={14} />,
};

interface OrderDetailDrawerProps {
  order: OrderDetail | null;
  onClose: () => void;
  onReassign?: (orderId: string) => void;
  /** Live timeline; when provided it replaces the static fallback timeline. */
  timeline?: OrderTimelineItem[];
  /** True while the live timeline is being fetched. */
  timelineLoading?: boolean;
}

export function OrderDetailDrawer({
  order,
  onClose,
  onReassign,
  timeline,
  timelineLoading,
}: OrderDetailDrawerProps) {
  if (!order) return null;

  // Static fallback steps for callers that don't supply a live timeline.
  const fallbackTimeline = [
    {
      s: "done",
      icon: <IconFileInvoice size={14} />,
      t: "Intent submitted",
      d: "22 Apr · #INT20260422-0047",
    },
    {
      s: "done",
      icon: <IconChecks size={14} />,
      t: "Intent confirmed by admin",
      d: "22 Apr · 14:58",
    },
    {
      s: "done",
      icon: <IconCreditCard size={14} />,
      t: `Payment confirmed — ${order.total}`,
      d: "22 Apr · 15:24",
    },
    {
      s: "done",
      icon: <IconUserCheck size={14} />,
      t: `Assigned to ${order.partner}`,
      d: "22 Apr · 15:30",
    },
    {
      s: order.status.toLowerCase() === "delivered" ? "done" : "active",
      icon: <IconMotorbike size={14} />,
      t: "Out for delivery",
      d: order.status.toLowerCase() === "delivered" ? "Delivered to ship" : "En route to Terminal",
    },
    {
      s: order.status.toLowerCase() === "delivered" ? "done" : "pend",
      icon: <IconPackage size={14} />,
      t: "Delivery confirmed",
      d: order.status.toLowerCase() === "delivered" ? "Completed · 16:12" : "Awaiting arrival",
    },
  ];

  // Map the live timeline to the row model; the first incomplete step is "active".
  const firstPendingIdx = timeline ? timeline.findIndex((t) => !t.is_done) : -1;
  const timelineRows = timeline
    ? timeline.map((item, i) => ({
        s: item.is_done ? "done" : i === firstPendingIdx ? "active" : "pend",
        icon: TIMELINE_ICONS[item.key] ?? <IconFileInvoice size={14} />,
        t: item.label,
        d: [item.at, item.detail].filter(Boolean).join(" · "),
      }))
    : fallbackTimeline;

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "success";
      case "in progress":
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

  const handleCancel = () => {
    const confirmCancel = window.confirm(
      `This will cancel order ${order.id} and trigger refund processing. This cannot be undone. Are you sure?`,
    );
    if (confirmCancel) {
      toast.error(`Order ${order.id} has been cancelled`);
      onClose();
    }
  };

  return (
    <div
      className="drawer-overlay show"
      onClick={onClose}
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
        {/* Drawer Header */}
        <div
          className="drawer-hd"
          style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-xs)" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="drawer-title" style={{ fontSize: "17px", fontWeight: 800 }}>
              Order {order.id}
            </span>
            <button
              onClick={onClose}
              className="modal-close"
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "var(--t4)",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {/* Status Badges */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <Badge
              variant={getStatusVariant(order.status)}
              style={{ fontSize: "12px", padding: "4px 10px" }}
            >
              {order.status}
            </Badge>
            <Badge variant="teal" style={{ fontSize: "12px", padding: "4px 10px" }}>
              <IconClock size={12} style={{ marginRight: "4px", display: "inline" }} />
              Live Tracking
            </Badge>
          </div>

          {/* Timeline Compact */}
          <div
            className="tl-compact mb20"
            style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}
          >
            {timelineLoading ? (
              <div
                className="tl-c-sub"
                style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 500 }}
              >
                Loading timeline…
              </div>
            ) : timelineRows.length === 0 ? (
              <div
                className="tl-c-sub"
                style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 500 }}
              >
                No timeline available
              </div>
            ) : (
              timelineRows.map((tl, i) => (
                <div
                  key={i}
                  className="tl-c-item"
                  style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}
                >
                  <div
                    className={`tl-c-dot ${tl.s}`}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        tl.s === "done"
                          ? "var(--teal-500)"
                          : tl.s === "active"
                            ? "var(--amber-500)"
                            : "var(--border-md)",
                      color: tl.s === "done" || tl.s === "active" ? "#fff" : "var(--t4)",
                      flexShrink: 0,
                    }}
                  >
                    {tl.icon}
                  </div>
                  <div className="tl-c-body">
                    <div
                      className="tl-c-title"
                      style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}
                    >
                      {tl.t}
                    </div>
                    <div
                      className="tl-c-sub"
                      style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 500 }}
                    >
                      {tl.d}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "20px 0" }} />

          {/* Details */}
          <div
            className="sec-label"
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--t4)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            Order Information
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}
          >
            <div
              className="detail-kv"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
            >
              <span className="detail-k" style={{ color: "var(--t3)" }}>
                Sailor
              </span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>
                {order.sailor}
              </span>
            </div>
            <div
              className="detail-kv"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
            >
              <span className="detail-k" style={{ color: "var(--t3)" }}>
                Ship / IMO
              </span>
              <span
                className="detail-v mono cteal"
                style={{ fontWeight: 700, color: "var(--teal-600)" }}
              >
                {order.ship}
              </span>
            </div>
            <div
              className="detail-kv"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
            >
              <span className="detail-k" style={{ color: "var(--t3)" }}>
                Terminal
              </span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>
                {order.terminal}
              </span>
            </div>
            <div
              className="detail-kv"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
            >
              <span className="detail-k" style={{ color: "var(--t3)" }}>
                Delivery Partner
              </span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>
                {order.partner}
              </span>
            </div>
            <div
              className="detail-kv"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
            >
              <span className="detail-k" style={{ color: "var(--t3)" }}>
                Payment
              </span>
              <span
                className="detail-v csuccess"
                style={{ fontWeight: 700, color: "var(--green-text)" }}
              >
                {order.payment}
              </span>
            </div>
            <div
              className="detail-kv"
              style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
            >
              <span className="detail-k" style={{ color: "var(--t3)" }}>
                Coupon
              </span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>
                {order.coupon || "None"}
              </span>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "20px 0" }} />

          {/* Items */}
          <div
            className="sec-label"
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--t4)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            Items
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}
          >
            {order.items.map((item, i) => (
              <div
                key={i}
                className="detail-kv"
                style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}
              >
                <span className="detail-k w5 c4" style={{ color: "var(--t3)" }}>
                  {item.name} &times;{item.qty}
                </span>
                <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>
                  {item.price}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            style={{
              background: "var(--surface-alt)",
              borderRadius: "var(--radius-md)",
              padding: "14px 16px",
              marginTop: "14px",
              border: "1px solid var(--border-sm)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t2)" }}>
                Order Total
              </span>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "var(--t1)" }}>
                {order.total}
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Footer / Actions */}
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (onReassign) {
                onReassign(order.id);
              } else {
                toast.success(`Assigning partner flow triggered for ${order.id}`);
              }
            }}
          >
            <IconTransfer size={15} style={{ marginRight: "4px" }} />
            Reassign
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.success(`Notification sent to Sailor ${order.sailor}`)}
          >
            <IconBell size={15} style={{ marginRight: "4px" }} />
            Notify Sailor
          </Button>
          <Button variant="danger" size="sm" style={{ marginLeft: "auto" }} onClick={handleCancel}>
            <IconX size={15} style={{ marginRight: "4px" }} />
            Cancel Order
          </Button>
        </div>
      </div>
    </div>
  );
}
