import { TableActions } from "@/components/common/TableActions";
import { avatarColumn, idColumn, statusColumn, textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { IconTransfer } from "@tabler/icons-react";
import type React from "react";
import { jobKindForStatus } from "../lib/assignmentStatus";
import type { Assignment } from "../types/assignment.types";

const M = MESSAGES.ASSIGNMENTS.ACTIVE;

/** Renders the assignment's job kind, or a dash when the status cannot say. */
function JobKindCell({ assignmentStatus }: { assignmentStatus: string }) {
  const kind = jobKindForStatus(assignmentStatus);
  if (kind === "verify") return <Badge variant="teal">{M.JOB_KIND.VERIFY}</Badge>;
  if (kind === "deliver") return <Badge variant="navy">{M.JOB_KIND.DELIVER}</Badge>;
  return <span className="td-m">{M.JOB_KIND.UNKNOWN}</span>;
}

export interface UseAssignmentColumnsOptions {
  onReassign: (e: React.MouseEvent, row: Assignment) => void;
}

export function useAssignmentColumns({
  onReassign,
}: UseAssignmentColumnsOptions): Column<Assignment>[] {
  return [
    idColumn({ id: "enquiry", header: M.COLUMNS.ENQ, get: (r) => r.enquiry }),
    avatarColumn({
      id: "partner",
      header: M.COLUMNS.PARTNER,
      name: (r) => r.partner.split(" ")[0],
      image: (r) => getFallbackAvatar(r.partner),
    }),
    idColumn({ id: "order", header: M.COLUMNS.ORDER, get: (r) => r.order }),
    textColumn({ id: "shop", header: M.COLUMNS.SHOP, get: (r) => r.shop, className: "td-m" }),
    textColumn({
      id: "deliverTo",
      header: M.COLUMNS.DELIVER_TO,
      get: (r) => r.deliverTo,
      className: "td-m",
    }),
    {
      id: "job",
      header: M.COLUMNS.JOB,
      className: "td-m",
      cell: (r) => <JobKindCell assignmentStatus={r.assignmentStatus} />,
    },
    statusColumn({ id: "status", header: M.COLUMNS.STATUS, get: (r) => r.status }),
    textColumn({ id: "eta", header: M.COLUMNS.ETA, get: (r) => r.eta, className: "td-m" }),
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (row) => (
        <TableActions
          row={row}
          actions={[
            {
              icon: <IconTransfer size={15} />,
              title: M.REASSIGN,
              onClick: (e, r) => onReassign(e, r),
            },
          ]}
        />
      ),
    },
  ];
}
