import { useState } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconStar,
  IconTicket,
  IconHistory,
  IconDownload,
  IconSettings,
  IconX,
  IconCheck,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Coupon {
  code: string;
  d: string;
  m: string;
  e: string;
  u: number;
  val: string;
}

interface Activity {
  sailor: string;
  activity: string;
  points: string;
  ref: string;
  date: string;
  isPositive: boolean;
}

export function RewardsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [formMinOrder, setFormMinOrder] = useState("");
  const [formExpiry, setFormExpiry] = useState("");

  const initialCoupons: Coupon[] = [
    { code: "SHIP10", d: "10% off shipping", m: "Min. order $50", e: "Oct 31, 2026", u: 284, val: "10" },
    { code: "FREESHIP", d: "20% off shipping", m: "Min. order $75", e: "Oct 30, 2026", u: 142, val: "20" },
    { code: "REFERRAL", d: "10% off (referral)", m: "First order only", e: "Oct 30, 2026", u: 97, val: "10" },
  ];

  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);

  const initialActivity: Activity[] = [
    { sailor: "Lois Becket", activity: "Order Delivered", points: "+ 250 pts", ref: "Order #AM2458", date: "May 20", isPositive: true },
    { sailor: "Lois Becket", activity: "Coupon Redeemed", points: "− 550 pts", ref: "SHIP10", date: "May 18", isPositive: false },
    { sailor: "James Wren", activity: "Referral Bonus", points: "+ 500 pts", ref: "WhatsApp referral", date: "May 15", isPositive: true },
    { sailor: "Sara Chen", activity: "Order Delivered", points: "+ 250 pts", ref: "Order #AM2463", date: "May 14", isPositive: true },
    { sailor: "Ali Mahmoud", activity: "Coupon Redeemed", points: "− 920 pts", ref: "FREESHIP", date: "May 12", isPositive: false },
  ];

  const openModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditCoupon(coupon);
      setFormCode(coupon.code);
      setFormDiscount(coupon.val);
      setFormMinOrder(coupon.m.replace(/\D/g, ""));
      setFormExpiry(coupon.e);
    } else {
      setEditCoupon(null);
      setFormCode("");
      setFormDiscount("");
      setFormMinOrder("");
      setFormExpiry(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    }
    setIsModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formDiscount) {
      toast.error("Code and discount are required");
      return;
    }

    if (editCoupon) {
      setCoupons(
        coupons.map((cp) =>
          cp.code === editCoupon.code
            ? {
                ...cp,
                code: formCode.toUpperCase(),
                d: `${formDiscount}% off shipping`,
                m: formMinOrder ? `Min. order $${formMinOrder}` : "First order only",
                e: formExpiry,
                val: formDiscount,
              }
            : cp
        )
      );
      toast.success(`Coupon ${formCode} updated successfully`);
    } else {
      const newCoupon: Coupon = {
        code: formCode.toUpperCase(),
        d: `${formDiscount}% off shipping`,
        m: formMinOrder ? `Min. order $${formMinOrder}` : "First order only",
        e: formExpiry,
        u: 0,
        val: formDiscount,
      };
      setCoupons([...coupons, newCoupon]);
      toast.success(`Coupon ${formCode} created successfully`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteCoupon = (code: string) => {
    const confirmDel = window.confirm(`Delete coupon "${code}"?`);
    if (confirmDel) {
      setCoupons(coupons.filter((cp) => cp.code !== code));
      toast.error(`Coupon ${code} has been deleted`);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Rewards & Coupons"
        subtitle="Loyalty · Referrals · Coupons"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => openModal()}>
              <IconTicket size={14} style={{ marginRight: "4px" }} />
              Create Coupon
            </Button>
            <Button variant="primary" size="sm" onClick={() => toast.success("Loyalty points guidelines saved")}>
              <IconSettings size={14} style={{ marginRight: "4px" }} />
              Configure Points
            </Button>
          </>
        }
      />

      {/* Grid 2 - Loyalty Program and Active Coupons */}
      <div
        className="grid-2 mb20"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Loyalty Program Overview */}
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
          <div className="card-hd" style={{ marginBottom: "16px" }}>
            <div className="card-ttl" style={{ fontSize: "14.5px", fontWeight: 800, color: "var(--t1)", display: "flex", alignItems: "center", gap: "8px" }}>
              <IconStar size={18} />
              Loyalty Program Overview
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="grid-2 mb16"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div style={{ background: "var(--surface-alt)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-sm)" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Total Points Issued</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--amber-600)", marginTop: "4px" }}>4.82M</div>
              </div>
              <div style={{ background: "var(--surface-alt)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-sm)" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Total Value</div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--teal-600)", marginTop: "4px" }}>$48.2k</div>
              </div>
              <div style={{ background: "var(--surface-alt)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-sm)" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Points Redeemed</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--t1)", marginTop: "4px" }}>1.24M pts</div>
              </div>
              <div style={{ background: "var(--surface-alt)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-sm)" }}>
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--t4)", textTransform: "uppercase" }}>Active Loyalty Users</div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--t1)", marginTop: "4px" }}>842</div>
              </div>
            </div>

            <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--t4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "8px" }}>Program Rules</div>
            <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border-sm)", borderRadius: "var(--radius-md)", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", paddingBottom: "8px", borderBottom: "1px dashed var(--border-xs)", marginBottom: "8px" }}>
                <span style={{ color: "var(--t3)", fontWeight: 600 }}>Per delivery completed</span>
                <span style={{ fontWeight: 800, color: "var(--t1)" }}>+250 pts</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", paddingBottom: "8px", borderBottom: "1px dashed var(--border-xs)", marginBottom: "8px" }}>
                <span style={{ color: "var(--t3)", fontWeight: 600 }}>Successful referral</span>
                <span style={{ fontWeight: 800, color: "var(--t1)" }}>+500 pts</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--t3)", fontWeight: 600 }}>Redemption rate</span>
                <span style={{ fontWeight: 800, color: "var(--t1)" }}>100 pts = $1.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Coupons list */}
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
              <IconTicket size={18} />
              Active Coupons
            </div>
            <Button variant="primary" size="xs" onClick={() => openModal()}>
              <IconPlus size={14} style={{ marginRight: "3px" }} />
              Add
            </Button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {coupons.map((cp) => (
              <div
                key={cp.code}
                className="ecard"
                onClick={() => openModal(cp)}
                style={{
                  border: "1px solid var(--border-xs)",
                  borderLeft: "3.5px solid var(--teal-500)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: "var(--surface-alt)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 800, color: "var(--teal-600)" }}>{cp.code}</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--t2)", fontWeight: 600 }}>{cp.d} · {cp.m}</div>
                    <div style={{ fontSize: "11px", color: "var(--t4)", marginTop: "2px" }}>{cp.u} uses · Expires {cp.e}</div>
                  </div>
                  <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="xs" onClick={() => openModal(cp)}>
                      <IconEdit size={14} />
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => handleDeleteCoupon(cp.code)}>
                      <IconTrash size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
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
            <IconHistory size={18} />
            Recent Reward Activity
          </div>
          <Button variant="ghost" size="xs" onClick={() => toast.success("Exported activity log")}>
            <IconDownload size={14} style={{ marginRight: "4px" }} />
            Export
          </Button>
        </div>
        <div className="tbl-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-sm)" }}>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Sailor</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Activity</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Points</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Reference</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {initialActivity.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border-xs)" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div className="av av-sm av-amber" style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--amber-50)", color: "var(--amber-700)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700 }}>
                        {row.sailor[0]}
                      </div>
                      <span className="td-p" style={{ fontWeight: 600, color: "var(--t1)" }}>{row.sailor}</span>
                    </div>
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t2)" }}>{row.activity}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: row.isPositive ? "var(--green-text)" : "var(--danger-text)" }}>
                    {row.points}
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{row.ref}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Coupon Modal Overlay */}
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
              width: "480px",
              overflow: "hidden",
              animation: "zoomIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <div className="modal-hd" style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-xs)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                {editCoupon ? "Edit Coupon Details" : "Create Discount Coupon"}
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
            <form onSubmit={handleSaveCoupon}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Coupon Code</label>
                    <Input
                      type="text"
                      placeholder="e.g. SHIP10"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Discount Value (%)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 15"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Minimum Order Value ($)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 50 (leave blank for referrals)"
                      value={formMinOrder}
                      onChange={(e) => setFormMinOrder(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Expiry Date</label>
                    <Input
                      type="text"
                      placeholder="e.g. Oct 31, 2026"
                      value={formExpiry}
                      onChange={(e) => setFormExpiry(e.target.value)}
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
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  <IconCheck size={15} style={{ marginRight: "4px" }} />
                  {editCoupon ? "Save Changes" : "Create Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
