import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconArrowLeft, IconChevronRight, IconInfoCircle, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ROLE_MANAGED_AT, ROLE_NOTES, ROLE_OPTIONS } from "../lib/roles";
import type { UserRole } from "../types/settings.types";
import { CreateUserDrawer } from "./CreateUserDrawer";

/**
 * User provisioning.
 *
 * `create-user` is one endpoint for all five roles, so creation lives in one
 * place rather than being duplicated per role screen. There is no
 * list-users endpoint, so this page provisions accounts and points at
 * whichever screen manages each role afterwards.
 */
export function UsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<UserRole | undefined>(undefined);

  const openFor = (role?: UserRole) => {
    setPresetRole(role);
    setIsCreateOpen(true);
  };

  return (
    <div>
      <PageHeader
        title={MESSAGES.SETTINGS.USERS.PAGE_TITLE}
        subtitle={MESSAGES.SETTINGS.USERS.PAGE_SUBTITLE}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openFor(undefined)}>
            <IconUserPlus size={16} />
            {MESSAGES.SETTINGS.USERS.ADD_BUTTON}
          </button>
        }
      />

      <Link
        to={APP_ROUTES.SETTINGS}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--teal-600)] hover:text-[var(--teal-700)]"
      >
        <IconArrowLeft size={15} />
        {MESSAGES.SETTINGS.FAQ.BACK_TO_SETTINGS}
      </Link>

      <div className="mb-5 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3">
        <IconInfoCircle size={17} className="mt-0.5 shrink-0 text-[var(--info-icon)]" />
        <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--info-text)]">
          {MESSAGES.SETTINGS.USERS.NO_LIST_NOTICE}
        </p>
      </div>

      <div className="card p-5">
        <div className="sec-label">{MESSAGES.SETTINGS.USERS.SECTIONS.ROLES}</div>
        <div className="flex flex-col gap-2">
          {ROLE_OPTIONS.map((role) => {
            const managedAt = ROLE_MANAGED_AT[role.value];
            return (
              <div
                key={role.value}
                className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--border-lg)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-[13.5px] font-bold text-[var(--t1)]">{role.label}</span>
                    <span className="mono text-[11px] font-semibold text-[var(--t4)]">
                      {role.value}
                    </span>
                  </div>
                  <p className="text-[12.5px] font-medium leading-relaxed text-[var(--t4)]">
                    {ROLE_NOTES[role.value]}
                  </p>
                </div>

                {managedAt ? (
                  <Link
                    to={managedAt.path}
                    className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[var(--teal-600)] hover:text-[var(--teal-700)]"
                  >
                    {managedAt.label}
                    <IconChevronRight size={15} />
                  </Link>
                ) : (
                  <Badge variant="warning">{MESSAGES.SETTINGS.USERS.NOT_MANAGEABLE}</Badge>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm shrink-0"
                  onClick={() => openFor(role.value)}
                >
                  <IconUserPlus size={14} />
                  {MESSAGES.SETTINGS.USERS.CREATE_SHORT}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <CreateUserDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        lockedRole={presetRole}
      />
    </div>
  );
}
