import { IconPlus, IconTicket, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { Search } from "@/components/common/Search";
import { SectionCard } from "@/components/common/SectionCard";
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
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { useGetActiveCouponsQuery } from "../api/couponApi";
import {
  useAddCouponAssignmentMutation,
  useDeleteCouponAssignmentMutation,
  useGetCouponAssignmentsQuery,
} from "../api/promotionApi";
import type { CouponAssignment } from "../types/reward.types";

const LIMIT = 10;
const M = MESSAGES.PROMOTION.ASSIGNMENTS;
const F = M.FORM;
const V = M.VALIDATION;

/** Per-user coupon grants — hand a specific coupon to a specific sailor. */
export function CouponAssignmentsTab() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [sailorSearch, setSailorSearch] = useState("");
  const [toRemove, setToRemove] = useState<CouponAssignment | null>(null);
  const [userId, setUserId] = useState("");
  const [couponId, setCouponId] = useState("");
  const [errors, setErrors] = useState<{ user?: string; coupon?: string }>({});

  const { data, isLoading, isError, refetch } = useGetCouponAssignmentsQuery({
    page,
    limit: LIMIT,
  });
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  /**
   * Pickers are only populated while the dialog is open.
   *
   * Sailor search runs server-side: a page is capped at 50 by
   * `CustomPagination`, so picking from a single fetched page left every sailor
   * past the 50th unassignable.
   *
   * The coupon picker had the same hole and a tighter one — it asked for no page
   * size at all, so it offered the first **ten** coupons and nothing could
   * assign the eleventh. It now asks for a full page.
   */
  const { data: sailorsData, isFetching: sailorsFetching } = useGetSailorsQuery(
    { page: 1, limit: API_MAX_PAGE_SIZE, search: sailorSearch },
    { skip: !formOpen },
  );
  const sailors = sailorsData?.sailors ?? [];
  const { data: couponsData } = useGetActiveCouponsQuery(
    { page: 1, limit: API_MAX_PAGE_SIZE },
    { skip: !formOpen },
  );
  const coupons = couponsData?.results ?? [];

  const [addAssignment, { isLoading: isSaving }] = useAddCouponAssignmentMutation();
  const [deleteAssignment, { isLoading: isRemoving }] = useDeleteCouponAssignmentMutation();

  /**
   * Assigning a private coupon to a sailor is a coupon write — the backend gates
   * both the create and the delete on `promo.coupon`, super-admin only. The
   * assignment list stays readable for both tiers.
   */
  const { can } = useAdminAccess();
  const canManageAssignments = can("promo.coupon");

  const openForm = () => {
    setUserId("");
    setCouponId("");
    setErrors({});
    setSailorSearch("");
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
    // No Sailor column: this response carries the user's **id and email only**.
    // The name column read a field that was never sent and printed a dash on
    // every row.
    { id: "email", header: M.COLUMNS.EMAIL, className: "td-m", cell: (r) => r.userEmail },
    {
      id: "coupon",
      header: M.COLUMNS.COUPON,
      className: "td-id",
      cell: (r) => r.couponCode,
    },
    // Replaces the "Used / Unused" badge, which had no field behind it —
    // `is_used` is not in this payload, so every row claimed Unused. When the
    // coupon was granted is a fact the endpoint does report.
    {
      id: "assigned",
      header: M.COLUMNS.ASSIGNED,
      className: "td-m",
      cell: (r) => r.assignedAt,
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-16 text-right",
      headerClassName: "text-right",
      cell: (r) =>
        canManageAssignments ? (
          <div className="td-acts">
            <Button variant="ghost" size="xs" onClick={() => setToRemove(r)}>
              <IconTrash size={15} />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <SectionCard
        icon={<IconTicket size={18} />}
        title={M.TITLE}
        bodyPadding="none"
        actions={
          canManageAssignments ? (
            <Button variant="primary" size="sm" onClick={openForm}>
              <IconPlus size={15} className="mr-1" />
              {M.ADD}
            </Button>
          ) : null
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
          page={page}
          pages={totalPages}
          onPageChange={setPage}
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
              <div className="mb-2">
                <Search
                  value={sailorSearch}
                  onSearch={setSailorSearch}
                  placeholder={F.USER_SEARCH_PLACEHOLDER}
                  debounceMs={300}
                  loading={sailorsFetching}
                  className="w-full"
                  style={{ width: "100%" }}
                />
              </div>
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
