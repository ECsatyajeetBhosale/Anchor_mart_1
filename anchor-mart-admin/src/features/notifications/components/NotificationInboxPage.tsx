import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { NotificationInboxTab } from "./NotificationInboxTab";

const I = MESSAGES.NOTIFICATIONS.INBOX;

/**
 * The signed-in admin's own notification inbox — what was sent **to** them.
 *
 * Deliberately a screen of its own rather than a tab beside the composers. The
 * sibling `NotificationsPage` is entirely outbound — what this admin *sent to
 * other people* — and folding the two together made the topbar bell open a
 * compose form, answering a question nobody asked.
 *
 * It is also the recovery path the realtime contract names: socket frames are
 * never replayed, so an admin whose panel was closed when an order was assigned
 * to them finds the durable row here and nowhere else.
 */
export function NotificationInboxPage() {
  return (
    <div className="page-enter">
      <PageHeader title={I.PAGE_TITLE} subtitle={I.PAGE_SUBTITLE} />
      <NotificationInboxTab />
    </div>
  );
}

export default NotificationInboxPage;
