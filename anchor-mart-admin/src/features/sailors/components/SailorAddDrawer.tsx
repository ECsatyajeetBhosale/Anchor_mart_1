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
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCreateSailorMutation } from "../api/sailorApi";

const F = MESSAGES.SAILORS.FORM;

export interface SailorAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Create a sailor via the shared `admin/create-user/` endpoint.
 *
 * Deliberately has **no account-status control**: create-user takes no
 * `is_active`, so a toggle here would be a field the API silently ignores.
 * Blocking happens after the fact, from the edit drawer.
 */
export function SailorAddDrawer({ isOpen, onClose }: SailorAddDrawerProps) {
  const [createSailor, { isLoading: isCreating }] = useCreateSailorMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("91");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  // Blank the form each time the drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    setFirstName("");
    setLastName("");
    setCountryCode("91");
    setWhatsapp("");
    setEmail("");
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // create-user requires email, role, first_name, country_code and
    // whatsapp_number; only last_name is optional. Checked here so a missing
    // field prompts rather than returning a 400.
    if (!firstName.trim() || !email.trim() || !whatsapp.trim() || !countryCode.trim()) {
      toast.error(F.REQUIRED);
      return;
    }
    const code = countryCode.trim();
    try {
      const response = await createSailor({
        email: email.trim(),
        // A sailor is created as a `customer` — there is no "sailor" role.
        role: "customer",
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        // create-user's contract shows the code prefixed with "+".
        country_code: code.startsWith("+") ? code : `+${code}`,
        whatsapp_number: whatsapp.trim(),
      }).unwrap();
      onClose();
      toast.success(getApiMessage(response) ?? F.ADD_SUCCESS);
    } catch (error) {
      // Keep the drawer open so the entered data survives, then explain why.
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
              <SheetTitle className="text-xl">{F.ADD_TITLE}</SheetTitle>
              <SheetDescription>{F.ADD_SUBTITLE}</SheetDescription>
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
          </div>

          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                className="btn btn-ghost btn-cancel"
                onClick={onClose}
                disabled={isCreating}
              >
                {F.CANCEL}
              </button>
              <button type="submit" className="btn btn-primary" disabled={isCreating}>
                <IconCheck size={16} />
                {isCreating ? F.ADDING : F.ADD_SUBMIT}
              </button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default SailorAddDrawer;
