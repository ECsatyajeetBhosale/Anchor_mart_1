import { IconEdit, IconPhotoOff, IconPlus, IconStack2, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Thumbnail } from "@/components/common/Thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import {
  useDeleteVariantMutation,
  useGetVariantsQuery,
  useSetVariantExpressMutation,
  useSetVariantSourceableMutation,
} from "../api/variantApi";
import type { ProductVariant } from "../types/variant.types";
import { VariantForm } from "./VariantForm";

const M = MESSAGES.VARIANTS;
const LIMIT = 10;

export interface ProductVariantsDrawerProps {
  /** Product whose variants are listed; null when nothing is selected. */
  productId: string | null;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

/** Renders an attribute map as `key: value · key: value`. */
function formatAttributes(attributes: Record<string, unknown>): string {
  const entries = Object.entries(attributes)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return entries.length ? entries.join(" · ") : M.DASH;
}

/**
 * The variant manager for one product — lists its SKUs and exposes create,
 * edit, delete, and the two per-variant flags (express, sourceable).
 */
export function ProductVariantsDrawer({
  productId,
  productName,
  isOpen,
  onClose,
}: ProductVariantsDrawerProps) {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [toDelete, setToDelete] = useState<ProductVariant | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // The inline panel can open below the fold on a long variant list, so bring
  // it into view — otherwise pressing Add looks like nothing happened.
  useEffect(() => {
    if (formOpen) formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [formOpen]);

  // Reopening the drawer on another product must not leave a stale form behind.
  useEffect(() => {
    if (!isOpen) {
      setFormOpen(false);
      setEditing(null);
    }
  }, [isOpen]);

  const { data, isLoading, isError, refetch } = useGetVariantsQuery(
    { page, limit: LIMIT, productId: productId ?? undefined },
    { skip: !isOpen || !productId },
  );

  const [deleteVariant, { isLoading: isDeleting }] = useDeleteVariantMutation();
  const [setExpress] = useSetVariantExpressMutation();
  const [setSourceable] = useSetVariantSourceableMutation();

  const variants = data?.variants ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (variant: ProductVariant) => {
    setEditing(variant);
    setFormOpen(true);
  };

  const toggleExpress = async (variant: ProductVariant, next: boolean) => {
    try {
      await setExpress({ id: variant.id, isExpress: next }).unwrap();
      toast.success(M.TOAST.FLAG_UPDATED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.FLAG_ERROR);
    }
  };

  const toggleSourceable = async (variant: ProductVariant, next: boolean) => {
    try {
      await setSourceable({ id: variant.id, adminSourceable: next }).unwrap();
      toast.success(M.TOAST.FLAG_UPDATED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.FLAG_ERROR);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteVariant(toDelete.id).unwrap();
      toast.success(M.TOAST.DELETED(toDelete.sku));
      setToDelete(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.DELETE_ERROR);
    }
  };

  const columns: Column<ProductVariant>[] = [
    {
      // The variants endpoint returns a full `images` array; until now the
      // transform kept only the write-payload paths, so nothing was renderable
      // and the drawer showed SKUs against no picture at all.
      id: "image",
      header: "",
      className: "w-12",
      cell: (v) => (
        <Thumbnail src={v.imageUrl} alt={v.sku} placeholder={<IconPhotoOff size={15} />} />
      ),
    },
    { id: "sku", header: M.COLUMNS.SKU, className: "td-id", cell: (v) => v.sku },
    {
      id: "price",
      header: M.COLUMNS.PRICE,
      className: "td-p",
      cell: (v) => `$${v.price.toFixed(2)}`,
    },
    {
      id: "attributes",
      header: M.COLUMNS.ATTRIBUTES,
      className: "td-m",
      cell: (v) => formatAttributes(v.attributes),
    },
    {
      id: "express",
      header: M.COLUMNS.EXPRESS,
      cell: (v) => (
        <Switch checked={v.isExpress} onCheckedChange={(next) => toggleExpress(v, next)} />
      ),
    },
    {
      id: "sourceable",
      header: M.COLUMNS.SOURCEABLE,
      cell: (v) => (
        <Switch checked={v.adminSourceable} onCheckedChange={(next) => toggleSourceable(v, next)} />
      ),
    },
    {
      id: "active",
      header: M.COLUMNS.ACTIVE,
      cell: (v) => (
        <Badge variant={v.isActive ? "success" : "neutral"}>
          {v.isActive ? MESSAGES.EXPRESS.CATALOG.ACTIVE : MESSAGES.EXPRESS.CATALOG.INACTIVE}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-24 text-right",
      headerClassName: "text-right",
      cell: (v) => (
        <div className="td-acts">
          <Button variant="ghost" size="xs" title={M.ACTIONS.EDIT} onClick={() => openEdit(v)}>
            <IconEdit size={15} />
          </Button>
          <Button variant="ghost" size="xs" title={M.ACTIONS.DELETE} onClick={() => setToDelete(v)}>
            <IconTrash size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          adjustable
          defaultWidth={900}
          className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
        >
          <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
                <IconStack2 size={22} />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                  {M.TITLE}
                </SheetTitle>
                <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                  {M.SUBTITLE(productName)}
                </SheetDescription>
              </div>
              <Button variant="primary" size="sm" onClick={openAdd} disabled={!productId}>
                <IconPlus size={15} className="mr-1" />
                {M.ADD}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <DataTable
              columns={columns}
              data={variants}
              rowKey="id"
              page={page}
              pages={totalPages}
              isLoading={isLoading}
              isError={isError}
              error={isError ? M.FETCH_ERROR : null}
              onRetry={refetch}
              onPageChange={setPage}
              showPagination
              emptyMessage={M.EMPTY}
            />

            {/* Inline rather than a second drawer: the SKU list stays visible
                while adding, which is what stops a duplicate SKU. */}
            <div ref={formRef}>
              {formOpen && productId && (
                <VariantForm
                  productId={productId}
                  variant={editing}
                  onDone={() => {
                    setFormOpen(false);
                    setEditing(null);
                  }}
                />
              )}
            </div>
          </div>

          <SheetFooter className="p-5 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <p className="text-[11.5px] leading-relaxed text-[var(--t4)]">{M.SOURCEABLE_HINT}</p>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={M.CONFIRM_DELETE.TITLE}
        description={toDelete ? M.CONFIRM_DELETE.MESSAGE(toDelete.sku) : ""}
        confirmText={M.CONFIRM_DELETE.CONFIRM}
      />
    </>
  );
}

export default ProductVariantsDrawer;
