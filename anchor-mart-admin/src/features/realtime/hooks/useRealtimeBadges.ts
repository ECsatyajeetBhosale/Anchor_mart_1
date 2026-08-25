import { logout } from "@/features/auth/slice/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { showBadgeToast, showSignalToast } from "../lib/arrivalToast";
import { authFailureAction } from "../lib/authFailure";
import { queuesForRoute, routeForQueue, tagsForQueues } from "../lib/badgeRefetch";
import { EventsSocket } from "../lib/eventsSocket";
import { installAudioUnlock, playNotificationSound } from "../lib/notificationSound";
import { RefetchCoalescer } from "../lib/refetchCoalescer";
import {
  applyBadge,
  clearActivity,
  markActivity,
  resetRealtime,
  setAuthError,
  setSocketStatus,
} from "../slice/realtimeSlice";
import { isBadgeQueue, isSignalScreen } from "../types/realtime.types";

/**
 * How often to re-snapshot while the tab is visible.
 *
 * This was originally justified by the contract's soft-delete publish gap. That
 * gap has since been **withdrawn** — an audit found nothing in the backend
 * soft-deletes an order — so that reason is gone and the timer is deliberately
 * kept for a different one: §9's warning that the socket is best-effort. The
 * case it covers is a connection that is *up but silently dead* — a proxy
 * holding a half-open socket sends no close, so no reconnect fires and no
 * snapshot arrives; a periodic `sync` is the only thing that notices.
 *
 * This is not the polling the socket replaced. It fetches no rows and touches no
 * list endpoint — it is one small frame on an already-open connection, two
 * orders of magnitude cheaper than a list poll, and well clear of the server's
 * one-per-5s limit.
 */
const SAFETY_SYNC_MS = 120_000;

/** The one live socket, for {@link requestBadgeSync}. Set by the hook below. */
let liveSocket: EventsSocket | null = null;

/**
 * Binds the realtime badge socket to the store and the RTK Query cache.
 *
 * **Mount this exactly once**, in the app shell. One socket serves the whole
 * panel and fans out through Redux; one per screen would mean N copies of every
 * frame and N reconnect loops. It coexists with the chat socket — separate
 * paths, separate connections, no interference.
 *
 * Two things happen per frame and no more: the counters are overwritten, and the
 * list the admin is currently looking at is invalidated. Rows never come off the
 * socket — it carries counters only, and the REST serializers remain the sole
 * authority on who may see what.
 *
 * **This does not make the order lists live, and it is not meant to.** The server
 * publishes only when a *count* moves, so an order going `at_port → at_berth`
 * sends nothing at all: it stays in the `orders` bucket, the milestone changed
 * and the badge did not. Live milestones on a detail screen are a different
 * feature and this socket is not it. Anyone reading a stale status here should
 * reach for the manual refresh, not file a bug against this hook.
 */
