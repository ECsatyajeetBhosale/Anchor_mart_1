import { IconCheck, IconTrash, IconUserOff, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  useGetAccountDeletionRequestQuery,
  useSetAccountDeletionStatusMutation,
} from "../api/accountDeletionApi";
import type { AccountDeletionRequest } from "../types/accountDeletion.types";

const A = MESSAGES.ACCOUNT_MANAGEMENT;
const M = A.DELETIONS;

export interface AccountDeletionDetailDrawerProps {
  /** The selected queue row; null when none is selected. */
  request: AccountDeletionRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Renders a count, or an em dash while the detail read is still in flight. */
function countLabel(value: number | null | undefined, loading: boolean): string {
  if (loading) return M.DASH;
  return (value ?? 0).toLocaleString("en-US");
}

/**
 * Review drawer for one account-deletion request (Flow 31 §10–11).
 *
 * The three decisions are offered strictly by state, never disabled-but-present:
 * `pending` gets approve/reject, `approved` gets the erasure, and a terminal
 * request gets a sentence instead of buttons. The API 409s on every other
 * transition, so showing a button that cannot work would only be a promise the
 * server refuses to keep.
 */
export function AccountDeletionDetailDrawer({
  request,
  isOpen,
  onClose,
}: AccountDeletionDetailDrawerProps) {
  const [note, setNote] = useState("");
  // Both decisions share one mutation hook, so `isLoading` alone can't say which
  // button should spin.
  const [pending, setPending] = useState<"approve" | "reject" | "complete" | null>(null);
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  const [setStatus, { isLoading: isSaving }] = useSetAccountDeletionStatusMutation();

  // §10 — detail carries the account footprint the list row doesn't have.
  const { data: detail, isFetching: detailLoading } = useGetAccountDeletionRequestQuery(
    request?.id ?? "",
    { skip: !isOpen || !request?.id },
  );

  // Reset the decision field whenever a different request is opened.
  useEffect(() => {
    if (isOpen) {
      setNote("");
      setPending(null);
      setConfirmingComplete(false);
    }
  }, [isOpen]);

  if (!request) return null;

  const status = request.status.toLowerCase();
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isCompleted = status === "completed";
  const hasDecision = !isPending;

  const openOrders = detail?.open_order_count ?? 0;
  // The API refuses completion while any order is still live (409). Blocking it
  // here turns a server conflict into an explained, visible precondition.
  const blockedByOpenOrders = openOrders > 0;

  const submit = async (
    decision: "approve" | "reject" | "complete",
    adminNote: string | undefined,
    success: string,
    failure: string,
  ) => {
    setPending(decision);
    try {
      await setStatus({ requestId: request.id, decision, adminNote }).unwrap();
      setConfirmingComplete(false);
      onClose();
      toast.success(success);
    } catch (error) {
      // A 409 body names the reason (already answered, wrong state, or live
      // orders) — surface it verbatim rather than a generic failure line.
      toast.error(getApiMessage(error, { labelFields: false }) ?? failure);
    } finally {
      setPending(null);
    }
  };

  const handleApprove = () =>
    submit("approve", note.trim() || undefined, M.TOAST.APPROVED, M.TOAST.APPROVE_ERROR);

  const handleReject = () => {
    // The API 400s on a rejection with a blank note — catch it here so the admin
    // gets a field-level nudge instead of a server error toast.
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error(M.DETAIL.NOTE_REQUIRED);
      return;
    }
    return submit("reject", trimmed, M.TOAST.REJECTED, M.TOAST.REJECT_ERROR);
  };

  const handleComplete = () =>
    submit("complete", note.trim() || undefined, M.TOAST.COMPLETED, M.TOAST.COMPLETE_ERROR);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={760}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUserOff size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.DETAIL.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {request.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Requester */}
          <div className="sec-label">{M.DETAIL.REQUESTER}</div>
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="av av-img">
                <img src={getFallbackAvatar(request.name)} alt={request.name} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{request.name}</div>
                <div className="text-[11px] text-[var(--t4)]">{request.email}</div>
              </div>
              <Badge variant={request.statusVariant}>{request.statusLabel}</Badge>
            </div>
            <FormRow className="!mb-0" columns={3}>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{request.roleLabel}</div>
                <div className="mini-stat-lbl">{M.COLUMNS.ROLE}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">
                  {request.isActive === null ? (
                    M.DETAIL.FALLBACK
                  ) : (
                    <Badge variant={request.isActive ? "success" : "neutral"}>
                      {request.isActive ? M.DETAIL.ACTIVE : M.DETAIL.INACTIVE}
                    </Badge>
                  )}
                </div>
                <div className="mini-stat-lbl">{M.DETAIL.ACCOUNT_STATE}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{request.createdAt}</div>
                <div className="mini-stat-lbl">{M.DETAIL.REQUESTED_ON}</div>
              </div>
            </FormRow>
          </div>

