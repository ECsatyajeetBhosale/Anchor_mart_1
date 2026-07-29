import { IconHistory, IconPlus, IconStar, IconTrash } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGetSailorsQuery } from "@/features/sailors";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import {
  useAddBonusPointsMutation,
  useDeleteBonusPointsMutation,
  useGetBonusPointHistoryQuery,
  useGetBonusPointsQuery,
} from "../api/promotionApi";
import type { BonusPoint, BonusPointType } from "../types/reward.types";

const M = MESSAGES.PROMOTION.BONUS;
const F = M.FORM;
const V = M.VALIDATION;
const H = M.HISTORY;

const TYPE_OPTIONS = [
  { value: "all", label: M.TYPE_FILTER.ALL },
  { value: "loyalty", label: M.TYPE_FILTER.LOYALTY },
  { value: "referral", label: M.TYPE_FILTER.REFERRAL },
];

const GRANT_TYPE_OPTIONS = [
  { value: "loyalty", label: M.TYPE_FILTER.LOYALTY },
  { value: "referral", label: M.TYPE_FILTER.REFERRAL },
];

/** Bonus-point balances, grants and per-user ledger. */
export function BonusPointsTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [grantOpen, setGrantOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<BonusPoint | null>(null);
  const [toClear, setToClear] = useState<BonusPoint | null>(null);

  // Grant-form state
  const [userId, setUserId] = useState("");
  const [grantType, setGrantType] = useState<BonusPointType>("loyalty");
  const [points, setPoints] = useState("");
  const [errors, setErrors] = useState<{ user?: string; points?: string }>({});

  const { data, isLoading, isError, refetch } = useGetBonusPointsQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  // Sailors feed the grant picker; only loaded when the dialog is open.
  const { data: sailorsData } = useGetSailorsQuery({ page: 1, limit: 100 }, { skip: !grantOpen });
  const sailors = sailorsData?.sailors ?? [];

  const [addPoints, { isLoading: isGranting }] = useAddBonusPointsMutation();
  const [clearPoints, { isLoading: isClearing }] = useDeleteBonusPointsMutation();

  const { data: history, isLoading: historyLoading } = useGetBonusPointHistoryQuery(
    { userId: historyFor?.userId ?? "", limit: 50 },
    { skip: !historyFor?.userId },
  );

  const openGrant = () => {
    setUserId("");
    setGrantType("loyalty");
    setPoints("");
    setErrors({});
    setGrantOpen(true);
  };

  const handleGrant = async () => {
    const next: { user?: string; points?: string } = {};
    if (!userId) next.user = V.USER_REQUIRED;
    const value = Number(points);
    if (!points.trim() || !Number.isInteger(value) || value <= 0) next.points = V.POINTS_INVALID;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      // The API takes `points` as a string, matching the documented payload.
      await addPoints({ user_id: userId, type: grantType, points: String(value) }).unwrap();
      toast.success(M.TOAST.GRANTED);
      setGrantOpen(false);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.GRANT_ERROR);
    }
  };

  const confirmClear = async () => {
    if (!toClear) return;
    try {
      // Deletion keys on the user, so this wipes their whole balance.
      await clearPoints(toClear.userId).unwrap();
      toast.success(M.TOAST.CLEARED);
      setToClear(null);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.TOAST.CLEAR_ERROR);
    }
  };

  const columns: Column<BonusPoint>[] = [
    { id: "user", header: M.COLUMNS.USER, cell: (r) => r.userName },
    { id: "email", header: M.COLUMNS.EMAIL, className: "td-m", cell: (r) => r.userEmail },
    {
      id: "type",
      header: M.COLUMNS.TYPE,
      cell: (r) => <Badge variant="navy">{r.type}</Badge>,
    },
    {
      id: "points",
      header: M.COLUMNS.POINTS,
      className: "td-p",
      cell: (r) => r.points.toLocaleString(),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-24 text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="td-acts">
          <Button variant="ghost" size="xs" title={M.ACTIONS.HISTORY} onClick={() => setHistoryFor(r)}>
            <IconHistory size={15} />
          </Button>
          <Button variant="ghost" size="xs" title={M.ACTIONS.CLEAR} onClick={() => setToClear(r)}>
            <IconTrash size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SectionCard
        icon={<IconStar size={18} />}
        title={M.TITLE}
        bodyPadding="none"
        actions={
          <div className="flex items-center gap-2">
            <DropdownSelect
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={TYPE_OPTIONS}
              width="150px"
            />
            <Button variant="primary" size="sm" onClick={openGrant}>
              <IconPlus size={15} className="mr-1" />
              {M.ADD}
            </Button>
          </div>
        }
      >
        <DataTable
          columns={columns}
          data={data?.rows ?? []}
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

      {/* Grant dialog */}
      <Dialog open={grantOpen} onOpenChange={(open) => !open && setGrantOpen(false)}>
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
            <FormField label={F.TYPE}>
              <DropdownSelect
                value={grantType}
                onValueChange={(val) => setGrantType(val as BonusPointType)}
                options={GRANT_TYPE_OPTIONS}
                width="100%"
              />
            </FormField>
            <FormField label={F.POINTS} error={errors.points}>
              <Input
                type="number"
                min="1"
                step="1"
                value={points}
                placeholder={F.POINTS_PLACEHOLDER}
                onChange={(e) => setPoints(e.target.value)}
              />
            </FormField>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setGrantOpen(false)}
              disabled={isGranting}
            >
              {F.CANCEL}
            </Button>
            <Button variant="primary" size="sm" loading={isGranting} onClick={handleGrant}>
              {F.SAVE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History drawer */}
      <Sheet open={!!historyFor} onOpenChange={(open) => !open && setHistoryFor(null)}>
        <SheetContent
          side="right"
          adjustable
          defaultWidth={640}
          className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
        >
          <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
            <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
              {H.TITLE}
            </SheetTitle>
            <SheetDescription className="text-[12.5px] text-[var(--t3)]">
              {H.SUBTITLE(historyFor?.userName ?? "")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <DataTable
              columns={[
                { id: "date", header: H.COLUMNS.DATE, className: "td-m", cell: (e) => e.createdAt },
                { id: "type", header: H.COLUMNS.TYPE, cell: (e) => e.type },
                {
                  id: "points",
                  header: H.COLUMNS.POINTS,
                  className: "td-p",
                  cell: (e) => e.points.toLocaleString(),
                },
                { id: "reason", header: H.COLUMNS.REASON, className: "td-m", cell: (e) => e.reason },
              ]}
              data={history?.entries ?? []}
              rowKey="id"
              isLoading={historyLoading}
              showPagination={false}
              emptyMessage={H.EMPTY}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        isOpen={!!toClear}
        onClose={() => setToClear(null)}
        onConfirm={confirmClear}
        isLoading={isClearing}
        title={M.CONFIRM_CLEAR.TITLE}
        description={toClear ? M.CONFIRM_CLEAR.MESSAGE(toClear.userName) : ""}
        confirmText={M.CONFIRM_CLEAR.CONFIRM}
      />
    </>
  );
}

export default BonusPointsTab;