export function useRealtimeBadges(): void {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  /**
   * Held in a ref for the same reason `pathname` is: the socket effect must not
   * rebuild when the router hands us a new function identity, or the connection
   * would drop on navigation.
   */
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  /**
   * The live route, read at frame time rather than closed over.
   *
   * Frames arrive asynchronously and the admin navigates between them; a
   * pathname captured when the socket was built would refetch whichever screen
   * happened to be open on login. A ref keeps the socket itself stable across
   * navigation — rebuilding it per route change would reconnect constantly.
   */
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const socketRef = useRef<EventsSocket | null>(null);

  /**
   * Arriving on a screen answers for every queue it covers.
   *
   * Keyed on `pathname` rather than done inside the frame handler, so a marker
   * raised while the admin was elsewhere clears the moment they navigate — not
   * only when the next frame happens to arrive.
   */
  useEffect(() => {
    const queues = queuesForRoute(pathname);
    if (queues.length > 0) dispatch(clearActivity(queues));
  }, [pathname, dispatch]);

  /**
   * Arm audio on the admin's first click or keypress.
   *
   * Not inside the socket effect: it has no dependency on the token, and
   * re-installing the listeners on every reconnect would be pointless churn.
   */
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    if (!token) {
      // Logged out: tear down and clear, so the numbers do not survive behind a
      // login form.
      socketRef.current?.close();
      socketRef.current = null;
      liveSocket = null;
      dispatch(resetRealtime());
      return;
    }

    dispatch(setAuthError(null));

    // Route is read at flush time, not capture time: an admin who navigates
    // mid-burst should refresh the screen they landed on, not the one they left.
    const coalescer = new RefetchCoalescer((queues) => {
      const tags = tagsForQueues(queues, pathnameRef.current);
      if (tags.length > 0) dispatch(baseApi.util.invalidateTags(tags));
    });

    const socket = new EventsSocket(token, {
      onBadge: (frame) => {
        // Dev trace. The chime has several deliberate silent paths and the
        // refetch fires regardless, so from the outside "working but quiet" and
        // "broken" look identical. `delta` is the field to read here: it is
        // optional in the contract, and a server that omits it silences the
        // chime on every badge frame.
        if (import.meta.env.DEV) {
          console.info(
            `[events] badge changed=${frame.changed} delta=${frame.delta ?? "(absent)"}`,
          );
        }

        // Absolute, always complete — overwrite rather than merge.
        dispatch(applyBadge({ counts: frame.counts, mine: frame.mine, at: frame.at }));

        // `connect` and `sync` are snapshots: set the numbers, refetch nothing.
        // `frame.id` is deliberately unused — it is advisory, and the list
        // refetch is the source of truth for what the admin may actually see.
        if (!isBadgeQueue(frame.changed)) return;
        const queue = frame.changed;

        // Through the coalescer rather than straight to `invalidateTags`: bursts
        // are normal, and one request per frame is the polling this replaced.
        coalescer.push(queue);

        // The activity marker. Three gates, each of which would otherwise make
        // the marker noise rather than signal:
        //
        //  1. `delta === "up"` only. `changed` fires in both directions, so
        //     without this an admin marks their own screen every time they
        //     complete an order. `"down"` and `null` (unknown) stay quiet — a
        //     late marker costs less than a false one.
        //  2. Not while they are already looking at it. Marking the screen
        //     under the admin's cursor is telling them about work they can see.
        //  3. Snapshots never mark, handled by the `isBadgeQueue` guard above:
        //     `connect`/`sync` name no queue, so there is nothing to attribute
        //     the movement to.
        if (frame.delta !== "up") {
          // Not an error: `down` is the admin's own completions, and `null` is
          // "direction unknown". Both are correctly silent — but this is the
          // line that says so, because the refetch above already happened.
          if (import.meta.env.DEV) {
            console.info(`[events] no chime: delta=${frame.delta ?? "(absent)"}, not "up"`);
          }
          return;
        }

        // The chime is raised *before* the route gate, and the marker after —
        // the one place the two deliberately diverge. Being on the screen makes
        // a marker redundant, because the refetch has already put the row in
        // front of the admin. It does not make the sound redundant: the tab
        // being open on Orders says nothing about whether anyone is looking at
        // it, and the case this feature exists for is an admin working in
        // another window.
        playNotificationSound();

        // Also route-independent. A badge frame carries no stage and no order
        // number, so this toast can only name the queue — but that is still the
        // difference between rows reshuffling unexplained and a caption saying
        // why.
        showBadgeToast(queue, frame.id, {
          route: routeForQueue(queue),
          onView: (route) => navigateRef.current(route),
        });

        if (queuesForRoute(pathnameRef.current).includes(queue)) return;
        dispatch(markActivity(queue));
      },
      /**
       * Work was handed to this admin.
       *
       * Signals exist because the counters structurally cannot express the work
       * chain: every hand-off inside the intent funnel moves an order *within*
       * the `intents` bucket, so the membership diff is silent for exactly the
       * transitions the chain is made of — a partner submitting a report, a
       * sailor paying, a delivery failing.
       *
       * Two differences from a badge frame, and one deliberate similarity:
       *
       *  - **No `delta` check.** A signal always means arrival; there is no
       *    `down`. Gating on direction here would drop every one of them.
       *  - **No counts touched.** A signal carries none — `badge` stays the sole
       *    source of numbers, and the two frames arrive independently.
       *  - Still not marked when the admin is already on the screen, same as a
       *    badge: the refetch below puts the row in front of them, and a marker
       *    as well would announce work they can already see.
       */
      onSignal: (frame) => {
        if (import.meta.env.DEV) {
          console.info(`[events] signal screen=${frame.screen} stage=${frame.stage}`);
        }

        // Validated, not trusted: an unrecognised screen from a future server
        // must be ignored rather than guessed at, since marking the wrong queue
        // sends the admin to look at somewhere nothing happened.
        if (!isSignalScreen(frame.screen)) return;
        const screen = frame.screen;

        // Through the coalescer for the same reason badges are — and because one
        // event often produces both frames (a new intent raises a signal *and* a
        // badge), which would otherwise be two requests for one arrival.
        coalescer.push(screen);

        // Before the route gate, same reasoning as the badge handler above.
        // Throttled internally, which is what keeps a signal and the badge frame
        // accompanying it from chiming twice for one arrival.
        playNotificationSound();

        // The rich notice: a signal names the stage, which is the detail neither
        // the marker nor the counters can carry. Deduped against the badge frame
        // for the same order by `order_id`.
        showSignalToast(frame, {
          route: routeForQueue(screen),
          onView: (route) => navigateRef.current(route),
        });

        if (queuesForRoute(pathnameRef.current).includes(screen)) return;
        dispatch(markActivity(screen));
      },
      onStatus: (status) => dispatch(setSocketStatus(status)),
      onAuthError: (code, detail) => {
        dispatch(setAuthError({ code, detail: detail || code }));

        // §3 gives each code a prescribed action, and this app has **no global
        // 401 handling** — grep for it — so this frame is the only notice the
        // panel ever gets that a token has died. Left unacted on, the admin
        // keeps a fully-rendered screen whose numbers have quietly frozen.
        //
        // Only codes that genuinely end the session clear it; an unrecognised
        // one is inert, because logging someone out mid-task on the strength of
        // a string we do not understand is the worse mistake in both directions.
        const action = authFailureAction(code);
        if (action === "inert") return;

        dispatch(logout());
        toast.error(
          action === "logout-blocked" ? MESSAGES.AUTH.OTP.BLOCKED : MESSAGES.REALTIME.SESSION_ENDED,
        );
        // No manual redirect: the router already sends an unauthenticated admin
        // to login, and `logout()` flips `isAuthenticated`. Navigating here as
        // well would race that and risk a double history entry.
      },
      onError: (code, detail) => {
        // `rate_limited` and `unknown_type` leave the connection up and are not
        // the admin's problem; log rather than toast.
        if (import.meta.env.DEV) console.warn(`[events] ${code}: ${detail}`);
      },
    });

    socketRef.current = socket;
    liveSocket = socket;
    socket.connect();

    return () => {
      coalescer.dispose();
      socket.close();
      socketRef.current = null;
      if (liveSocket === socket) liveSocket = null;
    };
  }, [token, dispatch]);

  /**
   * Re-snapshot when the tab comes back after being hidden.
   *
   * The socket is best-effort: a tab left open for an hour behind a silently
   * dead connection shows stale numbers until something wakes it. The socket's
   * own 5s guard absorbs a burst of tab-switching, so this can stay unthrottled.
   */
  useEffect(() => {
    const resnapshot = () => {
      // Nudges a closed socket into reconnecting — which snapshots by itself —
      // and asks an open one for a fresh count.
      socketRef.current?.connect();
      socketRef.current?.sync();
    };

    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (timer) return;
      timer = setInterval(resnapshot, SAFETY_SYNC_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resnapshot();
        // Paused while hidden: a background tab nobody is reading has no stale
        // numbers to correct, and it re-snapshots the moment it comes back.
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

/**
 * Asks the socket for a fresh snapshot on demand.
 *
 * A module-level handle rather than context or a prop: the socket is owned by
 * the shell, the manual refresh button lives in the header, and there is exactly
 * one of each. Threading a callback down through the layout to reach a singleton
 * would be ceremony around a fact the module already knows.
 *
 * No-ops when the socket is down or inside the 5s rate-limit gap — a closed
 * socket re-snapshots on reconnect anyway, so there is nothing to recover.
 */
export function requestBadgeSync(): boolean {
  return liveSocket?.sync() ?? false;
}
