import { IconEdit, IconLifebuoy, IconPhotoOff } from "@tabler/icons-react";

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
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useGetSpareProductQuery } from "../api/spareApi";

const M = MESSAGES.SPARES;
const D = M.DETAIL;

/** Returns a trimmed string, or "-" when null/undefined/blank. */
function dash(value: unknown): string {
  if (value === null || value === undefined) return D.FALLBACK;
  const s = String(value).trim();
  return s === "" ? D.FALLBACK : s;
}

/** Formats the base price as "$<amount>", or "-" when absent/non-numeric. */
function price(value: unknown): string {
  if (value === null || value === undefined || value === "") return D.FALLBACK;
  const num = Number(value);
  return Number.isNaN(num) ? D.FALLBACK : `$${num.toFixed(2)}`;
}

/** Turns a catalog type token ("marine_emergency") into a label. */
function typeLabel(value?: string | null): string {
  const raw = value ? String(value).trim() : "";
  if (!raw) return D.FALLBACK;
  return raw
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface SpareProductDetailDrawerProps {
  /** Id of the selected spare; null when none is selected. */
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /** Opens the edit drawer for this spare. Rendered only when supplied. */
  onEdit?: (productId: string) => void;
}

/**
 * Right-side read-only detail drawer for a marine-emergency spare.
 *
 * Fetches the full record by id rather than rendering the clicked row: the row
 * carries no description, no image gallery and no port list.
 */
export function SpareProductDetailDrawer({
  productId,
  isOpen,
  onClose,
  onEdit,
}: SpareProductDetailDrawerProps) {
  const {
    data: detail,
    isFetching,
    isUninitialized,
    isError,
    error,
    refetch,
  } = useGetSpareProductQuery(productId ?? "", { skip: !isOpen || !productId });

  // Treat the not-yet-started frame as loading so the empty state never flashes.
  const isBusy = isFetching || isUninitialized;

  const images = detail?.images ?? [];
  const primary = images.find((img) => img.is_primary) ?? images[0];
  const imageSrc = primary?.image || getFallbackAvatar(detail?.name ?? "spare");

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
              <IconLifebuoy size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {D.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {detail ? dash(detail.name) : D.FALLBACK}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div key={detail?.id ?? productId ?? "none"} className="flex-1 overflow-y-auto p-6">
          {isBusy ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
              <span className="text-[13px] font-semibold text-[var(--t4)]">{D.LOADING}</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-[13.5px] font-semibold text-[var(--danger-text)]">
                {getApiMessage(error) ?? D.FETCH_ERROR}
              </span>
              <Button variant="secondary" size="xs" onClick={() => refetch()}>
                {D.RETRY}
              </Button>
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <span className="text-[14px] font-bold text-[var(--t3)]">{D.EMPTY}</span>
            </div>
          ) : (
            <>
              {/* Product Overview */}
              <div className="sec-label">{D.OVERVIEW}</div>
              <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
                <div className="mb-3.5 flex items-center gap-3">
                  <div className="av av-img">
                    <img src={imageSrc} alt={dash(detail.name)} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-bold text-[var(--t1)]">
                      {dash(detail.name)}
                    </div>
                    <div className="text-[11px] text-[var(--t4)]">{dash(detail.category_name)}</div>
                  </div>
                  <StatusBadge
                    status={!!detail.is_active}
                    activeLabel={D.ACTIVE}
                    inactiveLabel={D.INACTIVE}
                  />
                </div>
                <div className="form-row !mb-0">
                  <div className="mini-stat">
                    <div className="mini-stat-val !text-[16px]">{price(detail.base_price)}</div>
                    <div className="mini-stat-lbl">{D.PRICE}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-val !text-[16px]">{detail.average_rating ?? 0}</div>
                    <div className="mini-stat-lbl">{D.RATING}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-val !text-[16px]">{detail.purchase_count ?? 0}</div>
                    <div className="mini-stat-lbl">{D.PURCHASES}</div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="sec-label">{D.DETAILS}</div>
              <FormField label={D.DESCRIPTION}>
                <div className="ecard leading-relaxed">{dash(detail.description)}</div>
              </FormField>
              <div className="form-row">
                <FormField label={D.CATEGORY}>
                  <div className="ecard">{dash(detail.category_name)}</div>
                </FormField>
                <FormField label={D.TYPE}>
                  <div className="ecard">{typeLabel(detail.catalog_type)}</div>
                </FormField>
              </div>
              <div className="form-row">
                <FormField label={D.ADMIN_SOURCEABLE}>
                  <div className="ecard">{detail.admin_sourceable ? D.YES : D.NO}</div>
                </FormField>
                <FormField label={D.TOP_RATED}>
                  <div className="ecard">{detail.is_top_rated ? D.YES : D.NO}</div>
                </FormField>
              </div>
              <div className="form-row">
                <FormField label={D.CREATED}>
                  <div className="ecard">{dash(detail.created_at)}</div>
                </FormField>
                <FormField label={D.UPDATED}>
                  <div className="ecard">{dash(detail.updated_at)}</div>
                </FormField>
              </div>
              <FormField label={D.PORTS}>
                <div className="ecard mono">
                  {detail.ports?.length ? detail.ports.join(", ") : D.FALLBACK}
                </div>
              </FormField>

              {/* Images */}
              <div className="sec-label mt-4">{D.IMAGES}</div>
              {images.length === 0 ? (
                <div className="srq-img empty">
                  <IconPhotoOff size={26} />
                  <span>{D.NO_IMAGE}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {images.map((img) => (
                    <img
                      key={img.id}
                      src={img.image}
                      alt={dash(detail.name)}
                      className="h-24 w-24 rounded-[var(--radius-sm)] border border-[var(--border-sm)] object-cover"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {D.CLOSE}
            </Button>
            {onEdit && detail && (
              <Button variant="primary" size="sm" onClick={() => onEdit(detail.id)}>
                <IconEdit size={15} className="mr-1" />
                {D.EDIT}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SpareProductDetailDrawer;
