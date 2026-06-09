import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useGetProductsQuery, useDeleteProductMutation } from "../api/productApi";
import type { Product } from "../types/product.types";
import {
  IconSearch,
  IconPlus,
  IconBoxSeam,
  IconCategory,
  IconStar,
  IconEdit,
  IconTrash,
  IconDeviceSpeaker,
} from "@tabler/icons-react";
import { ProductFormModal } from "./ProductFormModal";

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Pagination params from URL
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const nameFilter = searchParams.get("name") ?? "";

  // API Integration
  const limit = 10;
  const { data, isLoading, isError, refetch } = useGetProductsQuery({
    page,
    limit,
    name: nameFilter,
  });
  
  const [deleteProduct] = useDeleteProductMutation();

  const productsData: Product[] = data?.results?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const filteredProducts = React.useMemo(() => {
    if (activeTab === "deal") {
      return productsData.filter((p) => p.is_featured || p.average_rating >= 4.5);
    }
    return productsData;
  }, [productsData, activeTab]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id).unwrap();
      toast.success("Product deleted successfully");
    } catch (error) {
      toast.error("Failed to delete product");
    }
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

  const getProductImage = (images: any[]) => {
    if (!images || images.length === 0) {
      return <IconDeviceSpeaker size={18} />;
    }
    const primary = images.find((img) => img.is_primary);
    const imageUrl = primary ? primary.image_url : images[0].image_url;
    return (
      <img
        src={imageUrl}
        alt="Product"
        style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }}
      />
    );
  };

  const columns: Column<Product>[] = [
    {
      id: "image",
      header: "",
      cell: (row) => <div className="prod-thumb">{getProductImage(row.images)}</div>,
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
      cell: (row) => <span className="badge badge-navy">{row.category_name}</span>,
    },
    {
      id: "price",
      header: "Price",
      cell: (row) => <span className="td-p w7">${Number(row.base_price).toFixed(2)}</span>,
    },
    {
      id: "featured",
      header: "Featured",
      cell: (row) =>
        row.is_featured || row.average_rating >= 4.5 ? (
          <span className="badge badge-amber">
            <IconStar size={11} className="mr-1 inline-block" />
            Yes
          </span>
        ) : (
          <span className="td-m">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const statusText = row.is_active ? "Active" : "Inactive";
        const statusColor = row.is_active ? "success" : "danger";
        return <span className={`badge badge-${statusColor}`}>{statusText}</span>;
      },
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
            <span>{totalCount} products</span>
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
          <div className="stat-val">{totalCount}</div>
          <div className="stat-foot block mt-1 text-[11px] text-[var(--t4)]">
            <span>Updated catalog</span>
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
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? "Failed to fetch products" : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination={true}
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
