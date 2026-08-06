import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  IconBuildingStore,
  IconChevronRight,
  IconInfoCircle,
  IconMotorbike,
  IconShieldLock,
  IconUserCog,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_MANAGED_AT, ROLE_NOTES, ROLE_OPTIONS } from "../lib/roles";
import { isAdminTierRole } from "../types/adminUser.types";
import type { UserRole } from "../types/user.types";

const P = MESSAGES.ACCOUNT_MANAGEMENT.PROVISION;

/**
 * A glyph per role, so the directory scans by shape rather than by reading five
 * near-identical rows. Each matches the icon that role already carries in the
 * sidebar, so "Sailor" looks the same here as it does under Sailors.
 */
const ROLE_ICON: Record<UserRole, ComponentType<{ size?: number }>> = {
  customer: IconUsers,
  delivery_partner: IconMotorbike,
  seller: IconBuildingStore,
  admin: IconUserCog,
  super_admin: IconShieldLock,
};

/** Tint per role — the same accent vocabulary the stat cards use. */
const ROLE_TINT: Record<UserRole, string> = {
  customer: "bg-[var(--navy-50)] text-[var(--navy-600)]",
  delivery_partner: "bg-[var(--teal-50)] text-[var(--teal-600)]",
  seller: "bg-[var(--amber-50)] text-[var(--amber-700)]",
  admin: "bg-[var(--info-bg)] text-[var(--info-text)]",
  super_admin: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
};

export interface ProvisionUsersTabProps {
  /** Opens the create drawer, optionally locked to one role. */
  onCreate: (role?: UserRole) => void;
}

/**
 * Flow 31 §7 — provisioning.
 *
 * `create-user` is one endpoint for all five roles, so this is not a user table
 * — each role has its own screen. It is a role directory instead: what each
 * role means, where it is managed afterwards, and a create action scoped to it.
 *
 * **The two admin-tier rows are hidden below super admin.** Creating an `admin`
 * or `super_admin` is refused with a 403 (SEC-1), so for a sub-admin those rows
 * are two buttons that cannot work. Listing them and disabling them would
 * describe a capability they will never be granted from this screen; the picker
 * in the create drawer drops them on the same rule.
 */
export function ProvisionUsersTab({ onCreate }: ProvisionUsersTabProps) {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAdminAccess();

  const roles = isSuperAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => !isAdminTierRole(r.value));

  return (
    <SectionCard
      icon={<IconUserPlus size={18} />}
      title={P.SECTION_TITLE}
      actions={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onCreate(undefined)}
        >
          <IconUserPlus size={15} />
          {P.ADD_BUTTON}
        </button>
      }
    >
      <p className="fg-hint mb-4">{P.SECTION_SUBTITLE}</p>

      <div className="mb-5 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3">
        <IconInfoCircle size={17} className="mt-0.5 shrink-0 text-[var(--info-icon)]" />
        <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--info-text)]">
          {P.NO_LIST_NOTICE}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {roles.map((role) => {
          const managedAt = ROLE_MANAGED_AT[role.value];
          const Icon = ROLE_ICON[role.value];
          return (
            <div
              key={role.value}
              // The whole row navigates to the screen that manages the role —
              // the small link on the right was the only way through and was
              // easy to miss. Admin and super-admin have no such screen, so
              // those rows stay inert rather than advertising a dead click.
              role={managedAt ? "button" : undefined}
              tabIndex={managedAt ? 0 : undefined}
              onClick={managedAt ? () => navigate(managedAt.path) : undefined}
              onKeyDown={
                managedAt
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(managedAt.path);
                      }
                    }
                  : undefined
              }
              className={cn(
                "flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-[var(--border-lg)]",
                managedAt && "cursor-pointer hover:bg-[var(--surface-alt)]",
              )}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${ROLE_TINT[role.value]}`}
              >
                <Icon size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-[13.5px] font-bold text-[var(--t1)]">{role.label}</span>
                  {/* The literal token the API accepts — worth showing beside
                      the friendly label when debugging a 400. */}
                  <span className="mono text-[11px] font-semibold text-[var(--t4)]">
                    {role.value}
                  </span>
                </div>
                <p className="text-[12.5px] font-medium leading-relaxed text-[var(--t4)]">
                  {ROLE_NOTES[role.value]}
                </p>
              </div>

              {managedAt ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[var(--teal-600)]">
                  {managedAt.label}
                  <IconChevronRight size={15} />
                </span>
              ) : (
                // Admin and super-admin have no list/remove endpoint at all —
                // say so rather than linking somewhere that can't help.
                <Badge variant="warning">{P.NOT_MANAGEABLE}</Badge>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreate(role.value);
                }}
              >
                <IconUserPlus size={14} />
                {P.CREATE_SHORT}
              </button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

export default ProvisionUsersTab;
