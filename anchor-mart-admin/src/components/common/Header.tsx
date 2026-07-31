import { APP_ROUTES } from "@/lib/constants";
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

      <button type="button" className="tb-action" title="Refresh data" onClick={handleRefresh}>
        <IconRefresh size={17} />
      </button>
    </header>
  );
}
