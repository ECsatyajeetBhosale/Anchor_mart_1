import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconLogin,
} from "@tabler/icons-react";

import { useAppDispatch } from "@/hooks/useAppStore";
import { setCredentials } from "@/features/auth/slice/authSlice";
import { useLoginMutation } from "@/features/auth/api/authApi";
import { loginSchema, type LoginFormData } from "@/features/auth/schemas/loginSchema";
import { APP_ROUTES } from "@/lib/constants";
import { toast } from "sonner";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@anchormart.io",
      password: "password123",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      // For testing/development preview purposes when the server isn't running:
      // If VITE_API_BASE_URL points to localhost and we get a network error,
      // we can optionally log in with mock credentials if development mode is active.
      // Let's call the mutation first.
      const response = await login(data).unwrap();
      dispatch(setCredentials({ token: response.token, user: response.user }));
      toast.success(`Welcome back, ${response.user.name}!`);
      navigate(APP_ROUTES.DASHBOARD, { replace: true });
    } catch (err: any) {
      console.error("Login error:", err);
      // Let's check if we are in development mode and the request failed (e.g. server offline)
      // to allow easy local developer evaluation without a running Django backend
      const isDev = import.meta.env.DEV;
      if (isDev && (err.status === "FETCH_ERROR" || err.code === "ERR_NETWORK")) {
        // Mock success fallback for preview/developer demo
        const mockUser = {
          id: "1",
          email: data.email,
          name: "Satyajeet Bhosale",
          role: "Super Admin",
        };
        dispatch(setCredentials({ token: "mock-dev-token-xyz123", user: mockUser }));
        toast.success(`[DEV MOCK] Welcome back, ${mockUser.name}!`);
        navigate(APP_ROUTES.DASHBOARD, { replace: true });
      } else {
        const errorMsg = err?.data?.non_field_errors?.[0] || err?.data?.detail || "Invalid email or password. Please try again.";
        setApiError(errorMsg);
      }
    }
  };

  return (
    <div className="login-screen" id="ls">
      {/* Background decoration */}
      <div className="lbg">
        <div className="lbg-grid" />
        <div className="lbg-dots" />
        <div className="lbg-blob b1" />
        <div className="lbg-blob b2" />
        <div className="lbg-blob b3" />
      </div>

      <div className="login-card">
        {/* Left Hero Panel */}
        <div className="login-hero">
          <div className="lh-logo logo-only">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4IiB2aWV3Qm94PSIwIDAgMjAwIDI4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjkuNzExOSAyNy42NTM4TDM2LjU1NjIgNy40NTczM0g0MC4wNjYxTDQ2LjkzMjQgMjcuNjUzOEg0My4yMDMxTDM3LjU4NzMgOS48MjMySDM4Ljk5MTJMMzMuMzUzNSAyNy42NTM4SDI5LjcxMTlaTTMzLjEzNDEgMjMuMzI2TDM0LjA3NzQgMTkuNzc3Mkg0MS45NzQ2TDQyLjkzOTkgMjMuMzI2SDMzLjEzNDFaIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik00OC41MjU1IDI3LjY1MzhWNy40NTczM0g1MS40NjUxTDw5LjUyNSAyMS45OTg4SDU5LjA5OTFWNy40NTczM0g2Mi42MDlWMjcuNjUzOEg1OS42OTE0TDUwLjYwOTUgMTMuMTEyM0g1Mi4wMzU0VjI3LjY1MzhINDguNTI1NVoiIGZpbGw9IiNGRkZGRkYiLz4KPHBhdGggZD0iTTczLjU5MSAyOEM3Mi40MDY0IDI4IDcxLjMwMjIgMjcuNzQ5OSA3MC4yNzg1IDI3LjI0OThDNjkuMjY5NCAyNi43MzA1IDY4LjM5MTkgMjUuOTk5NiA2Ny42NDYxIDI1LjA1NzFDNjkuOTAwMiAyNC4xMTQ2IDY2LjMxNTIgMjMuMDA4NiA2NS45OTExIDIxLjczOTFDNjUuNDgxNiAyMC40Njk2IDY1LjI3NjkgMTkuMDc1MSA2NS4yNzY5IDE3LjU1NTZDNjUuMjc2OSAxNi4wMzYgNjUuNDgxNiAxNC42NDE1IDY1Ljg5MTEgMTMuMzcyQzY2LjMxNTIgMTIuMTAyNSA2Ni45MDAyIDEwLjk5NjUgNjcuNjQ2MSAxMC4wNTRDNjguNDA2NSA5LjExMTUyIDY5LjI5MTMgOC4zOTAyMiA3MC4zMDA0IDcuODkwMTJDNzEuMzA5NSA3LjM3MDc4IDcyLjQxMzcgNy4xMTExMSA3My42MTI5IDcuMTExMTFDNzQuOTQzNyA3LjExMTExIDc2LjE0MjkgNy40MTg4NyA3Ny4yMTA1IDguMDM0MzhDNzguMjkyOCA4LjYzMDY1IDc5LjE5OTUgOS41MTU0NSA3OS45MzA3IDEwLjY4ODhMNzcuNjQ5MyAxMy40NTg2Qzc3LjEyMjggMTIuNjY5OSA3Ni41Mzc4IDEyLjA4MzMgNzUuODk0MyAxMS42OTg2Qzc1LjI1MDggMTEuMjk0NyA3NC41NDg5IDExLjA5MjcgNzMuNzg4NCAxMS4wOTI3QzczLjA3MTggMTEuMDkyNyA3Mi40MTM3IDExLjQyNjYgNzEuODE0MSAxMS41NTQzQzcxLjIxNDUgMTEuODYyMSA3MC42OTUzIDEyLjMwNDUgNzAuMjU2NiAxMi44ODE1QzY5LjgxNzggMTMuNDU4NiA2OS40NzQxIDE0LjE0MTQgNjkuMjI1NSAxNC45M0M2OC45OTE1IDE1LjcxODYgNjguODc0NSAxNi41OTM4IDY4Ljg3NDUgMTcuNTU1NkM2OC44NzQ1IDE4LjUxNzMgNjguOTkxNSAxOS4zOTI1IDY5LjIyNTUgMjAuMTgxMUM2OS40NzQxIDIwLjk2OTcgNjkuODE3OCAyMS42NTI1IDcwLjI1NjYgMjIuMjI5NEM3MC42OTUzIDIyLjgwNjYgNzEuMjE0NSAyMy4yNDkgNzEuODE0MSAyMy41NTY4QzcyLjQxMzcgMjMuODY0NSA3My45NzE4IDI0LjAxODQgNzMuNzg4NCAyNC4wMTg0Qzc0LjU0ODkgMjQuMDE4NCA3NS4yNTA4IDIzLjgyNjEgNzUuODk0MyAyMy40NDE0Qzc2LjUzNzggMjMuMDM3NCA3Ny4xMjI4IDIyLjQzMTYgNzcuNjQ5MyAyMS42MjM3TDc5LjkzMDcgMjQuMzkzNUM3OS4xOTk1IDI1LjU2NjggNzguMjkyOCAyNi40NjEyIDc3LjIxMDUgMjcuMDc2N0M3Ni4xNDI5IDI3LjY5MjIgNzQuOTM2NCAyOCA3My41OTEgMjhaIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik05Mi44NjAyIDcuNDU3MzNIOTYuNDE0VjI3LjY1MzhIOTIuODYwMlY3LjQ1NzMzWk04NS44ODQzIDI3LjY1MzhIEDIuMzMwNlY3LjQ1NzMzSDg1Ljg4NDNWMjcuNjUzOFpNOTMuMTIzNSAxOS4zNzMySDg1LjYyMTFWMTUuNDIwNUg5My4xMjM1VjE5LjM3MzJaIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xMDcuNTA2IDI4QzEwNi4yOTIgMjggMTA1LjE2NiAyNy43NDAzIDEwNC4xMjcgMjcuMjIxQzEwMy4xMDQgMjYuNzAxNyAxMDIuMjEyIDI1Ljk3MDcgMTAxLjQ1MSAyNS4wMjgyQzEwMC43MDUgMjQuMDg1NyAxMDAuMTIgMjIuOTc5NyA5OS42OTYyIDIxLjcxMDNDOTkuMjg2NyAyMC40NDA4IDk5LjA4MTkgMTkuMDU1OSA5OS4wODE5IDE3LjU1NTZDOTkuMDgxOSAxNi4wNTUyIDk5LjI4NjcgMTQuNjcwMyA5OS42OTYyIDEzLjQwMDlDMTAwLjEyIDEyLjEzMTQgMTAwLjcxMyAxMS4wMjU0IDEwMS40NzMgMTAuMDgyOUMxMDIuMjM0IDkuMTQwMzcgMTAzLjEyNiA4LjQwOTQ1IDEwNC4xNDkgNy44OTAxMkMxMDUuMTczIDcuMzcwNzggMTA2LjI4NSA3LjExMTExIDEwNy40ODQgNy4xMTExMUMxMDguNjk4IDcuMTExMTEgMTA5LjgwOSA3LjM3MDc4IDExMC44MTggNy44OTAxMkMxMTEuODQyIDguNDA5NDUgMTEyLjcyNyA5LjE0MDM3IDExMy40NzIgMTAuMDgyOUMxMTQuMjMzIDExLjAyNTQgMTE0LjgyNSAxMi4xMzE0IDExNS4yNDkgMTMuNDAwOUMxMTUuNjczIDE0LjY1MTEgMTE1Ljg4NiAxNi4wMzYgMTE1Ljg4NiAxNy41NTU2QzExNS44ODYgMTkuMDU1OSAxMTUuNjczIDIwLjQ1MDQgMTE1LjI0OSAyMS43MzkxQzExNC44MjUgMjMuMDA4NiAxMTQuMjMzIDI0LjExNDYgMTEzLjQ3MiAyNS4wNTcxQzExMi43MjcgMjUuOTgwNCAxMTEuODQyIDI2LjcwMTcgMTEwLjgwOCAyNy4yMjFDMTA5LjgwOSAyNy43NDAzIDEwOC43MDUgMjggMTA3LjUwNiAyOFpNMTA3LjQ4NCAyNC4wMTg0QzEwOC4xNzEgMjQuMDE4NCAxMDguOCAyMy44NjQ1IDEwOS4zNyAyMy41NTY4QzEwOS45NTUgMjMuMjQ5IDExMC40NjcgMjIuODA2NiAxMTAuOTA2IDIyLjIyOTZDMTExLjM0NSAyMS42NTI1IDExMS42ODEgMjAuOTY5NyAxMTEuOTE1IDIwLjE4MTFDMTEyLjE2NCAxOS4zOTI1IDExMi4yODggMTguNTE3MyAxMTIuMjg4IDE3LjU1NTZDMTEyLjI4OCAxNi41OTM4IDExMi4xNjQgMTUuNzE4NiAxMTEuOTE1IDE0LjkzQzExMS42ODEgMTQuMTQxNCAxMTEuMzA1IDEzLjQ1ODYgMTEwLjkwNiAxMi44ODE1QzExMC40ODIgMTIuMzA0NSAxMDkuOTc3IDExLjg2MjEgMTEwLjkzOSAxMS41NTQzQzEwOC44MDcgMTEuMjQ2NiAxMDguMTcxIDExLjA5MjcgMTA3LjQ4NCAxMS4wOTI3QzEwNi43OTYgMTEuMDkyNyAxMDYuMTYgMTEuMjQ2NiAxMDUuNTc1IDExLjU1NDNDMTA1LjAwNSAxMS4eNjIxIDEwNC41IDEyLjMwNDUgMTA0LjA2MiAxMi44ODE1QzEwMy42MjMgMTMuNDU4NiAxMDMuMjc5IDE0LjE0MTQgMTAzLjAzMSAxNC45MUMxMDIuNzk3IDE1LjcxODYgMDIuNjggMTYuNTkzOCAxMDIuNjggMTcuNTU1NkMxMDIuNjggMTguNDk4MSAxMDIuNzk3IDE5LjM3MzIgMTAzLjAzMSAyMC4xODExQzEwMy4yNzkgMjAuOTY5NyAxMDMuNjE2IDIxLjY1MjUgMTA0LjA0IDIyLjIyOTZDMTA0LjQ3OCAyMi44MDY2IDEwNC45OSAyMy4yNDkgMTA1LjU3NSAyMy41NTY4QzEwNi4xNiAyMy44NjQ1IDEwNi43OTYgMjQuMDE4NCAxMDcuNDg0IDI0LjAxODRaIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xMTguNTU2IDI3LjY1MzhWNy40NTczM0gxMjUuMjAzQzEyNi41NzggNy40NTczMyAxMjcuNzYzIDcuNzU1NDcgMTI4Ljc1NyA4LjM1MTc1QzEyOS43NTEgOC45Mjg3OSAxMzAuNTE5IDkuNzY1NSAxMzEuMDYgMTAuODYxOUMxMzEuNjAxIDExLjk1ODMgMTMxLjg3MiAxMy4yNjYyIDEzMS44NzIgMTQuNzg1OEMxMzEuODcyIDE2LjI4NjEgMTMxLjYwMSAxNy41ODQ0IDEzMS4wNiAxOC42ODA4QzEzMC41MTkgMTkuNzU3OSAxMjkuNzUxIDIwLjU4NSAxMjguNzU3IDIxLjE2MjFDMTI3LjcwMyAyMS43MzkxIDEyNi41NzggMjIuMDI3NiAxMjUuMjAzIDIyLjAyNzZIMTIwLjUzMUwxMjIuMTEgMTkuOTc5MVYyNy42NTM4SDExOC41NTZaTTEyOC4zMTggIDI3LjY1MzhMMTI0LjQ3OSAyMC4zMjU0SDE4Mi4yNzRMMTMyLjE1NyAyNy42NTM4SDEyOC4zMThaTTEyMi4xMSAyMC40OTg1TDEyMC41MzEgMTguMzA1N0gxMjUuMDA2QzEyNi4xMDMgMTguMzA1NyAxMjYuOTIyIDE3Ljk5OCAxMjcuNDYzIDE3LjM4MjRDMTI4LjAwNCAxNi43NDc3IDEyOC4yNzQgMTUuODgyMSAxMjguMjc0IDE0Ljc4NThDMTI4LjI3NCAxMy42NzAxIDEyOC4wMDQgMTIuODA0NiAxMjcuNDYzIDEyLjE4OTFDMTI2LjkyMiAxMS41NzM2IDEyNi4xMDMgMTEuMjY1OCAxMjUuMDA2IDExLjY2NThIMTIwLjUzMUwxMjIuMTEgOS4wNDQyVjIwLjQ5ODVaIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xMzQuNjg4IDI3LjY1MzhWNy40NTczM0gxMzcuNjI3TDE0NC4xNjQgMjEuNzEwM0gxNDIuNjA3TDE0OS4wMzQgNy40NTczM0gxNTEuOTUyTDE1MS45OTYgMjcuNjUzOEgxNDguNjYxTDE0OC42MzkgMTQuMTc5OUgxNDkuMjU0TDE0NC4xMjEgMjUuNTE4N0gxNDIuNTE5TDEzNy4yNzYgMTQuMTc5OUgxMzguMDIyVjI3LjY1MzhIMTM0LjY4OFoiIGZpbGw9IiNGRkZGRkYiLz4KPHBhdGggZD0iTTE1My42MjEgMjcuNjUzOEwxNjAwLjQ2NSA3LjQ1NzczM0gxNjMuOTc1TDE3MC44NDEgMjc2NTM4SDE2Ny4xMTJMMTYxLjQ5NiA5LjgyMzJIMTYyLjlMMTU3LjI2MiAyNy42NTM4SDE1My42MjFaTTE1Ny4wNDMgMjMuMzI2TDE1Ny45ODYgMTkuNzc3MkgxNjUuODg0TTY2Ljg0OSAyMy4zMjZIMTU3LjA0M1oiIGZpbGw9IiNGRkZGRkYiLz4KPHBhdGggZD0iTTE3Mi40MzQgMjcuNjUzOFY3LjQ1NzMzSDE3OS4wODFDMTgwLjQ1NiA3LjQ1NzMzIDE4MS42NDEgNy43NTU0NyAxODIuNjM1IDguMzUxNzVDMTgzLjYzIDguOTI4NzkgMTg0LjM5NyA5Ljc2NTUgMTg0LjkzOCAxMC44NjE5QzE4NS40OCAxMS45NTgzIDE4NS43NSAxMy4yNjYyIDE4NS43NSAxNC43ODU4QzE4NS43NSAxNi4yODYxIDE4NS40OCAxNy41ODQ0IDE4NC45MzggMTguNjgwOEMxODQuMzk3IDE5Ljc1NzkgMTgzLjYzIDIwLjU4NSAxODIuNjM1IDIxLjE2MjFDMTgxLjY0MSAyMS43MzkxIDE4MC40NTYgMjIuMDI3NiAxNzkuMDgxIDIyLjAyNzZIMTc0LjQwOUwxNzUuOTg4IDE5Ljk3OTFWMjcuNjUzOEgxNzIuNDM0Wk0xODIuMTk2IDI3LjY1MzhMMTc4LjM1NyAyMC4zMjU0SDE4Mi4xNTJMMTg2LjAzNSAyNy4eNTM4SDE4Mi4xOTZaTTE3NS45ODggMjAuNDk4NUwxNzQuNDA5IDE4LjMwNTdIMTc4Ljg4NEMxNzkuOTgxIDE4LjMwNTcgMTgwLjggMTcuOTk4IDE4MS4zNDEgMTcuMzgyNEMxODEuODgyIDE2Ljc0NzcgMTgyLjE1MiAxNS44ODIxIDE4Mi4xNTIgMTQuNzg1OEMxODIuMTUyIDEzLjY3MDEgMTgxLjg4MiAxMi44MDQ2IDE4MS4zNDEgMTIuMTg5MUMxODAuOCAxMS41NzM2IDE3OS45ODEgMTEuMjY1OCAxNzguODg0IDExLjY2NThIMTc0LjQwOUwxNzUuOTg4IDkuMDQ0MlYyMC40OTg1WiIgZmlsbD0iI0ZGRkZGRi8+CjxwYXRoIGQ9Ik0xOTEuNTMyIDI3LjY1MzhWMTEuMjY1OEgxODYuNjE5VjcuNDU3MzNIMjAwVjExLjY2NThIMTk1LjA4NlYyNy42NTM4SDE5MS41MzJaIiBmaWxsPSIjRkZGRkZGIi8+PHBhdGggZD0iTTE2Ljc5MjcgNC45NTQ5NkMxNi43OTI3IDIuMjE4NDEgMTQuNTM1NSAwIDExLjc1MTIgMEM4Ljk2Njg5IDAgNi43MDk3NCAyLjIxODQxIDYuNzA5NzQgNC45NTQ5NlY2LjAxODAySDcuOTcwMTFMNy45NTk5OCA0Ljc5Mjc5QzguMDQ2MzYgMi44MDgxNSA5LjcxMDY2IDEuMjI1MjMgMTEuNzUxMiAxLjIyNTIzQzEzLjc5MTggMS4yMjUyMyAxNS40NTYxIDIuODA4MTUgMTUuNTQyNSA0Ljc5Mjc5TDE1LjUzMjMgNi4wMTgwMkgxNi43OTI3VjQuOTU0OTZaIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xMS44NDkxIDEwLjExODlDMTIuNDY5NSAxMC4xMTg5IDEyLjk3MjMgMTAuNTU5NiAxMi45NzIzIDExLjEwMzNWMTEuMTMxM0MxMi45NzIzIDExLjY3NSAxMi40OTY0IDEyLjExNTcgMTEuODQ5MSAxMi4xMTU3QzExLjIyODkgMTIuMTE1NyAxMC43MjYgMTEuNjc1IDEwLjcyNiAxMS4xMzEzVjExLjEwMzNDMTAuNzI2IDEwLjU1OTYgMTEuMjI4OCAxMC4xMTg5IDExLjg0OTEgMTAuMTE4OVoiIGZpbGw9IiNGRkZGRkYiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMy41MzkxIDI4SDBMMi4xOTk5MiA2LjAxODAySDIxLjcwNThMMjMuNTM5MSAyOFpNMTEuODg5NyA5LjQwNTQxQzEwLjc1MjQgOS45MDU0MSA5LjgzMTM4IDEwLjIwMTggOS44MzEzNyAxMS4xODUxQzkuODMxMzggMTEuODYzIDEwLjMwNTkgMTIuNTU5OCAxMC45NTAyIDEyLjg2MDNMMTEuMDE4OSAxNC4yNTcySDguMTA4NzdDNy43NTQ4NSAxNC4yNTczIDcuNDUxNzEgMTQuNTE5MyA3LjQ1MTcxIDE0Ljg0MjZDNy40YTE3MiAxNS4xNjU5IDcuNzU0ODUgMTUuNDI4IDguMTI4NzcgMTUuNDI4SDEwLjk1MjFMMTAuNjI4NCAyMS41MjY4QzkuMDY3ODMgMjMuNDU2NCA3LjQ0Njk3IDIwLjcwMjkgNi4zMTg3NCAxOS41ODYxTDcuMDY2MjMgMS43NTQ3TDQuNzE1MTcgMTcuMTUzNEw0LjQ3MzE2IDIwLjYwMjVMNS4yNDk2OCAxOS44OTM5QzYuMDI4MzIgMi4xNjcgNy41ODY4NyAyMy4wMDI2IDguOTkwNCAyMy45MzA2QzkuNzg1MjIgMjQuNDAxMSAxMC43OTQxIDI0Ljc3MTIgMTEuNjk2NCAyNS44Mzc4QzEyLjYzMzIgMjQuNzA5OSAxMy42OTQ3IDI0LjQxODggMTQuNTMwNCAyMy44NjM2QzE2LjI4MzYgMjIuNjk4NSAxNy41Mjc5IDIxLjczMDQgMTguMTA3NyAxOS44NjMyTDE5LjA2NTkgMjAuNDIzOUwxOC43NDg3IDE2Ljk2ODRMMTYuMzI2NiAxOS4xMjM5TDE3LjExMDYgMTkuNjc5MUMxNi40OTg3IDIwLjcwNTcgMTQuMDE4NSAyMy41NzUzIDEyLjgzNjUgMjEuNTg4MkwxMi40NjU1IDE1LjQyOEgxNS40NzgxQzE1Ljg1MiAxNS40MjggMTYuMTU1MiAxNS4xNjU5IDE2LjE1NTIgMTQuODQyNkMxNi4xNTUyIDE0LjUxOTMgMTUuODUxIDE0LjI1NzIgMTUuNDc4MSAxNC4yNTcySDEyLjM4OTFMMTIuNTA4NSAxMi44ODI5QzEzLjM0MzQgMTIuNjU1NyAxMy45NDggMTEuOTgxNCAxMy45NDgxIDExLjE4NTFDMTMuOTQ4IDEwLjIwMTggMTMuMDI2OSA5LjQwNTQxIDExLjg4OTcgOS45MDU0MVpNNy42NjMwNCA3LjYzOTY0QzcuNTYxNzkgNy42Mzk2NCA3LjQ3OTcxIDcuNzIwMzEgNy40Nzk3MSA3LjgxOTgyVjguMzYwMzZDNy40Mzk3MSA4LjUxOTU4IDcuMzQ4MzkgOC42NDg2NSA3LjE4NjM5IDguNjQ4NjVDNy4wMjQzOSA4LjY0ODY1IDYuODkzMDcgOC41MTk1OCA2Ljg5MzA3IDguMzYwMzZWNy44MTk4MkM2Ljg5MzA3IDcuNzIwMzEgNi44MTA5OSA3LjYzOTY0IDYuNzA5NzQgNy45Mzk2NEM2LjYwODQ5IDcuNjM5NjQgNi41MjY0MiA3LjcyMDMxIDYuNTI2NDIgNy44MTk4MlY4LjM2MDM2QzYuNTI2NDIgOC43MTg2IDYuODIxOSA5LjAwOTAxIDcuMTg2MzkgOS4wMDkwMUM3LjU1MDg4IDkuMDA5MDEgNy44NDYzNyA4LjcxODYgNy44NDYzNyA4LjM2MDM2VjcuODE5ODJDNy44NDYzNyA3LjcyMDMxIDcuNzY0MjkgNy42Mzk2NCA3LjY2MzA0IDcuNjM5NjRaTTE2LjcxOTQgNy42Mzk2NEMxNi42MTgxIDcuNjM5NjQgMTYuNTM2IDcuNzIwMzEgMTYuNTM2IDcuODE5ODJWOC4zNjAzNkMxNi41MzYgOC41MTk1OCAxNi40MDQ3IDguNjQ4NjUgMTYuMjQyNyA4LjY0ODY1QzE2LjA4MDcgOC42NDg2NSAxNS45NDk0IDguNTE5NTggMTUuOTQ5NCA4LjM2MDM2VjcuODE5ODJDMTUuOTQ5NCA3LjcyMDMxIDE1Ljg2NzMgNy42Mzk2NCAxNS43NjYxIDcuOTM5NjRDMTUuNjY0OCA3LjYzOTY0IDE1LjU4MjcgNy43MjUzMSAxNS41ODI3IDcuODE5ODJWOC4zNjAzNkMxNS41ODI3IDguNzE4NiAxNS44NzgyIDkuMDA5MDEgMTYuMjQyNyA5LjAwOTAxQzE2LjYwNzIgOS45MDkwMSAxNi45MDI3IDguNzE4NiAxNi45MDI3IDguMzYwMzZWNy44MTk4MkMxNi45MDI3IDcuNzIwMzEgMTYuODIwNiA3LjYzOTY0IDE2LjcxOTQgNy42Mzk2NFoiIGZpbGw9IiNGRkZGRkYiLz48L3N2Zz4="
              alt="AnchorMart Logo"
              className="logo-graphic"
            />
          </div>
          <div className="lh-headline">
            The command
            <br />
            bridge for your
            <br />
            maritime ops.
          </div>
          <div className="lh-desc">
            Complete visibility across sailor orders, delivery partner operations,
            inventory, and real-time port logistics.
          </div>
          <div className="lh-stats">
            <div className="lh-stat">
              <div className="lh-stat-val">2,847</div>
              <div className="lh-stat-lbl">Active Sailors</div>
            </div>
            <div className="lh-stat">
              <div className="lh-stat-val">64</div>
              <div className="lh-stat-lbl">Delivery Partners</div>
            </div>
            <div className="lh-stat">
              <div className="lh-stat-val">96.8%</div>
              <div className="lh-stat-lbl">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="login-form">
          <p className="lf-eyebrow">Admin Console</p>
          <h1 className="lf-title">Welcome back</h1>
          <p className="lf-sub">Sign in to access the AnchorMart control center.</p>

          {/* API Error Banner */}
          <div className={`l-alert err ${apiError ? "show" : ""}`}>
            <IconAlertCircle />
            <span>{apiError}</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div className="fg">
              <span className="fg-label">Email Address</span>
              <div className="fi-wrap">
                <IconMail className="fi-il" />
                <input
                  type="email"
                  className={`fi ${errors.email ? "err" : ""}`}
                  placeholder="admin@anchormart.io"
                  {...register("email")}
                />
              </div>
              <div className={`fi-err ${errors.email ? "show" : ""}`}>
                <IconAlertCircle />
                {errors.email?.message}
              </div>
            </div>

            {/* Password Field */}
            <div className="fg">
              <span className="fg-label">Password</span>
              <div className="fi-wrap">
                <IconLock className="fi-il" />
                <input
                  type={showPassword ? "text" : "password"}
                  className={`fi ${errors.password ? "err" : ""}`}
                  placeholder="Your password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="fi-ir"
                  onClick={() => setShowPassword((s) => !s)}
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
              <div className={`fi-err ${errors.password ? "show" : ""}`}>
                <IconAlertCircle />
                {errors.password?.message}
              </div>
            </div>

            {/* Remember & Forgot options */}
            <div className="l-row">
              <label className="l-check">
                <input type="checkbox" defaultChecked /> Remember me for 30 days
              </label>
              <span
                className="l-link"
                onClick={() => toast.info("Password reset must be initiated via system administrator.")}
              >
                Forgot password?
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`l-btn ${isLoading ? "loading" : ""}`}
              disabled={isLoading}
            >
              <div className="spin" />
              <span className="lbl flex aic justify-center gap-1.5">
                <IconLogin size={17} />
                Sign In to Console
              </span>
            </button>
          </form>

          <div className="lf-footer">
            Need access? <a>Contact your administrator</a>
          </div>
        </div>
      </div>
    </div>
  );
}
