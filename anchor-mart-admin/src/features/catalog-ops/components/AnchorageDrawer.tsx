import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import {
  actionsColumn,
  idColumn,
  statusColumn,
  textColumn,
} from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconAnchor, IconInfoCircle, IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useCreateAnchorageMutation,
  useDeleteAnchorageMutation,
  useGetAnchoragesQuery,
  useUpdateAnchorageMutation,
} from "../api/anchorageApi";
import { type AnchorageFormData, anchorageSchema } from "../schemas/catalogOps.schema";
import type { Anchorage, AnchorageUpdatePayload, Port } from "../types/catalogOps.types";

const M = MESSAGES.PORTS;
const A = M.ANCHORAGES;
const LIMIT = 50;

const DEFAULTS: AnchorageFormData = { anchorage_name: "", anchorage_code: "", is_active: true };

export interface AnchorageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The port whose moorings these are. `null` closes the drawer. */
  port: Port | null;
}

/**
 * The anchorages of one port — list plus an add/edit form, in the port's own
 * drawer.
 *
 * **Scoped to a port because the API is.** `get-anchorages/` requires a
 * `port_id` and there is no unscoped list, which matches the domain: a mooring
 * has no meaning outside the port it sits in. So this is reached from a port
 * row rather than living on the nav, the same shape the variants drawer takes
 * under a product.
 *
 * **Edit and delete are offered per row, not per table.** Both endpoints key on
 * an `anchorage_id` UUID that the documented read payloads do not return, so
 * whether a given row can be acted on is a property of that row: it has the key
 * or it does not. Rows carrying one get the actions; rows without get an empty
 * cell and the note under the list explains why, rather than the drawer either
 * hiding a working feature or showing buttons that would 404.
 *
 * The two write paths disagree on how a port is named: the list takes its
 * **UUID**, the create takes its **code**. Both come off the `Port` row, which
 * is another reason this belongs here and not on a standalone screen where one
 * of the two would have to be looked up.
 */
