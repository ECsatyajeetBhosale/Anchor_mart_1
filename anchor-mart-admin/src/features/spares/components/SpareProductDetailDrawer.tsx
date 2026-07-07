import { IconPackage } from "@tabler/icons-react";

import { FormField } from "@/components/common/FormField";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import type { SpareProduct } from "../types/spare.types";

const M = MESSAGES.SPARES;

export interface SpareProductDetailDrawerProps {
  /** The selected product row; null when none is selected. */
  product: SpareProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-side read-only detail drawer for a marine-emergency product (shadcn
 * `Sheet`). Renders the product summary from the selected row (no detail
 * endpoint is exposed yet).
 */
export function SpareProductDetailDrawer({
  product,
  isOpen,
  onClose,
}: SpareProductDetailDrawerProps) {
  if (!product) return null;

  const imageSrc = product.image || getFallbackAvatar(product.name);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={800}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconPackage size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.DETAIL.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {product.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Product Overview */}
          <div className="sec-label">{M.DETAIL.OVERVIEW}</div>
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="av av-img">
                <img src={imageSrc} alt={product.name} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{product.name}</div>
                <div className="text-[11px] text-[var(--t4)]">{product.category}</div>
              </div>
              <StatusBadge
                status={product.active}
                activeLabel={M.DETAIL.ACTIVE}
                inactiveLabel={M.DETAIL.INACTIVE}
              />
            </div>
            <div className="form-row !mb-0">
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{product.price}</div>
                <div className="mini-stat-lbl">{M.DETAIL.PRICE}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{product.variants}</div>
                <div className="mini-stat-lbl">{M.DETAIL.VARIANTS}</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="sec-label">{M.DETAIL.DETAILS}</div>
          <div className="form-row">
            <FormField label={M.DETAIL.CATEGORY}>
              <div className="ecard">{product.category}</div>
            </FormField>
            <FormField label={M.DETAIL.TYPE}>
              <div className="ecard">{product.type}</div>
            </FormField>
          </div>
          <div className="form-row">
            <FormField label={M.DETAIL.RATING}>
              <div className="ecard">{product.rating}</div>
            </FormField>
            <FormField label={M.DETAIL.CREATED}>
              <div className="ecard">{product.created}</div>
            </FormField>
          </div>
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {M.DETAIL.CLOSE}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SpareProductDetailDrawer;
