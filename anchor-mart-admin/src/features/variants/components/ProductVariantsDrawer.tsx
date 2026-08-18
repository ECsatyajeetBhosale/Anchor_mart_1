import {
  IconEdit,
  IconPencil,
  IconPhotoOff,
  IconPlus,
  IconStack2,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
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
import { catalogTypeLabel } from "@/features/products";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import {
  useDeleteVariantMutation,
  useGetVariantsQuery,
  useSetVariantSourceableMutation,
  useUpdateVariantMutation,
} from "../api/variantApi";
import type { ProductVariant } from "../types/variant.types";
import { SetVariantExpressDialog } from "./SetVariantExpressDialog";
import { VariantForm } from "./VariantForm";

const M = MESSAGES.VARIANTS;
/**
 * Visibility labels live under the express screen's namespace because both read
 * the same server-computed fields. Sharing the strings is deliberate: two
 * wordings for one computed answer is how the screens start disagreeing.
 */
const EC = MESSAGES.EXPRESS.CATALOG;
const LIMIT = 10;

export interface ProductVariantsDrawerProps {
  /** Product whose variants are listed; null when nothing is selected. */
  productId: string | null;
  productName: string;
  /**
   * The parent's sourceable master switch, for rendering inherited state.
   *
   * A variant created here does **not** inherit it — `add-product-variant/`
   * takes the model default `true` even under a non-sourceable product, while
   * `add-product/`'s inline variant explicitly passes it down. So the table can
   * legitimately show a sourceable variant under a product that blocks it, and
   * without this it looks like a bug rather than the AND rule working.
   */
  productAdminSourceable?: boolean;
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
  productAdminSourceable = true,
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
  const [updateVariant] = useUpdateVariantMutation();
  const [setSourceable] = useSetVariantSourceableMutation();

  const variants = data?.variants ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));
  /**
   * The parent's catalog, taken off any row — the serializer sources it from the
   * product, so every variant of one product reports the same value. Read from
   * the rows rather than passed in, so it re-renders from the invalidated list
   * after a cascade instead of from a prop the caller would have to refresh.
   */
  const productCatalogType = variants[0]?.catalogType ?? "";

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (variant: ProductVariant) => {
    setEditing(variant);
    setFormOpen(true);
  };

  /**
   * The express switch opens a dialog rather than writing inline.
   *
   * Express became a second price list on 2026-08-18: the flag alone leaves the
   * SKU *pending* — on the shelf and refused by the express cart — so the price
   * has to travel with it, and a switch has nowhere to put one. Un-flagging goes
   * through the same dialog, which warns that it clears the price and may take
   * the product off the express shelf.
   */
  const [expressTarget, setExpressTarget] = useState<ProductVariant | null>(null);

  /**
   * Promotes a SKU to the product's default. The incumbent is demoted in the
   * same call — `is_primary: false` is refused, because a product must have one.
   */
  const promotePrimary = async (variant: ProductVariant) => {
    try {
      await updateVariant({ id: variant.id, body: { is_primary: true } }).unwrap();
      toast.success(M.TOAST.PRIMARY_SET(variant.sku));
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.PRIMARY_ERROR);
    }
  };

  const toggleSourceable = async (variant: ProductVariant, next: boolean) => {
    try {
      const result = await setSourceable({ id: variant.id, adminSourceable: next }).unwrap();
      // The write may have cascaded up and switched the *product* on too. Report
      // that, rather than "Variant updated" for a change that moved two flags.
      toast.success(
        result.productCascaded
          ? M.TOAST.SOURCEABLE_CASCADED
          : result.message || M.TOAST.FLAG_UPDATED,
      );
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.FLAG_ERROR);
    }
  };

  /**
   * Deleting carries the same catalog demotion as un-flagging express — removing
   * the last express variant moves the product off the express shelf — so the
   * success copy names it the same way.
   *
   * The only-variant case is a **400** with the server's own sentence, which
   * says what to do instead; `getApiMessage` surfaces it verbatim rather than
   * flattening it to "Failed to delete".
   */
  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      const result = await deleteVariant(toDelete.id).unwrap();
      /**
       * Two cascades can ride on one delete, so the toast names whichever fired.
       * Demotion off the express shelf is the louder one; a re-pointed primary
       * is quieter but still a change nobody asked for — it moves where a
       * product-level express-price edit will land.
       */
      if (result.productCascaded) {
        toast.success(
          M.TOAST.DELETED_CASCADED(
            toDelete.sku,
            productName,
            catalogTypeLabel(result.productCatalogType ?? undefined) ??
              result.productCatalogType ??
              "",
          ),
        );
      } else if (result.newPrimaryVariantId) {
        toast.success(M.TOAST.DELETED_NEW_PRIMARY(toDelete.sku));
      } else {
        toast.success(M.TOAST.DELETED(toDelete.sku));
      }
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
    {
      id: "sku",
      header: M.COLUMNS.SKU,
      className: "td-id",
      // The primary is what a product-level price edit writes to, so which SKU
      // holds it is worth seeing without opening anything.
      cell: (v) => (
        <div className="flex aic g8">
          <span>{v.sku}</span>
          {v.isPrimary && <Badge variant="neutral">{M.EXPRESS.PRIMARY}</Badge>}
        </div>
      ),
    },
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
      /**
       * Three states, and the third depends on the **parent's** catalog.
       *
       * **Ready** (flagged and priced) is the only one a sailor can buy.
       * **Pending** is a real problem — but only on an express product, where
       * the SKU sits on the shelf and is refused at the cart and again at the
       * till. Under a regular or marine parent there is no express shelf to be
       * pending for, so the same unflagged SKU is simply *not express*: an
       * ordinary state, not a warning.
       *
       * Flagging one there is still offered, because `set-express/` on a regular
       * product's SKU is what moves the **product** onto the express shelf — the
       * dialog reports that cascade.
       */
      cell: (v) => {
        const isReady = v.isExpress && v.expressPrice !== null;
        const parentIsExpress = v.catalogType === "express";
        /**
         * Styled as an actual control.
         *
         * It was a bare `btn-ghost` wrapping the price, which rendered as plain
         * text beside a column of plain text — nothing said the number was the
         * way to change it. A bordered button with a pencil reads as editable
         * without needing a separate action column.
         */
        return (
          <button
            type="button"
            className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            onClick={() => setExpressTarget(v)}
            title={isReady ? M.EXPRESS.RETITLE : M.EXPRESS.SET_TITLE}
          >
            {isReady ? (
              <span className="tabular-nums font-semibold">${v.expressPrice?.toFixed(2)}</span>
            ) : parentIsExpress ? (
              <Badge variant="warning">{M.EXPRESS.PENDING}</Badge>
            ) : (
              <span className="td-m">{M.EXPRESS.NOT_EXPRESS}</span>
            )}
            <IconPencil size={13} style={{ color: "var(--t4)" }} />
          </button>
        );
      },
    },
    {
      id: "sourceable",
      header: M.COLUMNS.SOURCEABLE,
      /**
       * Only half the rule. Orderability is `variant AND product`, and a variant
       * added here starts sourceable **even under a non-sourceable product** —
       * `add-product-variant/` takes the model default rather than inheriting,
       * unlike the inline variant `add-product/` creates. So an on switch under
       * an off master is correct and misleading at once; the note says which.
       */
      cell: (v) => (
        <div>
          <Switch
            checked={v.adminSourceable}
            onCheckedChange={(next) => toggleSourceable(v, next)}
          />
          {v.adminSourceable && !productAdminSourceable && (
            <div className="fg-hint mt-1">{M.BLOCKED_BY_PRODUCT}</div>
          )}
        </div>
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
      id: "visibility",
      header: EC.COLUMNS.VISIBILITY,
      headerClassName: "whitespace-nowrap",
      /**
       * What every other flag in this table adds up to: whether a sailor can
       * find the SKU at all.
       *
       * Server-computed and shared with the express screen — the same
       * `catalog_visibility_blockers()` helper feeds both, so the two views
       * cannot disagree about the same variant. Three of its inputs are product
       * fields absent from this payload, so it could not be derived here even
       * approximately.
       *
       * Visible-but-not-orderable is a real state, not a contradiction: sourcing
       * switched off leaves an item browsable with an unavailable badge.
       */
      cell: (v) => {
        if (!v.isSailorVisible) {
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="danger" className="w-fit">
                {EC.NOT_VISIBLE}
              </Badge>
              {v.visibilityBlockers.length > 0 && (
                <span className="td-m">
                  {v.visibilityBlockers.map((b) => EC.VISIBILITY_BLOCKER[b] ?? b).join(" · ")}
                </span>
              )}
            </div>
          );
        }
        return (
          <Badge variant={v.isSailorOrderable ? "success" : "warning"} className="w-fit">
            {v.isSailorOrderable ? EC.VISIBLE : EC.NOT_ORDERABLE}
          </Badge>
        );
      },
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
          {/* Demotes the incumbent in the same call; `false` is refused, so the
              action is absent on the SKU that already holds it. */}
          {!v.isPrimary && (
            <Button
              variant="ghost"
              size="xs"
              title={M.ACTIONS.MAKE_PRIMARY}
              onClick={() => promotePrimary(v)}
            >
              <IconStar size={15} />
            </Button>
          )}
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
                {/*
                  The product's current catalog, read off the rows (it is
                  inherited state, identical on all of them).

                  Shown here rather than as a column because it is a property of
                  the product, not of any SKU — and because it is the thing the
                  express toggle silently moves. Watching it change is the
                  clearest evidence that a variant-level switch had a
                  product-level effect.
                */}
                {productCatalogType && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[11.5px] font-semibold text-[var(--t4)]">
                      {M.PRODUCT_CATALOG}
                    </span>
                    <Badge variant="neutral" className="h-[20px] px-1.5 text-[9.5px]">
                      {catalogTypeLabel(productCatalogType) ?? productCatalogType}
                    </Badge>
                  </div>
                )}
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
                  // Taken off any row — the serializer sources it from the
                  // parent, so every variant reports the same value.
                  productCatalogType={productCatalogType}
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

      {/*
        Closes the drawer when the write moves the product's catalog.

        Un-flagging the last express SKU sends the product back to regular — so
        the list behind this drawer no longer contains it, and the drawer's own
        header ("Product catalog: EXPRESS") has just become false. Leaving it
        open showed a product that had left the screen, which reads as the write
        not having taken.
      */}
      <SetVariantExpressDialog
        isOpen={!!expressTarget}
        onClose={() => setExpressTarget(null)}
        variant={expressTarget}
        onCascade={onClose}
      />

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
