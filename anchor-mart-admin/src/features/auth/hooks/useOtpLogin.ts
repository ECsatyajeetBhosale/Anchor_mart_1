import { useCallback, useEffect, useRef, useState } from "react";

import { useAppDispatch } from "@/hooks/useAppDispatch";
import { getApiMessage } from "@/lib/apiError";
import { getDeviceLabel } from "@/lib/device";
import { MESSAGES } from "@/lib/messages";
import { useRequestAdminOtpMutation, useVerifyAdminOtpMutation } from "../api/authApi";
import { setCredentials } from "../slice/authSlice";
import type { AdminUser } from "../types/auth.types";

const M = MESSAGES.AUTH.OTP;

/** Client-side fallback only — the server's countdown wins whenever it sends one. */
const DEFAULT_COOLDOWN_SECONDS = 120;

export type OtpStep = "email" | "code";

/**
 * Errors are split by where they render: `field` sits under the input,
 * `banner` sits in the step's single alert area.
 */
interface StepError {
  scope: "field" | "banner";
  message: string;
}

/** HTTP status off an RTK Query error, or null for network/parse failures. */
function statusOf(err: unknown): number | null {
  const status = (err as { status?: unknown } | undefined)?.status;
  return typeof status === "number" ? status : null;
}

/** Pull "N" out of a 429 body like "Please wait 47 seconds before requesting another". */
function parseCooldownSeconds(err: unknown): number | null {
  const match = /(\d+)\s*second/i.exec(getApiMessage(err) ?? "");
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function useOtpLogin(onAuthenticated: (user: AdminUser) => void) {
  const dispatch = useAppDispatch();
  const [requestOtp, { isLoading: isSending }] = useRequestAdminOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyAdminOtpMutation();

  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<StepError | null>(null);
  const [codeError, setCodeError] = useState<StepError | null>(null);
  /** Set when the server says the code expired — unlocks resend immediately. */
  const [isCodeExpired, setIsCodeExpired] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Keep the latest callback in a ref so the tick effect never re-subscribes.
  const onAuthenticatedRef = useRef(onAuthenticated);
  onAuthenticatedRef.current = onAuthenticated;

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  /**
   * Step 1 — request an OTP. Branches purely on HTTP status; the 404 collapse
   * (unknown email / wrong role / not an admin) is deliberate, so we don't try
   * to be more specific than the API.
   */
  const sendOtp = useCallback(
    async (rawEmail: string) => {
      const normalized = rawEmail.trim().toLowerCase();
      setEmailError(null);
      setCodeError(null);

      try {
        await requestOtp({ email: normalized }).unwrap();
        setEmail(normalized);
        setIsCodeExpired(false);
        setCooldown(DEFAULT_COOLDOWN_SECONDS);
        setStep("code");
        return { ok: true as const };
      } catch (err) {
        const status = statusOf(err);
        const serverMessage = getApiMessage(err);

        if (status === 429) {
          // A code is already in flight — sync the countdown and let them enter it
          // rather than stranding them on the email step.
          setEmail(normalized);
          setCooldown(parseCooldownSeconds(err) ?? DEFAULT_COOLDOWN_SECONDS);
          setStep("code");
          setCodeError({ scope: "banner", message: serverMessage ?? M.GENERIC_ERROR });
          return { ok: false as const };
        }

        if (status === 400) {
          setEmailError({ scope: "field", message: serverMessage ?? M.EMAIL_REQUIRED });
        } else if (status === 404) {
          setEmailError({ scope: "banner", message: M.NO_ACCOUNT });
        } else if (status === 403) {
          setEmailError({ scope: "banner", message: M.BLOCKED });
        } else {
          setEmailError({ scope: "banner", message: M.GENERIC_ERROR });
        }
        return { ok: false as const };
      }
    },
    [requestOtp],
  );

  const resendOtp = useCallback(() => {
    if (cooldown > 0 || isSending || !email) return;
    void sendOtp(email);
  }, [cooldown, isSending, email, sendOtp]);

  /** Step 2 — verify the code and persist the (non-expiring) admin token. */
  const submitOtp = useCallback(
    async (otp: string) => {
      setCodeError(null);

      const device = getDeviceLabel();
      try {
        const result = await verifyOtp({
          email,
          otp,
          // Omitted rather than sent as a placeholder when undetectable.
          ...(device ? { device } : {}),
        }).unwrap();

        dispatch(setCredentials({ token: result.token, user: result.user }));
        onAuthenticatedRef.current(result.user);
        return { ok: true as const };
      } catch (err) {
        const status = statusOf(err);
        const serverMessage = getApiMessage(err);

        if (status === 400) {
          // The only place we read the body text: 400 covers both "incorrect"
          // and "expired", and expiry needs a different affordance (resend).
          const expired = /expire/i.test(serverMessage ?? "");
          setIsCodeExpired(expired);
          if (expired) {
            setCooldown(0); // let them resend right away
            setCodeError({ scope: "banner", message: serverMessage ?? M.EXPIRED_HINT });
          } else {
            setCodeError({ scope: "field", message: serverMessage ?? M.OTP_REQUIRED });
          }
        } else if (status === 403) {
          // Not an admin, or blocked — no retrying the code. Back to step A.
          const blocked = /block/i.test(serverMessage ?? "");
          setStep("email");
          setIsCodeExpired(false);
          setCooldown(0);
          setEmailError({
            scope: "banner",
            message: blocked ? M.BLOCKED : M.NOT_ADMIN,
          });
        } else {
          setCodeError({ scope: "banner", message: M.GENERIC_ERROR });
        }
        return { ok: false as const };
      }
    },
    [dispatch, email, verifyOtp],
  );

  /** Back to step A to correct the email — drops all step-B state. */
  const backToEmail = useCallback(() => {
    setStep("email");
    setCodeError(null);
    setEmailError(null);
    setIsCodeExpired(false);
    setCooldown(0);
  }, []);

  return {
    step,
    email,
    emailError,
    codeError,
    isCodeExpired,
    cooldown,
    isSending,
    isVerifying,
    sendOtp,
    resendOtp,
    submitOtp,
    backToEmail,
  };
}
