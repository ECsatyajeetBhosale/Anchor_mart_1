import { IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import type { UserRole } from "../types/user.types";
import { AdminUsersTab } from "./AdminUsersTab";
import { CreateUserDrawer } from "./CreateUserDrawer";

const M = MESSAGES.ACCOUNT_MANAGEMENT;

/**
 * Flow 31 — admin accounts, on their own route.
 *
 * Was the `?tab=admins` tab of the combined Account Management screen. It became
 * a route when the sidebar grew an Account Management section: an entry per
 * screen needs a path per screen, since `NavLink` matches on pathname and every
 * `?tab=` link sharing `/account-management` would have rendered active at once.
 *
 * **Create User lives here** rather than on the deletion queue. It is the page's
 * natural companion — this is the only role with no other creation path, since a
 * sailor self-registers and a partner is onboarded from Delivery Partners — and
 * the drawer's own picker still offers every role an admin is allowed to create.
 *
 * **Super admin only.** Managing admin accounts is refused server-side below
 * that tier (SEC-1), so the sidebar drops the entry entirely; this guard is the
 * second line, for a typed URL or an old bookmark.
 */
export function AdminUsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<UserRole | undefined>(undefined);
  const { isSuperAdmin } = useAdminAccess();

  const openCreate = (role?: UserRole) => {
    setPresetRole(role);
    setIsCreateOpen(true);
  };

  if (!isSuperAdmin) {
    return (
      <div className="page-enter">
        <PageHeader title={M.TABS.ADMINS} />
        <div className="rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-[12.5px] font-semibold text-[var(--warning-text)]">
          {M.ADMINS_SUPER_ONLY}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TABS.ADMINS}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openCreate(undefined)}>
            <IconUserPlus size={16} />
            {M.PROVISION.ADD_BUTTON}
          </button>
        }
      />

      <AdminUsersTab />

      <CreateUserDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        lockedRole={presetRole}
      />
    </div>
  );
}

export default AdminUsersPage;
