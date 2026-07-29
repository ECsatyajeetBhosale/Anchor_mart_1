import { IconCheck, IconClipboardList } from "@tabler/icons-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
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
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useGetOrderReportsQuery, useMarkReportReviewedMutation } from "../api/verificationApi";
import type { ApiRawReport, VerificationReport } from "../types/verification.types";

const M = MESSAGES.VERIFICATION.ROUNDS;
const DASH = MESSAGES.VERIFICATION.DASH;

export interface VerificationRoundsDrawerProps {
  /** The report row whose order the rounds belong to; null when none selected. */
  report: VerificationReport | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Reads a display value, falling back to an em dash for blank/nullish input. */
function show(value: unknown): string {
  if (value === null || value === undefined) return DASH;
  const s = String(value).trim();
  return s === "" ? DASH : s;
}

/** True when the report has already been marked reviewed. */
function isReviewed(round: ApiRawReport): boolean {
  return Boolean(round.reviewed_at) || round.status_code?.toLowerCase() === "reviewed";
}

/**
 * Right-side drawer listing **every** verification round submitted for one order
 * (Flow 06 API 7) and exposing the per-report "mark reviewed" action (API 8).
 *
 * Note the inverted field semantics of API 7 versus the list endpoint: `status`
 * here is the human label and `status_code` the raw token, and `submitted_at` is
 * a pre-formatted display string — so both are rendered as-is, never parsed.
 */
export function VerificationRoundsDrawer({
  report,
  isOpen,
  onClose,
}: VerificationRoundsDrawerProps) {
  const orderId = report?.orderId ?? "";

  const {
    data: rounds = [],
    isLoading,
    isError,
  } = useGetOrderReportsQuery(orderId, { skip: !isOpen || !orderId });

  const [markReviewed, { isLoading: isSaving }] = useMarkReportReviewedMutation();

  const handleReview = async (reportId: string) => {
    try {
      await markReviewed(reportId).unwrap();
      toast.success(M.REVIEWED_TOAST);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.REVIEW_ERROR);
    }
  };

  if (!report) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={860}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconClipboardList size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {M.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {M.SUBTITLE(report.enquiry)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && <div className="py-10 text-center text-[13px] text-[var(--t4)]">…</div>}

          {isError && (
            <div className="py-10 text-center text-[13px] text-[var(--danger-text)]">
              {M.FETCH_ERROR}
            </div>
          )}

          {!isLoading && !isError && rounds.length === 0 && (
            <EmptyState title={M.EMPTY} icon={<IconClipboardList size={36} />} />
          )}

          {/* Newest round first — index 0 duplicates `latest_report` from API 6. */}
          {rounds.map((round, index) => {
            const reviewed = isReviewed(round);
            const items = round.items ?? [];
            return (
              <div
                key={round.id}
                className="mb-5 rounded-[var(--radius-md)] border border-[var(--border-sm)] overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 bg-[var(--navy-25)] px-4 py-3">
                  <span className="text-[13px] font-extrabold text-[var(--t1)]">
                    {M.ROUND(rounds.length - index)}
                  </span>
                  <Badge variant={reviewed ? "success" : "warning"}>
                    {show(round.status) === DASH
                      ? reviewed
                        ? M.REVIEWED
                        : M.SUBMITTED
                      : round.status}
                  </Badge>
                  <span className="text-[11.5px] text-[var(--t4)]">
                    {M.PARTNER}: {show(round.partner)}
                  </span>
                  <span className="text-[11.5px] text-[var(--t4)]">
                    {M.SUBMITTED}: {show(round.submitted_at)}
                  </span>
                  <div className="ml-auto">
                    {reviewed ? (
                      <span className="text-[11.5px] font-semibold text-[var(--green-text)]">
                        {M.ALREADY_REVIEWED}
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={isSaving}
                        onClick={() => handleReview(round.id)}
                      >
                        <IconCheck size={14} className="mr-1" />
                        {M.MARK_REVIEWED}
                      </Button>
                    )}
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="px-4 py-5 text-[12.5px] text-[var(--t4)]">{M.NO_ITEMS}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12.5px]">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--t4)]">
                          <th className="px-4 py-2 font-bold">{M.COLUMNS.ITEM}</th>
                          <th className="px-4 py-2 font-bold">{M.COLUMNS.REQUESTED}</th>
                          <th className="px-4 py-2 font-bold">{M.COLUMNS.AVAILABLE}</th>
                          <th className="px-4 py-2 font-bold">{M.COLUMNS.SHORTFALL}</th>
                          <th className="px-4 py-2 font-bold">{M.COLUMNS.REMARK}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr
                            key={item.id ?? `${round.id}-${i}`}
                            className="border-t border-[var(--border-xs)]"
                          >
                            <td className="px-4 py-2.5">
                              <div className="font-semibold text-[var(--t1)]">
                                {show(item.product_name)}
                              </div>
                              {item.variant_name ? (
                                <div className="text-[11px] text-[var(--t4)]">
                                  {item.variant_name}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5">{show(item.requested_quantity)}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant={item.is_available ? "success" : "danger"}>
                                {item.is_available ? M.AVAILABLE_YES : M.AVAILABLE_NO}
                              </Badge>
                              <span className="ml-2 text-[var(--t3)]">
                                {show(item.available_quantity)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={
                                  (item.shortfall ?? 0) > 0
                                    ? "font-bold text-[var(--danger-text)]"
                                    : "text-[var(--t4)]"
                                }
                              >
                                {show(item.shortfall)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-[var(--t3)]">{show(item.remark)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <SheetFooter className="p-5 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <p className="text-[11.5px] leading-relaxed text-[var(--t4)]">{M.REVIEW_NOTE}</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default VerificationRoundsDrawer;
