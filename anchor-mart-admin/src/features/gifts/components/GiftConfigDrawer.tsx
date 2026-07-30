import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
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
import { IconCheck, IconSettings } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGetGiftConfigQuery, useUpdateGiftConfigMutation } from "../api/giftApi";

const M = MESSAGES.GIFTS.CONFIG;
const MIN_ORDERS_FLOOR = 2;

export interface GiftConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The programme's two settings.
 *
 * Only `is_enabled` and `min_orders` are exposed, because only those two change
 * behaviour. `min_total_value` and `threshold_mode` exist as columns but are
 * deliberately off the API and must stay off this form — an inert writable
 * control reads as a working one, and an admin would set a threshold and wait
 * for behaviour that never arrives.
 */
export function GiftConfigDrawer({ isOpen, onClose }: GiftConfigDrawerProps) {
  const { data: config } = useGetGiftConfigQuery(undefined, { skip: !isOpen });
  const [updateConfig, { isLoading: isSaving }] = useUpdateGiftConfigMutation();

  const [isEnabled, setIsEnabled] = useState(false);
  const [minOrders, setMinOrders] = useState("2");
  const [error, setError] = useState<string | null>(null);

  // Reseed each time the drawer opens so it never shows a stale value.
  useEffect(() => {
    if (!isOpen || !config) return;
    setIsEnabled(config.is_enabled);
    setMinOrders(String(config.min_orders));
    setError(null);
  }, [isOpen, config]);

  const handleSave = async () => {
    const parsed = Number(minOrders);
    // Mirror the server rule client-side so the failure is immediate and
    // explains itself, rather than arriving as a 400.
    if (!Number.isInteger(parsed) || parsed < MIN_ORDERS_FLOOR) {
      setError(M.MIN_ORDERS_ERROR);
      return;
    }
    setError(null);
    try {
      await updateConfig({ is_enabled: isEnabled, min_orders: parsed }).unwrap();
      onClose();
      toast.success(M.SUCCESS);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={520}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconSettings size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{M.TITLE}</SheetTitle>
              <SheetDescription>{M.SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <FormField label={M.ENABLED} hint={M.ENABLED_HINT}>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </FormField>

          <FormField label={M.MIN_ORDERS} hint={M.MIN_ORDERS_HINT} error={error ?? undefined}>
            <Input
              type="number"
              min={MIN_ORDERS_FLOOR}
              step={1}
              value={minOrders}
              error={!!error}
              onChange={(e) => setMinOrders(e.target.value)}
            />
          </FormField>
        </div>

        <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
          <div className="flex w-full justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <IconCheck size={16} />
              {isSaving ? M.SAVING : M.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default GiftConfigDrawer;
