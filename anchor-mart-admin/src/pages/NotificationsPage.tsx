import { useState } from "react";
import {
  IconBell,
  IconSend,
  IconClock,
  IconCurrencyDollar,
  IconPackage,
  IconAlertTriangle,
  IconMotorbike,
  IconGift,
  IconCheck,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationLog {
  t: string;
  tg: string;
  m: string;
  tm: string;
  icon: React.ReactNode;
  bg: string;
  c: string;
}

export function NotificationsPage() {
  const [audience, setAudience] = useState("All Sailors");
  const [notifType, setNotifType] = useState("🔔 Payment Required");
  const [message, setMessage] = useState("");
  const [sendTime, setSendTime] = useState("Send Immediately");
  const [channel, setChannel] = useState("Push + WhatsApp");

  const [logs, setLogs] = useState<NotificationLog[]>([
    { t: "Payment Required", tg: "Lois Becket", m: "Complete payment for Order #AM2458 within 48 hours.", tm: "1m ago", icon: <IconCurrencyDollar size={15} />, bg: "var(--warning-bg)", c: "var(--warning-icon)" },
    { t: "Order Confirmed", tg: "Ali Mahmoud", m: "Titan Watch confirmed and being packed.", tm: "10m ago", icon: <IconPackage size={15} />, bg: "var(--success-bg)", c: "var(--success-icon)" },
    { t: "Product Update", tg: "Sara Chen", m: "Shaving Kit unavailable — substitute suggested.", tm: "18m ago", icon: <IconAlertTriangle size={15} />, bg: "var(--danger-bg)", c: "var(--danger-icon)" },
    { t: "Assignment", tg: "Rahul Singh (DP)", m: "New ENQ-0051 assigned — deliver by 1:30 PM.", tm: "22m ago", icon: <IconMotorbike size={15} />, bg: "var(--info-bg)", c: "var(--info-icon)" },
    { t: "Gift Unlocked", tg: "James Wren", m: "Special gift unlocked for your next order!", tm: "38m ago", icon: <IconGift size={15} />, bg: "var(--purple-bg)", c: "var(--purple-icon)" },
  ]);

  const handleSendNotif = () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const newLog: NotificationLog = {
      t: notifType.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim(),
      tg: audience,
      m: message,
      tm: "Just now",
      icon: <IconBell size={15} />,
      bg: "var(--navy-50)",
      c: "var(--navy-600)",
    };

    setLogs([newLog, ...logs]);
    toast.success("Notification broadcasted successfully");
    setMessage("");
  };

  const handleMarkAllRead = () => {
    toast.success("All notifications marked as read");
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Notifications"
        subtitle="Push notifications, announcements, and history"
      />

      {/* Main Grid */}
      <div
        className="grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        {/* Compose Notification */}
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
              fontSize: "14.5px",
              fontWeight: 800,
              color: "var(--t1)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <IconSend size={18} />
            Compose Notification
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Target Audience</label>
              <select
                className="form-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
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
                <option>All Sailors</option>
                <option>All Delivery Partners</option>
                <option>Specific Sailor</option>
                <option>Specific Partner</option>
                <option>Port-specific Sailors</option>
                <option>Sailors with Pending Payment</option>
              </select>
            </div>

            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Notification Type</label>
              <select
                className="form-select"
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
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
                <option>🔔 Payment Required</option>
                <option>📦 Order Confirmed</option>
                <option>🚗 Out for Delivery</option>
                <option>🎁 Gift / Reward</option>
                <option>⚠️ Product Update</option>
                <option>📢 General Announcement</option>
                <option>📋 Assignment (Partner)</option>
              </select>
            </div>

            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Message</label>
              <textarea
                className="form-input"
                placeholder="Notification message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={280}
                style={{
                  width: "100%",
                  height: "90px",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1.5px solid var(--border-md)",
                  background: "var(--surface-input)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
              <div className="fg-hint" style={{ fontSize: "11px", color: "var(--t4)", marginTop: "4px" }}>
                Max 280 characters · Use {"{name}"}, {"{order_id}"} for personalisation.
              </div>
            </div>

            <div
              className="form-row"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              <div className="fg">
                <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Send Time</label>
                <select
                  className="form-select"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
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
                  <option>Send Immediately</option>
                  <option>Schedule</option>
                </select>
              </div>
              <div className="fg">
                <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Channel</label>
                <select
                  className="form-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
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
                  <option>Push + WhatsApp</option>
                  <option>Push Only</option>
                  <option>Email Only</option>
                </select>
              </div>
            </div>

            <Button variant="primary" onClick={handleSendNotif} style={{ width: "100%" }}>
              <IconSend size={15} style={{ marginRight: "4px" }} />
              Send Notification
            </Button>
          </div>
        </div>

        {/* Recent Notifications Log */}
        <div
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-sm)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
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
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconClock size={18} />
              Recent Notifications
            </div>
            <Button variant="ghost" size="xs" onClick={handleMarkAllRead}>
              <IconCheck size={14} style={{ marginRight: "4px" }} />
              Mark all read
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
            {logs.map((n, i) => (
              <div
                key={i}
                className="notif-item"
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-xs)",
                }}
              >
                <div
                  className="notif-icon"
                  style={{
                    width: "32px",
                    height: "32px",
                    background: n.bg,
                    color: n.c,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {n.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--t1)" }}>{n.t}</span>
                    <span style={{ fontSize: "11px", color: "var(--t4)" }}>{n.tm}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--t2)", fontWeight: 500 }}>{n.m}</div>
                  <div style={{ fontSize: "10.5px", color: "var(--t4)", marginTop: "2px", fontWeight: 600 }}>Recipient: {n.tg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default NotificationsPage;
