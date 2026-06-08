import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/common/DataTable";
import { APP_ROUTES } from "@/lib/constants";
import { useGetProductsQuery, useDeleteProductMutation } from "@/features/products/api/productsApi";

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Pagination params from URL
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  // Simple filters – extend as needed
  const nameFilter = searchParams.get("name") ?? "";

  const { data, isLoading, isError, error } = useGetProductsQuery({
    page,
    limit,
    name: nameFilter,
  });

  const [deleteProduct] = useDeleteProductMutation();

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id).unwrap();
      toast.success("Product deleted");
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  const columns = useMemo<Column<any>[]>(
    () => [
      {
        id: "image",
        header: "Image",
        accessorKey: "image",
        cell: (row) => (
          <img
            src={row.image}
            alt={row.name}
            style={{ width: "40px", height: "40px", objectFit: "cover" }}
          />
        ),
        className: "w-12",
      },
      { id: "name", header: "Name", accessorKey: "name" },
      { id: "price", header: "Price", accessorKey: "price", cell: (row) => `$${row.price.toFixed(2)}` },
      { id: "stock", header: "Stock", accessorKey: "stock" },
      {
        id: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="flex gap-2">
            <button
              className="text-blue-600 hover:underline"
              onClick={() => navigate(`${APP_ROUTES.PRODUCTS}/${row.id}`)}
            >
              Edit
            </button>
            <button
              className="text-red-600 hover:underline"
              onClick={() => handleDelete(row.id)}
            >
              Delete
            </button>
          </div>
        ),
        className: "w-24",
      },
    ],
    [navigate, deleteProduct]
  );

  const handlePageChange = (newPage: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams.entries()), page: newPage.toString() });
  };

  const handleLimitChange = (newLimit: number) => {
    setSearchParams({ ...Object.fromEntries(searchParams.entries()), limit: newLimit.toString(), page: "1" });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      {/* TODO: Add ProductFilters component here */}
      <DataTable
        columns={columns}
        data={data?.results ?? []}
        isLoading={isLoading}
        isError={isError}
        error={error?.data?.detail ?? "Unable to load products"}
        page={page}
        pages={data?.total_pages ?? 1}
        onPageChange={handlePageChange}
        showPagination={true}
        emptyMessage="No products found."
      />
    </div>
  );
}
