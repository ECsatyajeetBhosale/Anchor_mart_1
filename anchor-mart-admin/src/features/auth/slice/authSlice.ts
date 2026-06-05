import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AdminUser, AuthState } from "../types/auth";

const TOKEN_KEY = "am_admin_token";

function loadToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  token: loadToken(),
  user: null,
  isAuthenticated: !!loadToken(),
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: AdminUser }>,
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isLoading = false;
      try {
        localStorage.setItem(TOKEN_KEY, action.payload.token);
      } catch {
        // localStorage unavailable — session-only auth
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
    },
  },
});

export const { setCredentials, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
