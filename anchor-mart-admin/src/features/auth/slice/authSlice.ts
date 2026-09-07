import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { AdminUser, AuthState } from "../types/auth.types";

/**
 * Exported because the cross-tab session sync watches this exact key: removing
 * it is what every *other* tab sees as "the session ended". Two spellings of it
 * would mean a sign-out that no other tab notices.
 */
export const AUTH_TOKEN_STORAGE_KEY = "am_admin_token";
const TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY;
const USER_KEY = "am_admin_user";

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function loadUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  token: loadToken(),
  user: loadUser(),
  isAuthenticated: !!loadToken(),
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token: string; user: AdminUser }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
      try {
        localStorage.setItem(TOKEN_KEY, action.payload.token);
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user));
      } catch {
        // localStorage unavailable — session-only auth
      }
    },
    /**
     * Replace the stored identity without touching the token — what the app-load
     * `GET /admin/me/` refresh dispatches.
     *
     * Admin tokens never expire by design, so a session that is not re-read
     * would keep the `features` list it was issued at its last sign-in
     * indefinitely: a demoted admin would go on seeing controls the server now
     * refuses, and a promoted one would not see their new ones until they
     * happened to log out.
     */
    setUser: (state, action: PayloadAction<AdminUser>) => {
      state.user = action.payload;
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(action.payload));
      } catch {
        // localStorage unavailable — session-only auth
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    /**
     * Ends the session in this tab.
     *
     * The two meta flags both mean "somebody else has already done part of
     * this", and only the session-sync middleware reads them:
     *
     * - `remote` — another tab signed out and told us, so this tab must not
     *   announce it again or one click becomes one message per open tab.
     * - `revoked` — the token is already dead server-side (a 401, or the badge
     *   socket's terminal auth frame), so calling the logout endpoint would be
     *   asking a dead token to invalidate itself. It would also 401, which
     *   dispatches `logout()` again: the loop this flag exists to stop.
     *
     * A caller signing *this* tab out deliberately — the sidebar, `useAuth` —
     * passes neither, and gets the full treatment including the server call.
     */
    logout: {
      reducer: (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        try {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } catch {
          // ignore
        }
      },
      prepare: (options?: { remote?: boolean; revoked?: boolean }) => ({
        payload: undefined,
        meta: {
          remote: options?.remote === true,
          revoked: options?.revoked === true,
        },
      }),
    },
  },
});

export const { setCredentials, setUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
