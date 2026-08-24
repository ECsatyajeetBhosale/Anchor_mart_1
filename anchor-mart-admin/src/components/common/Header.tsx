import { ConnectionStatus, requestBadgeSync, tagsForRoute } from "@/features/realtime";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { APP_ROUTES } from "@/lib/constants";
import { baseApi } from "@/lib/fetchUtils";
import { NAV_SECTIONS } from "@/lib/navigation";
import { IconBell, IconRefresh } from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Header(_props: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

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

      <button
        type="button"
        className="tb-action"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => navigate(APP_ROUTES.NOTIFICATIONS)}
      >
        <IconBell size={17} />
        <div className="tb-notif-dot" />
      </button>

      {/* Silent while the socket is healthy; speaks up only when the counts on
          screen have stopped being live. Sits beside refresh because that is the
          control it is telling the admin to reach for. */}
      <ConnectionStatus />

      <button type="button" className="tb-action" title="Refresh data" onClick={handleRefresh}>
        <IconRefresh size={17} />
      </button>
    </header>
  );
}
