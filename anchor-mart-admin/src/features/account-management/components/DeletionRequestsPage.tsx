import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { DeletionRequestsTab } from "./DeletionRequestsTab";

const M = MESSAGES.ACCOUNT_MANAGEMENT;

/**
 * Flow 31 §8–11 — the account-deletion review queue, on its own route.
 *
 * Was the default tab of the combined Account Management screen; see
 * `AdminUsersPage` for why the tabs became paths.
 *
 * No Create User button here: this screen erases accounts, and pairing the two
 * actions in one header invited the wrong click. It lives with the admin
 * directory instead.
 *
 * Available to every admin tier — a sub-admin reviews deletion requests, which
 * is why this, not the admin directory, is what `/account-management` now lands
 * on for them.
 */
export function DeletionRequestsPage() {
  return (
    <div className="page-enter">
      <PageHeader title={M.TABS.DELETIONS} />
      <DeletionRequestsTab />
    </div>
  );
}

export default DeletionRequestsPage;
