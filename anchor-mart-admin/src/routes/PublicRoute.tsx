import { useAppSelector } from "@/hooks/useAppDispatch";
import { APP_ROUTES } from "@/lib/constants";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Guards the auth routes — the mirror of {@link ProtectedRoute}.
 *
 * Signing in navigates to the dashboard with `replace`, which drops the login
 * entry it came from. That is not enough on its own, because it only removes
 * the *last* one: reaching OTP sign-in pushes `/login/otp` on top of `/login`,
 * so after a successful OTP sign-in the history still reads
 * `[/login, /dashboard]` and Back lands on a login form the admin has already
 * satisfied. Typing the URL, or a bookmark, gets there just as easily.
 *
 * `replace` here matters as much as the redirect does. Consuming the entry it
 * bounced off means a second Back press continues out of the app rather than
 * hitting the same `/login` again — a push would trap the admin between two
 * entries that both resolve to the dashboard.
 */
export function PublicRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={APP_ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}
