import { zodResolver } from "@hookform/resolvers/zod";
import { IconFileInvoice } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetCategoriesQuery } from "@/features/catalog";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { type GenerateBillFormData, generateBillSchema } from "../schemas/specialRequest.schema";
import type { GenerateBillPayload, SpecialRequestDetail } from "../types/specialRequest.types";

const B = MESSAGES.SPECIAL_REQUESTS.BILL_DIALOG;

export interface GenerateBillDialogProps {
  isOpen: boolean;
  /** The request being quoted; the form prefills from it. */
  request: SpecialRequestDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (payload: GenerateBillPayload) => void;
}

/**
 * Flow 13 API 10 — the quote form.
 *
 * Prefills from what the sailor asked for so the admin edits rather than
 * retypes. `quoted_price` is **per unit**: the backend multiplies by the
 * request's quantity and adds `fast_delivery_charge` as the order's shipping
 * fee when the sailor chose fastest delivery, so the same arithmetic is
 * previewed here.
 *
 * No catalog product is created by this call — the quote lives entirely on the
 * special request. The category is nonetheless required: the API rejects the
 * call without one whenever the request carries no category of its own.
 */
export function GenerateBillDialog({
  isOpen,
  request,
  isLoading,
  onClose,
  onConfirm,
}: GenerateBillDialogProps) {
  /**
   * Only general-scope, active categories are valid here (the backend rejects
   * anything else).
   *
   * Both conditions are applied **server-side**: this endpoint is already
   * general-scope-only (`ListGeneralCategoriesView`), and `is_active` is a
   * documented filter. Narrowing in the browser instead compounded the page cap
   * — a page holds at most 50 rows (`CustomPagination`), and discarding inactive
   * ones from that 50 could leave far fewer options than exist.
   */
  const { data: categoriesData } = useGetCategoriesQuery(
    { limit: API_MAX_PAGE_SIZE, isActive: true },
    { skip: !isOpen },
  );
  const categoryOptions = (categoriesData?.results?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<GenerateBillFormData>({
    resolver: zodResolver(generateBillSchema),
    defaultValues: {
      product_name: "",
      description: "",
      quoted_price: 0,
      fast_delivery_charge: 0,
      admin_response: "",
      category_id: "",
    },
  });

  /**
   * Reload each time the dialog opens for a request.
   *
   * `description` here is the **admin's** quote text (`quote_description`), not
   * the sailor's. The two were the same field until 2026-08-14, which is why
   * quoting used to overwrite the request it was answering; the form now edits
   * the admin's copy and leaves the sailor's alone.
   *
   * `category_id` prefills from the request's existing category, so the dropdown
   * shows where it is already filed and sending it back unchanged is a no-op.
   */
  useEffect(() => {
    if (isOpen && request) {
      reset({
        product_name: request.product_name ?? "",
        description: request.quote_description ?? "",
        quoted_price: request.quoted_price ? Number(request.quoted_price) : 0,
        fast_delivery_charge: request.fast_delivery_charge
          ? Number(request.fast_delivery_charge)
          : 0,
        admin_response: request.admin_response ?? "",
        category_id: request.category?.id ?? "",
      });
    }
  }, [isOpen, request, reset]);

  // Live preview of what the sailor will be asked to pay.
  const price = Number(watch("quoted_price")) || 0;
  const fastCharge = Number(watch("fast_delivery_charge")) || 0;
  const qty = request?.quantity && request.quantity > 0 ? request.quantity : 1;
  const total = price * qty + (request?.is_fastest_delivery ? fastCharge : 0);

  const submit = (data: GenerateBillFormData) => {
    // Built field-by-field: decimals go as strings.
    const payload: GenerateBillPayload = {
      product_name: data.product_name,
      quoted_price: data.quoted_price.toFixed(2),
      fast_delivery_charge: data.fast_delivery_charge.toFixed(2),
      admin_response: data.admin_response,
    };
    // Omitting `quote_description` leaves the previous quote text alone, which
    // is what a re-quote that only changes the price wants. Sent whenever the
    // field differs from what was loaded — including when it was cleared, since
    // clearing it is a deliberate edit.
    if (data.description !== (request?.quote_description ?? "")) {
      payload.quote_description = data.description;
    }
    // Override only. The detail now returns `category`, so an unchanged
    // selection is left out rather than re-sent — re-filing a request as a side
    // effect of re-quoting it is not something the admin asked for.
    if (data.category_id && data.category_id !== request?.category?.id) {
      payload.category_id = data.category_id;
    }
    onConfirm(payload);
  };

  const ref = request?.reference ?? "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{B.TITLE}</DialogTitle>
          <DialogDescription>{B.DESCRIPTION(ref)}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <FormField label={B.PRODUCT_NAME} error={errors.product_name?.message}>
            <Input
              placeholder={B.PRODUCT_NAME_PLACEHOLDER}
              error={!!errors.product_name}
              {...register("product_name")}
            />
          </FormField>

          <FormField label={B.DESCRIPTION_LABEL} error={errors.description?.message}>
            <Textarea
              className="h-16 min-h-0 py-[10px]"
              placeholder={B.DESCRIPTION_PLACEHOLDER}
              {...register("description")}
            />
          </FormField>

          <div className="form-row">
            <FormField
              label={B.QUOTED_PRICE}
              hint={B.QUOTED_PRICE_HINT}
              error={errors.quoted_price?.message}
            >
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder={B.PRICE_PLACEHOLDER}
                error={!!errors.quoted_price}
                {...register("quoted_price")}
              />
            </FormField>
            <FormField
              label={B.FAST_DELIVERY_CHARGE}
              hint={B.FAST_DELIVERY_CHARGE_HINT}
              error={errors.fast_delivery_charge?.message}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={B.PRICE_PLACEHOLDER}
                error={!!errors.fast_delivery_charge}
                {...register("fast_delivery_charge")}
              />
            </FormField>
          </div>

          {/* What the sailor is actually billed, using the backend's own maths. */}
          <div className="mb-[16px] rounded-[var(--radius-md)] bg-[var(--navy-25)] px-4 py-2.5">
            <span className="text-[12.5px] text-[var(--t3)]! font-semibold">
              {B.TOTAL_PREVIEW(total.toFixed(2), qty)}
            </span>
          </div>

          <FormField label={B.ADMIN_RESPONSE} error={errors.admin_response?.message}>
            <Textarea
              className="h-16 min-h-0 py-[10px]"
              placeholder={B.ADMIN_RESPONSE_PLACEHOLDER}
              {...register("admin_response")}
            />
          </FormField>

          <FormField label={B.CATEGORY} hint={B.CATEGORY_HINT} error={errors.category_id?.message}>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <DropdownSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={categoryOptions}
                  placeholder={categoryOptions.length ? B.CATEGORY_PLACEHOLDER : B.CATEGORY_EMPTY}
                  width="100%"
                />
              )}
            />
          </FormField>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {B.CANCEL}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit(submit)} disabled={isLoading}>
            <IconFileInvoice size={15} className="mr-1" />
            {isLoading ? B.SENDING : B.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerateBillDialog;
