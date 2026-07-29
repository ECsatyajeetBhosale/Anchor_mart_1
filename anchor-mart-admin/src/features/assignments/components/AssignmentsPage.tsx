import { type OrderDetail, OrderDetailDrawer } from "@/components/common/OrderDetailDrawer";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { DataTable } from "@/components/ui/data-table";
import { type PartnerData, useGetPartnersQuery } from "@/features/partners";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAssignOrderMutation,
  useGetActiveAssignmentsQuery,
  useGetUnassignedOrdersQuery,
} from "../api/assignmentApi";
import type { Assignment } from "../types/assignment.types";
import { AssignPartnerDrawer } from "./AssignPartnerDrawer";
import { UnassignedOrdersCard } from "./UnassignedOrdersCard";
import { useAssignmentColumns } from "./assignmentColumns";

const M = MESSAGES.ASSIGNMENTS;

/**
 * What the assign drawer is currently acting on. `orderId` is the real UUID the
 * API keys on; `label` is the human order number shown in the drawer; `confirm`
 * is true for a reassignment, which the API requires to take an order off the
 * partner already holding it (a bare assign returns 409 requires_confirmation).
 */
interface AssignTarget {
  orderId: string;
  label: string;
  confirm: boolean;
}

export function AssignmentsPage() {
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [target, setTarget] = useState<AssignTarget | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  // Board A — orders holding a live partner assignment (Flow 28 API 14).
  const {
    data: assignments = [],
    isLoading: activeLoading,
    isError: activeError,
    refetch: refetchActive,
  } = useGetActiveAssignmentsQuery();

  // Board B — orders still awaiting a partner (Flow 28 API 15).
  const { data: unassigned = [] } = useGetUnassignedOrdersQuery();

  // Delivery partners — same API + mapping the Partners page uses.
  const { data: partnersData } = useGetPartnersQuery();
  const partners: PartnerData[] = partnersData?.partners ?? [];

  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderMutation();

  const openAssign = (next: AssignTarget) => {
    setTarget(next);
    setAssignOpen(true);
  };

  const confirmAssign = async (partner: PartnerData, deliverBy: string) => {
    if (!target) return;
    try {
      await assignOrder({
        order_id: target.orderId,
        delivery_partner_id: partner.deliveryPartnerId,
        deliver_by: deliverBy,
        // Reassignment needs the explicit confirm flag; a first assignment doesn't.
        confirm: target.confirm,
      }).unwrap();

      // Both boards are tag-invalidated by the mutation, so they refresh
      // themselves — no local list surgery needed.
      toast.success(M.DRAWER.ASSIGNED(partner.n, target.label));
      setAssignOpen(false);
    } catch (error) {
      // Keep the drawer open so the user can retry or pick another partner.
      toast.error(getApiMessage(error) ?? M.DRAWER.ASSIGN_ERROR);
    }
  };

  const handleRowClick = (a: Assignment) => {
    setSelectedOrder({
      id: a.order,
      sailor: a.deliverTo,
      ship: "-",
      terminal: a.shop,
      partner: a.partner,
      payment: "-",
      total: "-",
      status: a.status,
      items: [],
    });
  };

  const columns = useAssignmentColumns({
    onReassign: (e, row) => {
      e.stopPropagation();
      openAssign({ orderId: row.orderId, label: row.order, confirm: true });
    },
  });

  return (
    <div className="page-enter">
      <PageHeader title={M.TITLE} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Left: active assignments */}
        <SectionCard title={M.ACTIVE.TITLE} bodyPadding="none">
          <DataTable
            columns={columns}
            data={assignments}
            rowKey="id"
            isLoading={activeLoading}
            isError={activeError}
            error={activeError ? M.ACTIVE.FETCH_ERROR : null}
            onRetry={refetchActive}
            showPagination={false}
            emptyMessage={M.ACTIVE.EMPTY}
            onRowClick={handleRowClick}
            bare
          />
        </SectionCard>

        {/* Right: unassigned orders */}
        <UnassignedOrdersCard
          orders={unassigned}
          onAssign={(orderNumber) => {
            const pending = unassigned.find((u) => u.id === orderNumber);
            if (!pending) return;
            openAssign({ orderId: pending.orderId, label: pending.id, confirm: false });
          }}
        />
      </div>

      <OrderDetailDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onReassign={(orderNumber) => {
          const row = assignments.find((a) => a.order === orderNumber);
          if (!row) return;
          openAssign({ orderId: row.orderId, label: row.order, confirm: true });
        }}
      />

      <AssignPartnerDrawer
        open={assignOpen}
        orderId={target?.label ?? null}
        partners={partners}
        isSubmitting={isAssigning}
        onClose={() => setAssignOpen(false)}
        onConfirm={confirmAssign}
      />
    </div>
  );
}

export default AssignmentsPage;
