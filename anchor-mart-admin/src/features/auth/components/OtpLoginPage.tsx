import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconMail,
  IconSend,
  IconShieldLock,
} from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useOtpLogin } from "../hooks/useOtpLogin";
import {
  type OtpCodeFormData,
  type OtpEmailFormData,
  otpCodeSchema,
  otpEmailSchema,
} from "../schemas/auth.schema";
import { AuthShell } from "./AuthShell";
import { OtpInput } from "./OtpInput";

const M = MESSAGES.AUTH.OTP;

/** ops@anchormart.example → op••@anchormart.example */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

/**
 * Two-step OTP sign-in. Scoped to OTP only — a password-login option can be
 * added later as a sibling link/tab beside the footer slot without touching
 * either step component.
 */
export function OtpLoginPage() {
  const navigate = useNavigate();
  const otp = useOtpLogin(() => {
    navigate(APP_ROUTES.DASHBOARD, { replace: true });
  });

  return (
    <AuthShell>
      {otp.step === "email" ? (
        <EmailStep
          defaultEmail={otp.email}
          isSending={otp.isSending}
          error={otp.emailError}
          onSubmit={async (data) => {
            const result = await otp.sendOtp(data.email);
            if (result.ok) toast.success(M.OTP_SENT);
          }}
        />
      ) : (
        <CodeStep
          email={otp.email}
          isVerifying={otp.isVerifying}
          isSending={otp.isSending}
          isCodeExpired={otp.isCodeExpired}
          cooldown={otp.cooldown}
          error={otp.codeError}
          onSubmit={(data) => otp.submitOtp(data.otp)}
          onResend={otp.resendOtp}
          onBack={otp.backToEmail}
        />
      )}
    </AuthShell>
  );
}

interface StepError {
  scope: "field" | "banner";
  message: string;
}

/* ── Step A — email ─────────────────────────────────────────── */

function EmailStep({
  defaultEmail,
  isSending,
  error,
  onSubmit,
}: {
  defaultEmail: string;
  isSending: boolean;
  error: StepError | null;
  onSubmit: (data: OtpEmailFormData) => unknown;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpEmailFormData>({
    resolver: zodResolver(otpEmailSchema),
    defaultValues: { email: defaultEmail },
  });

  // Client-side schema message first, then any 400 the server sent back.
  const fieldError =
    errors.email?.message ?? (error?.scope === "field" ? error.message : undefined);
  const bannerError = error?.scope === "banner" ? error.message : null;

  return (
    <>
      <p className="lf-eyebrow">Admin Console</p>
      <h1 className="lf-title">{M.EMAIL_STEP_TITLE}</h1>
      <p className="lf-sub">{M.EMAIL_STEP_SUB}</p>

      <div className={`l-alert err ${bannerError ? "show" : ""}`} role="alert">
        <IconAlertCircle />
        <span>{bannerError}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="fg">
          <label className="fg-label" htmlFor="otp-email">
            {MESSAGES.AUTH.EMAIL_LABEL}
          </label>
          <div className="fi-wrap">
            <IconMail className="fi-il" />
            <input
              id="otp-email"
              type="email"
              autoComplete="email"
              className={`fi ${fieldError ? "err" : ""}`}
              placeholder={MESSAGES.AUTH.EMAIL_PLACEHOLDER}
              aria-invalid={!!fieldError}
              disabled={isSending}
              {...register("email")}
            />
          </div>
          <div className={`fi-err ${fieldError ? "show" : ""}`}>
            <IconAlertCircle />
            {fieldError}
          </div>
        </div>

        <button
          type="submit"
          className={`l-btn ${isSending ? "loading" : ""}`}
          disabled={isSending}
        >
          <div className="spin" />
          <span className="lbl flex aic justify-center gap-1.5">
            <IconSend size={17} />
            {M.SEND_BUTTON}
          </span>
        </button>
      </form>

      {/* Sibling auth method — password sign-in (API 10, separate flow) */}
      <p className="lf-footer">
        {M.PREFER_PASSWORD}{" "}
        <Link className="l-link" to={APP_ROUTES.LOGIN}>
          {M.USE_PASSWORD_LINK}
        </Link>
      </p>
    </>
  );
}

/* ── Step B — 4-digit code ──────────────────────────────────── */

function CodeStep({
  email,
  isVerifying,
  isSending,
  isCodeExpired,
  cooldown,
  error,
  onSubmit,
  onResend,
  onBack,
}: {
  email: string;
  isVerifying: boolean;
  isSending: boolean;
  isCodeExpired: boolean;
  cooldown: number;
  error: StepError | null;
  onSubmit: (data: OtpCodeFormData) => unknown;
  onResend: () => void;
  onBack: () => void;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpCodeFormData>({
    resolver: zodResolver(otpCodeSchema),
    defaultValues: { otp: "" },
  });

  const fieldError = errors.otp?.message ?? (error?.scope === "field" ? error.message : undefined);
  const bannerError = error?.scope === "banner" ? error.message : null;
  const resendDisabled = cooldown > 0 || isSending;

  return (
    <>
      <button type="button" className="lf-back" onClick={onBack}>
        <IconArrowLeft size={15} />
        {M.CHANGE_EMAIL}
      </button>

      <p className="lf-eyebrow">Admin Console</p>
      <h1 className="lf-title">{M.CODE_STEP_TITLE}</h1>
      <p className="lf-sub">
        {M.CODE_STEP_SUB} <strong>{maskEmail(email)}</strong>
      </p>

      <div className={`l-alert err ${bannerError ? "show" : ""}`} role="alert">
        <IconAlertCircle />
        <span>{bannerError}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="fg">
          <span className="fg-label" id="otp-code-label">
            {M.CODE_LABEL}
          </span>
          <Controller
            name="otp"
            control={control}
            render={({ field }) => (
              <OtpInput
                value={field.value}
                onChange={field.onChange}
                // A complete code submits straight away — no extra click needed.
                onComplete={() => handleSubmit(onSubmit)()}
                error={!!fieldError}
                disabled={isVerifying}
                labelledBy="otp-code-label"
              />
            )}
          />
          <div className={`fi-err ${fieldError ? "show" : ""}`}>
            <IconAlertCircle />
            {fieldError}
          </div>
        </div>

        <button
          type="submit"
          className={`l-btn ${isVerifying ? "loading" : ""}`}
          disabled={isVerifying}
        >
          <div className="spin" />
          <span className="lbl flex aic justify-center gap-1.5">
            <IconShieldLock size={17} />
            {M.VERIFY_BUTTON}
          </span>
        </button>
      </form>

      <div className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--t4)]">
        {isCodeExpired && !resendDisabled ? (
          <span className="text-[var(--danger-text)]">{M.EXPIRED_HINT}</span>
        ) : null}
        <button
          type="button"
          className="l-link disabled:cursor-not-allowed disabled:text-[var(--t4)] disabled:opacity-70"
          onClick={onResend}
          disabled={resendDisabled}
        >
          {cooldown > 0 ? M.RESEND_IN(cooldown) : M.RESEND}
        </button>
      </div>
    </>
  );
}
