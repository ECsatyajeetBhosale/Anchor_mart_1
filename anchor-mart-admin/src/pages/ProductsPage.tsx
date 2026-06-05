import { useState } from "react";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconStar,
  IconTrash,
  IconX,
  IconBox,
  IconCheck,
  IconPackageOff,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ProductData {
  n: string;
  d: string;
  c: string;
  p: string;
  sk: number;
  so: string;
  r: number;
  f: boolean;
  s: string;
  sc: "success" | "danger" | "warning";
}

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [activeTab, setActiveTab] = useState<"All Products" | "Deal Products" | "Out of Stock">("All Products");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductData | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("Electronics");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formFeatured, setFormFeatured] = useState(false);

  const initialProducts: ProductData[] = [
    { n: "Echo Dot 5th Gen", d: "Smart speaker with Alexa", c: "Electronics", p: "$39.99", sk: 124, so: "1,284+", r: 4.7, f: true, s: "Active", sc: "success" },
    { n: "Titan Quartz Analog Watch", d: "Car wheel multicolour dial", c: "Accessories", p: "$75.00", sk: 38, so: "100+", r: 4.5, f: true, s: "Active", sc: "success" },
    { n: "Lavazza IL Mattino Coffee", d: "Ground coffee powder", c: "Beverages", p: "$11.30", sk: 210, so: "547+", r: 4.8, f: false, s: "Active", sc: "success" },
    { n: "Aquaminder Water Bottle", d: "770ml smart water bottle", c: "Fitness", p: "$13.77", sk: 0, so: "100+", r: 4.3, f: false, s: "Out of Stock", sc: "danger" },
    { n: "KILLER Trendy Running Shoes", d: "For Men", c: "Fashion", p: "$67.00", sk: 14, so: "50+", r: 4.6, f: true, s: "Low Stock", sc: "warning" },
    { n: "Bombay Shaving Kit 5 Piece", d: "Complete grooming kit", c: "Beauty", p: "$18.00", sk: 56, so: "200+", r: 4.4, f: false, s: "Active", sc: "success" },
  ];

  const [products, setProducts] = useState<ProductData[]>(initialProducts);

  const openModal = (product?: ProductData) => {
    if (product) {
      setEditProduct(product);
      setFormName(product.n);
      setFormDesc(product.d);
      setFormCategory(product.c);
      setFormPrice(product.p.replace("$", ""));
      setFormStock(String(product.sk));
      setFormFeatured(product.f);
    } else {
      setEditProduct(null);
      setFormName("");
      setFormDesc("");
      setFormCategory("Electronics");
      setFormPrice("");
      setFormStock("");
      setFormFeatured(false);
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) {
      toast.error("Name and Price are required");
      return;
    }

    const stockVal = parseInt(formStock) || 0;
    const priceFormatted = `$${parseFloat(formPrice).toFixed(2)}`;

    let statusVal = "Active";
    let statusClass: "success" | "danger" | "warning" = "success";

    if (stockVal === 0) {
      statusVal = "Out of Stock";
      statusClass = "danger";
    } else if (stockVal < 20) {
      statusVal = "Low Stock";
      statusClass = "warning";
    }

    if (editProduct) {
      setProducts(
        products.map((p) =>
          p.n === editProduct.n
            ? {
                ...p,
                n: formName,
                d: formDesc,
                c: formCategory,
                p: priceFormatted,
                sk: stockVal,
                f: formFeatured,
                s: statusVal,
                sc: statusClass,
              }
            : p
        )
      );
      toast.success("Product updated successfully");
    } else {
      const newProduct: ProductData = {
        n: formName,
        d: formDesc,
        c: formCategory,
        p: priceFormatted,
        sk: stockVal,
        so: "0",
        r: 5.0,
        f: formFeatured,
        s: statusVal,
        sc: statusClass,
      };
      setProducts([newProduct, ...products]);
      toast.success("Product added successfully");
    }
    setIsModalOpen(false);
  };

  const handleToggleFeatured = (name: string) => {
    setProducts(
      products.map((p) => {
        if (p.n === name) {
          const newF = !p.f;
          toast.success(`${name} ${newF ? "added to" : "removed from"} featured deals`);
          return { ...p, f: newF };
        }
        return p;
      })
    );
  };

  const handleDeleteProduct = (name: string) => {
    const confirmDel = window.confirm(`Remove "${name}" from the catalog? This cannot be undone.`);
    if (confirmDel) {
      setProducts(products.filter((p) => p.n !== name));
      toast.error(`"${name}" has been removed`);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.n.toLowerCase().includes(search.toLowerCase()) ||
      p.d.toLowerCase().includes(search.toLowerCase()) ||
      p.c.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "All Categories" || p.c === categoryFilter;

    const matchesStatus = statusFilter === "All Status" || p.s === statusFilter;

    let matchesTab = true;
    if (activeTab === "Deal Products") matchesTab = p.f;
    else if (activeTab === "Out of Stock") matchesTab = p.sk === 0;

    return matchesSearch && matchesCategory && matchesStatus && matchesTab;
  });

  return (
    <div style={{ animation: "fadeUp 0.22s ease-out" }}>
      {/* Page Header */}
      <PageHeader
        title="Products & Catalog"
        subtitle={
          <p className="pg-sub">
            <span>1,284 products</span>
            <span className="sep">·</span>
            <span style={{ color: "var(--danger-text)", fontWeight: 700 }}>86 out of stock</span>
          </p>
        }
        actions={
          <>
            <div className="relative flex items-center" style={{ width: "200px" }}>
              <IconSearch size={16} style={{ position: "absolute", left: "12px", color: "var(--t4)" }} />
              <Input
                type="text"
                placeholder="Search catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: "36px", height: "36px" }}
              />
            </div>
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
              <option>Electronics</option>
              <option>Accessories</option>
              <option>Beverages</option>
              <option>Fitness</option>
              <option>Fashion</option>
              <option>Beauty</option>
            </select>
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
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => openModal()}>
              <IconPlus size={15} style={{ marginRight: "4px" }} />
              Add Product
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
          label="Total Products"
          value="1,284"
          icon={<IconBox size={20} />}
          variant="navy"
          footer="12 categories"
        />
        <StatCard
          label="In Stock"
          value="1,198"
          icon={<IconCheck size={20} />}
          variant="green"
          footer="93.3% availability"
        />
        <StatCard
          label="Out of Stock"
          value="86"
          icon={<IconPackageOff size={20} />}
          variant="red"
          footer="Needs attention"
        />
        <StatCard
          label="Featured / Deals"
          value="48"
          icon={<IconStar size={20} />}
          variant="amber"
          footer="Active promotions"
        />
      </div>

      {/* Tab Selectors */}
      <div className="tab-row" style={{ display: "flex", gap: "2px", borderBottom: "1.5px solid var(--border-xs)", marginBottom: "16px" }}>
        {(["All Products", "Deal Products", "Out of Stock"] as const).map((tab) => (
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

      {/* Products Table Card */}
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
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Stock</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Sold</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Rating</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Featured</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Status</th>
                <th style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", textTransform: "uppercase", color: "var(--t3)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => (
                <tr
                  key={idx}
                  className="tr-click"
                  onClick={() => openModal(p)}
                  style={{
                    borderBottom: "1px solid var(--border-xs)",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={{ padding: "14px 20px" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--t1)" }}>{p.n}</div>
                      <div style={{ fontSize: "11.5px", color: "var(--t4)", fontWeight: 500 }}>{p.d}</div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant="navy">{p.c}</Badge>
                  </td>
                  <td className="td-p w7" style={{ padding: "14px 20px", fontWeight: 700 }}>{p.p}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, color: p.sk === 0 ? "var(--danger-text)" : p.sk < 20 ? "var(--warning-text)" : "var(--t3)" }}>
                    {p.sk}
                  </td>
                  <td className="td-m" style={{ padding: "14px 20px", color: "var(--t4)" }}>{p.so}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ color: "var(--amber-600)" }}>{"★".repeat(Math.floor(p.r))}</span>
                    <span style={{ fontSize: "11px", color: "var(--t4)", fontWeight: 600 }}> {p.r}</span>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    {p.f ? (
                      <Badge variant="amber">
                        <IconStar size={11} style={{ marginRight: "3px" }} />
                        Yes
                      </Badge>
                    ) : (
                      <span style={{ color: "var(--t4)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <Badge variant={p.sc}>{p.s}</Badge>
                  </td>
                  <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                    <div className="td-acts" style={{ display: "flex", gap: "4px" }}>
                      <Button variant="ghost" size="xs" title="Edit" onClick={() => openModal(p)}>
                        <IconEdit size={15} />
                      </Button>
                      <Button variant="ghost" size="xs" title="Toggle Featured" onClick={() => handleToggleFeatured(p.n)}>
                        <IconStar size={15} color={p.f ? "var(--amber-500)" : undefined} />
                      </Button>
                      <Button variant="danger" size="xs" title="Remove" onClick={() => handleDeleteProduct(p.n)}>
                        <IconTrash size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "var(--t4)", fontWeight: 600 }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal Overlay */}
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
              <span className="modal-title" style={{ fontSize: "16px", fontWeight: 800 }}>
                {editProduct ? "Edit Product Details" : "Add New Product"}
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
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body" style={{ padding: "20px 24px", overflowY: "auto" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Product Title</label>
                    <Input
                      type="text"
                      placeholder="e.g. Titan Quartz Analog Watch"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="fg">
                    <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Short Description</label>
                    <Input
                      type="text"
                      placeholder="Summary for product listings..."
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
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
                      <option>Electronics</option>
                      <option>Accessories</option>
                      <option>Beverages</option>
                      <option>Fitness</option>
                      <option>Fashion</option>
                      <option>Beauty</option>
                    </select>
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
                      <label className="fg-label" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--t3)", marginBottom: "6px" }}>Initial Stock</label>
                      <Input
                        type="number"
                        placeholder="e.g. 100"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="fg" style={{ marginTop: "8px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "13.5px",
                        fontWeight: 600,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formFeatured}
                        onChange={(e) => setFormFeatured(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      Add as Featured Deal item
                    </label>
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
                  {editProduct ? "Save Changes" : "Add Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
