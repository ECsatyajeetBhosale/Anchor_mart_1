import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
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
import { IconCheck, IconUser } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useToggleSailorStatusMutation, useUpdateSailorMutation } from "../api/sailorApi";
import type { SailorData } from "../types/sailor.types";

const F = MESSAGES.SAILORS.FORM;

export interface SailorEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sailor: SailorData;
}

/** Splits "First Middle Last" into first_name + last_name for the API. */
function splitFullName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

/**
 * Splits the single contact string into a digits-only country code + WhatsApp
 * number. Handles "+91 8790091840", "91 8790091840", and a bare "8790091840"
 * (defaults the code to "91"). The update API expects the code without a "+".
 */
function splitPhone(value: string): { country_code: string; whatsapp_number: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^\+?(\d{1,4})[\s-]+(.*)$/);
  if (match) {
    return { country_code: match[1], whatsapp_number: match[2].replace(/[\s-]/g, "") };
  }
  return { country_code: "91", whatsapp_number: trimmed.replace(/^\+/, "").replace(/[\s-]/g, "") };
}

/** Drops the em-dash placeholder the table uses for a missing value. */
const real = (v: string) => (v === "—" ? "" : v);

/**
 * Edit a sailor's profile.
 *
 * Two endpoints back this one form: the profile fields go to
 * `sailor/<id>/update/`, while `is_active` has its own `sailor/<id>/status/`
 * endpoint and is only called when the toggle actually changed.
 */
export function SailorEditDrawer({ isOpen, onClose, sailor }: SailorEditDrawerProps) {
  const [updateSailor, { isLoading: isUpdating }] = useUpdateSailorMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleSailorStatusMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("91");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Read the real flag, not the display label: a sailor whose lifecycle status
  // is "New" is still active, and comparing `st === "Active"` would show the
  // toggle as blocked and never settle after saving.
  const wasActive = sailor.active;

  // The row carries a combined name + contact, so split them back into the
  // discrete fields the API expects. Re-runs when the drawer opens on a
  // different sailor.
  useEffect(() => {
    if (!isOpen) return;
    const { first_name, last_name } = splitFullName(real(sailor.n));
    const { country_code, whatsapp_number } = splitPhone(real(sailor.w));
    setFirstName(first_name);
    setLastName(last_name);
    setCountryCode(country_code || "91");
    setWhatsapp(whatsapp_number);
    setEmail(real(sailor.e));
    setIsActive(wasActive);
  }, [isOpen, sailor, wasActive]);

  const busy = isUpdating || isToggling;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !whatsapp.trim() || !countryCode.trim()) {
      toast.error(F.REQUIRED);
      return;
    }
    try {
      await updateSailor({
        id: sailor.id,
        // Unlike create-user, update expects the country code without a "+".
        body: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          country_code: countryCode.trim().replace(/^\+/, ""),
          whatsapp_number: whatsapp.trim(),
          email: email.trim(),
        },
      }).unwrap();

      // `is_active` isn't part of the profile update — push it through the
      // dedicated status endpoint, and only when it changed.
      if (isActive !== wasActive) {
        await toggleStatus({ id: sailor.id, body: { is_active: isActive } }).unwrap();
      }

      onClose();
      toast.success(F.EDIT_SUCCESS);
    } catch (error) {
      toast.error(getApiMessage(error) ?? F.SAVE_ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={560}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUser size={22} />
            </div>
            <div>
              <SheetTitle className="text-xl">{F.EDIT_TITLE}</SheetTitle>
              <SheetDescription>{F.EDIT_SUBTITLE}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <FormRow>
              <FormField label={F.FIRST_NAME}>
                <Input
                  placeholder={F.FIRST_NAME_PLACEHOLDER}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </FormField>
              <FormField label={F.LAST_NAME}>
                <Input
                  placeholder={F.LAST_NAME_PLACEHOLDER}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label={F.COUNTRY_CODE}>
                <Input
                  placeholder={F.COUNTRY_CODE_PLACEHOLDER}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                />
              </FormField>
              <FormField label={F.WHATSAPP}>
                <Input
                  placeholder={F.WHATSAPP_PLACEHOLDER}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField label={F.EMAIL}>
                <Input
                  type="email"
                  placeholder={F.EMAIL_PLACEHOLDER}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>
            </FormRow>

            <FormRow columns={1}>
              <FormField label={F.ACCOUNT_STATUS}>
                <div className="flex items-center gap-2 h-[38px]">
                  <Switch id="sailor-active" checked={isActive} onCheckedChange={setIsActive} />
                  <label
                    htmlFor="sailor-active"
                    className="text-[13px] font-semibold text-[var(--t2)]"
                  >
                    {isActive ? F.ACTIVE : F.INACTIVE}
                  </label>
                </div>
              </FormField>
            </FormRow>
          </div>

          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                className="btn btn-ghost btn-cancel"
                onClick={onClose}
                disabled={busy}
              >
                {F.CANCEL}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <IconCheck size={16} />
                {busy ? F.SAVING : F.EDIT_SUBMIT}
              </button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default SailorEditDrawer;
