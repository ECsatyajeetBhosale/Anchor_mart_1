import { MESSAGES } from "@/lib/messages";
import { IconPaperclip, IconSend, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

const M = MESSAGES.CHAT;

export interface ChatComposerProps {
  disabled: boolean;
  /** Shown in place of the hint when the socket is not open. */
  offlineNotice: string | null;
  /** Non-null while editing an existing message. */
  editing: { id: string; content: string } | null;
  onCancelEdit: () => void;
  onSend: (text: string) => void;
  onSubmitEdit: (id: string, text: string) => void;
  onTyping: () => void;
  onStoppedTyping: () => void;
}

/** Idle gap after the last keystroke before we declare the admin stopped typing. */
const STOP_TYPING_DELAY_MS = 2_500;

/**
 * The reply box. Doubles as the edit surface — an inline second input would put
 * two carets on screen and make "which one am I typing in?" a real question.
 */
export function ChatComposer({
  disabled,
  offlineNotice,
  editing,
  onCancelEdit,
  onSend,
  onSubmitEdit,
  onTyping,
  onStoppedTyping,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entering edit mode loads the message and focuses; leaving clears the draft
  // so the next reply doesn't start with the edited text still in the box.
  useEffect(() => {
    setText(editing?.content ?? "");
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // A pending "stopped typing" must not fire after unmount, which would send on
  // a thread the admin has already navigated away from.
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  const scheduleStoppedTyping = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      stopTimerRef.current = null;
      onStoppedTyping();
    }, STOP_TYPING_DELAY_MS);
  };

  const handleChange = (value: string) => {
    setText(value);
    if (disabled || editing) return;
    // Editing is not "typing" to the room — the message already exists, and
    // announcing it would show an indicator for a reply nobody is waiting on.
    if (value.trim()) {
      onTyping();
      scheduleStoppedTyping();
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    if (editing) {
      onSubmitEdit(editing.id, trimmed);
      onCancelEdit();
    } else {
      onSend(trimmed);
      onStoppedTyping();
    }
    setText("");
  };

  return (
    <div
      className="border-t border-[var(--border-xs)] bg-[var(--surface)]"
      style={{ padding: "13px" }}
    >
      {editing && (
        <div className="mb-2 flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--amber-50)] px-2.5 py-1.5">
          <span className="text-[11.5px] font-bold text-[var(--amber-700)]">
            {M.COMPOSER.EDITING}
          </span>
          <button
            type="button"
            className="text-[11.5px] font-bold text-[var(--amber-700)] hover:underline"
            onClick={onCancelEdit}
          >
            <IconX size={13} className="inline" /> {M.COMPOSER.CANCEL_EDIT}
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attach sits where AnchorMart-1 puts it, but permanently disabled:
            upload lives under `/api/chat/`, which needs a `server-secret-key`
            header this panel has no access to. A button that toasted "sent"
            without uploading anything would be worse than one that is visibly
            unavailable. */}
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-icon"
          style={{ height: "40px", width: "40px" }}
          disabled
          title={M.COMPOSER.NO_ATTACH}
        >
          <IconPaperclip size={15} />
        </button>

        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          disabled={disabled}
          placeholder={M.COMPOSER.PLACEHOLDER}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            // Shift+Enter keeps the newline; plain Enter sends, which is what
            // every chat client trains people to expect.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[120px] flex-1 resize-y rounded-[var(--radius-md)] border-[1.5px] border-[var(--border-md)] bg-[var(--surface-input)] px-3 py-[9px] text-[13.5px] font-medium text-[var(--t1)] outline-none transition-colors placeholder:text-[var(--t4)] focus:border-[var(--teal-500)] focus:shadow-[var(--sh-focus-teal)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ minHeight: "40px" }}
        />

        <button
          type="button"
          className="btn btn-primary btn-icon"
          style={{ height: "40px", width: "40px" }}
          onClick={submit}
          disabled={disabled || !text.trim()}
          title={M.COMPOSER.SEND}
        >
          <IconSend size={16} />
        </button>
      </div>

      <p className="mt-1.5 text-[10.5px] font-medium text-[var(--t4)]">
        {offlineNotice ?? M.COMPOSER.HINT}
      </p>
    </div>
  );
}

export default ChatComposer;
