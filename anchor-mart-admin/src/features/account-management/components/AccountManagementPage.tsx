import { IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import type { UserRole } from "../types/user.types";
import { AdminUsersTab } from "./AdminUsersTab";
import { CreateUserDrawer } from "./CreateUserDrawer";
import { DeletionRequestsTab } from "./DeletionRequestsTab";
import { ProvisionUsersTab } from "./ProvisionUsersTab";

const M = MESSAGES.ACCOUNT_MANAGEMENT;

const TAB_DELETIONS = "deletions";
const TAB_PROVISION = "provision";
const TAB_ADMINS = "admins";

/**
 * Flow 31 — Account Management.
 *
 * Provisioning used to live under Settings and deletion review on its own
 * screen, which split one lifecycle across two places: the screen that creates
 * an account was not the screen that erases it. They are one page now, with a
 * tab each.
 *
 * Two layout decisions worth keeping:
 *
 * - **Create User is pinned to the page header**, not to a tab. It is the
 *   page's primary action and stays reachable while reviewing deletions —
 *   moving it into the provisioning tab would hide the most common thing an
 *   admin comes here to do behind a tab switch.
 * - **The KPI cards live inside the deletions tab.** They count deletion
 *   requests; above the tab bar they would also head the provisioning tab,
 *   attaching numbers to a screen they say nothing about.
 *
 * The active tab is held in the URL alongside the queue's existing filter
 * params, so a link to a filtered queue still opens on the queue.
 *
 * **Admin Users is a super-admin tab and is not rendered below that tier.**
 * Managing admin accounts is gated server-side, and creating one is refused
 * outright (SEC-1) — so a sub-admin has nothing to do there. Showing the tab
 * and then explaining it is off-limits advertises a permission they cannot get;
 * omitting it keeps the page to what they can actually act on.
 */
export function AccountManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [presetRole, setPresetRole] = useState<UserRole | undefined>(undefined);

  const { isSuperAdmin } = useAdminAccess();

  // Which tabs this admin actually has. Admin Users is dropped below super
  // admin, so `?tab=admins` on a shared link falls through to the queue rather
  // than selecting a tab that isn't in the list.
  const tabs = isSuperAdmin
    ? [TAB_DELETIONS, TAB_PROVISION, TAB_ADMINS]
    : [TAB_DELETIONS, TAB_PROVISION];

  // An unknown, hand-edited or now-unavailable `?tab=` falls back to the queue
  // rather than rendering nothing.
  const tabRaw = searchParams.get("tab") ?? "";
  const activeTab = tabs.includes(tabRaw) ? tabRaw : TAB_DELETIONS;

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === TAB_DELETIONS) {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }
    setSearchParams(next);
  };

  /** Opens the create drawer; a role locks the picker for role-scoped entry. */
  const openCreate = (role?: UserRole) => {
    setPresetRole(role);
    setIsCreateOpen(true);
  };

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openCreate(undefined)}>
            <IconUserPlus size={16} />
            {M.PROVISION.ADD_BUTTON}
          </button>
        }
      />

      <DynamicTabs
        value={activeTab}
        onTabChange={handleTabChange}
        tabs={[
          {
            value: TAB_DELETIONS,
            label: M.TABS.DELETIONS,
            content: <DeletionRequestsTab />,
          },
          {
            value: TAB_PROVISION,
            label: M.TABS.PROVISION,
            content: <ProvisionUsersTab onCreate={openCreate} />,
          },
          // Super admin only — see the note on this component.
          ...(isSuperAdmin
            ? [
                {
                  value: TAB_ADMINS,
                  label: M.TABS.ADMINS,
                  content: <AdminUsersTab />,
                },
              ]
            : []),
        ]}
      />

      {/* One drawer for both entry points — the header button and every role
          row — so there is a single create form on the page. */}
      <CreateUserDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        lockedRole={presetRole}
      />
    </div>
  );
}

export default AccountManagementPage;
