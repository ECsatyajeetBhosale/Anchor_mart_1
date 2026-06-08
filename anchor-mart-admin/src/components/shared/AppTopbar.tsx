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
    <header className="topbar">
      <div className="topbar-title" id="tb-title">
        {pageTitle}
      </div>

      <button className="tb-action" title="Notifications">
        <IconBell size={17} />
        <div className="tb-notif-dot" />
      </button>

      <button className="tb-action" title="Refresh data" onClick={handleRefresh}>
        <IconRefresh size={17} />
      </button>
    </header>
  );
}
