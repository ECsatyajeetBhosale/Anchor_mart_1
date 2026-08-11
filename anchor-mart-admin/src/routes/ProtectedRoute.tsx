import { useGetMeQuery } from "@/features/auth/api/authApi";
import { setUser } from "@/features/auth/slice/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { APP_ROUTES } from "@/lib/constants";
import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Protects all dashboard routes.
 * Redirects to /login if not authenticated.
 *
 * Also re-reads the signed-in identity once per app load. Admin tokens never
 * expire by design, so without this an account whose role changed would keep
 * the capability list it received at its last sign-in indefinitely — see
 * `setUser` in the auth slice. This is the one caller of `GET /admin/me/`, and
 * it is also what backfills `features` for a session persisted by a build that
 * predates it.
 */
export function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: me } = useGetMeQuery(undefined, { skip: !isAuthenticated });

  useEffect(() => {
    if (me) dispatch(setUser(me));
  }, [me, dispatch]);

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
}
