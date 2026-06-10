import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { IconBolt, IconDeviceSpeaker } from "@tabler/icons-react";
import type React from "react";
import type { ExpressItem } from "../types/expressItem.types";

export interface ExpressItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ExpressItem | null;
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="fg-label">{label}</span>
      <span className="text-[13.5px] font-medium text-[var(--t1)]">{value || "—"}</span>
    </div>
  );
}

export function ExpressItemDrawer({ isOpen, onClose, item }: ExpressItemDrawerProps) {
  const attributes = item?.attributes;
  const material = attributes?.material;
  const image = item?.images?.find((img) => img.is_primary) ?? item?.images?.[0];
  const imageSrc = image?.image_url || image?.image;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={640}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="prod-thumb h-10 w-10">
              {imageSrc ? (
                <img src={imageSrc} alt="Express item" className="h-10 w-10 rounded object-cover" />
              ) : (
                <IconDeviceSpeaker size={20} />
              )}
            </div>
            <div>
              <SheetTitle className="text-xl">{item?.product_name ?? "Express Item"}</SheetTitle>
              <SheetDescription>
                <span className="mono">{item?.sku}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-6">
          {item && (
            <>
              <section>
                <div className="sec-label">Overview</div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <StatusBadge status={item.is_active} />
                  <Badge variant={item.is_express_item ? "teal" : "neutral"}>
                    {item.is_express_item ? "Express" : "Non-Express"}
                  </Badge>
                  <Badge variant={item.admin_sourceable ? "success" : "neutral"}>
                    {item.admin_sourceable ? "Sourceable" : "Not Sourceable"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Category" value={attributes?.category} />
                  <DetailRow label="Brand" value={attributes?.brand} />
                  <DetailRow label="Color" value={attributes?.color} />
                  <DetailRow label="Price" value={`$${Number(item.price).toFixed(2)}`} />
                  <DetailRow label="Sales Count" value={item.sales_count?.toLocaleString()} />
                </div>
              </section>

              <section>
                <div className="sec-label">Attributes</div>
                <div className="grid grid-cols-3 gap-4">
                  <DetailRow label="Gender" value={attributes?.gender} />
                  <DetailRow label="Fit" value={attributes?.fit} />
                  <DetailRow label="Length" value={attributes?.length} />
                  <DetailRow label="Rise" value={attributes?.rise} />
                  <DetailRow label="Season" value={attributes?.season} />
                  <DetailRow label="Closure" value={attributes?.closure_type} />
                </div>
              </section>

              <section>
                <div className="sec-label">Material</div>
                <div className="grid grid-cols-3 gap-4">
                  <DetailRow label="Primary" value={material?.primary} />
                  <DetailRow label="Secondary" value={material?.secondary} />
                  <DetailRow label="Elastane" value={material?.elastane} />
                </div>
              </section>

              <section>
                <div className="sec-label">Care Instructions</div>
                <p className="text-[13.5px] font-medium text-[var(--t2)]">
                  {attributes?.care_instructions || "—"}
                </p>
              </section>
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end w-full">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <IconBolt size={16} />
              Close
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
