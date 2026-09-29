import { IconMapOff } from "@tabler/icons-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.COMMON.NOT_FOUND;

/**
 * Shown for an unknown URL inside the signed-in app (BUG-032). It used to
 * redirect silently to the Dashboard, which hid a mistyped or stale link.
 */
export function NotFoundPage() {
  useEffect(() => {
    document.title = `${M.TITLE} · ${MESSAGES.COMMON.APP_TITLE}`;
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-alt)] text-[var(--t4)]">
        <IconMapOff size={24} />
      </div>
      <h1 className="pg-title">{M.TITLE}</h1>
      <p className="pg-sub">{M.MESSAGE}</p>
      <Link to={APP_ROUTES.DASHBOARD} className="btn btn-primary mt-2">
        {M.ACTION}
      </Link>
    </div>
  );
}

export default NotFoundPage;
