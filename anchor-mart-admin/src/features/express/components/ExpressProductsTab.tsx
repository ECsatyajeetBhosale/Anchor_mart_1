import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/ui/data-table";
import { useGetCategoriesQuery } from "@/features/catalog";
import {
  type Product,
  ProductFormModal,
  SetCatalogTypeDialog,
  useAnnounceProductAvailabilityMutation,
  useDealBoundaryRefetch,
  useDeleteProductMutation,
  useProductColumns,
  useSetProductActiveMutation,
  useSetProductSourceableMutation,
  useSetProductTopRatedMutation,
} from "@/features/products";
import { ProductVariantsDrawer } from "@/features/variants";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useGetExpressProductsQuery } from "../api/expressApi";

const LIMIT = 10;

/**
 * Express catalog at **product** level — the same screen as Products, pointed at
 * `express/products/`.
 *
 * It shares a view class with `get-products/` on the backend, so the rows, the
 * form, the row actions and the delete blast radius are all identical; this
 * renders the products feature's own columns and dialogs rather than a parallel
 * set that could drift from them.
 *
 * Writes go to the **catalog-wide** `products/` endpoints, which still accept an
 * express id — `express/products/` is read-only, exactly as the marine spares
 * screen borrows the same three `set-*` toggles.
 *
 * Filter state is read from the URL rather than passed down: the toolbar lives in
 * the parent's page header (so the layout matches Products) and writes the same
 * params this reads.
 */
