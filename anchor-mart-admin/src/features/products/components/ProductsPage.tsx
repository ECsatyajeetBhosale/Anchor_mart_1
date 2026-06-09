import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TableActions } from "@/components/common/TableActions";
import { type Column, DataTable } from "@/components/ui/data-table";
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
import { useGetProductsQuery } from "../api/productApi";
import type { Product } from "../types/product.types";
import { ProductFormModal } from "./ProductFormModal";

const categoryOptions = [
  { value: "all-categories", label: "All Categories" },
  { value: "fashion", label: "Fashion" },
  { value: "beauty", label: "Beauty" },
  { value: "fitness", label: "Fitness" },
  { value: "electronics", label: "Electronics" },
  { value: "marine", label: "Marine Emergency" },
  { value: "living", label: "Living" },
];

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
  const [localDeletedIds, setLocalDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination params from URL
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const nameFilter = searchParams.get("name") ?? "";

  // API Integration
  const limit = 10;
  const { data, isLoading, isError, refetch } = useGetProductsQuery({
    page,
    limit,
    name: nameFilter,
  });

  const productsData: Product[] = data?.results?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const filteredProducts = React.useMemo(() => {
    let result = productsData;
    if (activeTab === "deal") {
      result = result.filter((p) => p.is_featured || p.average_rating >= 4.5);
    }
    return result.filter((p) => !localDeletedIds.includes(p.id));
  }, [productsData, activeTab, localDeletedIds]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProductToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      // Future API integration:
      // await deleteProduct(productToDelete).unwrap();
      setLocalDeletedIds((prev) => [...prev, productToDelete]);
      toast.success("Product deleted successfully");
    } catch (_error) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
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
          <div className="td-p truncate" title={row.name}>
            {row.name}
          </div>
          <div className="td-m truncate" title={row.description}>
            {row.description}
          </div>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => <StatusBadge status={row.category_name} />,
    },
    {
      id: "price",
      header: "Price",
      cell: (row) => <span className="td-p w7">${Number(row.base_price).toFixed(2)}</span>,
    },
    {
      id: "featured",
      header: "Featured",
      cell: (row) => {
        const isFeatured = row.is_featured || row.average_rating >= 4.5;
        return isFeatured ? <StatusBadge status="Featured" /> : <span className="td-m">—</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.is_active} />,
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
            searchValue={nameFilter}
            onSearchChange={(val) => {
              setSearchParams({
                ...Object.fromEntries(searchParams.entries()),
                name: val,
                page: "1",
              });
            }}
            searchPlaceholder="Search products…"
            searchDebounceMs={300}
            searchLoading={isLoading}
            filters={[
              {
                id: "category",
                value: "all-categories",
                placeholder: "All Categories",
                options: categoryOptions,
                width: "160px",
                onValueChange: () => {},
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
