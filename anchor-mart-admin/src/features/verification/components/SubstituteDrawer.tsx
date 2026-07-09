import { DynamicTabs } from "@/components/common/DynamicTabs";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconRefresh, IconSend } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { PriceDiff } from "../types/verification.types";

const M = MESSAGES.VERIFICATION.DIALOG;

const PRICE_TABS = [
  { label: M.PRICE.SAME, value: "Same Price" },
  { label: M.PRICE.INCREASE, value: "Price Increase" },
  { label: M.PRICE.DECREASE, value: "Price Decrease" },
];

export interface SubstituteDrawerProps {
  open: boolean;
  /** Name of the unavailable item being substituted. */
  itemName: string;
  /** Shop the item was confirmed out of stock at (for the warning note). */
  shop: string;
  onClose: () => void;
  onSubmit: (substituteName: string, priceDiff: PriceDiff) => void;
}

/**
 * Right-side drawer for suggesting a substitute for an out-of-stock item. Owns
 * its own transient input state and reseeds each time it opens; the parent
 * handles the side effect via `onSubmit`.
 */
export function SubstituteDrawer({
  open,
  itemName,
  shop,
  onClose,
  onSubmit,
}: SubstituteDrawerProps) {
  const [search, setSearch] = useState("");
  const [priceDiff, setPriceDiff] = useState<PriceDiff>("Same Price");

  useEffect(() => {
    if (open) {
      setSearch("");
      setPriceDiff("Same Price");
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={480}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconRefresh size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{M.TITLE}</SheetTitle>
              <SheetDescription>{M.ITEM(itemName)}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-[14px]">
          <div className="rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-[var(--warning-text)]">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase mb-1">
              <IconAlertTriangle size={14} />
              {M.UNAVAILABLE_LABEL}
            </div>
            <div className="text-[13px] font-bold">{itemName}</div>
            {shop && (
              <div className="text-[11px] opacity-85 mt-0.5">{M.UNAVAILABLE_NOTE(shop)}</div>
            )}
          </div>

          <FormField label={M.NAME_LABEL}>
            <Input
              placeholder={M.NAME_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>

          <FormField label={M.PRICE_LABEL}>
            <DynamicTabs
              tabs={PRICE_TABS}
              value={priceDiff}
              onTabChange={(v) => setPriceDiff(v as PriceDiff)}
            />
          </FormField>
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" type="button" onClick={onClose}>
              {MESSAGES.COMMON.CANCEL}
            </Button>
            <Button variant="primary" onClick={() => onSubmit(search, priceDiff)}>
              <IconSend size={15} className="mr-1" />
              {M.SEND}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
