import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Input } from "@/components/ui/input";
import { MESSAGES } from "@/lib/messages";
import { IconSettings } from "@tabler/icons-react";

/**
 * Platform Configuration — the operational limits.
 *
 * **Everything here is read-only, and deliberately so.** The cancellation
 * window, payment timeout, description cap and feature toggles have no endpoint
 * in the API: removing them would hide agreed scope, and making them editable
 * would silently discard whatever an admin typed. They are shown as the values
 * the platform actually runs on, disabled, each saying why.
 *
 * The loyalty values used to sit above them and were the one wired thing on this
 * screen. They moved out — not away: **Rewards & Coupons has always had its own
 * Configure Points drawer** writing the same `promotion/loyalty/config/update/`
 * endpoint. Two editors for one record is one too many, and the surviving one is
 * beside the loyalty figures it changes rather than three sections down a
 * settings page.
 */
export function PlatformConfigCard() {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <IconSettings size={18} className="text-[var(--t3)]" />
        <span className="text-[14.5px] font-extrabold text-[var(--t1)]">
          {MESSAGES.SETTINGS.CONFIG.TITLE}
        </span>
      </div>

      <div className="sec-label">{MESSAGES.SETTINGS.CONFIG.SECTIONS.OPERATIONAL}</div>
      <p className="fg-hint mb-3">{MESSAGES.SETTINGS.CONFIG.NO_ENDPOINT_HINT}</p>
      <FormRow>
        <FormField label="Order cancellation window" hint="No API — not saved">
          <Input value="36 hours after ship arrival" disabled readOnly />
        </FormField>
        <FormField label="Payment confirmation timeout" hint="No API — not saved">
          <Input value="48 hours" disabled readOnly />
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="Max special request description" hint="No API — not saved">
          <Input value="500 characters" disabled readOnly />
        </FormField>
        <FormField label="Feature toggles" hint="No API — not saved">
          <Input value="Express · Auto-assign · Maintenance" disabled readOnly />
        </FormField>
      </FormRow>
    </div>
  );
}
