import { AppSidebar } from "@/components/common/AppSidebar";
import { Header } from "@/components/common/Header";
import { ChatSocketProvider } from "@/features/chat";
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
