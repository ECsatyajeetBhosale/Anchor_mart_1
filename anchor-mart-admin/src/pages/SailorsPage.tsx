import { useState } from "react";
import {
  IconUsers,
  IconUserCheck,
  IconGift,
  IconShare,
  IconSearch,
  IconPlus,
  IconEye,
  IconEdit,
  IconMessage,
  IconBan,
  IconX,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProfileDrawer, type ProfileDetail } from "@/components/common/ProfileDrawer";
import { toast } from "sonner";

interface SailorData {
  n: string;
  e: string;
  w: string;
  j: string;
  sh: string;
  o: number;
  p: number;
  ca: number;
  wi: number;
  st: string;
  sc: "success" | "neutral" | "info" | "danger" | "warning";
}

export function SailorsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Inactive" | "New Signups" | "Blocked">("All");

  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSailor, setEditSailor] = useState<SailorData | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formShip, setFormShip] = useState("");
  const [formStatus, setFormStatus] = useState("Active");

  const initialSailors: SailorData[] = [
    { n: "Lois Becket", e: "loisbecket@gmail.com", w: "+44 7700 900124", j: "Mar 12, 2026", sh: "IMO 0123456", o: 18, p: 2450, ca: 1, wi: 3, st: "Active", sc: "success" },
    { n: "Ali Mahmoud", e: "ali.m@vessel.com", w: "+971 50 444 1234", j: "Jan 8, 2026", sh: "MSC Marvela", o: 12, p: 1820, ca: 2, wi: 5, st: "Active", sc: "success" },
    { n: "Sara Chen", e: "sara.c@marine.io", w: "+65 9123 4567", j: "Feb 22, 2026", sh: "APL Vanda", o: 7, p: 920, ca: 0, wi: 2, st: "Active", sc: "success" },
    { n: "James Wren", e: "jwren@shipco.net", w: "+44 7900 112233", j: "Dec 3, 2025", sh: "Evergreen Faith", o: 31, p: 5100, ca: 0, wi: 8, st: "Active", sc: "success" },
    { n: "Ravi Patel", e: "ravi.p@anchormail.com", w: "+91 98765 43210", j: "Apr 1, 2026", sh: "IMO 0123456", o: 2, p: 200, ca: 6, wi: 1, st: "New", sc: "info" },
    { n: "Maria Santos", e: "msantos@seafarer.ph", w: "+63 912 345 6789", j: "Nov 14, 2025", sh: "MSC Marvela", o: 0, p: 0, ca: 0, wi: 0, st: "Inactive", sc: "neutral" },
  ];

  const [sailors, setSailors] = useState<SailorData[]>(initialSailors);

  const openAddModal = (sailor?: SailorData) => {
    if (sailor) {
      setEditSailor(sailor);
      setFormName(sailor.n);
      setFormEmail(sailor.e);
      setFormWhatsapp(sailor.w);
      setFormShip(sailor.sh);
      setFormStatus(sailor.st);
    } else {
      setEditSailor(null);
      setFormName("");
      setFormEmail("");
      setFormWhatsapp("");
      setFormShip("IMO 0123456");
      setFormStatus("Active");
    }
    setIsModalOpen(true);
  };

  const handleSaveSailor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error("Name and Email are required");
      return;
    }

    if (editSailor) {
      // Edit mode
      setSailors(
        sailors.map((s) =>
          s.e === editSailor.e
            ? {
                ...s,
                n: formName,
                e: formEmail,
                w: formWhatsapp,
                sh: formShip,
                st: formStatus,
                sc: formStatus === "Active" ? "success" : formStatus === "New" ? "info" : formStatus === "Inactive" ? "neutral" : "danger",
              }
            : s
        )
      );
      toast.success("Sailor profile updated successfully");
    } else {
      // Add mode
      const newSailor: SailorData = {
        n: formName,
        e: formEmail,
        w: formWhatsapp,
        sh: formShip,
        j: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        o: 0,
        p: 0,
        ca: 0,
        wi: 0,
        st: formStatus,
        sc: formStatus === "Active" ? "success" : formStatus === "New" ? "info" : formStatus === "Inactive" ? "neutral" : "danger",
      };
      setSailors([newSailor, ...sailors]);
      toast.success("New sailor registered successfully");
    }
    setIsModalOpen(false);
  };

  const handleBlock = (sailorName: string) => {
    const confirmBlock = window.confirm(`Block ${sailorName}? They will lose app access immediately.`);
    if (confirmBlock) {
      setSailors(
        sailors.map((s) => (s.n === sailorName ? { ...s, st: "Blocked", sc: "danger" as const } : s))
      );
      toast.error(`${sailorName} has been blocked`);
    }
  };

  const showSailorProfile = (s: SailorData) => {
    setSelectedProfile({
      name: s.n,
      role: "sailor",
      email: s.e,
      whatsapp: s.w,
      joined: s.j,
      stat1Val: String(s.o),
      stat1Lbl: "Orders",
      stat2Val: s.o > 0 ? `$${Math.round(1500 / s.o)}` : "—",
      stat2Lbl: "Avg Order",
      stat3Val: s.p.toLocaleString(),
      stat3Lbl: "Loyalty Pts",
      status: s.st,
    });
  };

  // Filtering logic
  const filteredSailors = sailors.filter((s) => {
    // Search filter
    const matchesSearch =
      s.n.toLowerCase().includes(search.toLowerCase()) ||
      s.e.toLowerCase().includes(search.toLowerCase()) ||
      s.w.toLowerCase().includes(search.toLowerCase()) ||
      s.sh.toLowerCase().includes(search.toLowerCase());

    // Dropdown status filter
    const matchesDropdown = statusFilter === "All Status" || s.st.toLowerCase() === statusFilter.toLowerCase();

    // Tab status filter
    let matchesTab = true;
    if (activeTab === "Active") matchesTab = s.st === "Active";
    else if (activeTab === "Inactive") matchesTab = s.st === "Inactive";
    else if (activeTab === "New Signups") matchesTab = s.st === "New";
    else if (activeTab === "Blocked") matchesTab = s.st === "Blocked";

    return matchesSearch && matchesDropdown && matchesTab;
  });

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Sailors Management"
        subtitle={
          <p className="pg-sub">
            <span>2,847 registered</span>
            <span className="sep">·</span>
            <span>1,204 active this month</span>
          </p>
        }
        actions={
          <>
            <div className="relative flex items-center" style={{ width: "220px" }}>
              <IconSearch size={16} style={{ position: "absolute", left: "12px", color: "var(--t4)" }} />
              <Input
                type="text"
                placeholder="Search sailors..."
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
              <option>Active</option>
              <option>Inactive</option>
              <option>New</option>
              <option>Blocked</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => openAddModal()}>
              <IconPlus size={15} style={{ marginRight: "4px" }} />
              Add Sailor
            </Button>
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
          label="Total Sailors"
          value="2,847"
          icon={<IconUsers size={20} />}
          variant="navy"
          delta={{ value: "220", direction: "up" }}
          footer="this month"
        />
        <StatCard
          label="Active This Month"
          value="1,204"
          icon={<IconUserCheck size={20} />}
          variant="green"
          footer="42.3% engagement"
        />
        <StatCard
          label="Loyalty Pts Issued"
          value="4.82M"
          icon={<IconGift size={20} />}
          variant="amber"
          footer="≈ $48,200 value"
        />
        <StatCard
          label="Referrals (Month)"
          value="148"
          icon={<IconShare size={20} />}
          variant="teal"
          footer="+500 pts each"
        />
      </div>

      {/* Tabs Row */}
      <div className="tab-row" style={{ display: "flex", gap: "2px", borderBottom: "1.5px solid var(--border-xs)", marginBottom: "16px" }}>
        {(["All", "Active", "Inactive", "New Signups", "Blocked"] as const).map((tab) => (
          <div
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: "13.5px",
              fontWeight: 700,
              color: activeTab === tab ? "var(--teal-600)" : "var(--t4)",
              borderBottom: activeTab === tab ? "2px solid var(--teal-500)" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Sailors Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Sailor</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Contact</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Joined</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Ship</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Orders</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Loyalty Pts</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Cart/Wish</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSailors.map((s, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => showSailorProfile(s)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="av av-navy" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--navy-50)", color: "var(--navy-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>
                        {s.n[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--t1)" }}>{s.n}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--t4)", fontWeight: 500 }}>{s.e}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--t3)", fontWeight: 500 }}>{s.w}</td>
                  <td style={{ padding: "14px 20px", color: "var(--t3)", fontWeight: 500 }}>{s.j}</td>
                  <td style={{ padding: "14px 20px", color: "var(--t3)", fontWeight: 500 }}>{s.sh}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: "var(--t1)" }}>{s.o}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ color: "var(--amber-700)", fontWeight: 700 }}>{s.p.toLocaleString()}</span>
                    <span style={{ fontSize: "11px", color: "var(--t4)" }}> pts</span>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--t3)", fontWeight: 500 }}>
                    {s.ca} · {s.wi}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={s.sc}>{s.st}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "4px" }}>
                      <Button variant="ghost" size="xs" title="View" onClick={() => showSailorProfile(s)}>
                        <IconEye size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Edit" onClick={() => openAddModal(s)}>
                        <IconEdit size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Message" onClick={() => toast.success(`Opening WhatsApp chat to ${s.w}`)}>
                        <IconMessage size={15} />
                      </Button>
                      <Button variant="danger" size="xs" title="Block" onClick={() => handleBlock(s.n)}>
                        <IconBan size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSailors.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--t4)", fontWeight: 600 }}>
                    No sailors match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
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
            Showing {filteredSailors.length} of {sailors.length}
          </span>
          <div style={{ display: "flex", gap: "5px" }}>
            <Button variant="secondary" size="xs" disabled style={{ padding: "0 8px" }}>Prev</Button>
            <Button variant="primary" size="xs" style={{ padding: "0 8px" }}>1</Button>
            <Button variant="secondary" size="xs" disabled style={{ padding: "0 8px" }}>Next</Button>
          </div>
        </div>
      </div>

      {/* Sailor Profile Drawer */}
      <ProfileDrawer
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onEdit={(p) => {
          setSelectedProfile(null);
          const found = sailors.find((s) => s.n === p.name);
          if (found) openAddModal(found);
        }}
      />

      {/* Add / Edit Sailor Modal overlay */}
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
            <div className="modal-hd" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-xs)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                  {editSailor ? "Edit Sailor Profile" : "Register New Sailor"}
                </span>
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
            <form onSubmit={handleSaveSailor}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Full Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Lois Becket"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Email</label>
                    <Input
                      type="email"
                      placeholder="e.g. loisbecket@gmail.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>WhatsApp / Contact</label>
                    <Input
                      type="text"
                      placeholder="e.g. +44 7700 900124"
                      value={formWhatsapp}
                      onChange={(e) => setFormWhatsapp(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Ship Name / IMO Number</label>
                    <Input
                      type="text"
                      placeholder="e.g. IMO 0123456"
                      value={formShip}
                      onChange={(e) => setFormShip(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Status</label>
                    <select
                      className="form-select"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
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
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>New</option>
                      <option>Blocked</option>
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
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {editSailor ? "Save Changes" : "Register"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
