import { useState } from "react";
import {
  IconSettings,
  IconUsers,
  IconHelpCircle,
  IconDeviceFloppy,
  IconPlus,
  IconEdit,
  IconTrash,
  IconX,
  IconSend,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AdminAcc {
  n: string;
  r: string;
  e: string;
}

export function SettingsPage() {
  // Config states
  const [cancelWindow, setCancelWindow] = useState("36 hours after ship arrival");
  const [timeout, setTimeoutVal] = useState("48 hours");
  const [pointsPerDelivery, setPointsPerDelivery] = useState("250");
  const [referralBonus, setReferralBonus] = useState("500");
  const [conversionRate, setConversionRate] = useState("100 pts = $1.00");
  const [maxDesc, setMaxDesc] = useState("500 characters");

  const [enableExpress, setEnableExpress] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  // Modals state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  // Admin Form states
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("Operations");

  // FAQ Form states
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  const [admins, setAdmins] = useState<AdminAcc[]>([
    { n: "Super Admin", r: "Super Admin", e: "admin@anchormart.io" },
    { n: "Ops Manager", r: "Operations", e: "ops@anchormart.io" },
    { n: "Support Agent", r: "Support", e: "support@anchormart.io" },
  ]);

  const [faqs, setFaqs] = useState([
    "How does ship delivery work?",
    "Can I change my location after ordering?",
    "How do I track my order?",
    "Which payment methods are accepted?",
    "How do I apply a coupon?",
    "Is support available offshore?",
  ]);

  const handleSaveConfig = () => {
    toast.success("Platform configuration saved successfully");
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminEmail) {
      toast.error("Full Name and Email are required");
      return;
    }
    const newAdmin: AdminAcc = {
      n: adminName,
      r: adminRole,
      e: adminEmail,
    };
    setAdmins([...admins, newAdmin]);
    toast.success(`Invitation sent to ${adminEmail}`);
    setIsAdminOpen(false);
    setAdminName("");
    setAdminEmail("");
  };

  const handleDeleteAdmin = (name: string) => {
    const confirmDel = window.confirm(`Remove admin account for "${name}"?`);
    if (confirmDel) {
      setAdmins(admins.filter((a) => a.n !== name));
      toast.error(`Admin ${name} removed`);
    }
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion) {
      toast.error("Question is required");
      return;
    }
    setFaqs([...faqs, faqQuestion]);
    toast.success("FAQ item added");
    setIsFaqOpen(false);
    setFaqQuestion("");
    setFaqAnswer("");
  };

  const handleDeleteFaq = (index: number) => {
    const confirmDel = window.confirm("Remove this FAQ item?");
    if (confirmDel) {
      setFaqs(faqs.filter((_, i) => i !== index));
      toast.error("FAQ item removed");
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Settings"
        subtitle="Platform configuration, admin accounts, preferences"
        actions={
          <Button variant="primary" size="sm" onClick={handleSaveConfig}>
            <IconDeviceFloppy size={14} style={{ marginRight: "4px" }} />
            Save Changes
          </Button>
        }
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
        {/* Left Side: Platform Config */}
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
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconSettings size={18} />
              Platform Configuration
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Order cancellation window</label>
              <Input value={cancelWindow} onChange={(e) => setCancelWindow(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Payment confirmation timeout</label>
              <Input value={timeout} onChange={(e) => setTimeoutVal(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Loyalty points per delivery</label>
              <Input value={pointsPerDelivery} onChange={(e) => setPointsPerDelivery(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Referral bonus points</label>
              <Input value={referralBonus} onChange={(e) => setReferralBonus(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Points to $ conversion rate</label>
              <Input value={conversionRate} onChange={(e) => setConversionRate(e.target.value)} />
            </div>
            <div className="fg">
              <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Max special request description</label>
              <Input value={maxDesc} onChange={(e) => setMaxDesc(e.target.value)} />
            </div>

            <hr style={{ border: 0, borderTop: "1px solid var(--border-xs)", margin: "10px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={enableExpress}
                  onChange={(e) => setEnableExpress(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                Enable Express Delivery
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={autoAssign}
                  onChange={(e) => setAutoAssign(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                Auto-assign partner to new orders
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={maintenance}
                  onChange={(e) => setMaintenance(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                Maintenance mode
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Admins & FAQs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Admin Accounts */}
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
              <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
                <IconUsers size={18} />
                Admin Accounts
              </div>
              <Button variant="ghost" size="xs" onClick={() => setIsAdminOpen(true)}>
                <IconPlus size={14} style={{ marginRight: "3px" }} />
                Add Admin
              </Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {admins.map((a) => (
                <div
                  key={a.e}
                  className="ecard"
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border-xs)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "var(--surface-alt)",
                  }}
                >
                  <div className="av av-navy" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--navy-50)", color: "var(--navy-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                    {a.n[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>{a.n}</div>
                    <div style={{ fontSize: "11.5px", color: "var(--t4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.r} · {a.e}
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                  <Button variant="ghost" size="xs" onClick={() => toast.info("Edit Admin details...")}>
                    <IconEdit size={14} />
                  </Button>
                  <Button variant="danger" size="xs" onClick={() => handleDeleteAdmin(a.n)}>
                    <IconTrash size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Help & FAQ Card */}
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
              <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
                <IconHelpCircle size={18} />
                Help & FAQ Management
              </div>
              <Button variant="ghost" size="xs" onClick={() => setIsFaqOpen(true)}>
                <IconPlus size={14} style={{ marginRight: "3px" }} />
                Add FAQ
              </Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {faqs.map((q, i) => (
                <div
                  key={i}
                  className="ecard"
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border-xs)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "var(--surface-alt)",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", width: "18px" }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "var(--t2)" }}>{q}</span>
                  <Button variant="ghost" size="xs" onClick={() => toast.info("FAQ editor opened")}>
                    <IconEdit size={13} />
                  </Button>
                  <Button variant="danger" size="xs" onClick={() => handleDeleteFaq(i)}>
                    <IconTrash size={13} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Admin Modal Overlay */}
      {isAdminOpen && (
        <div
          className="overlay show"
          onClick={() => setIsAdminOpen(false)}
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
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Add Admin Account</span>
              <button
                onClick={() => setIsAdminOpen(false)}
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
            <form onSubmit={handleAddAdmin}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Full Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Ops Specialist"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Email Address</label>
                    <Input
                      type="email"
                      placeholder="e.g. specialist@anchormart.io"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Role Designation</label>
                    <select
                      className="form-select"
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value)}
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
                      <option>Super Admin</option>
                      <option>Operations</option>
                      <option>Support</option>
                    </select>
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
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsAdminOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  <IconSend size={15} style={{ marginRight: "4px" }} />
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add FAQ Modal Overlay */}
      {isFaqOpen && (
        <div
          className="overlay show"
          onClick={() => setIsFaqOpen(false)}
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
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>Add FAQ Item</span>
              <button
                onClick={() => setIsFaqOpen(false)}
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
            <form onSubmit={handleAddFaq}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Question</label>
                    <Input
                      type="text"
                      placeholder="e.g. Can I change my location after ordering?"
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Answer</label>
                    <textarea
                      className="form-input"
                      placeholder="e.g. FAQ Answer..."
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
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
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsFaqOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  <IconPlus size={15} style={{ marginRight: "4px" }} />
                  Add FAQ
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default SettingsPage;
