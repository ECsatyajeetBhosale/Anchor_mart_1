import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { setCredentials, setLoading, logout } from "../slice/authSlice";
import { useLoginMutation, useLogoutMutation } from "../api/authApi";
import type { LoginFormData } from "../schemas/auth.schema";

/**
 * Custom hook encapsulating auth logic.
 * Provides login, logout, and auth state access.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { token, user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  const [loginMutation] = useLoginMutation();
  const [logoutMutation] = useLogoutMutation();

  async function login(data: LoginFormData) {
    dispatch(setLoading(true));
    try {
      const result = await loginMutation(data).unwrap();
      dispatch(setCredentials({ token: result.token, user: result.user }));
      return result;
    } catch (error) {
      dispatch(setLoading(false));
      throw error;
    }
  }

  function signOut() {
    logoutMutation();
    dispatch(logout());
  }

  return {
    token,
    user,
    isAuthenticated,
    isLoading,
    login,
    signOut,
  };
}