export function AnchorageDrawer({ isOpen, onClose, port }: AnchorageDrawerProps) {
  /** Open form: `null` = closed, `"new"` = add, an `Anchorage` = editing it. */
  const [formTarget, setFormTarget] = useState<Anchorage | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Anchorage | null>(null);

  const { data, isLoading, isError, refetch } = useGetAnchoragesQuery(
    { portId: port?.id ?? "", limit: LIMIT },
    // A blank `port_id` is a 400, so the request is never made without one.
    { skip: !isOpen || !port?.id },
  );
  const [createAnchorage, { isLoading: isCreating }] = useCreateAnchorageMutation();
  const [updateAnchorage, { isLoading: isUpdating }] = useUpdateAnchorageMutation();
  const [deleteAnchorage, { isLoading: isDeleting }] = useDeleteAnchorageMutation();

  const isSaving = isCreating || isUpdating;
  const editing = formTarget && formTarget !== "new" ? formTarget : null;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnchorageFormData>({
    resolver: zodResolver(anchorageSchema),
    defaultValues: DEFAULTS,
  });

  // Each open starts closed and empty: the drawer is reused across port rows,
  // and a name typed for one port must not reappear under another.
  useEffect(() => {
    if (!isOpen) return;
    setFormTarget(null);
    setToDelete(null);
    reset(DEFAULTS);
  }, [isOpen, reset]);

  const anchorages = data?.items ?? [];

  const closeForm = () => {
    setFormTarget(null);
    reset(DEFAULTS);
  };

  const openAddForm = () => {
    reset(DEFAULTS);
    setFormTarget("new");
  };

  const openEditForm = (row: Anchorage) => {
    reset({
      anchorage_name: row.anchorage_name,
      anchorage_code: row.anchorage_code,
      is_active: row.is_active,
    });
    setFormTarget(row);
  };

  const onCreate = async (values: AnchorageFormData) => {
    if (!port) return;
    try {
      const response = await createAnchorage({
        portId: port.id,
        // `port` carries the port's **UUID**: it is the plain FK field, which
        // DRF resolves against the primary key. Not `port_code`, even though
        // that is what the list rows come back carrying, and not `port_id`,
        // even though that is what the list is queried by.
        body: { port: port.id, ...values },
      }).unwrap();
      closeForm();
      toast.success(getApiMessage(response) ?? A.TOAST.ADD_SUCCESS);
    } catch (error) {
      // The duplicate case returns a real sentence — "Anchorage already exists
      // for this port" — which is more use than any wording here. The form
      // stays open with the name intact so it can be corrected.
      toast.error(getApiMessage(error) ?? A.TOAST.ADD_ERROR);
    }
  };

  const onUpdate = async (row: Anchorage, values: AnchorageFormData) => {
    // Only reachable from a row that had an id — the actions are not rendered
    // otherwise — but the write cannot be addressed without one, so it is
    // checked rather than asserted.
    if (!port || !row.id) return;

    // Send the changed fields only. The endpoint is a partial update and this
    // form is three fields wide, so a diff costs nothing and keeps an untouched
    // `anchorage_code` — the field the guide does not list as updatable — out
    // of the body entirely unless it was actually edited.
    const patch: AnchorageUpdatePayload = {};
    if (values.anchorage_name !== row.anchorage_name) patch.anchorage_name = values.anchorage_name;
    if (values.anchorage_code !== row.anchorage_code) patch.anchorage_code = values.anchorage_code;
    if (values.is_active !== row.is_active) patch.is_active = values.is_active;

    if (Object.keys(patch).length === 0) {
      closeForm();
      toast.info(A.TOAST.NO_CHANGES);
      return;
    }

    try {
      await updateAnchorage({ portId: port.id, anchorageId: row.id, body: patch }).unwrap();
      closeForm();
      toast.success(A.TOAST.UPDATE_SUCCESS);
    } catch (error) {
      // Left open on failure, same as the add form: a rejected rename is
      // usually a duplicate name, and retyping it from scratch helps nobody.
      toast.error(getApiMessage(error) ?? A.TOAST.UPDATE_ERROR);
    }
  };

  const onSubmit = (values: AnchorageFormData) =>
    editing ? onUpdate(editing, values) : onCreate(values);

  const confirmDelete = async () => {
    if (!port || !toDelete?.id) return;
    try {
      const response = await deleteAnchorage({
        portId: port.id,
        anchorageId: toDelete.id,
      }).unwrap();
      setToDelete(null);
      // If the row being deleted was open in the form, that form is now editing
      // something the server no longer returns.
      if (editing?.id === toDelete.id) closeForm();
      toast.success(getApiMessage(response) ?? A.TOAST.DELETE_SUCCESS);
    } catch (error) {
      // The dialog stays open so the reason is readable — "Anchorage not found"
      // on a row already deleted from another tab is worth seeing rather than
      // silently swallowing.
      toast.error(getApiMessage(error) ?? A.TOAST.DELETE_ERROR);
    }
  };

  /**
   * Enter commits from either field.
   *
   * The form is two short identifiers and a toggle; reaching for the mouse to
   * save that is friction with no purpose. `preventDefault` because the inputs
   * are not inside a `<form>` — the drawer submits through `handleSubmit`.
   */
  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    void handleSubmit(onSubmit)();
  };

  const columns: Column<Anchorage>[] = [
    idColumn({
      id: "code",
      header: A.COLUMNS.CODE,
      get: (r) => r.anchorage_code || M.DASH,
    }),
    textColumn({
      id: "name",
      header: A.COLUMNS.NAME,
      get: (r) => r.anchorage_name || M.DASH,
    }),
    statusColumn({
      id: "status",
      header: A.COLUMNS.STATUS,
      get: (r) => r.is_active,
    }),
    textColumn({
      id: "added",
      header: A.COLUMNS.ADDED,
      // Rendered verbatim. These arrive pre-formatted ("August 14, 2026, 07:09
      // AM"), not as ISO-8601, so the app's date helpers would return Invalid
      // Date on them.
      get: (r) => r.created_at || M.DASH,
      cellClassName: "td-m",
    }),
    actionsColumn({
      header: A.COLUMNS.ACTIONS,
      // Both writes address `anchorage_id`. A row that arrived without one gets
      // an empty cell; the note under the list says why.
      actions: (row) =>
        row.id
          ? {
              edit: {
                title: MESSAGES.COMMON.EDIT,
                onClick: (e) => {
                  e.stopPropagation();
                  openEditForm(row);
                },
              },
              delete: {
                title: MESSAGES.COMMON.DELETE,
                onClick: (e) => {
                  e.stopPropagation();
                  setToDelete(row);
                },
              },
            }
          : {},
    }),
  ];

  // Only worth saying when it is actually true of something on screen.
  const hasUnaddressableRows = anchorages.some((row) => !row.id);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={560}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconAnchor size={22} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-xl">{A.TITLE}</SheetTitle>
              <SheetDescription>{A.SUBTITLE(port?.port_name || M.DASH)}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="sec-label !mb-0">{A.COUNT(data?.count ?? anchorages.length)}</span>
            {/* The add form is folded away until asked for: the common errand
                here is looking a mooring up, not creating one. */}
            {!formTarget && (
              <button type="button" className="btn btn-primary" onClick={openAddForm}>
                <IconPlus size={16} />
                {A.ADD}
              </button>
            )}
          </div>

          {formTarget && (
            <section className="rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-alt)] p-4">
              <div className="mb-3 text-[12.5px] font-bold text-[var(--t2)]">
                {editing ? A.EDIT_TITLE : A.ADD_TITLE}
              </div>

              <FormRow>
                <FormField label={A.NAME} error={errors.anchorage_name?.message}>
                  <Input
                    autoFocus
                    placeholder={A.NAME_PLACEHOLDER}
                    error={!!errors.anchorage_name}
                    onKeyDown={submitOnEnter}
                    {...register("anchorage_name")}
                  />
                </FormField>
                {/* `mono`, like the port code it sits under — these are
                    identifiers read character by character, not prose. */}
                <FormField label={A.CODE} error={errors.anchorage_code?.message}>
                  <Input
                    className="mono"
                    placeholder={A.CODE_PLACEHOLDER}
                    error={!!errors.anchorage_code}
                    onKeyDown={submitOnEnter}
                    {...register("anchorage_code")}
                  />
                </FormField>
              </FormRow>

              <FormField label={A.ACTIVE}>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </FormField>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-cancel"
                  onClick={closeForm}
                  disabled={isSaving}
                >
                  {MESSAGES.COMMON.CANCEL}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSaving}
                >
                  {!editing && <IconPlus size={16} />}
                  {editing
                    ? isSaving
                      ? A.EDIT_SAVING
                      : A.EDIT_SUBMIT
                    : isSaving
                      ? A.SAVING
                      : A.SUBMIT}
                </button>
              </div>
            </section>
          )}

          {/* The list scrolls inside itself rather than growing the drawer: a
              port can hold dozens of moorings, and the read-only notes below
              have to stay reachable without scrolling past all of them. */}
          <div className="tbl-scroll [--tbl-scroll-h:min(52vh,420px)]">
            <DataTable
              columns={columns}
              data={anchorages}
              // No `id` on the row, so the name is the only stable key
              // available — and it is genuinely unique here, since the API
              // refuses a duplicate name under the same port.
              rowKey="anchorage_name"
              isLoading={isLoading}
              isError={isError}
              error={isError ? A.FETCH_ERROR : null}
              onRetry={refetch}
              emptyMessage={A.EMPTY}
            />
          </div>

          <div className="flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
            <IconInfoCircle size={15} className="mt-px shrink-0" />
            <span>{A.HINT}</span>
          </div>
          {hasUnaddressableRows && (
            <div className="flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
              <IconInfoCircle size={15} className="mt-px shrink-0" />
              <span>{A.READ_ONLY_NOTE}</span>
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={confirmDelete}
          isLoading={isDeleting}
          title={A.DELETE_CONFIRM.TITLE}
          description={A.DELETE_CONFIRM.MESSAGE}
          confirmText={A.DELETE_CONFIRM.CONFIRM}
        />
      </SheetContent>
    </Sheet>
  );
}

export default AnchorageDrawer;
