import { useState } from "react";
import {
  IconSearch,
  IconPlus,
  IconEye,
  IconMessage,
  IconEdit,
  IconUserOff,
  IconUsers,
  IconCircleCheck,
  IconMotorbike,
  IconCurrencyDollar,
  IconStar,
  IconX,
  IconCheck,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProfileDrawer, type ProfileDetail } from "@/components/shared/ProfileDrawer";
import { toast } from "sonner";

interface PartnerData {
  n: string;
  id: string;
  p: string;
  j: string;
  s: string;
  c: number;
  w: string;
  t: number;
  r: string;
  email: string;
  phone: string;
  vehicle: string;
}

export function PartnersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPartner, setEditPartner] = useState<PartnerData | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPortZone, setFormPortZone] = useState("Port of Singapore");
  const [formId, setFormId] = useState("");
  const [formVehicle, setFormVehicle] = useState("Motorcycle");

  const initialPartners: PartnerData[] = [
    { n: "Rahul Singh", id: "DP-00124", p: "Port of Singapore", j: "Mar 2023", s: "On Duty", c: 3, w: "$84.50", t: 124, r: "4.9", email: "rahul@anchormart.io", phone: "+65 9123 4567", vehicle: "Motorcycle" },
    { n: "Pita Havili", id: "DP-00087", p: "Port of Singapore", j: "Jun 2023", s: "On Duty", c: 2, w: "$61.00", t: 98, r: "4.7", email: "pita@anchormart.io", phone: "+65 9123 4568", vehicle: "Motorcycle" },
    { n: "Marco Reyes", id: "DP-00201", p: "Port of Singapore", j: "Oct 2023", s: "On Duty", c: 1, w: "$42.00", t: 87, r: "4.8", email: "marco@anchormart.io", phone: "+65 9123 4569", vehicle: "Car / Van" },
    { n: "Aisha Karimi", id: "DP-00056", p: "Port of Singapore", j: "Jan 2023", s: "Available", c: 0, w: "$0", t: 76, r: "4.6", email: "aisha@anchormart.io", phone: "+65 9123 4570", vehicle: "Bicycle" },
    { n: "David Lim", id: "DP-00033", p: "Jurong Port", j: "Nov 2022", s: "Inactive", c: 0, w: "$0", t: 52, r: "4.4", email: "david@anchormart.io", phone: "+65 9123 4571", vehicle: "On foot" },
    { n: "Sari Wijaya", id: "DP-00145", p: "Keppel Terminal", j: "May 2023", s: "On Duty", c: 2, w: "$58.00", t: 67, r: "4.5", email: "sari@anchormart.io", phone: "+65 9123 4572", vehicle: "Motorcycle" },
  ];

  const [partners, setPartners] = useState<PartnerData[]>(initialPartners);

  const openModal = (partner?: PartnerData) => {
    if (partner) {
      setEditPartner(partner);
      setFormName(partner.n);
      setFormEmail(partner.email);
      setFormPhone(partner.phone);
      setFormPortZone(partner.p);
      setFormId(partner.id);
      setFormVehicle(partner.vehicle);
    } else {
      setEditPartner(null);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormPortZone("Port of Singapore");
      setFormId("");
      setFormVehicle("Motorcycle");
    }
    setIsModalOpen(true);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.error("Name and email are required");
      return;
    }

    const generatedId = formId || `DP-00${Math.floor(Math.random() * 900 + 100)}`;

    if (editPartner) {
      setPartners(
        partners.map((pt) =>
          pt.id === editPartner.id
            ? {
                ...pt,
                n: formName,
                email: formEmail,
                phone: formPhone,
                p: formPortZone,
                id: generatedId,
                vehicle: formVehicle,
              }
            : pt
        )
      );
      toast.success("Delivery partner updated successfully");
    } else {
      const newPartner: PartnerData = {
        n: formName,
        id: generatedId,
        p: formPortZone,
        j: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        s: "Available",
        c: 0,
        w: "$0",
        t: 0,
        r: "5.0",
        email: formEmail,
        phone: formPhone,
        vehicle: formVehicle,
      };
      setPartners([...partners, newPartner]);
      toast.success("Delivery partner onboarded successfully");
    }
    setIsModalOpen(false);
  };

  const handleDeactivate = (id: string, name: string) => {
    const confirmDeact = window.confirm(`Deactivate partner ${name}?`);
    if (confirmDeact) {
      setPartners(
        partners.map((pt) => (pt.id === id ? { ...pt, s: "Inactive" } : pt))
      );
      toast.error(`Partner ${name} deactivated`);
    }
  };

  const showProfile = (d: PartnerData) => {
    setSelectedProfile({
      name: d.n,
      role: "partner",
      email: d.email,
      whatsapp: d.phone,
      joined: d.j,
      stat1Val: String(d.t),
      stat1Lbl: "Deliveries",
      stat2Val: d.r,
      stat2Lbl: "Rating",
      stat3Val: d.w === "$0" ? "—" : d.w,
      stat3Lbl: "This Week",
      status: d.s,
    });
  };

  const getStatusVariant = (s: string) => {
    switch (s.toLowerCase()) {
      case "on duty":
        return "teal";
      case "available":
        return "success";
      default:
        return "neutral";
    }
  };

  // Filter partners list
  const filteredPartners = partners.filter((pt) => {
    const matchesSearch =
      pt.n.toLowerCase().includes(search.toLowerCase()) ||
      pt.id.toLowerCase().includes(search.toLowerCase()) ||
      pt.p.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All Status" || pt.s === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Delivery Partners"
        subtitle={
          <p className="pg-sub">
            <span>64 partners</span>
            <span className="sep">·</span>
            <span className="sdot on sm w6 csuccess">28 on duty</span>
          </p>
        }
        actions={
          <>
            <div className="relative flex items-center" style={{ width: "200px" }}>
              <IconSearch size={16} style={{ position: "absolute", left: "12px", color: "var(--t4)" }} />
              <Input
                type="text"
                placeholder="Search partners..."
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
              <option>On Duty</option>
              <option>Available</option>
              <option>Inactive</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => openModal()}>
              <IconPlus size={15} style={{ marginRight: "4px" }} />
              Onboard Partner
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
          label="Total Partners"
          value="64"
          icon={<IconUsers size={20} />}
          variant="navy"
          footer="Across all ports"
        />
        <StatCard
          label="On Duty Now"
          value="28"
          icon={<IconCircleCheck size={20} />}
          variant="green"
          footer={<span className="sdot on xs csuccess">All active</span>}
        />
        <StatCard
          label="Active Deliveries"
          value="38"
          icon={<IconMotorbike size={20} />}
          variant="amber"
          footer="In progress"
        />
        <StatCard
          label="Weekly Earnings"
          value="$3.4k"
          icon={<IconCurrencyDollar size={20} />}
          variant="teal"
          footer="Total paid out"
        />
      </div>

      {/* Partners Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Partner</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>ID</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Port Zone</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Joined</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Active Orders</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>This Week</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Total Deliveries</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Rating</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((d) => (
                <tr
                  key={d.id}
                  className="tr-click"
                  onClick={() => showProfile(d)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="av av-teal" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--teal-50)", color: "var(--teal-600)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>
                        {d.n[0]}
                      </div>
                      <span className="td-p" style={{ fontWeight: 700, color: "var(--t1)" }}>{d.n}</span>
                    </div>
                  </td>
                  <td className="td-id" style={{ padding: "14px 20px", fontWeight: 600 }}>{d.id}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{d.p}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{d.j}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={getStatusVariant(d.s)}>{d.s}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: d.c > 0 ? "var(--teal-700)" : "var(--t4)" }}>{d.c}</td>
                  <td className="cteal w7" style={{ padding: "14px 20px", color: "var(--teal-600)", fontWeight: 700 }}>{d.w}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t3)" }}>{d.t}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <IconStar size={12} color="var(--amber-500)" style={{ display: "inline", marginRight: "3px" }} />
                    <span className="w7 camber" style={{ color: "var(--amber-700)", fontWeight: 700 }}> {d.r}</span>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "4px" }}>
                      <Button variant="ghost" size="xs" title="View Profile" onClick={() => showProfile(d)}>
                        <IconEye size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Message" onClick={() => toast.success(`Chat session opened with ${d.n}`)}>
                        <IconMessage size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Edit Info" onClick={() => openModal(d)}>
                        <IconEdit size={15} />
                      </Button>
                      <Button variant="danger" size="xs" title="Deactivate" onClick={() => handleDeactivate(d.id, d.n)}>
                        <IconUserOff size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Drawer component */}
      <ProfileDrawer
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onEdit={(p) => {
          setSelectedProfile(null);
          const found = partners.find((pt) => pt.n === p.name);
          if (found) openModal(found);
        }}
      />

      {/* Onboard / Edit Partner Modal Overlay */}
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
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                {editPartner ? "Edit Partner Details" : "Onboard Delivery Partner"}
              </span>
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
            <form onSubmit={handleSavePartner}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Full Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Aisha Karimi"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Email</label>
                    <Input
                      type="email"
                      placeholder="e.g. partner@anchormart.io"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Phone Number</label>
                    <Input
                      type="text"
                      placeholder="e.g. +65 9123 4567"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Port Zone</label>
                    <select
                      className="form-select"
                      value={formPortZone}
                      onChange={(e) => setFormPortZone(e.target.value)}
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
                      <option>Port of Singapore</option>
                      <option>Keppel Terminal</option>
                      <option>Brani Terminal</option>
                      <option>Jurong Port</option>
                      <option>PSA Pasir Panjang</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Partner ID</label>
                    <Input
                      type="text"
                      placeholder="e.g. DP-00056 (leave blank to auto-generate)"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Vehicle Type</label>
                    <select
                      className="form-select"
                      value={formVehicle}
                      onChange={(e) => setFormVehicle(e.target.value)}
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
                      <option>Motorcycle</option>
                      <option>Bicycle</option>
                      <option>Car / Van</option>
                      <option>On foot</option>
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
                  <IconCheck size={15} style={{ marginRight: "4px" }} />
                  {editPartner ? "Save Changes" : "Onboard Partner"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
