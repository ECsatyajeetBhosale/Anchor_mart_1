import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { SectionCard } from "@/components/common/SectionCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconBroadcast } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSendBroadcastMutation } from "../api/notificationApi";

const M = MESSAGES.NOTIFICATIONS;

/**
 * Platform-wide broadcast — every user, no role filter.
 *
 * Deliberately its own surface rather than a "role: everyone" option: this one
 * cannot be scoped, so it gets its own confirm copy that says so plainly.
 */
export function BroadcastForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});
  const [confirming, setConfirming] = useState(false);

  const [sendBroadcast, { isLoading: isSending }] = useSendBroadcastMutation();

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = M.VALIDATION.TITLE_REQUIRED;
    if (!message.trim()) next.message = M.VALIDATION.MESSAGE_REQUIRED;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) {
      setConfirming(false);
      return;
    }
    try {
      const response = await sendBroadcast({
        title: title.trim(),
        message: message.trim(),
        // Always sent, blank when unused — the field is required in the body.
        image_path: imagePath.trim(),
      }).unwrap();
      setConfirming(false);
      toast.success(getApiMessage(response) ?? M.BROADCAST_FORM.SUCCESS);
      setTitle("");
      setMessage("");
      setImagePath("");
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.BROADCAST_FORM.ERROR);
    }
  };

  return (
    <div className="max-w-[760px]">
      <SectionCard icon={<IconBroadcast size={18} />} title={M.BROADCAST_FORM.TITLE}>
        <p className="fg-hint mb-4">{M.BROADCAST_FORM.SUBTITLE}</p>

        <FormField label={M.BROADCAST_FORM.TITLE_FIELD} error={errors.title}>
          <Input
            placeholder={M.BROADCAST_FORM.TITLE_PLACEHOLDER}
            value={title}
            error={!!errors.title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField label={M.BROADCAST_FORM.MESSAGE} error={errors.message}>
          <Textarea
            className="h-28"
            placeholder={M.BROADCAST_FORM.MESSAGE_PLACEHOLDER}
            value={message}
            error={!!errors.message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </FormField>

        <FormField label={M.BROADCAST_FORM.IMAGE} hint={M.BROADCAST_FORM.IMAGE_HINT}>
          <Input
            className="mono text-[12px]"
            placeholder={M.BROADCAST_FORM.IMAGE_PLACEHOLDER}
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
          />
        </FormField>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => validate() && setConfirming(true)}
            disabled={isSending}
          >
            <IconBroadcast size={16} />
            {isSending ? M.BROADCAST_FORM.SENDING : M.BROADCAST_FORM.SUBMIT}
          </button>
        </div>
      </SectionCard>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleSend}
        isLoading={isSending}
        title={M.BROADCAST_FORM.CONFIRM_TITLE}
        description={M.BROADCAST_FORM.CONFIRM_MESSAGE}
        confirmText={M.BROADCAST_FORM.SUBMIT}
        loadingText={M.BROADCAST_FORM.SENDING}
      />
    </div>
  );
}

export default BroadcastForm;