export function ExpressProductsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [catalogProduct, setCatalogProduct] = useState<Product | null>(null);
  const [announceProduct, setAnnounceProduct] = useState<Product | null>(null);

  // Creating and deleting a product is super-admin only; editing is not.
  const { canManageCatalog } = useAdminAccess();

  const [setTopRated] = useSetProductTopRatedMutation();
  const [setSourceable] = useSetProductSourceableMutation();
  const [setActive] = useSetProductActiveMutation();
  const [announceAvailability, { isLoading: isAnnouncing }] =
    useAnnounceProductAvailabilityMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const categoryFilter = searchParams.get("category") ?? "all";
  const statusFilter = searchParams.get("status") ?? "";
  const topRatedFilter = searchParams.get("top_rated") ?? "";
  const sourceableFilter = searchParams.get("sourceable") ?? "";

  const isActive =
    statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;

  const { data, isLoading, isError, error, refetch } = useGetExpressProductsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    isActive,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    isTopRated: topRatedFilter === "" ? undefined : topRatedFilter === "true",
    adminSourceable: sourceableFilter === "" ? undefined : sourceableFilter === "true",
  });

  /**
   * Express products use **general-scope** categories — there is no express
   * category bucket, so this is the same list the Products screen filters by.
   */
  const { data: categoriesData } = useGetCategoriesQuery({ limit: API_MAX_PAGE_SIZE });
  const categories = categoriesData?.results?.data ?? [];

  const products: Product[] = data?.results?.data ?? [];
  // One refetch scheduled at the moment the soonest deal on screen expires —
  // `on_deal` flips with the clock and has no write to invalidate against (C8).
  useDealBoundaryRefetch(products, refetch);
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

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

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  };

  /**
   * A page past the end is a **404**, not an empty page — same `CustomPagination`
   * as every other catalog list, so the same recovery to page 1.
   */
  const isPageOutOfRange = getApiStatus(error) === 404;
  React.useEffect(() => {
    if (!isPageOutOfRange || page === 1) return;
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [isPageOutOfRange, page, searchParams, setSearchParams]);

  // Client-side refinement, mirroring Products: a fallback that still holds if
  // the backend ever ignores `?category=`.
  const selectedCategoryName = categories.find((c) => c.id === categoryFilter)?.name;
  const filteredProducts = React.useMemo(() => {
    if (categoryFilter === "all" || !selectedCategoryName) return products;
    return products.filter((p) => p.category_name === selectedCategoryName);
  }, [products, categoryFilter, selectedCategoryName]);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    // The row action is already hidden for a sub-admin, but a stale dialog left
    // open across a role change must not fire the call.
    if (!canManageCatalog) {
      toast.error(MESSAGES.ROLES.CATALOG_DELETE_DENIED);
      setProductToDelete(null);
      return;
    }
    try {
      await deleteProduct(productToDelete).unwrap();
      toast.success(MESSAGES.PRODUCTS.TOAST.DELETE_SUCCESS);
      setProductToDelete(null);
    } catch (_error) {
      toast.error(MESSAGES.PRODUCTS.TOAST.DELETE_ERROR);
    }
  };

  const handleConfirmAnnounce = async () => {
    if (!announceProduct) return;
    try {
      const res = await announceAvailability(announceProduct.id).unwrap();
      // Branch on `announced`, not the status code: a repeat inside the 120s
      // dedupe window returns 200 with `announced: false` and nothing was sent.
      const sent = res?.announced !== false;
      if (sent) {
        toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.ANNOUNCED(announceProduct.name));
      } else {
        toast.info(
          getApiMessage(res) ?? MESSAGES.PRODUCT_FLAGS.TOAST.ANNOUNCE_DEDUPED(announceProduct.name),
        );
      }
      setAnnounceProduct(null);
    } catch (error) {
      toast.error(getApiMessage(error) ?? MESSAGES.PRODUCT_FLAGS.TOAST.ANNOUNCE_ERROR);
    }
  };

  const columns = useProductColumns({
    statusFilter,
    onStatusFilter: (value) => setFilterParam("status", value),
    topRatedFilter,
    onTopRatedFilter: (value) => setFilterParam("top_rated", value),
    sourceableFilter,
    onSourceableFilter: (value) => setFilterParam("sourceable", value),
    // This is the express catalog, so both prices are meaningful here — and a
    // product with no express price is exactly what needs finding.
    showExpressPrice: true,
    onEdit: (e, product) => {
      e.stopPropagation();
      setEditingProduct(product);
      setIsModalOpen(true);
    },
    onDelete: (e, id) => {
      e.stopPropagation();
      setProductToDelete(id);
    },
    canDelete: canManageCatalog,
    onManageVariants: (e, product) => {
      e.stopPropagation();
      setVariantsProduct(product);
    },
    onChangeCatalog: (e, product) => {
      e.stopPropagation();
      setCatalogProduct(product);
    },
    onAnnounce: (e, product) => {
      e.stopPropagation();
      setAnnounceProduct(product);
    },
    onToggleTopRated: async (product, next) => {
      try {
        await setTopRated({ id: product.id, isTopRated: next }).unwrap();
        toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_UPDATED);
      } catch (err) {
        toast.error(getApiMessage(err) ?? MESSAGES.PRODUCT_FLAGS.TOAST.TOP_RATED_ERROR);
      }
    },
    onToggleSourceable: async (product, next) => {
      try {
        await setSourceable({ id: product.id, adminSourceable: next }).unwrap();
        toast.success(MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_UPDATED);
      } catch (err) {
        toast.error(getApiMessage(err) ?? MESSAGES.PRODUCT_FLAGS.TOAST.SOURCEABLE_ERROR);
      }
    },
    onToggleActive: async (product, next) => {
      try {
        const res = await setActive({ id: product.id, isActive: next }).unwrap();
        toast.success(
          getApiMessage(res) ??
            (next ? MESSAGES.PRODUCTS.TOAST.ACTIVATED : MESSAGES.PRODUCTS.TOAST.DEACTIVATED),
        );
      } catch (err) {
        toast.error(getApiMessage(err) ?? MESSAGES.PRODUCTS.TOAST.ACTIVE_ERROR);
      }
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredProducts}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? MESSAGES.PRODUCTS.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={MESSAGES.PRODUCTS.EMPTY}
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

      <ProductVariantsDrawer
        productId={variantsProduct?.id ?? null}
        productName={variantsProduct?.name ?? ""}
        productAdminSourceable={variantsProduct?.admin_sourceable !== false}
        isOpen={!!variantsProduct}
        onClose={() => setVariantsProduct(null)}
      />

      {/* Moving a product out of express drops it off this list entirely — the
          dialog says so at the point of decision. */}
      <SetCatalogTypeDialog
        product={catalogProduct}
        isOpen={!!catalogProduct}
        onClose={() => setCatalogProduct(null)}
      />

      <ConfirmDialog
        isOpen={!!announceProduct}
        onClose={() => setAnnounceProduct(null)}
        onConfirm={handleConfirmAnnounce}
        isLoading={isAnnouncing}
        title={MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.TITLE}
        description={
          announceProduct
            ? `${MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.MESSAGE(announceProduct.name)} ${MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.NOTE}`
            : ""
        }
        confirmText={MESSAGES.PRODUCT_FLAGS.ANNOUNCE_DIALOG.CONFIRM}
      />

      {/* Typed confirmation, as on Products: the delete cascades to every
          variant, ignores open orders and live deals, and has no restore. */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={MESSAGES.PRODUCTS.DELETE_CONFIRM.TITLE}
        description={MESSAGES.PRODUCTS.DELETE_CONFIRM.MESSAGE}
        confirmText={MESSAGES.PRODUCTS.DELETE_CONFIRM.CONFIRM}
        confirmPhrase={MESSAGES.PRODUCTS.DELETE_CONFIRM.PHRASE}
        isLoading={isDeleting}
      />
    </>
  );
}
