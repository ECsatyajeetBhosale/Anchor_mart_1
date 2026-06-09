import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/common/AppSidebar";
import { Header } from "@/components/common/Header";
import { useState, useEffect } from "react";

/**
 * Main dashboard shell layout.
 * Sidebar (left) + Header (top) + scrollable content area (right).
 * Matches the original Cloud Dock Light design exactly.
 */
export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""} ${mounted ? "in" : ""}`} id="app">
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      
      <Header collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <main className="main-content" id="mc">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
