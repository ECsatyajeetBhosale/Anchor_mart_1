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
import { describeError, fingerprintToken, pushLog } from "../lib/pushLog";
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
 * ## Registration is automatic on sign-in
 *
 * Every sign-in registers, in one of two ways depending on what the browser has
 * already been asked:
 *
 *  - permission **granted** — mint and send straight away. Token rotation means
 *    yesterday's token is not guaranteed to still be the one FCM will deliver
 *    to, so "already enabled" still has to send.
 *  - permission **default** — raise the prompt, then send if it is granted.
 *
 * The prompt is raised without a user gesture, which browsers treat unequally:
 *
 *  - **Chrome** shows it. It may use the quieter UI for a user who habitually
 *    blocks notifications, but the prompt is not suppressed.
 *  - **Firefox / Safari** require a gesture and resolve to `"default"` without
 *    showing anything. Crucially that is *not* a denial — permission is left
 *    untouched, so nothing is burned and a later gesture could still ask.
 *
 * So the auto-path is best-effort and never destructive: the worst case on a
 * gesture-strict browser is that nothing happens and push stays off there. A
 * `"denied"` answer is respected and never re-asked, since script cannot undo
 * it — only the admin can, in browser settings.
 *
 * {@link enable} is that gesture-backed path. Nothing calls it today — the
 * header toggle it belonged to was removed — and it is kept because it is the
 * only way push can ever be turned on in Firefox and Safari, so a future
 * control has something to call.
 */
/**
 * How often a still-signed-in tab re-checks whether FCM has rotated the token.
 *
 * Rotation is rare but the window is not: admin tokens never expire by design
 * (see `setUser` in the auth slice), so a session can outlive many rotations,
 * and sign-in used to be the only thing that ever re-registered. A tab left
 * open for a fortnight would go on holding a token the backend no longer knows.
 */
