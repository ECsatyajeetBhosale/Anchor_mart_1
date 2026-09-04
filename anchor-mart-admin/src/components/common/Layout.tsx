import { AppSidebar } from "@/components/common/AppSidebar";
import { Header } from "@/components/common/Header";
import { ChatSocketProvider } from "@/features/chat";
import { usePushNotifications } from "@/features/push";
import { useRealtimeBadges } from "@/features/realtime";
import { MESSAGES } from "@/lib/messages";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

/**
 * Main dashboard shell layout.
 * Sidebar (left) + Header (top) + scrollable content area (right).
 * Matches the original Cloud Dock Light design exactly.
 */
export function Layout() {
  // One badge socket for the whole panel, mounted here because this shell is the
  // one component that mounts exactly once. Per-screen would mean N copies of
  // every frame and N reconnect loops.
  useRealtimeBadges();

  // Browser push, mounted here for the same reason and with the same constraint:
  // exactly one copy. It used to ride along on the header's toggle button; with
  // that button gone this shell is what keeps it alive, and mounting it here is
  // also what makes the permission prompt appear on the first protected screen
  // an admin lands on rather than on the login page.
  usePushNotifications();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * Below 900px the sidebar is an off-canvas drawer rather than a grid column.
   * The open state lives here because the class that drives it sits on the
   * shell, and because both the header's button and the scrim have to reach it.
   * Above that breakpoint the class is inert — the CSS only acts on it inside
   * the mobile media query — so there is nothing to reset on resize.
   */
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  // A drawer left standing over the screen it just navigated to reads as a
  // stuck overlay. Navigating to the route you are already on does not change
  // `pathname`, so the sidebar closes itself on click as well.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Escape is what people try on any overlay before they look for its close
  // button, and this one deliberately has none — the scrim and the nav are the
  // ways out.
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <ChatSocketProvider>
      <div
        className={`app-shell ${collapsed ? "collapsed" : ""} ${mounted ? "in" : ""} ${
          navOpen ? "nav-open" : ""
        }`}
        id="app"
      >
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onNavigate={() => setNavOpen(false)}
        />

        {/* Dismiss layer for the mobile drawer. A button rather than a div so it
            is reachable by keyboard and announced as an action; `display:none`
            is avoided in the CSS so it can fade, and `visibility:hidden` keeps
            it out of the tab order while shut. Always rendered — mounting it
            with the drawer would give the fade nothing to start from. */}
        <button
          type="button"
          className="nav-scrim"
          aria-label={MESSAGES.COMMON.CLOSE_NAVIGATION}
          onClick={() => setNavOpen(false)}
        />

        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onOpenNav={() => setNavOpen(true)}
        />

        <main className="main-content" id="mc">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </ChatSocketProvider>
  );
}
