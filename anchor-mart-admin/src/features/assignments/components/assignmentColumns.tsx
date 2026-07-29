import { TableActions } from "@/components/common/TableActions";
import { avatarColumn, idColumn, statusColumn, textColumn } from "@/components/common/tableColumns";
import type { Column } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { IconTransfer } from "@tabler/icons-react";
import type React from "react";
import type { Assignment } from "../types/assignment.types";

const M = MESSAGES.ASSIGNMENTS.ACTIVE;

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
