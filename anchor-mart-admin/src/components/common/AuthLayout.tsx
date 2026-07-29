import { Outlet } from "react-router-dom";

/**
 * Auth layout — wraps the login page.
 * Full-screen centered layout with the AnchorMart branding background.
 */
export function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Outlet />
    </div>
  );
}