const ROTATION_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function usePushNotifications() {
  const token = useAppSelector((s) => s.auth.token);
  const [state, setState] = useState<PushState>(initialState);
  const [registerFcmToken] = useRegisterFcmTokenMutation();

  // Guards a re-register per sign-in. The effect below depends on the auth
  // token, so without this a re-render mid-session would re-send needlessly.
  const registeredFor = useRef<string | null>(null);

  /**
   * The live session, readable from inside an async closure.
   *
   * This is what tells "the admin signed out while the prompt was open" apart
   * from "React re-ran the effect" — a distinction the old `cancelled` flag
   * could not make, and the reason the token never reached the backend. See the
   * effect below.
   */
  const sessionRef = useRef(token);
  sessionRef.current = token;

  /** The device token the backend has already accepted for this session. */
  const lastRegistered = useRef<string | null>(null);
  /** When rotation was last checked, so the two triggers share one throttle. */
  const lastRotationCheck = useRef(0);

  /**
   * Mint a token and hand it to the backend. Returns whether it landed.
   *
   * Failures are quiet to the *admin* — this runs unattended on mount, and
   * nobody should be shown an error about a feature they did not ask for — but
   * no longer quiet to the developer: every branch says which one it took.
   */
  const sendToken = useCallback(
    async (reason: string): Promise<boolean> => {
      // Stamped here rather than in the rotation trigger, because *this* is the
      // check. Left to the trigger it started at zero, so the first time the
      // tab was foregrounded after signing in the throttle had already elapsed
      // and the SDK was asked again for a token nobody had reason to doubt.
      lastRotationCheck.current = Date.now();
      const fcmToken = await getDeviceToken();
      if (!fcmToken) {
        pushLog("no-token", { reason, hint: "getDeviceToken() returned null — see earlier log" });
        return false;
      }
      pushLog("token-minted", { reason, token: fingerprintToken(fcmToken) });

      // Already registered, this session, unchanged. The rotation check runs on
      // a timer and on every foreground; posting an identical token each time
      // would be the duplicate call this is meant to avoid.
      if (lastRegistered.current === fcmToken) {
        pushLog("token-unchanged", { reason });
        return true;
      }

      try {
        pushLog("post-start", { reason, endpoint: "add-fcm-token", field: "fcm_token" });
        await registerFcmToken({ fcm_token: fcmToken }).unwrap();
        lastRegistered.current = fcmToken;
        pushLog("post-ok", { reason });
        return true;
      } catch (error) {
        // `unwrap()` rethrows RTK Query's error shape, whose `status` is the
        // HTTP code (or "FETCH_ERROR" when the request never arrived) — the one
        // fact that separates "the backend refused it" from "it never left".
        const status = (error as { status?: unknown })?.status;
        pushLog("post-failed", { reason, status, error: describeError(error) });
        return false;
      }
    },
    [registerFcmToken],
  );

  /**
   * Silent registration on sign-in — prompting first if the browser has not
   * been asked yet.
   *
   * **This effect must survive being re-run.** `main.tsx` renders inside
   * `<StrictMode>`, so in development React mounts every effect, tears it down
   * and mounts it again. The previous version aborted its async work on that
   * teardown while leaving `registeredFor` claimed, so the second run bailed
   * out as a duplicate and the first run bailed out as cancelled: on the
   * *first* sign-in from a browser — the one path that has to wait on a
   * permission prompt — no token was ever minted and nothing retried for the
   * rest of the session. That is why the backend never received it.
   *
   * The abort condition is now the **session**, not the effect run. Registering
   * a device is a side effect of signing in, not of rendering, so a remount
   * must not cancel it; only signing out or switching admin should.
   */
  useEffect(() => {
    if (!token) {
      // Signed out: let the next sign-in register again. The backend drops this
      // user's tokens on logout, so the row is gone server-side regardless — but
      // on a shared machine the next admin must send their own.
      registeredFor.current = null;
      lastRegistered.current = null;
      return;
    }
    // "unsupported" / "unconfigured" / "denied" / "error" are all dead ends here
    // — nothing this effect can do changes them.
    if (state !== "enabled" && state !== "prompt") {
      pushLog("skipped", { state });
      return;
    }
    // Claimed before the first await so the state changes below, which re-run
    // this effect, cannot start a second registration for the same sign-in.
    if (registeredFor.current === token) return;
    registeredFor.current = token;
    lastRegistered.current = null;

    /** Has the session moved on since this run started? */
    const stale = () => sessionRef.current !== token;

    void (async () => {
      pushLog("register-start", { state });
      if (state === "prompt") {
        const permission = await requestPermission();
        pushLog("permission", { result: permission });
        if (stale()) return;
        if (permission !== "granted") {
          // Released rather than left claimed: on a gesture-strict browser this
          // is a prompt that was never shown, so nothing about this sign-in has
          // actually been attempted yet.
          registeredFor.current = null;
          // No state change on "default" — it is already "prompt", and writing
          // it back would be a no-op React discards anyway.
          if (permission === "denied") setState("denied");
          return;
        }
      }
      const ok = await sendToken("sign-in");
      if (stale()) return;
      setState(ok ? "enabled" : "error");
    })();
  }, [token, state, sendToken]);

  /**
   * Keeps the backend's copy current when FCM rotates the token.
   *
   * The modern SDK has no `onTokenRefresh` — it was removed in v9 — so the
   * documented approach is to ask for the token again and compare. Two triggers
   * share one throttle: coming back to the tab, which is when a rotation that
   * happened while it was hidden is worth catching, and a long timer, for the
   * tab nobody ever leaves. `sendToken` posts only when the value actually
   * changed, so the usual cost of both is a local SDK call and no request.
   */
  useEffect(() => {
    if (!token || state !== "enabled") return;

    const check = (trigger: string) => {
      if (Date.now() - lastRotationCheck.current < ROTATION_CHECK_INTERVAL_MS) return;
      void sendToken(trigger);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") check("foreground");
    };
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(() => check("interval"), ROTATION_CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
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
    const ok = await sendToken("enable-button");
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
