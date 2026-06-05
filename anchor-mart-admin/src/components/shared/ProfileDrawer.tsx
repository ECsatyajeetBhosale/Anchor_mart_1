import { IconX, IconMessage, IconEdit } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ProfileDetail {
  name: string;
  role: "sailor" | "partner";
  email: string;
  whatsapp: string;
  joined: string;
  stat1Val: string;
  stat1Lbl: string;
  stat2Val: string;
  stat2Lbl: string;
  stat3Val: string;
  stat3Lbl: string;
  status: string;
}

interface ProfileDrawerProps {
  profile: ProfileDetail | null;
  onClose: () => void;
  onEdit?: (profile: ProfileDetail) => void;
}

export function ProfileDrawer({ profile, onClose, onEdit }: ProfileDrawerProps) {
  if (!profile) return null;

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
        className="drawer open sm"
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
            <span className="drawer-title" style={{ fontSize: "16px", fontWeight: 800 }}>Profile Overview</span>
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

        {/* Body */}
        <div className="drawer-body" style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {/* Avatar and Name */}
          <div style={{ textAlign: "center", paddingBottom: "20px", borderBottom: "1px solid var(--border-sm)", marginBottom: "20px" }}>
            <div
              className={`av av-xl av-${profile.role === "partner" ? "teal" : "navy"}`}
              style={{
                margin: "0 auto 12px",
                fontSize: "22px",
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: profile.role === "partner" ? "var(--teal-50)" : "var(--navy-50)",
                color: profile.role === "partner" ? "var(--teal-600)" : "var(--navy-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              {profile.name[0]}
            </div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--t1)" }}>{profile.name}</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--t4)", marginTop: "4px" }}>
              {profile.role === "partner" ? "Delivery Partner" : "Sailor"}
            </div>
            <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "center" }}>
              <Badge variant="success">{profile.status}</Badge>
              {profile.role === "partner" && <Badge variant="teal">On Duty</Badge>}
            </div>
          </div>

          {/* Contact */}
          <div className="sec-label" style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
            Contact Details
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span className="detail-k" style={{ color: "var(--t3)" }}>Email</span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>{profile.email}</span>
            </div>
            <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span className="detail-k" style={{ color: "var(--t3)" }}>WhatsApp</span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>{profile.whatsapp}</span>
            </div>
            <div className="detail-kv" style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span className="detail-k" style={{ color: "var(--t3)" }}>Joined</span>
              <span className="detail-v" style={{ fontWeight: 600, color: "var(--t1)" }}>{profile.joined}</span>
            </div>
          </div>

          {/* Statistics */}
          <div className="sec-label" style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
            Statistics
          </div>
          <div
            className="form-row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              marginBottom: 0,
            }}
          >
            <div
              className="mini-stat"
              style={{
                padding: "12px 6px",
                background: "var(--surface-alt)",
                border: "1px solid var(--border-sm)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div className="mini-stat-val" style={{ fontSize: "18px", fontWeight: 800, color: "var(--t1)" }}>{profile.stat1Val}</div>
              <div className="mini-stat-lbl" style={{ fontSize: "10px", fontWeight: 600, color: "var(--t4)", textTransform: "uppercase", marginTop: "2px" }}>{profile.stat1Lbl}</div>
            </div>
            <div
              className="mini-stat"
              style={{
                padding: "12px 6px",
                background: "var(--surface-alt)",
                border: "1px solid var(--border-sm)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div className="mini-stat-val" style={{ fontSize: "18px", fontWeight: 800, color: "var(--t1)" }}>{profile.stat2Val}</div>
              <div className="mini-stat-lbl" style={{ fontSize: "10px", fontWeight: 600, color: "var(--t4)", textTransform: "uppercase", marginTop: "2px" }}>{profile.stat2Lbl}</div>
            </div>
            <div
              className="mini-stat"
              style={{
                padding: "12px 6px",
                background: "var(--surface-alt)",
                border: "1px solid var(--border-sm)",
                borderRadius: "var(--radius-md)",
                textAlign: "center",
              }}
            >
              <div className="mini-stat-val" style={{ fontSize: "18px", fontWeight: 800, color: "var(--t1)" }}>{profile.stat3Val}</div>
              <div className="mini-stat-lbl" style={{ fontSize: "10px", fontWeight: 600, color: "var(--t4)", textTransform: "uppercase", marginTop: "2px" }}>{profile.stat3Lbl}</div>
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
          <Button variant="ghost" size="sm" onClick={onClose} style={{ marginRight: "auto" }}>
            Close
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast.success(`Message thread opened with ${profile.name}`)}>
            <IconMessage size={15} style={{ marginRight: "4px" }} />
            Message
          </Button>
          {onEdit && (
            <Button variant="primary" size="sm" onClick={() => onEdit(profile)}>
              <IconEdit size={15} style={{ marginRight: "4px" }} />
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
