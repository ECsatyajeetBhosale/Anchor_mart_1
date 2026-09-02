import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import {
  actionsColumn,
  idColumn,
  statusColumn,
  textColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
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
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconAlertTriangle, IconAnchor, IconInfoCircle, IconPlus } from "@tabler/icons-react";
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

const DEFAULTS: AnchorageFormData = {
  anchorage_name: "",
  anchorage_code: "",
  is_active: true,
};

export interface AnchorageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The port whose moorings these are. `null` closes the drawer. */
  port: Port | null;
}

/**
 * The anchorages of one port — list, add/edit form, and the controls for which
 * one is the port's default.
 *
 * **Scoped to a port because the API is.** `get-anchorages/` requires a
 * `port_id` and there is no unscoped list, which matches the domain: a mooring
 * has no meaning outside the port it sits in. So this is reached from a port
 * row rather than living on the nav, the same shape the variants drawer takes
 * under a product.
 *
 * **The default anchorage is the shape of most of this component.** Exactly one
 * per port, by database constraint, and the API refuses every way of removing
 * one without a replacement: it cannot be demoted (`is_default: false` is a
 * 400), cannot be deactivated (400), and cannot be deleted while the port has
 * siblings (409). Promotion is the only lever, and it moves two rows at once —
 * the incumbent is demoted in the same transaction. So the default row is shown
 * without the controls that would fail, the promote action appears only on the
 * rows that are not it, and the note under the list explains the asymmetry
 * rather than leaving it to be discovered by a rejected click.
 *
 * A port from before that rule has **no** default at all. Nothing was
 * backfilled — choosing one would have been the backend deciding a delivery
 * location — so the empty case gets a warning that names the fix.
 */
