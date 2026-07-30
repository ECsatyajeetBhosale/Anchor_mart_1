import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { BroadcastForm } from "./BroadcastForm";
import { RoleNotificationForm } from "./RoleNotificationForm";

const M = MESSAGES.NOTIFICATIONS;

const TAB_ROLE = "role";

/**
 * The admin notification console — composing and sending only.
 *
 * There is no sent-history endpoint on the backend, so this screen deliberately
 * shows no log. (It previously rendered a hardcoded one, which read as a real
 * audit trail while being fiction.)
 */
export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState(TAB_ROLE);

  return (
    <div className="page-enter">
      <PageHeader title={M.TITLE} subtitle={M.SUBTITLE} />

      <DynamicTabs
        value={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { value: TAB_ROLE, label: M.TABS.ROLE, content: <RoleNotificationForm /> },
          { value: "broadcast", label: M.TABS.BROADCAST, content: <BroadcastForm /> },
        ]}
      />
    </div>
  );
}

export default NotificationsPage;
