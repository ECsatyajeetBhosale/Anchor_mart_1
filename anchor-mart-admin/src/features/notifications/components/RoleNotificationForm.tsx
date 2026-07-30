import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { SectionCard } from "@/components/common/SectionCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconSend } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetRecipientCountQuery, useSendRoleNotificationMutation } from "../api/notificationApi";
import {
  NOTIFICATION_ROLES,
  NOTIFICATION_TYPES,
  type NotificationRole,
  type NotificationType,
} from "../types/notification.types";
import { RecipientReachCard } from "./RecipientReachCard";

const M = MESSAGES.NOTIFICATIONS;

const ROLE_OPTIONS = NOTIFICATION_ROLES.map((role) => ({
  value: role,
  label: M.ROLE_LABELS[role] ?? role,
}));

const TYPE_OPTIONS = NOTIFICATION_TYPES.map((type) => ({
  value: type,
  label: M.TYPE_LABELS[type] ?? type,
}));

/**
 * Parses the optional metadata box. Blank is valid and means `{}`; anything
 * that isn't a JSON **object** is rejected, because the backend spreads it into
 * the FCM data payload and an array or scalar would fail there instead.
 */
function parseMetadata(text: string): { value: Record<string, unknown> } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { value: {} };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: M.ROLE_FORM.METADATA_INVALID };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: M.ROLE_FORM.METADATA_INVALID };
  }
}

/**
 * Compose-and-send for a single role.
 *
 * A send is irreversible, so it goes through a confirm step that names the
 * audience and its size — the one number an admin most wants to double-check
 * before pressing the button.
 */
export function RoleNotificationForm() {
  const [role, setRole] = useState<NotificationRole>("customer");
  const [type, setType] = useState<NotificationType>("order_update");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [metadata, setMetadata] = useState("");
  const [errors, setErrors] = useState<{ title?: string; message?: string; metadata?: string }>({});
  const [confirming, setConfirming] = useState(false);

  const [sendRoleNotification, { isLoading: isSending }] = useSendRoleNotificationMutation();
  const { data: recipientCount } = useGetRecipientCountQuery({ role, type });

  const validate = (): Record<string, unknown> | null => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = M.VALIDATION.TITLE_REQUIRED;
    if (!message.trim()) next.message = M.VALIDATION.MESSAGE_REQUIRED;

    const parsed = parseMetadata(metadata);
    if ("error" in parsed) next.metadata = parsed.error;

    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return "value" in parsed ? parsed.value : {};
  };

  const handleReview = () => {
    if (validate()) setConfirming(true);
  };

  const handleSend = async () => {
    const parsedMetadata = validate();
    // Re-validated because the form stays editable while the dialog is open.
    if (!parsedMetadata) {
      setConfirming(false);
      return;
    }
    try {
      const response = await sendRoleNotification({
        role,
        notification_type: type,
        title: title.trim(),
        message: message.trim(),
        metadata: parsedMetadata,
      }).unwrap();
      setConfirming(false);
      toast.success(getApiMessage(response) ?? M.ROLE_FORM.SUCCESS);
      // Clear the body but keep role/type — an admin usually sends several
      // messages to the same audience in a row.
      setTitle("");
      setMessage("");
      setMetadata("");
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.ROLE_FORM.ERROR);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
      <SectionCard icon={<IconSend size={18} />} title={M.ROLE_FORM.TITLE}>
        <p className="fg-hint mb-4">{M.ROLE_FORM.SUBTITLE}</p>

        <FormRow>
          <FormField label={M.ROLE_FORM.ROLE}>
            <DropdownSelect
              value={role}
              options={ROLE_OPTIONS}
              onValueChange={(v) => setRole(v as NotificationRole)}
              width="100%"
            />
          </FormField>
          <FormField label={M.ROLE_FORM.TYPE}>
            <DropdownSelect
              value={type}
              options={TYPE_OPTIONS}
              onValueChange={(v) => setType(v as NotificationType)}
              width="100%"
            />
          </FormField>
        </FormRow>

        <FormField label={M.ROLE_FORM.TITLE_FIELD} error={errors.title}>
          <Input
            placeholder={M.ROLE_FORM.TITLE_PLACEHOLDER}
            value={title}
            error={!!errors.title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField label={M.ROLE_FORM.MESSAGE} error={errors.message}>
          <Textarea
            className="h-28"
            placeholder={M.ROLE_FORM.MESSAGE_PLACEHOLDER}
            value={message}
            error={!!errors.message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </FormField>

        <FormField
          label={M.ROLE_FORM.METADATA}
          hint={M.ROLE_FORM.METADATA_HINT}
          error={errors.metadata}
        >
          <Textarea
            className="h-20 mono text-[12px]"
            placeholder={M.ROLE_FORM.METADATA_PLACEHOLDER}
            value={metadata}
            error={!!errors.metadata}
            onChange={(e) => setMetadata(e.target.value)}
          />
        </FormField>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReview}
            disabled={isSending}
          >
            <IconSend size={16} />
            {isSending ? M.ROLE_FORM.SENDING : M.ROLE_FORM.SUBMIT}
          </button>
        </div>
      </SectionCard>

      <RecipientReachCard type={type} highlightRole={role} />

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleSend}
        isLoading={isSending}
        title={M.ROLE_FORM.CONFIRM_TITLE}
        description={M.ROLE_FORM.CONFIRM_MESSAGE(M.ROLE_LABELS[role] ?? role, recipientCount ?? 0)}
        confirmText={M.ROLE_FORM.SUBMIT}
        loadingText={M.ROLE_FORM.SENDING}
      />
    </div>
  );
}

export default RoleNotificationForm;
