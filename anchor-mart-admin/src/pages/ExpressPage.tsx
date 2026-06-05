import { useState } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCup,
  IconCookie,
  IconHeartRateMonitor,
  IconX,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ExpressItem {
  n: string;
  c: string;
  p: string;
  sz: string;
  sk: number;
  so: number;
  s: string;
}

export function ExpressPage() {
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [selectedCategoryCard, setSelectedCategoryCard] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExpressItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Beverages");
  const [formPrice, setFormPrice] = useState("");
  const [formSize, setFormSize] = useState("");
  const [formStock, setFormStock] = useState("");

  const initialItems: ExpressItem[] = [
    { n: "Bisleri Water 1L", c: "Beverages", p: "$2.00", sz: "1 Litre", sk: 500, so: 1284, s: "Active" },
    { n: "Lay's Classic", c: "Snacks", p: "$3.00", sz: "Standard pack", sk: 320, so: 986, s: "Active" },
    { n: "Tetley Green Tea", c: "Beverages", p: "$5.00", sz: "25 bags", sk: 180, so: 742, s: "Active" },
    { n: "Amul Taaza Milk", c: "Beverages", p: "$2.50", sz: "500ml", sk: 240, so: 584, s: "Active" },
    { n: "Colgate Strong Teeth", c: "Personal Care", p: "$5.50", sz: "100g", sk: 156, so: 421, s: "Active" },
    { n: "Dettol Antiseptic", c: "Personal Care", p: "$6.00", sz: "250ml", sk: 0, so: 621, s: "Out of Stock" },
  ];

  const [items, setItems] = useState<ExpressItem[]>(initialItems);

  const openModal = (item?: ExpressItem) => {
    if (item) {
      setEditItem(item);
      setFormName(item.n);
      setFormCategory(item.c);
      setFormPrice(item.p.replace("$", ""));
      setFormSize(item.sz);
      setFormStock(String(item.sk));
    } else {
      setEditItem(null);
      setFormName("");
      setFormCategory("Beverages");
      setFormPrice("");
      setFormSize("");
      setFormStock("");
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) {
      toast.error("Name and Price are required");
      return;
    }

    const priceFormatted = `$${parseFloat(formPrice).toFixed(2)}`;
    const stockVal = parseInt(formStock) || 0;
    const statusVal = stockVal === 0 ? "Out of Stock" : "Active";

    if (editItem) {
      setItems(
        items.map((it) =>
          it.n === editItem.n
            ? {
                ...it,
                n: formName,
                c: formCategory,
                p: priceFormatted,
                sz: formSize,
                sk: stockVal,
                s: statusVal,
              }
            : it
        )
      );
      toast.success("Express item updated successfully");
    } else {
      const newItem: ExpressItem = {
        n: formName,
        c: formCategory,
        p: priceFormatted,
        sz: formSize || "Standard",
        sk: stockVal,
        so: 0,
        s: statusVal,
      };
      setItems([newItem, ...items]);
      toast.success("New express item added successfully");
    }
    setIsModalOpen(false);
  };

  const handleDeleteItem = (name: string) => {
    const confirmDel = window.confirm(`Remove express item "${name}"?`);
    if (confirmDel) {
      setItems(items.filter((it) => it.n !== name));
      toast.error(`"${name}" has been removed`);
    }
  };

  const handleCategoryCardClick = (catName: string) => {
    if (selectedCategoryCard === catName) {
      setSelectedCategoryCard(null);
    } else {
      setSelectedCategoryCard(catName);
    }
  };

  // Filtering
  const filteredItems = items.filter((it) => {
    const matchesHeaderDropdown = categoryFilter === "All Categories" || it.c === categoryFilter;
    const matchesCardFilter = !selectedCategoryCard || it.c === selectedCategoryCard;
    return matchesHeaderDropdown && matchesCardFilter;
  });

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Express Items"
        subtitle="Fast-delivery everyday essentials"
        actions={
          <>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
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
              <option>All Categories</option>
              <option>Beverages</option>
              <option>Snacks</option>
              <option>Personal Care</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => openModal()}>
              <IconPlus size={15} style={{ marginRight: "4px" }} />
              Add Express Item
            </Button>
          </>
        }
      />

      {/* Grid 3 Category Summary Cards */}
      <div
        className="grid-3 mb20"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {/* Beverages card */}
        <div
          className="card"
          onClick={() => handleCategoryCardClick("Beverages")}
          style={{
            cursor: "pointer",
            border: selectedCategoryCard === "Beverages" ? "1.5px solid var(--teal-500)" : "1px solid var(--border-sm)",
            background: selectedCategoryCard === "Beverages" ? "var(--teal-25)" : "var(--surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              className="stat-icon sc-teal"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                background: "var(--teal-50)",
                color: "var(--teal-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCup size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Beverages</div>
              <div style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 500 }}>24 items · Top: Bisleri 1L</div>
            </div>
            <Badge variant="teal">24</Badge>
          </div>
        </div>

        {/* Snacks card */}
        <div
          className="card"
          onClick={() => handleCategoryCardClick("Snacks")}
          style={{
            cursor: "pointer",
            border: selectedCategoryCard === "Snacks" ? "1.5px solid var(--amber-500)" : "1px solid var(--border-sm)",
            background: selectedCategoryCard === "Snacks" ? "var(--amber-25)" : "var(--surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              className="stat-icon sc-amber"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                background: "var(--amber-50)",
                color: "var(--amber-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCookie size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Snacks</div>
              <div style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 500 }}>18 items · Top: Lay's Classic</div>
            </div>
            <Badge variant="amber">18</Badge>
          </div>
        </div>

        {/* Personal Care card */}
        <div
          className="card"
          onClick={() => handleCategoryCardClick("Personal Care")}
          style={{
            cursor: "pointer",
            border: selectedCategoryCard === "Personal Care" ? "1.5px solid var(--navy-500)" : "1px solid var(--border-sm)",
            background: selectedCategoryCard === "Personal Care" ? "var(--navy-50)" : "var(--surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--sh-xs)",
            padding: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              className="stat-icon sc-navy"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                background: "var(--navy-50)",
                color: "var(--navy-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconHeartRateMonitor size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Personal Care</div>
              <div style={{ fontSize: "12px", color: "var(--t4)", fontWeight: 500 }}>12 items · Top: Dettol Antiseptic</div>
            </div>
            <Badge variant="navy">12</Badge>
          </div>
        </div>
      </div>

      {/* Express Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Product</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Category</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Price</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Size</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Stock</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Units Sold</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((e, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => openModal(e)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td className="td-p" style={{ padding: "14px 20px", fontWeight: 700, color: "var(--t1)" }}>{e.n}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span className="tag" style={{ background: "var(--neutral-bg)", color: "var(--neutral-text)", border: "1px solid var(--neutral-border)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 700 }}>
                      {e.c}
                    </span>
                  </td>
                  <td className="td-p w7" style={{ padding: "14px 20px", fontWeight: 700 }}>{e.p}</td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{e.sz}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: e.sk === 0 ? "var(--danger-text)" : "var(--t2)" }}>{e.sk}</td>
                  <td className="td-p" style={{ padding: "14px 20px", color: "var(--t3)" }}>{e.so.toLocaleString()}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={e.s === "Active" ? "success" : "danger"}>{e.s}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(ev) => ev.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "4px" }}>
                      <Button variant="ghost" size="xs" title="Edit" onClick={() => openModal(e)}>
                        <IconEdit size={15} />
                      </Button>
                      <Button variant="danger" size="xs" title="Remove" onClick={() => handleDeleteItem(e.n)}>
                        <IconTrash size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Express Item Modal Overlay */}
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
            onClick={(ev) => ev.stopPropagation()}
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
                {editItem ? "Edit Express Item" : "Add Express Item"}
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
            <form onSubmit={handleSaveItem}>
              <div className="modal-body" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Item Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Bisleri Water 1L"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Category</label>
                    <select
                      className="form-select"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
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
                      <option>Beverages</option>
                      <option>Snacks</option>
                      <option>Personal Care</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Price ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Item Size / Pack Volume</label>
                    <Input
                      type="text"
                      placeholder="e.g. 1 Litre, Standard Pack"
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Stock Available</label>
                    <Input
                      type="number"
                      placeholder="e.g. 250"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
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
                  {editItem ? "Save Changes" : "Save Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
