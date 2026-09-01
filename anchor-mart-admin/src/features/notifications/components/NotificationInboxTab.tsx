import { useState } from "react";

import { badgeColumn, textColumn, twoLineColumn } from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetNotificationInboxQuery } from "../api/notificationInboxApi";
import type { AdminNotification } from "../types/notification.types";
import { NotificationDetailDrawer } from "./NotificationDetailDrawer";

const M = MESSAGES.NOTIFICATIONS;
const I = M.INBOX;

const LIMIT = 10;

/** `order_update` → `Order update`. Used for the open-ended enum fields. */
function humanise(key: string): string {
  if (!key) return "";
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The signed-in admin's notification inbox.
 *
 * **The recovery path for a missed assignment.** The realtime socket never
 * replays frames, so an admin whose panel was closed when an order was handed
 * to them gets no toast and no dot — the durable row lands here instead. That is
 * why the realtime layer refetches this list on every `signal` and whenever the
 * tab comes back to the foreground.
 *
 * Read-only apart from marking a row read: the rows are written by the backend,
 * and nothing here composes anything. The `NotificationsPage` in the sidebar is
 * the outbound half — what this admin *sent* — and shares none of this
 * module's plumbing.
 *
 * The row opens {@link NotificationDetailDrawer} rather than carrying an
 * actions column. A notification is a sentence written to be read, not a record
 * to be operated on: the table truncates it, the drawer shows it, and opening
 * it is what marks it read.
 */
export function NotificationInboxTab() {
  const [page, setPage] = useState(1);
  /** The row being read. Opening it is what marks it read — see the drawer. */
  const [opened, setOpened] = useState<AdminNotification | null>(null);

  const { data, isLoading, isError, refetch } = useGetNotificationInboxQuery({
    page,
    limit: LIMIT,
  });

  const rows = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const columns: Column<AdminNotification>[] = [
    twoLineColumn({
      id: "notification",
      header: I.TITLE,
      primary: (r) => r.title || M.DASH,
      secondary: (r) => r.message || M.DASH,
    }),
    badgeColumn({
      id: "type",
      header: I.TYPE,
      // Humanised rather than looked up: the kinds are open-ended, and a new
      // one must read sensibly on arrival instead of showing snake_case.
      get: (r) => humanise(r.type) || M.DASH,
      variant: "neutral",
    }),
    badgeColumn({
      id: "category",
      header: I.CATEGORY,
      get: (r) => I.CATEGORY_LABELS[r.category] ?? (humanise(r.category) || M.DASH),
      // Transactional is operational and always delivered; promotional is the
      // one that honours opt-outs, so it is the one worth colouring.
      variant: (r) => (r.category === "promotional" ? "amber" : "neutral"),
    }),
    badgeColumn({
      id: "state",
      header: I.UNREAD_BADGE,
      /**
       * Two different things share this column, and only ever one at a time:
       * an unread row is New, and a row demanding work is Action needed. A
       * "Read" badge on everything else would be noise on the state that needs
       * no attention.
       */
      get: (r) => (r.actionRequired ? I.ACTION_REQUIRED : r.isRead ? null : I.UNREAD_BADGE),
      variant: (r) => (r.actionRequired ? "warning" : "info"),
    }),
    textColumn({
      id: "received",
      // Rendered verbatim — the API sends a display string ("August 27, 2026,
      // 12:02 PM"), not ISO-8601, so parsing it yields Invalid Date.
      header: I.RECEIVED,
      get: (r) => r.createdAt || M.DASH,
      cellClassName: "td-m",
    }),
    // No actions column. A notification is a sentence to be read, not a record
    // to be operated on: the row opens it, and opening it is what marks it
    // read. Nor an Order column — the observed rows carry no order field, so it
    // would be a column of dashes.
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? I.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={setPage}
        showPagination
        emptyMessage={I.EMPTY}
        onRowClick={setOpened}
      />
      <NotificationDetailDrawer notification={opened} onClose={() => setOpened(null)} />
    </>
  );
}

export default NotificationInboxTab;
