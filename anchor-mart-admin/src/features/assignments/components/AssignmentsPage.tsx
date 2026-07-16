import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { type PartnerData, useGetPartnersQuery } from "@/features/partners";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAssignOrderMutation, useGetUnassignedOrdersQuery } from "../api/assignmentApi";
import { MOCK_ASSIGNMENTS } from "../data/mockAssignments";
import type { Assignment, UnassignedOrder } from "../types/assignment.types";
import { AssignPartnerDrawer } from "./AssignPartnerDrawer";
import { UnassignedOrdersCard } from "./UnassignedOrdersCard";
import { useAssignmentColumns } from "./assignmentColumns";

const M = MESSAGES.ASSIGNMENTS;

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  // Unassigned orders come from the live API; seed local state from it so the
  // assign flow can still optimistically remove a row on assignment.
  const { data: unassignedData } = useGetUnassignedOrdersQuery();
  const [unassigned, setUnassigned] = useState<UnassignedOrder[]>([]);
  useEffect(() => {
    if (unassignedData) setUnassigned(unassignedData);
  }, [unassignedData]);

  // Delivery partners — same API + mapping the Partners page uses.
  const { data: partnersData } = useGetPartnersQuery();
  const partners: PartnerData[] = partnersData?.partners ?? [];

  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderMutation();

  const openAssign = (orderId: string) => {
    setAssignOrderId(orderId);
    setAssignOpen(true);
  };

  const confirmAssign = async (partner: PartnerData, deliverBy: string) => {
    const pending = unassigned.find((u) => u.id === assignOrderId);

    if (pending) {
      // Real unassigned order → assign via the live API (initial assignment).
      try {
        await assignOrder({
          order_id: pending.orderId,
          delivery_partner_id: partner.deliveryPartnerId,
          deliver_by: deliverBy,
          confirm: false,
        }).unwrap();

        // Optimistically move it into the active-assignments list for instant
        // feedback; the unassigned list also refreshes via tag invalidation.
        setUnassigned((prev) => prev.filter((u) => u.id !== assignOrderId));
        setAssignments((prev) => [
          {
            id: pending.id,
            enquiry: pending.id.replace("#AM", "ENQ-"),
            partner: partner.n,
            order: pending.id,
            shop: pending.port,
            deliverTo: pending.sailor,
            status: "New",
            eta: "ASAP",
          },
          ...prev,
        ]);

        toast.success(M.DRAWER.ASSIGNED(partner.n, pending.id));
        setAssignOpen(false);
      } catch (error) {
        // Keep the drawer open so the user can retry.
        toast.error(getApiMessage(error) ?? M.DRAWER.ASSIGN_ERROR);
      }
      return;
    }

    // Reassign an existing (mock) active row — no live order UUID yet, so update
    // locally to keep the existing behaviour until that list is API-backed.
    setAssignments((prev) =>
      prev.map((a) => (a.order === assignOrderId ? { ...a, partner: partner.n } : a)),
    );
    toast.success(M.DRAWER.ASSIGNED(partner.n, assignOrderId ?? ""));
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
        partners={partners}
        isSubmitting={isAssigning}
        onClose={() => setAssignOpen(false)}
        onConfirm={confirmAssign}
      />
    </div>
  );
}

export default AssignmentsPage;
