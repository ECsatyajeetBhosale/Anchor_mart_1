import { avatarColumn, badgeColumn, idColumn, textColumn } from "@/components/common/tableColumns";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import type React from "react";
import type { VerificationReport } from "../types/verification.types";

const M = MESSAGES.VERIFICATION.TABLE;
const DASH = MESSAGES.VERIFICATION.DASH;

/** Whether a report still needs action (has confirmed-unavailable items). */
export function needsAction(row: VerificationReport): boolean {
  return (row.unavailable ?? 0) > 0;
}

/** Map a report status onto a badge colour (action-aware for "Submitted"). */
function statusVariant(row: VerificationReport): BadgeProps["variant"] {
  const status = row.status.toLowerCase();
  if (status === "in progress") return "info";
  if (status === "resolved") return "success";
  return needsAction(row) ? "warning" : "success";
}

export interface UseVerificationColumnsOptions {
  onSuggest: (e: React.MouseEvent, row: VerificationReport) => void;
}

export function useVerificationColumns({
  onSuggest,
}: UseVerificationColumnsOptions): Column<VerificationReport>[] {
  return [
    idColumn({ id: "enquiry", header: M.COLUMNS.ENQ, get: (r) => r.enquiry }),
    avatarColumn({
      id: "partner",
      header: M.COLUMNS.PARTNER,
      variant: "teal",
      name: (r) => r.partner.split(" ")[0],
      initial: (r) => r.partner.charAt(0),
    }),
    textColumn({
      id: "total",
      header: M.COLUMNS.TOTAL,
      get: (r) => r.totalItems,
      className: "td-p w-[90px]",
    }),
    textColumn({
      id: "available",
      header: M.COLUMNS.AVAILABLE,
      get: (r) => r.available ?? DASH,
      className: "w-[80px]",
      cellClassName: (r) =>
        r.available !== null ? "td-p text-[var(--green-text)]" : "td-p text-[var(--t4)]",
    }),
    textColumn({
      id: "unavailable",
      header: M.COLUMNS.UNAVAILABLE,
      get: (r) => r.unavailable ?? DASH,
      className: "w-[80px]",
      cellClassName: (r) =>
        needsAction(r) ? "td-p text-[var(--danger-text)]" : "td-p text-[var(--t4)]",
    }),
    badgeColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.status,
      variant: statusVariant,
    }),
    {
      id: "action",
      header: M.COLUMNS.ACTION,
      cell: (row) =>
        needsAction(row) ? (
          <Button variant="primary" size="xs" onClick={(e) => onSuggest(e, row)}>
            {M.SUGGEST}
          </Button>
        ) : (
          <span className="text-[12px] font-semibold text-[var(--t4)]">{M.NO_ACTION}</span>
        ),
    },
  ];
}
