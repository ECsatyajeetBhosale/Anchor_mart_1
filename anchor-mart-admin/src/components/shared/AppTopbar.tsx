import { useLocation } from "react-router-dom";
import { IconBell, IconRefresh } from "@tabler/icons-react";
import { NAV_SECTIONS } from "@/constants/navigation";
import { toast } from "sonner";

interface AppTopbarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppTopbar({ collapsed, onToggle }: AppTopbarProps) {
  const location = useLocation();

  // Find the page title based on active path
  let pageTitle = "Dashboard";
  for (const section of NAV_SECTIONS) {
    const matched = section.items.find((item) => item.path === location.pathname);
    if (matched) {
      pageTitle = matched.label;
      break;
    }
  }

  function handleRefresh() {
    toast.info("Refreshing page data...");
    // Future API reload trigger logic can go here
  }

  return (
    <header
      className="topbar"
      style={{
        height: "var(--topbar-h)",
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border-sm)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: "16px",
        zIndex: 90,
        position: "sticky",
        top: 0,
        boxShadow: "0 4px 12px rgba(10, 22, 40, 0.03)",
      }}
    >
      <div
        className="topbar-title"
        style={{
          fontSize: "15.5px",
          fontWeight: 800,
          color: "var(--t1)",
          flex: 1,
          letterSpacing: "-0.2px",
        }}
      >
        {pageTitle}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Notifications */}
        <button
          className="tb-action"
          title="Notifications"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--border-sm)",
            background: "var(--surface)",
            color: "var(--t3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.15s",
          }}
        >
          <IconBell size={17} />
          <span
            className="tb-notif-dot"
            style={{
              position: "absolute",
              top: "7px",
              right: "7px",
              width: "7px",
              height: "7px",
              background: "var(--danger-icon)",
              borderRadius: "50%",
              border: "1.5px solid var(--surface)",
            }}
          />
        </button>

        {/* Refresh */}
        <button
          className="tb-action"
          title="Refresh data"
          onClick={handleRefresh}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-sm)",
            border: "1.5px solid var(--border-sm)",
            background: "var(--surface)",
            color: "var(--t3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <IconRefresh size={17} />
        </button>
      </div>
    </header>
  );
}
