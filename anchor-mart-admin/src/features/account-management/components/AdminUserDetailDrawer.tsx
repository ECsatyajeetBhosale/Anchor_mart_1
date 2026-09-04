import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconKey,
  IconTrash,
  IconUserCheck,
  IconUserCog,
  IconUserOff,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppSelector } from "@/hooks/useAppDispatch";
import { getApiMessage, getFieldErrors } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import {
  useDeleteAdminUserMutation,
  useGetAdminUserQuery,
  useResetAdminUserPasswordMutation,
  useSetAdminUserStatusMutation,
  useUpdateAdminUserMutation,
} from "../api/adminUserApi";
import { type AdminUserFormData, adminUserSchema } from "../schemas/adminUser.schema";
import type { AdminUser } from "../types/adminUser.types";

const A = MESSAGES.ACCOUNT_MANAGEMENT;
const M = A.ADMIN_USERS;
const D = M.DETAIL;

export interface AdminUserDetailDrawerProps {
  /** The selected row; null when none is selected. */
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * One admin user — edit their details, toggle access, reset the password, or
 * remove the account.
 *
 * Three layout decisions worth keeping:
 *
 * - **The tier is shown, never edited.** It is fixed at creation exactly as a
 *   sailor's role is, so it reads as a fact beside the account rather than as a
 *   dropdown the server would refuse.
 * - **The destructive actions sit in their own section**, not in the footer
 *   beside Save. Deactivate, reset and delete each answer a different question
 *   from "did my edits stick", and mixing them makes the footer ambiguous.
 * - **Editing your own account is allowed; locking yourself out is not.** The
 *   server may well permit it, but a console that lets an operator delete the
 *   session they are using has no good outcome — so those two actions are
 *   withheld on your own row and the reason is stated.
 */
export function AdminUserDetailDrawer({ user, isOpen, onClose }: AdminUserDetailDrawerProps) {
  const [confirming, setConfirming] = useState<"status" | "reset" | "delete" | null>(null);

  const currentEmail = useAppSelector((s) => s.auth.user?.email?.trim().toLowerCase() ?? "");

  const [updateUser, { isLoading: isSaving }] = useUpdateAdminUserMutation();
  const [setStatus, { isLoading: isTogglingStatus }] = useSetAdminUserStatusMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetAdminUserPasswordMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteAdminUserMutation();

  /**
   * All four writes in this drawer — update, status, reset-password, delete —
   * are gated on `governance.admin_users`, held by `super_admin` alone. For a
   * sub-admin the drawer is a read-only profile: the fields still render so they
   * can look a colleague up, but nothing that would 403 is offered.
   */
  const { can } = useAdminAccess();
  const canManageAdmins = can("governance.admin_users");

  // The row seeds the drawer so it opens instantly; the detail read fills in
  // anything the list row doesn't carry (last sign-in, `is_staff`).
  const { data: detail } = useGetAdminUserQuery(user?.id ?? "", {
    skip: !isOpen || !user?.id,
  });
  const record = detail ?? user;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<AdminUserFormData>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      country_code: "",
      whatsapp_number: "",
    },
  });

  // Re-seed whenever a different user is opened, or the detail read upgrades
  // the row underneath it. Seeded from the raw fields, never from the joined
  // display strings — splitting "Ana Maria Silva" or a code-less number back
  // apart would save the wrong values.
  useEffect(() => {
    if (!isOpen || !record) return;
    reset({
      first_name: record.firstName,
      last_name: record.lastName,
      // `email` is "-" when the payload had none; that placeholder must not
      // reach the input, where it would fail validation as a malformed address.
      email: record.email === "-" ? "" : record.email,
      country_code: record.countryCode,
      whatsapp_number: record.whatsappNumber,
    });
    setConfirming(null);
  }, [isOpen, record, reset]);

  if (!user) return null;

  const isSelf = !!currentEmail && record?.email.trim().toLowerCase() === currentEmail;
  const isActive = record?.isActive !== false;
  const busy = isSaving || isTogglingStatus || isResetting || isDeleting;

  const onSubmit = async (formData: AdminUserFormData) => {
    try {
      await updateUser({ id: user.id, body: formData }).unwrap();
      toast.success(M.TOAST.UPDATED);
    } catch (error) {
      // Field errors arrive as bare keys, the same shape `create-user` adopted
      // in 2026-07-30. Pin each to its input so "already exists" lands on the
      // field rather than only in a toast.
      for (const [field, message] of Object.entries(getFieldErrors(error))) {
        if (field in formData) {
          setError(field as keyof AdminUserFormData, { type: "server", message });
        }
      }
      toast.error(getApiMessage(error) ?? M.TOAST.UPDATE_ERROR);
    }
  };

  /** Activating needs no confirmation — it only ever restores access. */
  const handleToggleStatus = async () => {
    try {
      await setStatus({ id: user.id, is_active: !isActive }).unwrap();
      setConfirming(null);
      toast.success(isActive ? M.TOAST.DEACTIVATED : M.TOAST.ACTIVATED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.TOAST.STATUS_ERROR);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(user.id).unwrap();
      setConfirming(null);
      // The password is never in the response, so naming the address it went to
      // is the only honest confirmation available.
      toast.success(M.TOAST.RESET_SENT(record?.email ?? user.email));
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.TOAST.RESET_ERROR);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(user.id).unwrap();
      setConfirming(null);
      onClose();
      toast.success(M.TOAST.DELETED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.TOAST.DELETE_ERROR);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUserCog size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {D.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {record?.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Identity card — who this is, and the two facts that are read-only. */}
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="av av-img">
                <img src={getFallbackAvatar(record?.name ?? "")} alt={record?.name ?? ""} />
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{record?.name}</div>
                <div className="text-[11px] text-[var(--t4)]">{record?.email}</div>
              </div>
              <Badge variant={isActive ? "success" : "neutral"}>
                {isActive ? M.STATUS.ACTIVE : M.STATUS.INACTIVE}
              </Badge>
            </div>
            <FormRow className="!mb-0" columns={2}>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">
                  <Badge variant={record?.role === "super_admin" ? "danger" : "info"}>
                    {record?.roleLabel}
                  </Badge>
                </div>
                <div className="mini-stat-lbl">{D.TIER}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val !text-[16px]">{record?.joined}</div>
                <div className="mini-stat-lbl">{D.JOINED}</div>
              </div>
            </FormRow>
          </div>

          <p className="fg-hint -mt-2 mb-5">{D.TIER_LOCKED_HINT}</p>

          {/* Your own account — say so before offering anything destructive. */}
          {isSelf && (
            <div className="mb-5 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3">
              <IconAlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--warning-icon)]" />
              <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--warning-text)]">
                {D.SELF_NOTICE}
              </p>
            </div>
          )}

          {/* Editable details */}
          <div className="sec-label">{D.IDENTITY}</div>
          <FormRow>
            <FormField label={`${D.FIRST_NAME} *`} error={errors.first_name?.message}>
              <Input error={!!errors.first_name} {...register("first_name")} />
            </FormField>
            <FormField label={D.LAST_NAME} error={errors.last_name?.message}>
              <Input {...register("last_name")} />
            </FormField>
          </FormRow>
          <FormField label={`${D.EMAIL} *`} error={errors.email?.message}>
            <Input type="email" error={!!errors.email} {...register("email")} />
          </FormField>

          <div className="sec-label mt-4">{D.CONTACT}</div>
          <FormRow>
            <FormField label={`${D.COUNTRY_CODE} *`} error={errors.country_code?.message}>
              <Input
                placeholder="+91"
                error={!!errors.country_code}
                {...register("country_code")}
              />
            </FormField>
            <FormField label={`${D.WHATSAPP} *`} error={errors.whatsapp_number?.message}>
              <Input error={!!errors.whatsapp_number} {...register("whatsapp_number")} />
            </FormField>
          </FormRow>

          {/* Security — the three actions that are not "save my edits". */}
          {canManageAdmins && (
            <>
              <div className="sec-label mt-4">{D.SECURITY}</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-[var(--t1)]">
                      {D.RESET_PASSWORD}
                    </div>
                    <p className="text-[12.5px] font-medium leading-relaxed text-[var(--t4)]">
                      {D.RESET_PASSWORD_HINT}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => setConfirming("reset")}
                  >
                    <IconKey size={15} className="mr-1" />
                    {D.RESET_PASSWORD}
                  </Button>
                </div>

                <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-[var(--t1)]">
                      {isActive ? D.DEACTIVATE : D.ACTIVATE}
                    </div>
                    <p className="text-[12.5px] font-medium leading-relaxed text-[var(--t4)]">
                      {D.DEACTIVATE_HINT}
                    </p>
                  </div>
                  <Button
                    variant={isActive ? "danger" : "primary"}
                    size="sm"
                    loading={isTogglingStatus}
                    // Withheld on your own account: deactivating the session you are
                    // signed in with logs you out with no way back in.
                    disabled={busy || isSelf}
                    onClick={() => (isActive ? setConfirming("status") : handleToggleStatus())}
                  >
                    {isActive ? (
                      <IconUserOff size={15} className="mr-1" />
                    ) : (
                      <IconUserCheck size={15} className="mr-1" />
                    )}
                    {isActive ? D.DEACTIVATE : D.ACTIVATE}
                  </Button>
                </div>

                <div className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-[var(--danger-text)]">
                      {D.DELETE}
                    </div>
                    <p className="text-[12.5px] font-medium leading-relaxed text-[var(--danger-text)] opacity-90">
                      {D.DELETE_HINT}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={isDeleting}
                    disabled={busy || isSelf}
                    onClick={() => setConfirming("delete")}
                  >
                    <IconTrash size={15} className="mr-1" />
                    {D.DELETE}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
          <div className="flex w-full justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-cancel"
              onClick={onClose}
              disabled={busy}
            >
              {canManageAdmins ? MESSAGES.COMMON.CANCEL : MESSAGES.COMMON.CLOSE}
            </button>
            {canManageAdmins && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit(onSubmit)}
                disabled={busy || !isDirty}
              >
                <IconDeviceFloppy size={16} />
                {isSaving ? D.SAVING : D.SAVE}
              </button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>

      <ConfirmDialog
        isOpen={confirming === "status"}
        onClose={() => setConfirming(null)}
        onConfirm={handleToggleStatus}
        isLoading={isTogglingStatus}
        title={M.CONFIRM.DEACTIVATE_TITLE}
        description={M.CONFIRM.DEACTIVATE_MESSAGE}
        confirmText={M.CONFIRM.DEACTIVATE_CTA}
        loadingText={M.CONFIRM.DEACTIVATING}
      />
      <ConfirmDialog
        isOpen={confirming === "reset"}
        onClose={() => setConfirming(null)}
        onConfirm={handleResetPassword}
        isLoading={isResetting}
        title={M.CONFIRM.RESET_TITLE}
        description={M.CONFIRM.RESET_MESSAGE}
        confirmText={M.CONFIRM.RESET_CTA}
        loadingText={M.CONFIRM.RESETTING}
      />
      <ConfirmDialog
        isOpen={confirming === "delete"}
        onClose={() => setConfirming(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={M.CONFIRM.DELETE_TITLE}
        description={M.CONFIRM.DELETE_MESSAGE}
        confirmText={M.CONFIRM.DELETE_CTA}
        loadingText={M.CONFIRM.DELETING}
      />
    </Sheet>
  );
}

export default AdminUserDetailDrawer;
