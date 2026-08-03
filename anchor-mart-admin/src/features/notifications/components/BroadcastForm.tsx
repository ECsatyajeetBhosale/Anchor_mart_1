import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { SectionCard } from "@/components/common/SectionCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconBroadcast } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSendBroadcastMutation } from "../api/notificationApi";
import {
  BROADCAST_CATEGORIES,
  BROADCAST_CHANNELS,
  type BroadcastAudience,
  type BroadcastCategory,
  type BroadcastChannel,
  NOTIFICATION_ROLES,
} from "../types/notification.types";

const M = MESSAGES.NOTIFICATIONS;
const B = M.BROADCAST_FORM;

const AUDIENCE_OPTIONS = [
  { value: "all", label: B.AUDIENCE_ALL },
  ...NOTIFICATION_ROLES.map((role) => ({ value: role, label: M.ROLE_LABELS[role] ?? role })),
];

const CATEGORY_LABEL: Record<BroadcastCategory, string> = {
  promotional: B.CATEGORY_PROMOTIONAL,
  service: B.CATEGORY_SERVICE,
};

const CATEGORY_OPTIONS = BROADCAST_CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABEL[c],
}));

const CHANNEL_LABEL: Record<BroadcastChannel, string> = {
  inapp: B.CHANNEL_INAPP,
  email: B.CHANNEL_EMAIL,
};

/**
 * Platform broadcast — one durable announcement, optionally fanned out by email.
 *
 * Three fields here are not cosmetic and were previously missing, which is why
 * they get their own controls rather than server defaults:
 *
 * - **`category` is required** and is the consent boundary. `promotional`
 *   honours every opt-out; `service` overrides it. The hint under the dropdown
 *   changes with the choice, and picking `service` adds a warning to the
 *   confirm step.
 * - **`channels`** must be non-empty, so an empty selection is blocked here
 *   rather than bounced back as a 400.
 * - **`audience`** defaults to `customer` server-side — sending it explicitly
 *   means the screen never disagrees with what actually went out.
 */
export function BroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("all");
  const [category, setCategory] = useState<BroadcastCategory>("promotional");
  const [channels, setChannels] = useState<BroadcastChannel[]>(["inapp"]);
  const [imagePath, setImagePath] = useState("");
  const [errors, setErrors] = useState<{ title?: string; message?: string; channels?: string }>({});
  const [confirming, setConfirming] = useState(false);

  const [sendBroadcast, { isLoading: isSending }] = useSendBroadcastMutation();

  const toggleChannel = (channel: BroadcastChannel) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
    if (errors.channels) setErrors((prev) => ({ ...prev, channels: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = M.VALIDATION.TITLE_REQUIRED;
    if (!message.trim()) next.message = M.VALIDATION.MESSAGE_REQUIRED;
    if (channels.length === 0) next.channels = B.CHANNELS_REQUIRED;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSend = async () => {
    // Re-validated because the form stays editable while the dialog is open.
    if (!validate()) {
      setConfirming(false);
      return;
    }
    try {
      const outcome = await sendBroadcast({
        title: title.trim(),
        message: message.trim(),
        category,
        channels,
        audience,
        // Omitted rather than sent blank — the field is optional and a
        // whitespace value is normalised to null server-side anyway.
        ...(imagePath.trim() ? { image_path: imagePath.trim() } : {}),
      }).unwrap();
      setConfirming(false);

      // A suppressed duplicate is a 200, so it lands here rather than in the
      // catch. It is not a failure and not a success — say plainly that nothing
      // was sent, and keep the form filled so it can be retried or edited.
      if (!outcome.sent) {
        toast.warning(outcome.message || B.SUCCESS, {
          description: outcome.retryAfterSeconds
            ? M.SUPPRESSED.RETRY(outcome.retryAfterSeconds)
            : undefined,
        });
        return;
      }

      toast.success(outcome.message || B.SUCCESS, {
        description:
          outcome.estimatedEmailRecipients !== null
            ? B.EMAIL_ESTIMATE(outcome.estimatedEmailRecipients)
            : undefined,
      });
      setTitle("");
      setMessage("");
      setImagePath("");
    } catch (error) {
      toast.error(getApiMessage(error) ?? B.ERROR);
    }
  };

  const audienceLabel = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label ?? audience;
  const channelsLabel = channels.map((c) => CHANNEL_LABEL[c]).join(" + ");
  const isService = category === "service";

  return (
    <div className="max-w-[760px]">
      <SectionCard icon={<IconBroadcast size={18} />} title={B.TITLE}>
        <p className="fg-hint mb-4">{B.SUBTITLE}</p>

        <FormRow>
          <FormField label={B.AUDIENCE}>
            <DropdownSelect
              value={audience}
              options={AUDIENCE_OPTIONS}
              onValueChange={(v) => setAudience(v as BroadcastAudience)}
              width="100%"
            />
          </FormField>
          <FormField
            label={B.CATEGORY}
            hint={isService ? B.CATEGORY_HINT_SERVICE : B.CATEGORY_HINT_PROMOTIONAL}
          >
            <DropdownSelect
              value={category}
              options={CATEGORY_OPTIONS}
              onValueChange={(v) => setCategory(v as BroadcastCategory)}
              width="100%"
            />
          </FormField>
        </FormRow>

        <FormField label={B.CHANNELS} hint={B.CHANNELS_HINT} error={errors.channels}>
          <div className="flex gap-2 pt-1">
            {BROADCAST_CHANNELS.map((channel) => {
              const active = channels.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => toggleChannel(channel)}
                  className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                  aria-pressed={active}
                >
                  {CHANNEL_LABEL[channel]}
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label={B.TITLE_FIELD} error={errors.title}>
          <Input
            placeholder={B.TITLE_PLACEHOLDER}
            value={title}
            error={!!errors.title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField label={B.MESSAGE} error={errors.message}>
          <Textarea
            className="h-28"
            placeholder={B.MESSAGE_PLACEHOLDER}
            value={message}
            error={!!errors.message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </FormField>

        <FormField label={B.IMAGE} hint={B.IMAGE_HINT}>
          <Input
            className="mono text-[12px]"
            placeholder={B.IMAGE_PLACEHOLDER}
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
          />
        </FormField>

        {/* Service overrides consent — flag it on the form, not only at confirm. */}
        {isService && (
          <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3">
            <IconAlertTriangle size={17} className="mt-px shrink-0 text-[var(--warning-icon)]" />
            <p className="text-[12px] font-semibold leading-relaxed text-[var(--warning-text)]">
              {B.CONFIRM_SERVICE_WARNING}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => validate() && setConfirming(true)}
            disabled={isSending}
          >
            <IconBroadcast size={16} />
            {isSending ? B.SENDING : B.SUBMIT}
          </button>
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleSend}
        isLoading={isSending}
        title={B.CONFIRM_TITLE}
        description={`${B.CONFIRM_MESSAGE(audienceLabel, channelsLabel, CATEGORY_LABEL[category])}${
          isService ? ` ${B.CONFIRM_SERVICE_WARNING}` : ""
        }`}
        confirmText={B.SUBMIT}
        loadingText={B.SENDING}
      />
    </div>
  );
}

export default BroadcastForm;
