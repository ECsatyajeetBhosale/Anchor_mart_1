import { AppSidebar } from "@/components/common/AppSidebar";
import { Header } from "@/components/common/Header";
import { ChatSocketProvider } from "@/features/chat";
import { usePushNotifications } from "@/features/push";
import { useRealtimeBadges } from "@/features/realtime";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ChatSocketProvider>
      <div className={`app-shell ${collapsed ? "collapsed" : ""} ${mounted ? "in" : ""}`} id="app">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        <Header collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        <main className="main-content" id="mc">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </ChatSocketProvider>
  );
}