export function AnchorageDrawer({ isOpen, onClose, port }: AnchorageDrawerProps) {
  /** Open form: `null` = closed, `"new"` = add, an `Anchorage` = editing it. */
  const [formTarget, setFormTarget] = useState<Anchorage | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Anchorage | null>(null);
  const [toPromote, setToPromote] = useState<Anchorage | null>(null);

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
    setToPromote(null);
    reset(DEFAULTS);
  }, [isOpen, reset]);

  const anchorages = data?.items ?? [];
  const hasDefault = anchorages.some((row) => row.is_default);
  /** The default may be deleted when it is the port's only mooring. */
  const isLastAnchorage = anchorages.length === 1;

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
        body: {
          // The parent's **UUID**, not its `port_code` — and the port must be
          // active, else a field-level `{"port": ["Port not found"]}`.
          port: port.id,
          anchorage_name: values.anchorage_name,
          // Omitted rather than sent blank: the API defaults it to "" anyway,
          // and an explicit "" records an empty code as a decision.
          ...(values.anchorage_code ? { anchorage_code: values.anchorage_code } : {}),
          is_active: values.is_active,
          // `is_default` is never sent from here. A port that already has a
          // default should not have it silently moved by an add, and a port
          // that has none is handled by promoting a row afterwards — which is
          // one visible, confirmed step rather than a hidden side effect.
        },
      }).unwrap();
      closeForm();
      toast.success(getApiMessage(response) ?? A.TOAST.ADD_SUCCESS);
    } catch (error) {
      // The duplicate case returns a real sentence — "An anchorage with this
      // name already exists for this port." — as a field-level error, which is
      // more use than any wording here. The form stays open with the name
      // intact so it can be corrected.
      toast.error(getApiMessage(error) ?? A.TOAST.ADD_ERROR);
    }
  };

  const onUpdate = async (row: Anchorage, values: AnchorageFormData) => {
    if (!port) return;

    // Send the changed fields only. The endpoint is partial, so a diff keeps
    // untouched values out of the body entirely — which matters most for
    // `is_active`: re-sending the default's own `true` is harmless, but the
    // habit of sending the whole form is what turns a rename into a rejected
    // write the first time someone edits the default.
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

  /**
   * Promote one anchorage to default.
   *
   * `is_default: true` is the whole body — the incumbent's demotion is the
   * server's half of the same transaction, which is why the list is invalidated
   * per port rather than per row.
   */
  const confirmPromote = async () => {
    if (!port || !toPromote) return;
    const promoted = toPromote;
    try {
      await updateAnchorage({
        portId: port.id,
        anchorageId: promoted.id,
        body: { is_default: true },
      }).unwrap();
      setToPromote(null);
      toast.success(A.TOAST.SET_DEFAULT_SUCCESS(promoted.anchorage_name));
    } catch (error) {
      toast.error(getApiMessage(error) ?? A.TOAST.SET_DEFAULT_ERROR);
    }
  };

  const confirmDelete = async () => {
    if (!port || !toDelete) return;
    const target = toDelete;
    try {
      const response = await deleteAnchorage({
        portId: port.id,
        anchorageId: target.id,
      }).unwrap();
      setToDelete(null);
      // If the row being deleted was open in the form, that form is now editing
      // something the server no longer returns.
      if (editing?.id === target.id) closeForm();
      toast.success(getApiMessage(response) ?? A.TOAST.DELETE_SUCCESS);
    } catch (error) {
      // The 409 is the "right request, wrong moment" case — the row is the
      // default and the port has others — and it is branched on by status
      // rather than prose, which is free to be reworded server-side. The
      // dialog stays open either way so the reason is readable.
      const fallback =
        getApiStatus(error) === 409 ? A.TOAST.DELETE_DEFAULT_BLOCKED : A.TOAST.DELETE_ERROR;
      toast.error(getApiMessage(error) ?? fallback);
    }
  };

  /**
   * Enter commits from either field.
   *
   * The form is a few short identifiers and a toggle; reaching for the mouse to
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
      // Optional and never generated, so a blank one is ordinary data.
      get: (r) => r.anchorage_code || M.DASH,
    }),
    {
      id: "name",
      header: A.COLUMNS.NAME,
      // The default is a property of the row, so it is marked on the row rather
      // than in a column of its own that would be empty for everything else.
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="td-p">{row.anchorage_name || M.DASH}</span>
          {row.is_default && (
            <Badge variant="teal" className="text-[10px]">
              {A.DEFAULT_BADGE}
            </Badge>
          )}
        </div>
      ),
    },
    textColumn({
      id: "eta",
      header: A.COLUMNS.ETA,
      // `null` is "never set", which is not the same answer as `0` — that would
      // promise immediate delivery — so it shows as absent, not as zero hours.
      get: (r) =>
        r.estimated_delivery_hours === null ? M.DASH : A.HOURS(r.estimated_delivery_hours),
      cellClassName: "td-m",
    }),
    statusColumn({
      id: "status",
      header: A.COLUMNS.STATUS,
      get: (r) => r.is_active,
    }),
    actionsColumn({
      header: A.COLUMNS.ACTIONS,
      actions: (row) => ({
        // Promotion only exists in one direction, so it is offered on the rows
        // that are not the default and nowhere else.
        ...(row.is_default
          ? {}
          : {
              setDefault: {
                title: A.SET_DEFAULT,
                onClick: (e) => {
                  e.stopPropagation();
                  setToPromote(row);
                },
              },
            }),
        edit: {
          title: MESSAGES.COMMON.EDIT,
          onClick: (e) => {
            e.stopPropagation();
            openEditForm(row);
          },
        },
        // Deleting the default is a 409 while the port has other moorings — but
        // allowed when it is the last one. Offering the button only where it
        // can succeed beats explaining the refusal afterwards; the note under
        // the list says why it is missing.
        ...(row.is_default && !isLastAnchorage
          ? {}
          : {
              delete: {
                title: MESSAGES.COMMON.DELETE,
                onClick: (e) => {
                  e.stopPropagation();
                  setToDelete(row);
                },
              },
            }),
      }),
    }),
  ];

  // Editing the default cannot deactivate it — the API refuses — so the toggle
  // is disabled rather than offered and then rejected.
  const isEditingDefault = Boolean(editing?.is_default);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
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

          {/* A real state for any port created before default anchorages
              existed, not a loading blip — so it names the fix. */}
          {!isLoading && !isError && anchorages.length > 0 && !hasDefault && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--amber-100)] bg-[var(--amber-50)] p-3 text-[11.5px] font-semibold leading-relaxed text-[var(--amber-700)]">
              <IconAlertTriangle size={15} className="mt-px shrink-0" />
              <span>{A.NO_DEFAULT_WARNING}</span>
            </div>
          )}

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

              <FormField label={A.ACTIVE} hint={isEditingDefault ? A.DEFAULT_NOTE : undefined}>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isEditingDefault}
                    />
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
              port can hold dozens of moorings, and the notes below have to stay
              reachable without scrolling past all of them. */}
          <div className="tbl-scroll [--tbl-scroll-h:min(52vh,420px)]">
            <DataTable
              columns={columns}
              data={anchorages}
              rowKey="id"
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
          {/* Only worth saying while a default is actually on screen — it is
              the explanation for the controls that row is missing. */}
          {hasDefault && (
            <div className="flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
              <IconInfoCircle size={15} className="mt-px shrink-0" />
              <span>{A.DEFAULT_NOTE}</span>
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={!!toPromote}
          onClose={() => setToPromote(null)}
          onConfirm={confirmPromote}
          isLoading={isUpdating}
          title={A.SET_DEFAULT_CONFIRM.TITLE}
          description={A.SET_DEFAULT_CONFIRM.MESSAGE}
          confirmText={A.SET_DEFAULT_CONFIRM.CONFIRM}
          loadingText={A.EDIT_SAVING}
        />

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
