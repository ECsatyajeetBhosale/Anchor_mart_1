import { MESSAGES } from "@/lib/messages";
import { IconLoader2, IconPaperclip, IconSend, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import {
  UPLOAD_FILE_TYPES,
  UPLOAD_IMAGE_TYPES,
  UPLOAD_MAX_BYTES,
  type UploadMessageType,
} from "../types/chat.types";

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
  /**
   * Uploads an attachment (§4.4). Absent on a thread that cannot take one —
   * the button is then hidden rather than shown disabled, since there is
   * nothing the admin could do to enable it.
   */
  onAttach?: (file: File, messageType: UploadMessageType, caption: string) => void;
  /** True while an upload is in flight. */
  isUploading?: boolean;
}

/** Extension of a filename, lowercased, without the dot. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** The `accept` filter for the picker — a convenience, never the authority. */
const ACCEPT = UPLOAD_FILE_TYPES.map((ext) => `.${ext}`).join(",");

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
  onAttach,
  isUploading = false,
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  /**
   * Pre-flights a picked file, then hands it up.
   *
   * The checks here duplicate the server's on purpose: a 413 or a bare 400 tells
   * the admin nothing about *which* rule they broke, and they have already spent
   * the upload waiting to find out. The server remains the authority — it sniffs
   * the real bytes, so a renamed file still fails there and that failure is
   * reported as it comes back.
   */
  const handleFile = (file: File | null) => {
    // Reset first: picking the same file twice in a row fires no change event
    // otherwise, which reads as the button having silently stopped working.
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !onAttach) return;

    if (file.size > UPLOAD_MAX_BYTES) {
      setUploadError(M.COMPOSER.TOO_LARGE);
      return;
    }
    const ext = extensionOf(file.name);
    if (!UPLOAD_FILE_TYPES.includes(ext as (typeof UPLOAD_FILE_TYPES)[number])) {
      setUploadError(M.COMPOSER.BAD_TYPE);
      return;
    }

    setUploadError(null);
    // `image` renders inline, `file` as a download row — decided by what the
    // file actually is, not by which button was pressed.
    const messageType: UploadMessageType = UPLOAD_IMAGE_TYPES.includes(
      ext as (typeof UPLOAD_IMAGE_TYPES)[number],
    )
      ? "image"
      : "file";

    // Whatever is in the box rides along as the caption, so a file sent with a
    // sentence of explanation stays one message instead of two.
    onAttach(file, messageType, text);
    setText("");
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
        {/* §4.4 — upload goes to `/api/chat/`, the one mount outside
            `/superadmin/` and so the one call carrying `server-secret-key`.
            Hidden rather than disabled when the caller cannot take an upload:
            a disabled control invites the admin to work out how to enable it. */}
        {onAttach && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              style={{ height: "40px", width: "40px" }}
              onClick={() => fileRef.current?.click()}
              disabled={disabled || isUploading}
              title={M.COMPOSER.ATTACH}
            >
              {isUploading ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconPaperclip size={15} />
              )}
            </button>
          </>
        )}

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

      {/* The connection marker lives here, and **only** when something is wrong.
          A permanently-green "Connected" badge carried no information and no
          action: it was true almost always, so it taught people to stop looking
          at that corner — and then to miss the one state that mattered. What is
          worth saying is the exception, said where the admin is already looking
          when they act. */}
      <p
        className={`mt-1.5 flex items-center gap-1.5 font-medium text-[10.5px] ${
          uploadError
            ? "text-[var(--danger-text)]"
            : offlineNotice
              ? "text-[var(--amber-700)]"
              : "text-[var(--t4)]"
        }`}
      >
        {!uploadError && offlineNotice && (
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--amber-500)]"
          />
        )}
        {uploadError ?? offlineNotice ?? (isUploading ? M.COMPOSER.UPLOADING : M.COMPOSER.HINT)}
      </p>
    </div>
  );
}

export default ChatComposer;
