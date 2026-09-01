import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { KV, Section } from "@/components/common/ReviewLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconBellRinging } from "@tabler/icons-react";
import { useMarkNotificationReadMutation } from "../api/notificationInboxApi";
import type { AdminNotification } from "../types/notification.types";

const M = MESSAGES.NOTIFICATIONS;
const I = M.INBOX;

/** `order_update` → `Order update`. Matches the list's treatment of the enums. */
function humanise(key: string): string {
  if (!key) return "";
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface NotificationDetailDrawerProps {
  /** The row being read. `null` closes the drawer. */
  notification: AdminNotification | null;
  onClose: () => void;
}

/**
 * The full text of one received notification.
 *
 * Built on the shared `ReviewLayout` primitives (`Section` + `KV`) so it reads
 * as the same object the Intents and Orders review drawers are — identity
 * header, then labelled sections of key/value facts — rather than as a
 * one-off. The message gets its own section above the facts because it is the
 * thing the admin opened this to read; everything else is provenance.
 *
 * **Opening marks it read.** That is what opening a message means in an inbox,
 * and the alternative — a row you have visibly just read still counting toward
 * the bell — is the behaviour people file bugs about.
 */
export function NotificationDetailDrawer({ notification, onClose }: NotificationDetailDrawerProps) {
  const navigate = useNavigate();
  const [markRead] = useMarkNotificationReadMutation();

  const id = notification?.id;
  const isUnread = notification ? !notification.isRead : false;

  useEffect(() => {
    if (!id || !isUnread) return;
    // Failure is deliberately quiet: the admin came here to read the message,
    // and a toast about bookkeeping they never asked for would bury it. The row
    // stays unread and the next open tries again.
    void markRead(id)
      .unwrap()
      .catch(() => undefined);
  }, [id, isUnread, markRead]);

  const openOrder = () => {
    if (!notification?.orderNumber) return;
    // Searched by number, matching every other order deep-link in the panel:
    // the id is advisory and a detail route keyed on it can legitimately 404.
    navigate(`${APP_ROUTES.ORDERS}?search=${encodeURIComponent(notification.orderNumber)}`);
    onClose();
  };

  return (
    <Sheet open={!!notification} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={560}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconBellRinging size={22} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-xl">{notification?.title || I.DETAIL_TITLE}</SheetTitle>
              <SheetDescription>{notification?.createdAt || M.DASH}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Sits above the facts and outside the KV grid: it is prose written
              to be read, and the two-column key/value shape fights that. */}
          <Section title={I.DETAIL_MESSAGE}>
            <p className="text-[13.5px] leading-relaxed text-[var(--t2)]">
              {notification?.message || I.DETAIL_NO_MESSAGE}
            </p>
          </Section>

          {/* The one row that changes what the admin should do next, so it is
              called out rather than left as another key/value line. */}
          {notification?.actionRequired && (
            <div className="mb-6 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-[12.5px] font-semibold leading-relaxed text-[var(--warning-text)]">
              <IconAlertTriangle size={15} className="mt-px shrink-0" />
              <span>{I.ACTION_REQUIRED_HINT}</span>
            </div>
          )}

          <Section title={I.DETAIL_ABOUT}>
            <KV label={I.TYPE} value={humanise(notification?.type ?? "")} />
            <KV
              label={I.CATEGORY}
              value={
                I.CATEGORY_LABELS[notification?.category ?? ""] ??
                humanise(notification?.category ?? "")
              }
            />
            <KV
              label={I.PRIORITY}
              value={
                I.PRIORITY_LABELS[notification?.priority ?? ""] ??
                humanise(notification?.priority ?? "")
              }
            />
            <KV label={I.DETAIL_RECEIVED} value={notification?.createdAt ?? ""} />
            {/* Absent on most kinds — the observed rows name no order — so the
                row appears only when there is genuinely one to name. */}
            {notification?.orderNumber && (
              <KV label={I.DETAIL_ORDER} value={notification.orderNumber} className="mono" />
            )}
          </Section>

          <Section title={I.DETAIL_STATE}>
            {/* Reads "Read" by the time it is on screen — opening the drawer is
                what marks it — so this records state rather than offering an
                action. */}
            <Badge variant={notification?.isRead ? "neutral" : "info"}>
              {notification?.isRead ? I.STATE_READ : I.STATE_UNREAD}
            </Badge>
          </Section>
        </div>

        <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
          <div className="flex w-full justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {I.CLOSE}
            </Button>
            {/* The one action a notification offers: go to the thing it is
                about. Absent when it points at nothing, which is most of them. */}
            {notification?.orderNumber && (
              <Button variant="primary" onClick={openOrder}>
                {I.VIEW_ORDER}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default NotificationDetailDrawer;
