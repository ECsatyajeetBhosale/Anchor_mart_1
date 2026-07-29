import { IconPlus, IconTicket, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetSailorsQuery } from "@/features/sailors";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useGetActiveCouponsQuery } from "../api/couponApi";
import {
  useAddCouponAssignmentMutation,
  useDeleteCouponAssignmentMutation,
  useGetCouponAssignmentsQuery,
} from "../api/promotionApi";
import type { CouponAssignment } from "../types/reward.types";

const M = MESSAGES.PROMOTION.ASSIGNMENTS;
const F = M.FORM;
const V = M.VALIDATION;

/** Per-user coupon grants — hand a specific coupon to a specific sailor. */
export function CouponAssignmentsTab() {
  const [formOpen, setFormOpen] = useState(false);
  const [toRemove, setToRemove] = useState<CouponAssignment | null>(null);
  const [userId, setUserId] = useState("");
  const [couponId, setCouponId] = useState("");
  const [errors, setErrors] = useState<{ user?: string; coupon?: string }>({});

  const { data, isLoading, isError, refetch } = useGetCouponAssignmentsQuery();

  // Pickers are only populated while the dialog is open.
  const { data: sailorsData } = useGetSailorsQuery({ page: 1, limit: 100 }, { skip: !formOpen });
  const sailors = sailorsData?.sailors ?? [];
  const { data: couponsData } = useGetActiveCouponsQuery(undefined, { skip: !formOpen });
  const coupons = couponsData?.results ?? [];

  const [addAssignment, { isLoading: isSaving }] = useAddCouponAssignmentMutation();
  const [deleteAssignment, { isLoading: isRemoving }] = useDeleteCouponAssignmentMutation();

  const openForm = () => {
    setUserId("");
    setCouponId("");
    setErrors({});
    setFormOpen(true);
  };

  const handleSave = async () => {
    const next: { user?: string; coupon?: string } = {};
    if (!userId) next.user = V.USER_REQUIRED;
    if (!couponId) next.coupon = V.COUPON_REQUIRED;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await addAssignment({ user: userId, coupon: couponId }).unwrap();
      toast.success(M.TOAST.ASSIGNED);
      setFormOpen(false);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.ASSIGN_ERROR);
    }
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    try {
      // Assignment ids are integers, unlike the coupon UUIDs they reference.
      await deleteAssignment(toRemove.id).unwrap();
      toast.success(M.TOAST.REMOVED);
      setToRemove(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.REMOVE_ERROR);
    }
  };

  const columns: Column<CouponAssignment>[] = [
    { id: "user", header: M.COLUMNS.USER, cell: (r) => r.userName },
    { id: "email", header: M.COLUMNS.EMAIL, className: "td-m", cell: (r) => r.userEmail },
    {
      id: "coupon",
      header: M.COLUMNS.COUPON,
      className: "td-id",
      cell: (r) => r.couponCode,
    },
    {
      id: "used",
      header: M.COLUMNS.USED,
      cell: (r) => (
        <Badge variant={r.isUsed ? "neutral" : "success"}>
          {r.isUsed ? M.USED_YES : M.USED_NO}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-16 text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="td-acts">
          <Button variant="ghost" size="xs" onClick={() => setToRemove(r)}>
            <IconTrash size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SectionCard
        icon={<IconTicket size={18} />}
        title={M.TITLE}
        bodyPadding="none"
        actions={
          <Button variant="primary" size="sm" onClick={openForm}>
            <IconPlus size={15} className="mr-1" />
            {M.ADD}
          </Button>
        }
      >
        <DataTable
          columns={columns}
          data={data?.assignments ?? []}
          rowKey="id"
          isLoading={isLoading}
          isError={isError}
          error={isError ? M.FETCH_ERROR : null}
          onRetry={refetch}
          showPagination={false}
          emptyMessage={M.EMPTY}
          bare
        />
      </SectionCard>

      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{F.TITLE}</DialogTitle>
            <DialogDescription>{M.TITLE}</DialogDescription>
          </DialogHeader>

          <div className="mt-3">
            <FormField label={F.USER} error={errors.user}>
              <DropdownSelect
                value={userId}
                onValueChange={setUserId}
                placeholder={F.USER_PLACEHOLDER}
                options={sailors.map((s) => ({ value: s.id, label: `${s.n} · ${s.e}` }))}
                width="100%"
              />
            </FormField>
            <FormField label={F.COUPON} error={errors.coupon}>
              <DropdownSelect
                value={couponId}
                onValueChange={setCouponId}
                placeholder={F.COUPON_PLACEHOLDER}
                options={coupons.map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` }))}
                width="100%"
              />
            </FormField>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFormOpen(false)}
              disabled={isSaving}
            >
              {F.CANCEL}
            </Button>
            <Button variant="primary" size="sm" loading={isSaving} onClick={handleSave}>
              {F.SAVE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        isLoading={isRemoving}
        title={M.CONFIRM_REMOVE.TITLE}
        description={toRemove ? M.CONFIRM_REMOVE.MESSAGE(toRemove.couponCode) : ""}
        confirmText={M.CONFIRM_REMOVE.CONFIRM}
      />
    </>
  );
}

export default CouponAssignmentsTab;
