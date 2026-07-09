import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { MOCK_ASSIGNMENTS, MOCK_PARTNERS, MOCK_UNASSIGNED } from "../data/mockAssignments";
import type { Assignment, UnassignedOrder } from "../types/assignment.types";
import { AssignPartnerDrawer } from "./AssignPartnerDrawer";
import { UnassignedOrdersCard } from "./UnassignedOrdersCard";
import { useAssignmentColumns } from "./assignmentColumns";

const M = MESSAGES.ASSIGNMENTS;

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);
  const [unassigned, setUnassigned] = useState<UnassignedOrder[]>(MOCK_UNASSIGNED);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const openAssign = (orderId: string) => {
    setAssignOrderId(orderId);
    setAssignOpen(true);
  };

  const confirmAssign = (partnerName: string) => {
    if (!partnerName) {
      toast.error(M.DRAWER.SELECT_REQUIRED);
      return;
    }

    const pending = unassigned.find((u) => u.id === assignOrderId);
    if (pending) {
      // Promote the unassigned order into the active-assignments list.
      setUnassigned((prev) => prev.filter((u) => u.id !== assignOrderId));
      setAssignments((prev) => [
        {
          id: pending.id,
          enquiry: pending.id.replace("#AM", "ENQ-"),
          partner: partnerName,
          order: pending.id,
          shop: pending.port,
          deliverTo: pending.sailor,
          status: "New",
          eta: "ASAP",
        },
        ...prev,
      ]);
    } else {
      // Reassign an existing row to the chosen partner.
      setAssignments((prev) =>
        prev.map((a) => (a.order === assignOrderId ? { ...a, partner: partnerName } : a)),
      );
    }

    toast.success(M.DRAWER.ASSIGNED(partnerName, assignOrderId ?? ""));
    setAssignOpen(false);
  };

  const handleRowClick = (a: Assignment) => {
    setSelectedOrder({
      id: a.order,
      sailor: "Sailor",
      ship: "IMO 0123456",
      terminal: a.deliverTo.split("·")[0],
      partner: a.partner,
      payment: "Card · Paid",
      total: "$70.00",
      status: a.status,
      items: [{ name: "Order items", qty: 3, price: "$70.00" }],
    });
  };

  const columns = useAssignmentColumns({
    onReassign: (e, row) => {
      e.stopPropagation();
      openAssign(row.order);
    },
  });

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <Button variant="primary" size="sm" onClick={() => openAssign("new")}>
            <IconPlus size={15} className="mr-1" />
            {M.NEW_ASSIGNMENT}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Left: active assignments */}
        <SectionCard title={M.ACTIVE.TITLE} bodyPadding="none">
          <DataTable
            columns={columns}
            data={assignments}
            rowKey="id"
            showPagination={false}
            emptyMessage={M.ACTIVE.EMPTY}
            onRowClick={handleRowClick}
            bare
          />
        </SectionCard>

        {/* Right: unassigned orders */}
        <UnassignedOrdersCard orders={unassigned} onAssign={openAssign} />
      </div>

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onReassign={(orderId) => openAssign(orderId)}
      />

      <AssignPartnerDrawer
        open={assignOpen}
        orderId={assignOrderId}
        partners={MOCK_PARTNERS}
        onClose={() => setAssignOpen(false)}
        onConfirm={confirmAssign}
      />
    </div>
  );
}

export default AssignmentsPage;
