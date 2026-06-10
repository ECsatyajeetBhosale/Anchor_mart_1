import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useGetCategoriesQuery } from "@/features/catalog";
import {
  IconBoxSeam,
  IconCategory,
  IconDeviceSpeaker,
  IconEdit,
  IconPlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteProductMutation, useGetProductsQuery } from "../api/productApi";
import type { Product } from "../types/product.types";
import { ProductFormModal } from "./ProductFormModal";

const productTabs = [
  { label: "All Products", value: "all" },
  { label: "Deal Products", value: "deal" },
  { label: "Special Requests", value: "special" },
];

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  // Pagination + search + filter params from URL
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";
  const statusFilter = searchParams.get("status") ?? ""; // "", "active", "inactive"

  // Map the URL status filter to the backend `is_active` flag (undefined = all).
  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  // API Integration — search is sent as `?search=...`, status as `?is_active=...`
  const limit = 10;
  const { data, isLoading, isError, refetch } = useGetProductsQuery({
    page,
    limit,
    search: searchTerm,
    isActive,
  });

  // Category options sourced from the catalog API (replaces the old static list)
  const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
  const categoryOptions = React.useMemo(
    () => [
      { value: "all", label: "All Categories" },
      ...(categoriesData?.results?.data ?? []).map((c) => ({ value: c.name, label: c.name })),
    ],
    [categoriesData],
  );

  const productsData: Product[] = data?.results?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const filteredProducts = React.useMemo(() => {
    let result = productsData;
    if (activeTab === "deal") {
      result = result.filter((p) => p.is_featured || p.average_rating >= 4.5);
    }
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category_name === categoryFilter);
    }
    return result;
  }, [productsData, activeTab, categoryFilter]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete).unwrap();
      toast.success("Product deleted successfully");
      setProductToDelete(null);
    } catch (_error) {
      toast.error("Failed to delete product");
    }
  };

  const handleEdit = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  // Update a single URL param and reset to page 1; empty value clears the param.
  const setFilterParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleStatusFilter = (value: string) => setFilterParam("status", value);

  const getProductImage = (images: Product["images"]) => {
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
        <div style={{ maxWidth: "180px" }}>
          <div className="td-p trunc" title={row.name}>
            {row.name}
          </div>
          <div className="td-m trunc" title={row.description}>
            {row.description}
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => (
        <Badge variant="navy" className="text-[10px] h-[24px]">
          {row.category_name}
        </Badge>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: (row) => `$${Number(row.base_price).toFixed(2)}`,
      className: "td-p w7",
    },
    {
      id: "featured",
      header: "Featured",
      cell: (row) => {
        const isFeatured = row.is_featured || row.average_rating >= 4.5;
        return isFeatured ? (
          <Badge variant="amber" className="gap-1 h-[24px]">
            <IconStar size={12} fill="currentColor" />
            Yes
          </Badge>
        ) : (
          <span className="td-m">—</span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active} className="text-[10px] h-[24px]" />,
      // Server-side status filter via the clickable header (?is_active=True|False).
      filter: {
        value: statusFilter,
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
        onChange: handleStatusFilter,
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <TableActions
          row={row}
          actions={[
            {
              icon: <IconEdit size={16} />,
              title: "Edit",
              onClick: (e, r) => handleEdit(e, r),
            },
            {
              icon: <IconStar size={16} />,
              title: "Toggle featured",
              onClick: (e) => {
                e.stopPropagation();
                toast.success("Toggled featured status");
              },
            },
            {
              icon: <IconTrash size={16} />,
              title: "Remove",
              variant: "danger",
              onClick: (e, r) => handleDeleteClick(e, r.id),
            },
          ]}
        />
      ),
      className: "w-24 text-right",
    },
  ];

  const handlePageChange = (newPage: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams.entries()), page: newPage.toString() });
  };

  const statItems = [
    {
      id: "total-products",
      label: "Total Products",
      value: totalCount,
      icon: <IconBoxSeam size={19} />,
      variant: "navy" as const,
    },
    {
      id: "total-categories",
      label: "Total Categories",
      value: "12",
      icon: <IconCategory size={19} />,
      variant: "teal" as const,
    },
    {
      id: "featured-deals",
      label: "Featured / Deals",
      value: "48",
      icon: <IconStar size={19} />,
      variant: "amber" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="Products & Catalog"
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => {
              // New search → reset to page 1. Empty value is dropped at the API layer.
              setSearchParams({
                ...Object.fromEntries(searchParams.entries()),
                search: val,
                page: "1",
              });
            }}
            searchPlaceholder="Search products…"
            searchDebounceMs={300}
            searchLoading={isLoading}
            filters={[
              {
                id: "category",
                value: categoryFilter,
                placeholder: "All Categories",
                options: categoryOptions,
                width: "160px",
                onValueChange: (val) => {
                  setSearchParams({
                    ...Object.fromEntries(searchParams.entries()),
                    category: val,
                    page: "1",
                  });
                },
              },
            ]}
          >
            <button type="button" className="btn btn-primary" onClick={handleAddProduct}>
              <IconPlus size={16} />
              Add Product
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      {/* Tabs */}
      <DynamicTabs
        tabs={productTabs}
        value={activeTab}
        onTabChange={setActiveTab}
        triggerClassName="data-[state=active]:!text-black data-[state=active]:!border-black"
      />

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

      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
