import { toast } from "sonner";

/**
 * Example component demonstrating toast usage.
 * Uses the toast helpers from @/lib/toast.
 */
export function ToastExample() {
  return (
    <div style={{ display: "flex", gap: "8px", padding: "16px" }}>
      <button type="button" onClick={() => toast.success("Action completed!")}>
        Success
      </button>
      <button type="button" onClick={() => toast.error("Something went wrong")}>
        Error
      </button>
      <button type="button" onClick={() => toast.warning("Please check your input")}>
        Warning
      </button>
      <button type="button" onClick={() => toast.info("New update available")}>
        Info
      </button>
    </div>
  );
}
