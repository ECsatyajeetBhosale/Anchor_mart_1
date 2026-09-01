import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { BroadcastForm } from "./BroadcastForm";
import { NotificationHistoryTab } from "./NotificationHistoryTab";
import { RoleNotificationForm } from "./RoleNotificationForm";

const M = MESSAGES.NOTIFICATIONS;

const TAB_ROLE = "role";

/**
 * The admin notification console (Flow 32) — compose, preview the audience, send,
 * and see what actually went out.
 *
 * **Outbound only.** What this admin *receives* lives on its own screen
 * (`NotificationInboxPage`, reached from the topbar bell) — the two answer
 * opposite questions, and merging them made the bell open a compose form.
 *
 * The History tab reads the real `GeneralNotification` log. An earlier version
 * of this screen rendered a *hardcoded* log, which read as an audit trail while
 * being fiction; it was removed rather than faked, and is only back now that
 * there is an endpoint behind it.
 */
export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState(TAB_ROLE);

  return (
    <div className="page-enter">
      <PageHeader title={M.TITLE} />

      <DynamicTabs
        value={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { value: TAB_ROLE, label: M.TABS.ROLE, content: <RoleNotificationForm /> },
          { value: "broadcast", label: M.TABS.BROADCAST, content: <BroadcastForm /> },
          { value: "history", label: M.TABS.HISTORY, content: <NotificationHistoryTab /> },
        ]}
      />
    </div>
  );
}

export default NotificationsPage;
