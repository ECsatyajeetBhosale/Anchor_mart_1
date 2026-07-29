import { cn } from "@/lib/utils";
import { useRef } from "react";

/** Stable per-slot keys — the boxes are fixed positions, never a reorderable list. */
const OTP_SLOTS = ["digit-1", "digit-2", "digit-3", "digit-4"] as const;
const OTP_LENGTH = OTP_SLOTS.length;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the last digit lands, so the form can auto-submit. */
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  /** id of the element labelling the group (the visible field label). */
  labelledBy?: string;
}

/**
 * Four single-character boxes behaving as one field: auto-advance, backspace to
 * the previous box, arrow-key navigation, and paste of a full 4-digit code into
 * any box. Enter bubbles to the surrounding form for submit-on-enter.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  labelledBy,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (index: number) => {
    inputsRef.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus();
  };

  const commit = (next: string) => {
    onChange(next);
    if (next.length === OTP_LENGTH) onComplete?.(next);
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // Clamp to the first empty box so the code stays left-packed — clicking box 4
    // of an empty field types into box 1 rather than leaving holes.
    const target = Math.min(index, value.length);

    // Typing over a filled box replaces it; a multi-digit value (autofill, or a
    // paste the browser routed through onChange) fills forward from there.
    const chars = value.split("");
    for (let i = 0; i < digits.length && target + i < OTP_LENGTH; i++) {
      chars[target + i] = digits[i];
    }
    commit(chars.join(""));
    focusBox(target + digits.length);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      // Delete this box's digit, or step back and delete the previous one when
      // this box is already empty. Remaining digits close the gap.
      const doomed = value[index] ? index : index - 1;
      if (doomed < 0) return;
      const chars = value.split("");
      chars.splice(doomed, 1);
      commit(chars.join(""));
      focusBox(doomed);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    commit(digits);
    focusBox(digits.length);
  };

  return (
    <fieldset className="m-0 flex min-w-0 gap-3 border-0 p-0" aria-labelledby={labelledBy}>
      {OTP_SLOTS.map((slot, index) => (
        <input
          key={slot}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[index] ?? ""}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          aria-invalid={error}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-full rounded-[var(--radius-md)] border-[1.5px] bg-[var(--surface-input)]",
            "text-center font-mono text-[22px] font-extrabold tabular-nums text-[var(--t1)]",
            "transition-all outline-none",
            "focus:border-[var(--teal-500)] focus:shadow-[var(--sh-focus-teal)]",
            "disabled:cursor-not-allowed disabled:opacity-55",
            error
              ? "border-[var(--danger-icon)] bg-[var(--danger-bg)] shadow-[var(--sh-focus-red)]"
              : "border-[var(--border-md)]",
          )}
        />
      ))}
    </fieldset>
  );
}
