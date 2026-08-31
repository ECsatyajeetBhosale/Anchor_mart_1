import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { idColumn, statusColumn, textColumn } from "@/components/common/tableColumns";
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
import { useCreateAnchorageMutation, useGetAnchoragesQuery } from "../api/anchorageApi";
import { type AnchorageFormData, anchorageSchema } from "../schemas/catalogOps.schema";
import type { Anchorage, Port } from "../types/catalogOps.types";

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
 * The anchorages of one port — list plus an add form, in the port's own drawer.
 *
 * **Scoped to a port because the API is.** `get-anchorages/` requires a
 * `port_id` and there is no unscoped list, which matches the domain: a mooring
 * has no meaning outside the port it sits in. So this is reached from a port
 * row rather than living on the nav, the same shape the variants drawer takes
 * under a product.
 *
 * **List and add only.** Update and delete exist server-side but key on an
 * `anchorage_id` UUID that no read payload returns, so a row here cannot be
 * addressed for either. The note under the table says so rather than the drawer
 * offering controls that cannot work — see `types/catalogOps.types.ts`.
 *
 * The two endpoints disagree on how a port is named: the list takes its
 * **UUID**, the create takes its **code**. Both come off the `Port` row, which
 * is another reason this belongs here and not on a standalone screen where one
 * of the two would have to be looked up.
 */
export function AnchorageDrawer({ isOpen, onClose, port }: AnchorageDrawerProps) {
  const [isAdding, setIsAdding] = useState(false);

  const { data, isLoading, isError, refetch } = useGetAnchoragesQuery(
    { portId: port?.id ?? "", limit: LIMIT },
    // A blank `port_id` is a 400, so the request is never made without one.
    { skip: !isOpen || !port?.id },
  );
  const [createAnchorage, { isLoading: isSaving }] = useCreateAnchorageMutation();

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
    setIsAdding(false);
    reset(DEFAULTS);
  }, [isOpen, reset]);

  const anchorages = data?.items ?? [];

  const onSubmit = async (values: AnchorageFormData) => {
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
      reset(DEFAULTS);
      setIsAdding(false);
      toast.success(getApiMessage(response) ?? A.TOAST.ADD_SUCCESS);
    } catch (error) {
      // The duplicate case returns a real sentence — "Anchorage already exists
      // for this port" — which is more use than any wording here. The form
      // stays open with the name intact so it can be corrected.
      toast.error(getApiMessage(error) ?? A.TOAST.ADD_ERROR);
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
  ];

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
            {!isAdding && (
              <button type="button" className="btn btn-primary" onClick={() => setIsAdding(true)}>
                <IconPlus size={16} />
                {A.ADD}
              </button>
            )}
          </div>

          {isAdding && (
            <section className="rounded-[var(--radius-md)] border border-[var(--border-md)] bg-[var(--surface-alt)] p-4">
              <div className="mb-3 text-[12.5px] font-bold text-[var(--t2)]">{A.ADD_TITLE}</div>

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
                  onClick={() => {
                    setIsAdding(false);
                    reset(DEFAULTS);
                  }}
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
                  <IconPlus size={16} />
                  {isSaving ? A.SAVING : A.SUBMIT}
                </button>
              </div>
            </section>
          )}

          <DataTable
            columns={columns}
            data={anchorages}
            // No `id` on the row, so the name is the only stable key available —
            // and it is genuinely unique here, since the API refuses a duplicate
            // name under the same port.
            rowKey="anchorage_name"
            isLoading={isLoading}
            isError={isError}
            error={isError ? A.FETCH_ERROR : null}
            onRetry={refetch}
            emptyMessage={A.EMPTY}
          />

          <div className="flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
            <IconInfoCircle size={15} className="mt-px shrink-0" />
            <span>{A.HINT}</span>
          </div>
          <div className="flex items-start gap-2 text-[11.5px] font-medium leading-relaxed text-[var(--t4)]">
            <IconInfoCircle size={15} className="mt-px shrink-0" />
            <span>{A.READ_ONLY_NOTE}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AnchorageDrawer;
