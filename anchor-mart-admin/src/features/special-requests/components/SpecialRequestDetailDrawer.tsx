import { IconClipboardText, IconPhotoOff, IconSend, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  specialRequestStatusVariant,
  useGetSpecialRequestDetailQuery,
} from "../api/specialRequestApi";

const M = MESSAGES.SPECIAL_REQUESTS;

// Communication-preference options for the delivery form.
const COMM_OPTIONS = [
  { value: M.COMM_OPTIONS.WHATSAPP, label: M.COMM_OPTIONS.WHATSAPP },
  { value: M.COMM_OPTIONS.EMAIL, label: M.COMM_OPTIONS.EMAIL },
];

/** Returns a trimmed string, or "-" when the value is null/undefined/blank. */
function dash(value: unknown): string {
  if (value === null || value === undefined) return M.DETAIL.FALLBACK;
  const s = String(value).trim();
  return s === "" ? M.DETAIL.FALLBACK : s;
}

export interface SpecialRequestDetailDrawerProps {
  /** Row id (UUID) sent to the detail API as `product_id`; null when none selected. */
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-side review drawer for a special-request item — mirrors the Intent
 * review drawer (shadcn `Sheet`). Fetches the full request detail by id when
 * opened and populates the existing layout; renders loading / error / empty
 * states while the data is in flight.
 */
export function SpecialRequestDetailDrawer({
  requestId,
  isOpen,
  onClose,
}: SpecialRequestDetailDrawerProps) {
  const [commPref, setCommPref] = useState<string>(M.COMM_OPTIONS.WHATSAPP);

  // Fetch only when the drawer is open and a row id is present.
  const {
    data: detail,
    isFetching,
    isUninitialized,
    isError,
    error,
    refetch,
  } = useGetSpecialRequestDetailQuery(requestId ?? "", { skip: !isOpen || !requestId });

  // Treat the not-yet-started frame as loading too, so the empty state never
  // flashes between opening the drawer and the request kicking off.
  const isBusy = isFetching || isUninitialized;

  const reject = () => {
    onClose();
    toast.error(M.TOAST.REJECTED);
  };
  const confirm = () => {
    onClose();
    toast.success(M.TOAST.PAYMENT_SENT);
  };

  // Derived, "-"-guarded view values (only meaningful once `detail` resolves).
  const user = detail?.user ?? undefined;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  const avatarKey = user?.id || fullName || requestId || "special-request";
  const avatarSrc = user?.profile_picture || getFallbackAvatar(avatarKey);
  const statusLabel = dash(detail?.status_display);
  const statusVar = specialRequestStatusVariant(detail?.status ?? "");
  const images = detail?.images ?? [];
  const productName = dash(detail?.product_name);

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
              <IconClipboardText size={22} />
            </div>
            <div>
              {/* Match the Intent drawer header typography (17px / 800, 12.5px). */}
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.DETAIL.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {detail ? dash(detail.reference) : M.DETAIL.FALLBACK}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isBusy ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
              <span className="text-[13px] font-semibold text-[var(--t4)]">{M.DETAIL.LOADING}</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-[13.5px] font-semibold text-[var(--danger-text)]">
                {getApiMessage(error) ?? M.DETAIL.FETCH_ERROR}
              </span>
              <Button variant="secondary" size="xs" onClick={() => refetch()}>
                {M.DETAIL.RETRY}
              </Button>
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <span className="text-[14px] font-bold text-[var(--t3)]">{M.DETAIL.EMPTY}</span>
            </div>
          ) : (
            <>
              {/* Requested By */}
              <div className="sec-label">{M.DETAIL.REQUESTED_BY}</div>
              <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
                <div className="mb-3.5 flex items-center gap-3">
                  <div className="av av-img">
                    <img src={avatarSrc} alt={dash(fullName)} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-bold text-[var(--t1)]">{dash(fullName)}</div>
                    <div className="text-[11px] text-[var(--t4)]">{M.DETAIL.SAILOR}</div>
                  </div>
                  <Badge variant={statusVar}>{statusLabel}</Badge>
                </div>
                {/* 2×2 summary grid — matches the Intent drawer's mini-stat layout. */}
                <div className="form-row !mb-0">
                  <div className="mini-stat">
                    <div className="mini-stat-val !text-[16px]">{dash(user?.email)}</div>
                    <div className="mini-stat-lbl">{M.DETAIL.EMAIL}</div>
                  </div>
                  {/* Phone & Ship/Port have no field in the detail response → "-". */}
                  <div className="mini-stat">
                    <div className="mini-stat-val mono !text-[16px]">{M.DETAIL.FALLBACK}</div>
                    <div className="mini-stat-lbl">{M.DETAIL.PHONE}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-val !text-[16px]">{M.DETAIL.FALLBACK}</div>
                    <div className="mini-stat-lbl">{M.DETAIL.SHIP_PORT}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-val !text-[16px]">{dash(detail.created_at)}</div>
                    <div className="mini-stat-lbl">{M.DETAIL.DATE_OF_REQUEST}</div>
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div className="sec-label">{M.DETAIL.ITEM_DETAILS}</div>
              <div className="form-row">
                <FormField label={M.DETAIL.PRODUCT_NAME}>
                  <div className="ecard">{productName}</div>
                </FormField>
                <FormField label={M.DETAIL.BRAND}>
                  <div className="ecard">{dash(detail.brand)}</div>
                </FormField>
              </div>
              <div className="form-row">
                <FormField label={M.DETAIL.QUANTITY}>
                  <div className="ecard">{dash(detail.quantity)}</div>
                </FormField>
                <div className="fg" />
              </div>
              <FormField label={M.DETAIL.DESCRIPTION}>
                <div className="ecard leading-relaxed">{dash(detail.description)}</div>
              </FormField>
              <FormField label={M.DETAIL.UPLOADED_IMAGE}>
                {images.length > 0 ? (
                  <div className="srq-img">
                    {images.map((src, i) => (
                      <img
                        key={src}
                        src={src}
                        alt={`${productName} ${i + 1}`}
                        className="max-h-40 w-auto max-w-full rounded-[var(--radius-sm)] object-contain"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="srq-img empty">
                    <IconPhotoOff size={26} />
                    <span>{M.DETAIL.NO_IMAGE}</span>
                  </div>
                )}
              </FormField>

              {/* Ship & Delivery Information */}
              <div className="sec-label mt-4">{M.DETAIL.SHIP_DELIVERY}</div>
              <div className="form-row">
                <FormField label={M.DETAIL.SHIP_INFO}>
                  <Input placeholder={M.DETAIL.SHIP_INFO_PLACEHOLDER} />
                </FormField>
                <FormField label={M.DETAIL.IMO}>
                  <Input className="mono" placeholder={M.DETAIL.IMO_PLACEHOLDER} />
                </FormField>
              </div>
              <div className="form-row triple">
                <FormField label={M.DETAIL.STROKE_TERMINAL}>
                  <Input placeholder={M.DETAIL.STROKE_TERMINAL_PLACEHOLDER} />
                </FormField>
                <FormField label={M.DETAIL.ARRIVAL_DATE}>
                  <Input type="date" />
                </FormField>
                <FormField label={M.DETAIL.ARRIVAL_TIME}>
                  <Input type="time" />
                </FormField>
              </div>
              <div className="form-row">
                <FormField label={M.DETAIL.EXPECTED_STAY}>
                  <Input placeholder={M.DETAIL.EXPECTED_STAY_PLACEHOLDER} />
                </FormField>
                <FormField label={M.DETAIL.COMM_PREF}>
                  <DropdownSelect
                    value={commPref}
                    onValueChange={setCommPref}
                    options={COMM_OPTIONS}
                    width="100%"
                  />
                </FormField>
              </div>
              <FormField label={M.DETAIL.SPECIAL_INSTRUCTIONS}>
                <Textarea
                  className="h-16 min-h-0 py-[10px]"
                  placeholder={M.DETAIL.SPECIAL_INSTRUCTIONS_PLACEHOLDER}
                />
              </FormField>

              {/* Pricing */}
              <div className="sec-label mt-4">{M.DETAIL.PRICING}</div>
              <div className="form-row">
                <FormField label={M.DETAIL.ESTIMATED_PRICE}>
                  <Input type="number" placeholder={M.DETAIL.ESTIMATED_PRICE_PLACEHOLDER} />
                </FormField>
                <div className="fg" />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="danger" size="sm" onClick={reject}>
              <IconX size={15} className="mr-1" />
              {M.DETAIL.REJECT}
            </Button>
            <Button variant="primary" size="sm" onClick={confirm}>
              <IconSend size={15} className="mr-1" />
              {M.DETAIL.CONFIRM}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SpecialRequestDetailDrawer;
