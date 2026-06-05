import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/hooks/useAppStore";
import { APP_ROUTES } from "@/lib/constants";

/**
 * Protects all dashboard routes.
 * Redirects to /login if not authenticated.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