          <FormField label={M.DETAIL.REASON}>
            <div className="ecard leading-relaxed">{request.reason}</div>
          </FormField>

          {/* Account footprint — the three figures the decision hangs on. */}
          <div className="sec-label mt-4">{M.DETAIL.FOOTPRINT}</div>
          <FormRow columns={3}>
            <div className="mini-stat">
              <div
                className={`mini-stat-val ${blockedByOpenOrders ? "!text-[var(--danger-text)]" : ""}`}
              >
                {countLabel(detail?.open_order_count, detailLoading)}
              </div>
              <div className="mini-stat-lbl">{M.DETAIL.OPEN_ORDERS}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-val">
                {countLabel(detail?.total_order_count, detailLoading)}
              </div>
              <div className="mini-stat-lbl">{M.DETAIL.TOTAL_ORDERS}</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-val">
                {countLabel(detail?.outstanding_points, detailLoading)}
              </div>
              <div className="mini-stat-lbl">{M.DETAIL.POINTS}</div>
            </div>
          </FormRow>
          <p className="fg-hint mb-4">{M.DETAIL.FOOTPRINT_HINT}</p>

          {/* Recorded decision — only once someone has answered. */}
          {hasDecision && (
            <>
              <div className="sec-label mt-4">{M.DETAIL.RECORDED}</div>
              <FormRow>
                <FormField label={M.DETAIL.REVIEWED_BY}>
                  <div className="ecard">{request.reviewedBy}</div>
                </FormField>
                <FormField label={M.DETAIL.REVIEWED_AT}>
                  <div className="ecard">{request.reviewedAt}</div>
                </FormField>
              </FormRow>
              {isCompleted && (
                <FormField label={M.DETAIL.PROCESSED_AT}>
                  <div className="ecard">{request.processedAt}</div>
                </FormField>
              )}
              <FormField label={M.DETAIL.ADMIN_NOTE}>
                <div className="ecard leading-relaxed">{request.adminNote}</div>
              </FormField>
            </>
          )}

          {/* Decision input — offered while the request can still move. */}
          {!isRejected && !isCompleted && (
            <>
              <div className="sec-label mt-4">{M.DETAIL.DECISION}</div>
              {isApproved && <p className="fg-hint mb-3">{M.DETAIL.APPROVED_HINT}</p>}
              <FormField label={M.DETAIL.ADMIN_NOTE} hint={M.DETAIL.NOTE_HINT}>
                <Textarea
                  className="h-20 min-h-0 py-[10px]"
                  placeholder={M.DETAIL.NOTE_PLACEHOLDER}
                  value={note}
                  maxLength={2000}
                  onChange={(e) => setNote(e.target.value)}
                />
              </FormField>
            </>
          )}

          {isRejected && <p className="fg-hint mt-4">{M.DETAIL.TERMINAL_REJECTED}</p>}
          {isCompleted && <p className="fg-hint mt-4">{M.DETAIL.TERMINAL_COMPLETED}</p>}
        </div>

        {/* Terminal requests get no footer at all — nothing left to do. */}
        {!isRejected && !isCompleted && (
          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex w-full items-center justify-end gap-3">
              {blockedByOpenOrders && isApproved && (
                <span className="mr-auto text-[11.5px] font-semibold text-[var(--danger-text)]">
                  {M.DETAIL.BLOCKED_BY_ORDERS(openOrders)}
                </span>
              )}
              {isPending && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={pending === "reject"}
                    disabled={isSaving}
                    onClick={handleReject}
                  >
                    <IconX size={15} className="mr-1" />
                    {M.DETAIL.REJECT}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={pending === "approve"}
                    disabled={isSaving}
                    onClick={handleApprove}
                  >
                    <IconCheck size={15} className="mr-1" />
                    {M.DETAIL.APPROVE}
                  </Button>
                </>
              )}
              {isApproved && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={pending === "complete"}
                  disabled={isSaving || blockedByOpenOrders}
                  onClick={() => setConfirmingComplete(true)}
                >
                  <IconTrash size={15} className="mr-1" />
                  {M.DETAIL.COMPLETE}
                </Button>
              )}
            </div>
          </SheetFooter>
        )}
      </SheetContent>

      {/* Erasure is the only irreversible step in the flow, so it alone confirms. */}
      <ConfirmDialog
        isOpen={confirmingComplete}
        onClose={() => setConfirmingComplete(false)}
        onConfirm={handleComplete}
        isLoading={pending === "complete"}
        title={M.CONFIRM.COMPLETE_TITLE}
        description={M.CONFIRM.COMPLETE_MESSAGE}
        confirmText={M.CONFIRM.COMPLETE_CTA}
        loadingText={M.CONFIRM.COMPLETING}
      />
    </Sheet>
  );
}

export default AccountDeletionDetailDrawer;
