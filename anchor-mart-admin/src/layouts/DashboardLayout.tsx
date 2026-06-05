import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { AppTopbar } from "@/components/shared/AppTopbar";
import { useState } from "react";

/**
 * Main dashboard shell layout.
 * Sidebar (left) + Topbar (top) + scrollable content area (right).
 * Matches the original Cloud Dock Light design exactly.
 */
export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <AppTopbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

        <main
          id="main-content"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "26px 28px",
          }}
        >
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
