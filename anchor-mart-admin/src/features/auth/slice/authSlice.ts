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
     * `meta.remote` says where the sign-out came from, and only the session-sync
     * middleware reads it: a `true` means another tab already told everyone, so
     * this tab must not announce it again. Callers who are signing *this* tab
     * out — the sidebar, `useAuth`, the 401 handler, the socket's terminal auth
     * frame — keep calling `logout()` with no argument and get `false`.
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
      prepare: (options?: { remote?: boolean }) => ({
        payload: undefined,
        meta: { remote: options?.remote === true },
      }),
    },
  },
});

export const { setCredentials, setUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
