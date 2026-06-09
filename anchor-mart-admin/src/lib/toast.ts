import { toast } from "sonner";

/**
 * Toast helper functions for consistent notifications.
 * Use these instead of calling toast() directly for standardized messages.
 */

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(message: string) {
  toast.error(message);
}

export function showWarning(message: string) {
  toast.warning(message);
}

export function showInfo(message: string) {
  toast.info(message);
}

/**
 * Show an API error toast with optional fallback message.
 */
export function showApiError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message =
    error && typeof error === "object" && "data" in error
      ? ((error as { data?: { detail?: string } }).data?.detail ?? fallback)
      : fallback;
  toast.error(message);
}
