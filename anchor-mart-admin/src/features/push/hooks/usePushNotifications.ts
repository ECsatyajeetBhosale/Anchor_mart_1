import { useAppSelector } from "@/hooks/useAppDispatch";
import { MESSAGES } from "@/lib/messages";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useRegisterFcmTokenMutation } from "../api/pushApi";
import { isPushConfigured } from "../lib/firebaseConfig";
import {
  currentPermission,
  getDeviceToken,
  isPushSupported,
  onForegroundMessage,
  requestPermission,
} from "../lib/firebaseMessaging";
import type { PushState } from "../types/push.types";

const P = MESSAGES.PUSH;

/** Resolves the starting state from browser + build facts alone — no I/O. */
function initialState(): PushState {
  if (!isPushSupported()) return "unsupported";
  if (!isPushConfigured()) return "unconfigured";
  const permission = currentPermission();
  if (permission === "denied") return "denied";
  if (permission === "granted") return "enabled";
  return "prompt";
}

/**
 * Browser push registration for the signed-in admin (Flow 21 §9).
 *
 * **Mount exactly once**, in the app shell, alongside the badge socket. Two
 * copies would mint the same token twice and register it twice on every sign-in.
 *
 * The division of labour with the socket is worth stating, because they overlap
 * and neither replaces the other. `/ws/events/` is live and precise but only
 * while a tab is open; push survives a closed tab and a locked laptop but is
 * best-effort and carries no counts. An admin who never enables push loses
 * nothing they had before.
 *
 * ## Why enabling is a button, not something this does on sign-in
 *
 * It re-registers silently whenever permission is **already** granted — token
 * rotation means yesterday's token is not guaranteed to still be the one FCM
 * will deliver to, so "already enabled" still has to send. But it never raises
 * the permission prompt on its own. Chrome ignores a prompt not tied to a user
 * gesture, and Firefox blocks it outright; a blocked prompt is recorded as a
 * denial the admin never saw and cannot undo from script. Spending the one
 * chance at that prompt on a page load is how a panel ends up permanently unable
 * to ask. {@link enable} is the gesture-backed path, wired to the header button.
 */
export function usePushNotifications() {
  const token = useAppSelector((s) => s.auth.token);
  const [state, setState] = useState<PushState>(initialState);
  const [registerFcmToken] = useRegisterFcmTokenMutation();

  // Guards a re-register per sign-in. The effect below depends on the auth
  // token, so without this a re-render mid-session would re-send needlessly.
  const registeredFor = useRef<string | null>(null);

  /**
   * Mint a token and hand it to the backend. Returns whether it landed.
   *
   * Failures are deliberately quiet here — this runs unattended on mount, and an
   * admin who has not asked for anything should not be shown an error about a
   * feature they may not know exists. {@link enable} reports its own failures,
   * because there a human is waiting on the click.
   */
  const sendToken = useCallback(async (): Promise<boolean> => {
    const fcmToken = await getDeviceToken();
    if (!fcmToken) return false;
    try {
      await registerFcmToken({ fcm_token: fcmToken }).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [registerFcmToken]);

  // Silent re-registration for a browser that has already granted permission.
  useEffect(() => {
    if (!token) {
      // Signed out: let the next sign-in register again. The backend drops this
      // user's tokens on logout, so the row is gone server-side regardless — but
      // on a shared machine the next admin must send their own.
      registeredFor.current = null;
      return;
    }
    if (state !== "enabled" || registeredFor.current === token) return;
    registeredFor.current = token;
    let cancelled = false;
    void sendToken().then((ok) => {
      if (!cancelled && !ok) setState("error");
    });
    return () => {
      cancelled = true;
    };
  }, [token, state, sendToken]);

  // Foreground messages. FCM hands these to the page rather than the worker, so
  // without this an alert that arrives while the admin is looking at the panel
  // shows nothing at all.
  useEffect(() => {
    if (state !== "enabled") return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void onForegroundMessage(({ title, body }) => {
      if (title || body) toast.info(title ?? P.FOREGROUND_FALLBACK, { description: body });
    }).then((off) => {
      if (cancelled) off();
      else unsubscribe = off;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [state]);

  /**
   * The user-gesture path: prompt, mint, register, report.
   *
   * Safe to call in any state — the impossible ones return early rather than
   * throwing, so the button never has to guess whether it is allowed to run.
   */
  const enable = useCallback(async () => {
    if (state === "unsupported") return void toast.error(P.UNSUPPORTED);
    if (state === "unconfigured") return void toast.error(P.UNCONFIGURED);
    if (state === "denied") return void toast.error(P.DENIED_HINT);

    const permission = await requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "prompt");
      toast.error(P.DENIED_HINT);
      return;
    }
    const ok = await sendToken();
    setState(ok ? "enabled" : "error");
    if (ok) {
      registeredFor.current = token;
      toast.success(P.ENABLED);
    } else {
      toast.error(P.FAILED);
    }
  }, [state, sendToken, token]);

  return { state, enable };
}
