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

import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setCredentials } from "@/features/auth/slice/authSlice";
import { useLoginMutation } from "@/features/auth/api/authApi";
import { loginSchema, type LoginFormData } from "@/features/auth/schemas/auth.schema";
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
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const response = await login(data).unwrap();
      dispatch(setCredentials({ token: response.token, user: response.user }));
      toast.success(response.message || "Login successful");
      navigate(APP_ROUTES.DASHBOARD, { replace: true });
    } catch (err: unknown) {
      const error = err as { status?: string | number; data?: Record<string, unknown> };
      const errorData = error?.data as Record<string, string | string[]> | undefined;
      const errorMsg =
        (Array.isArray(errorData?.non_field_errors) ? errorData.non_field_errors[0] : null) ??
        (typeof errorData?.detail === "string" ? errorData.detail : null) ??
        (typeof errorData?.message === "string" ? errorData.message : null) ??
        "Invalid email or password. Please try again.";
      setApiError(errorMsg);
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
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4IiB2aWV3Qm94PSIwIDAgMjAwIDI4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjkuNzExOSAyNy42NTM4TDM2LjU1NjIgNy40NTczM0g0MC4wNjYxTDQ2LjkzMjQgMjcuNjUzOEg0My4yMDMxTDM3LjU4NzMgOS44MjMySDM4Ljk5MTJMMzMuMzUzNSAyNy42NTM4SDI5LjcxMTlaTTMzLjEzNDEgMjMuMzI2TDM0LjA3NzQgMTkuNzc3Mkg0MS45NzQ2TDQyLjkzOTkgMjMuMzI2SDMzLjEzNDFaIiBmaWxsPSIjRkZGRkZGIi8+"
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
