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
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconCheck, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateChatGroupMutation } from "../api/chatApi";

const M = MESSAGES.CHAT;

export interface CreateGroupChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Flow 23 §4.6 — create a group chat.
 *
 * Participants are entered as raw user ids because no admin endpoint lists
 * users across roles; the server validates every id and returns the unknown
 * ones, so a typo is reported rather than silently dropped.
 */
export function CreateGroupChatDrawer({ isOpen, onClose }: CreateGroupChatDrawerProps) {
  const [createGroup, { isLoading }] = useCreateChatGroupMutation();
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState("");

  // Reset on open so a cancelled attempt doesn't prefill the next one.
  // Adjusted during render rather than in an effect, so the drawer's first
  // paint is already clean instead of flashing the previous draft.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setName("");
      setParticipants("");
    }
  }

  // Split on newlines or commas so a pasted list works either way; blanks are
  // dropped rather than sent as empty ids the server would reject.
  const ids = participants
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);

  const canSubmit = name.trim().length > 0 && ids.length > 0 && !isLoading;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await createGroup({ group_name: name.trim(), participants: ids }).unwrap();
      toast.success(M.GROUP.CREATED);
      onClose();
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.GROUP.ERROR);
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
        <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconUsersGroup size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.GROUP.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {M.GROUP.SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <FormField label={M.GROUP.NAME}>
            <Input
              value={name}
              placeholder={M.GROUP.NAME_PLACEHOLDER}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField label={M.GROUP.PARTICIPANTS}>
            <textarea
              rows={6}
              value={participants}
              placeholder={M.GROUP.PARTICIPANTS_PLACEHOLDER}
              onChange={(e) => setParticipants(e.target.value)}
              className="w-full resize-y rounded-[var(--radius-md)] border-[1.5px] border-[var(--border-md)] bg-[var(--surface-input)] px-3 py-2 font-mono text-[12.5px] text-[var(--t1)] outline-none transition-colors placeholder:text-[var(--t4)] focus:border-[var(--teal-500)] focus:shadow-[var(--sh-focus-teal)]"
            />
          </FormField>
          <p className="-mt-2 text-[11px] text-[var(--t4)]">{M.GROUP.PARTICIPANTS_HINT}</p>
        </div>

        <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
          <div className="flex w-full justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submit}
              disabled={!canSubmit}
            >
              <IconCheck size={16} />
              {M.GROUP.SUBMIT}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CreateGroupChatDrawer;
