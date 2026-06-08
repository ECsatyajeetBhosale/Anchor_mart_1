import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { AppTopbar } from "@/components/shared/AppTopbar";
import { useState, useEffect } from "react";

/**
 * Main dashboard shell layout.
 * Sidebar (left) + Topbar (top) + scrollable content area (right).
 * Matches the original Cloud Dock Light design exactly.
 */
export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""} ${mounted ? "in" : ""}`} id="app">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      
      <AppTopbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <main className="main-content" id="mc">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
