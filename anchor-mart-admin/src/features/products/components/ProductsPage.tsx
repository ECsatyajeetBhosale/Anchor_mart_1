import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/ui/data-table";
import { APP_ROUTES } from "@/lib/constants";
import {
  IconSearch,
  IconPlus,
  IconBoxSeam,
  IconCategory,
  IconStar,
  IconEdit,
  IconTrash,
  IconDeviceSpeaker,
  IconClock,
  IconCoffee,
  IconDroplet,
  IconShirt,
  IconTool,
} from "@tabler/icons-react";
import { ProductFormModal } from "./ProductFormModal";

// Static data mimicking the original HTML mock
const STATIC_PRODUCTS = [
  {
    id: "1",
    icon: <IconDeviceSpeaker size={18} />,
    name: "Echo Dot 5th Gen",
    description: "Smart speaker with Alexa",
    category: "Electronics",
    price: 39.99,
    stock: 124,
    sales: "1,284+",
    rating: 4.7,
    featured: true,
    status: "Active",
    statusColor: "success",
  },
  {
    id: "2",
    icon: <IconClock size={18} />,
    name: "Titan Quartz Analog Watch",
    description: "Car wheel multicolour dial",
    category: "Accessories",
    price: 75.00,
    stock: 38,
    sales: "100+",
    rating: 4.5,
    featured: true,
    status: "Active",
    statusColor: "success",
  },
  {
    id: "3",
    icon: <IconCoffee size={18} />,
    name: "Lavazza IL Mattino Coffee",
    description: "Ground coffee powder",
    category: "Beverages",
    price: 11.30,
    stock: 210,
    sales: "547+",
    rating: 4.8,
    featured: false,
    status: "Active",
    statusColor: "success",
  },
  {
    id: "4",
    icon: <IconDroplet size={18} />,
    name: "Aquaminder Water Bottle",
    description: "770ml smart water bottle",
    category: "Fitness",
    price: 13.77,
    stock: 0,
    sales: "100+",
    rating: 4.3,
    featured: false,
    status: "Out of Stock",
    statusColor: "danger",
  },
  {
    id: "5",
    icon: <IconShirt size={18} />,
    name: "KILLER Trendy Running Shoes",
    description: "For Men",
    category: "Fashion",
    price: 67.00,
    stock: 14,
    sales: "50+",
    rating: 4.6,
    featured: true,
    status: "Low Stock",
    statusColor: "warning",
  },
  {
    id: "6",
    icon: <IconTool size={18} />,
    name: "Bombay Shaving Kit 5 Piece",
    description: "Complete grooming kit",
    category: "Beauty",
    price: 18.00,
    stock: 56,
    sales: "200+",
    rating: 4.4,
    featured: false,
    status: "Active",
    statusColor: "success",
  },
];

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Pagination params from URL
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const nameFilter = searchParams.get("name") ?? "";

  // Mock filtering based on search params
  const filteredProducts = useMemo(() => {
    let result = STATIC_PRODUCTS;
    if (nameFilter) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
          p.description.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    if (activeTab === "deal") {
      result = result.filter((p) => p.featured);
    }
    return result;
  }, [nameFilter, activeTab]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    toast.success("Product deleted (Mock)");
  };

  const handleEdit = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const columns: Column<any>[] = [
      {
        id: "image",
        header: "",
        cell: (row) => <div className="prod-thumb">{row.icon}</div>,
        className: "w-12",
      },
      {
        id: "name",
        header: "Product",
        cell: (row) => (
          <>
            <div className="td-p">{row.name}</div>
            <div className="td-m">{row.description}</div>
          </>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: (row) => <span className="badge badge-navy">{row.category}</span>,
      },
      {
        id: "price",
        header: "Price",
        cell: (row) => <span className="td-p w7">${row.price.toFixed(2)}</span>,
      },
      {
        id: "featured",
        header: "Featured",
        cell: (row) =>
          row.featured ? (
            <span className="badge badge-amber">
              <IconStar size={11} />
              Yes
            </span>
          ) : (
            <span className="td-m">—</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <span className={`badge badge-${row.statusColor}`}>{row.status}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="td-acts flex items-center gap-1">
            <button
              className="btn btn-ghost btn-sm btn-icon"
              title="Edit"
              onClick={(e) => handleEdit(e, row)}
            >
              <IconEdit size={16} />
            </button>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              title="Toggle featured"
              onClick={(e) => {
                e.stopPropagation();
                toast.success("Toggled featured status");
              }}
            >
              <IconStar size={16} />
            </button>
            <button
              className="btn btn-danger btn-sm btn-icon"
              title="Remove"
              onClick={(e) => handleDelete(e, row.id)}
            >
              <IconTrash size={16} />
            </button>
          </div>
        ),
        className: "w-24 text-right",
      },
    ];

  const handlePageChange = (newPage: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams.entries()), page: newPage.toString() });
  };

  return (
    <>
      {/* Header */}
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Products & Catalog</h1>
          <p className="pg-sub block">
            <span>1,284 products</span>
          </p>
        </div>
        <div className="pg-actions">
          <div className="input-wrap">
            <IconSearch className="pre" size={16} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--t4)" }} />
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Search products…"
              style={{ width: 200, paddingLeft: 36 }}
              value={nameFilter}
              onChange={(e) => {
                setSearchParams({ ...Object.fromEntries(searchParams.entries()), name: e.target.value, page: "1" });
              }}
            />
          </div>
          <select className="form-select">
            <option>All Categories</option>
            <option>Fashion</option>
            <option>Beauty</option>
            <option>Fitness</option>
            <option>Electronics</option>
            <option>Marine Emergency</option>
            <option>Living</option>
          </select>
          <select className="form-select">
            <option>All Status</option>
            <option>In Stock</option>
            <option>Out of Stock</option>
            <option>Low Stock</option>
          </select>
          <button className="btn btn-primary" onClick={handleAddProduct}>
            <IconPlus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card sc-navy">
          <div className="stat-stripe"></div>
          <div className="stat-top">
            <div className="stat-lbl">Total Products</div>
            <div className="stat-icon">
              <IconBoxSeam size={19} />
            </div>
          </div>
          <div className="stat-val">1,284</div>
          <div className="stat-foot block mt-1 text-[11px] text-[var(--t4)]">
            <span>12 categories</span>
          </div>
        </div>
        <div className="stat-card sc-teal">
          <div className="stat-stripe"></div>
          <div className="stat-top">
            <div className="stat-lbl">Total Categories</div>
            <div className="stat-icon">
              <IconCategory size={19} />
            </div>
          </div>
          <div className="stat-val">12</div>
          <div className="stat-foot block mt-1 text-[11px] text-[var(--t4)]">
            <span>Across catalog</span>
          </div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-stripe"></div>
          <div className="stat-top">
            <div className="stat-lbl">Featured / Deals</div>
            <div className="stat-icon">
              <IconStar size={19} />
            </div>
          </div>
          <div className="stat-val">48</div>
          <div className="stat-foot block mt-1 text-[11px] text-[var(--t4)]">
            <span>Active promotions</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-row">
        <div
          className={`tab-item ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Products
        </div>
        <div
          className={`tab-item ${activeTab === "deal" ? "active" : ""}`}
          onClick={() => setActiveTab("deal")}
        >
          Deal Products
        </div>
        <div
          className={`tab-item ${activeTab === "special" ? "active" : ""}`}
          onClick={() => setActiveTab("special")}
        >
          Special Requests
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        page={page}
        pages={1}
        onPageChange={handlePageChange}
        showPagination={false}
        emptyMessage="No products found."
        onRowClick={(row) => {
          setEditingProduct(row);
          setIsModalOpen(true);
        }}
      />

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
      />
    </>
  );
}
