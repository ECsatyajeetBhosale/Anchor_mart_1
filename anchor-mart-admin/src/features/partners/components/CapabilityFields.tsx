import { FormField } from "@/components/common/FormField";
import { Switch } from "@/components/ui/switch";
import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.PARTNERS.CAPABILITY;

interface CapabilityToggleProps {
  label: string;
  help: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

function CapabilityToggle({ label, help, checked, onChange, disabled }: CapabilityToggleProps) {
  // A plain div rather than a <label>: Radix's Switch renders a button, which a
  // label cannot be associated with. The switch carries its own accessible name
  // instead, and the visible text is decorative.
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-xs)] p-3">
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
        className="mt-0.5"
      />
      <div className="min-w-0">
        <span className="block text-[13px] font-bold text-[var(--t1)]">{label}</span>
        <span className="block text-[11.5px] text-[var(--t4)]">{help}</span>
      </div>
    </div>
  );
}

export interface CapabilityFieldsProps {
  canVerify: boolean;
  canDeliver: boolean;
  onChange: (next: { canVerify: boolean; canDeliver: boolean }) => void;
  /** Message from the "at least one" rule, when it is currently violated. */
  error?: string;
  disabled?: boolean;
}

/**
 * The two capability switches, shared by the onboard and edit drawers
 * (Flow 28 · `can_verify` / `can_deliver`).
 *
 * They are **independent booleans, not a role picker**: valid shapes are
 * verify-only, deliver-only, and both — "both" being the default and the common
 * case. Rendered as two switches rather than a three-option select precisely so
 * nobody reads them as mutually exclusive.
 *
 * `false`/`false` is refused by the backend with a 400, and is caught here first
 * by the form schema so the operator learns it without a round trip.
 */
export function CapabilityFields({
  canVerify,
  canDeliver,
  onChange,
  error,
  disabled,
}: CapabilityFieldsProps) {
  return (
    <>
      <div className="sec-label">{M.SECTION}</div>
      <FormField hint={error ? undefined : M.HELP} error={error}>
        <div className="flex flex-col gap-2.5">
          <CapabilityToggle
            label={M.VERIFY}
            help={M.VERIFY_HELP}
            checked={canVerify}
            disabled={disabled}
            onChange={(next) => onChange({ canVerify: next, canDeliver })}
          />
          <CapabilityToggle
            label={M.DELIVER}
            help={M.DELIVER_HELP}
            checked={canDeliver}
            disabled={disabled}
            onChange={(next) => onChange({ canVerify, canDeliver: next })}
          />
          {/* Capability and availability answer different questions and are the
              two most commonly conflated fields on this screen, so the
              distinction is stated rather than left to be inferred. */}
          <p className="text-[11px] text-[var(--t4)]">{M.NOT_AVAILABILITY}</p>
        </div>
      </FormField>
    </>
  );
}

export default CapabilityFields;
