import { useState } from "react";
import { toast } from "sonner";

import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import {
  useAllowSpecialRequestChangesMutation,
  useGenerateBillMutation,
  useRejectSpecialRequestMutation,
} from "../api/specialRequestApi";
import { canAdminReject, canAllowChanges, canGenerateBill } from "../lib/specialRequestStatus";
import type { GenerateBillPayload, SpecialRequestDetail } from "../types/specialRequest.types";

const M = MESSAGES.SPECIAL_REQUESTS;

/** Which of the three Flow 13 write popups is open, if any. */
export type SpecialRequestDialog = "bill" | "reject" | "changes";

/**
 * The three Flow 13 admin write actions plus the popup state they share.
 *
 * Lives in a hook rather than the page because the popups can't be open at the
 * same time as the drawer: they are custom `Dialog`s, which render behind the
 * `Sheet` overlay, so opening one closes the drawer first and the request has
 * to be carried over as a snapshot (`target`).
 *
 * @param closeDrawer called before a popup opens, for the reason above.
 */
export function useSpecialRequestActions(closeDrawer: () => void) {
  const [generateBill, { isLoading: isQuoting }] = useGenerateBillMutation();
  const [rejectRequest, { isLoading: isRejecting }] = useRejectSpecialRequestMutation();
  const [allowChanges, { isLoading: isAllowing }] = useAllowSpecialRequestChangesMutation();

  const [target, setTarget] = useState<SpecialRequestDetail | null>(null);
  const [openDialog, setOpenDialog] = useState<SpecialRequestDialog | null>(null);

  const open = (dialog: SpecialRequestDialog) => (detail: SpecialRequestDetail) => {
    setTarget(detail);
    closeDrawer();
    setOpenDialog(dialog);
  };
  const close = () => setOpenDialog(null);

  const targetRef = target?.reference ?? target?.id ?? "";

  /**
   * Last line of defence before a write. `target` is the snapshot taken when
   * the drawer closed, so the request can have moved on since — another admin
   * quoting it, or the sailor paying or rejecting. Re-checking the gate here
   * turns that race into a clear message instead of a raw backend 400, and
   * keeps the invariant if a future button ever ships without its own gate.
   */
  const guard = (allowed: (status?: string | null) => boolean): boolean => {
    if (!target) return false;
    if (allowed(target.status)) return true;
    toast.error(M.TOAST.STALE_STATE(target.status_display || target.status || "unknown"));
    close();
    return false;
  };

  /** Flow 13 API 10 — send the quote; the request moves to `quote_sent`. */
  const submitBill = async (body: GenerateBillPayload) => {
    if (!target || !guard(canGenerateBill)) return;
    try {
      await generateBill({ id: target.id, body }).unwrap();
      close();
      toast.success(M.TOAST.QUOTED(targetRef));
    } catch (err) {
      // Keep the popup open so the entered quote isn't lost.
      toast.error(getApiMessage(err) ?? M.TOAST.QUOTE_FAILED);
    }
  };

  /** Flow 13 API 11 — reject before quoting, with the required reason. */
  const submitReject = async (reason: string) => {
    if (!target || !guard(canAdminReject)) return;
    try {
      await rejectRequest({ id: target.id, body: { admin_response: reason } }).unwrap();
      close();
      toast.success(M.TOAST.REJECTED(targetRef));
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.REJECT_FAILED);
    }
  };

  /** Flow 13 API 12 — raise the rebill cap by `additional` (1–10). */
  const submitAllowChanges = async (additional: number) => {
    if (!target || !guard(canAllowChanges)) return;
    try {
      await allowChanges({ id: target.id, body: { additional } }).unwrap();
      close();
      toast.success(M.TOAST.CHANGES_ALLOWED((target.rebill_cap ?? 0) + additional));
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.CHANGES_FAILED);
    }
  };

  return {
    /** The request the open popup is acting on (a snapshot — see above). */
    target,
    targetRef,
    openDialog,
    /** `open("bill")` returns the handler the drawer's action prop expects. */
    open,
    close,
    submitBill,
    submitReject,
    submitAllowChanges,
    isQuoting,
    isRejecting,
    isAllowing,
  };
}
