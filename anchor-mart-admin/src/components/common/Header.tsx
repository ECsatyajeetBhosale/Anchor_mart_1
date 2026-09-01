import { selectUnreadCount, useGetNotificationInboxQuery } from "@/features/notifications";
import { PushToggleButton } from "@/features/push";
import {
  ConnectionStatus,
  isSoundMuted,
  requestBadgeSync,
  setSoundMuted,
  subscribeSoundMuted,
  tagsForRoute,
} from "@/features/realtime";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { APP_ROUTES } from "@/lib/constants";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import { NAV_SECTIONS } from "@/lib/navigation";
import { IconBell, IconRefresh, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const INBOX = MESSAGES.NOTIFICATIONS.INBOX;

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Header(_props: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // The preference lives outside React — the frame handler that plays the chime
  // is not in a component — so it is read through the store contract rather than
  // mirrored into state that could fall out of step with what actually sounds.
  const muted = useSyncExternalStore(subscribeSoundMuted, isSoundMuted, () => false);

  /**
   * Unread total behind the bell.
   *
   * Asks for the **unread-filtered** page, because the inbox payload carries no
   * `unread_count` — it is a plain DRF page, so the filtered `count` is the only
   * number that answers this. `selectUnreadCount` guards the case where the
   * server ignores the filter, which would otherwise light the bell permanently
   * and reinstate the hardcoded dot this replaced.
   *
   * Kept fresh by cache invalidation rather than a poll: the realtime layer
   * drops this tag on every `signal` and whenever the tab returns to the
   * foreground.
   */
  const { data: inbox } = useGetNotificationInboxQuery({ unreadOnly: true, limit: 10 });
  const unreadCount = selectUnreadCount(inbox);

  // Find the page title based on active path
  let pageTitle = "Dashboard";
  for (const section of NAV_SECTIONS) {
    const matched = section.items.find((item) => item.path === location.pathname);
    if (matched) {
      pageTitle = matched.label;
      break;
    }
  }

  /**
   * Manual refresh — the backstop for a socket that has silently died.
   *
   * The badge socket is best-effort: a tab left open behind a broken connection
   * shows stale numbers until something wakes it, which is exactly why this
   * button has to do real work. It did not: until now it fired a toast and
   * nothing else, so the one control an admin reaches for when the screen looks
   * wrong was a placebo.
   *
   * Both halves are refreshed, because either can be the stale one — the caches
   * behind the open screen, and the counters in the sidebar.
   */
  function handleRefresh() {
    const tags = tagsForRoute(location.pathname);
    if (tags.length > 0) dispatch(baseApi.util.invalidateTags(tags));
    requestBadgeSync();
    toast.info("Refreshing page data...");
  }

  return (
    <header className="topbar">
      <div className="topbar-title" id="tb-title">
        {pageTitle}
      </div>

      {/* The dot is driven by the real unread total. It used to be hardcoded —
          permanently lit, on every screen, for every admin — which trained
          everyone to ignore the one control that tells them work arrived.

          This is also the recovery surface for a missed assignment: socket
          frames are never replayed, so an admin whose panel was shut when an
          order was handed to them learns about it here. The realtime layer
          refetches this list on every signal and on foreground. */}
      <button
        type="button"
        className="tb-action"
        title={unreadCount > 0 ? INBOX.UNREAD_TITLE(unreadCount) : INBOX.NONE_UNREAD}
        aria-label={unreadCount > 0 ? INBOX.UNREAD_TITLE(unreadCount) : INBOX.NONE_UNREAD}
        onClick={() => navigate(APP_ROUTES.NOTIFICATION_INBOX)}
      >
        <IconBell size={17} />
        {unreadCount > 0 && <div className="tb-notif-dot" />}
      </button>

      {/* Silent while the socket is healthy; speaks up only when the counts on
          screen have stopped being live. Sits beside refresh because that is the
          control it is telling the admin to reach for. */}
      <ConnectionStatus />

      {/* Next to the connection state because both answer "why has this screen
          gone quiet?" — one because the socket died, one because you silenced it. */}
      <button
        type="button"
        className="tb-action"
        title={muted ? MESSAGES.REALTIME.SOUND_UNMUTE : MESSAGES.REALTIME.SOUND_MUTE}
        aria-label={muted ? MESSAGES.REALTIME.SOUND_UNMUTE : MESSAGES.REALTIME.SOUND_MUTE}
        aria-pressed={muted}
        onClick={() => setSoundMuted(!muted)}
      >
        {muted ? <IconVolumeOff size={17} /> : <IconVolume size={17} />}
      </button>

      {/* Push sits beside the chime for the same reason the chime sits beside
          the connection state: all three answer "will this console tell me when
          something happens?". This one is the only one that still answers yes
          with the tab closed. Renders nothing where push is unsupported or the
          deployment has no Firebase config. */}
      <PushToggleButton />

      <button type="button" className="tb-action" title="Refresh data" onClick={handleRefresh}>
        <IconRefresh size={17} />
      </button>
    </header>
  );
}
