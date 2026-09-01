import { logout } from "@/features/auth/slice/authSlice";
import { NOTIFICATION_INBOX_TAG } from "@/features/notifications";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { showArrivalToast, showSignalToast } from "../lib/arrivalToast";
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
 * Three frame types arrive on it and each does one job. A `badge` overwrites the
 * counters and invalidates the list the admin is looking at. A `signal` says
 * work was handed to this admin, naming the stage. An `arrival` says something
 * new landed in a queue — and it, not the badge frame, is what raises the
 * activity marker, the chime and the toast.
 *
 * One event commonly produces all three. That is expected rather than a fault,
 * and nothing is announced three times: the coalescer collapses the refetches,
 * the chime throttles itself, and the toasts share an id keyed on `order_id`.
 *
 * Rows never come off the socket — none of the three carries any, and the REST
 * serializers remain the sole authority on who may see what.
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

  /**
   * `dispatch` is referentially stable, but the visibility effect below mounts
   * once with an empty dep list — the same reason `navigate` and `pathname` are
   * held in refs above rather than listed as dependencies.
   */
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

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
        // Absolute, always complete — overwrite rather than merge.
        dispatch(applyBadge({ counts: frame.counts, mine: frame.mine, at: frame.at }));

        // `connect` and `sync` are snapshots: set the numbers, refetch nothing.
        // `frame.id` is deliberately unused — it is advisory, and the list
        // refetch is the source of truth for what the admin may actually see.
        if (!isBadgeQueue(frame.changed)) return;

        // Through the coalescer rather than straight to `invalidateTags`: bursts
        // are normal, and one request per frame is the polling this replaced.
        coalescer.push(frame.changed);

        // **And that is all a badge frame does now.** It used to also raise the
        // activity marker, the chime and a toast, gated on `delta === "up"` —
        // because `changed` fires on completions too, and without that gate an
        // admin marked their own screen every time they finished an order.
        //
        // That gate was load-bearing on an optional field. `delta` is optional
        // in the contract, and a server that omits it silences every one of
        // those three, which is precisely what this panel hit: new intents
        // refetched the list and announced nothing. The `arrival` frame is the
        // backend's own answer — it has no direction to gate on, because
        // receiving one *is* the arrival. All three moved to `onArrival` below,
        // and this handler is back to what §1 always said it was: counters.
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

        // The durable half of the same event. An assignment writes an
        // `order_assigned` row, and the inbox is the only place an admin who
        // was offline will ever see it — frames are never replayed. Dropped
        // rather than fetched: the bell subscribes, so RTK Query refetches only
        // where something is actually mounted.
        dispatch(
          baseApi.util.invalidateTags([{ type: "Notifications", id: NOTIFICATION_INBOX_TAG }]),
        );

        if (queuesForRoute(pathnameRef.current).includes(screen)) return;
        dispatch(markActivity(screen));
      },
      /**
       * Something new landed in a queue.
       *
       * The activity marker's real source. Unlike a badge frame there is no
       * direction to check and no counts to apply — the frame names a queue and
       * that is the whole payload. Unlike a signal it is not limited to the four
       * screens work is handed over on: an arrival covers seller registrations
       * and special requests too, which no signal ever describes.
       *
       * Three frames land for one event — an `arrival`, a `badge` and often a
       * `signal`. That is expected, and each is deduplicated by a different
       * mechanism: the coalescer collapses the refetches, the chime's own
       * throttle collapses the sound, and the toasts share an id keyed on
       * `order_id`.
       */
      onArrival: (frame) => {
        if (import.meta.env.DEV) {
          console.info(`[events] arrival queue=${frame.queue} entity=${frame.entity ?? "order"}`);
        }

        // Validated, not trusted, and the ignore path here is a normal outcome
        // rather than an error. One socket serves three vocabularies plus
        // `deltas`, which this panel has no Delta Payments screen for — and the
        // contract promises more queues will be added. A dot we cannot route
        // anywhere is worse than no dot: it sends the admin looking for a screen
        // that does not exist.
        if (!isBadgeQueue(frame.queue)) {
          if (import.meta.env.DEV) {
            console.info(`[events] arrival ignored: no screen for queue=${frame.queue}`);
          }
          return;
        }
        const queue = frame.queue;

        // The list the admin is looking at, if this is that queue. An arrival
        // means a new row exists, so this is the refetch that matters most —
        // and it no longer depends on the badge frame's `delta` surviving.
        coalescer.push(queue);

        // Chime and toast before the route gate; the marker after. The one place
        // the three deliberately diverge: being on the screen makes a *marker*
        // redundant, because the refetch above has already put the row in front
        // of the admin. It does not make the sound redundant — a tab open on
        // Orders says nothing about whether anyone is looking at it, and an
        // admin working in another window is the case this exists for.
        playNotificationSound();

        showArrivalToast(queue, frame.order_id ?? null, {
          route: routeForQueue(queue),
          onView: (route) => navigateRef.current(route),
        });

        if (queuesForRoute(pathnameRef.current).includes(queue)) return;
        dispatch(markActivity(queue));
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
      // The counters come back over the socket; the inbox does not. A tab that
      // slept through an assignment receives no frame for it on wake, so the
      // durable row is the only trace and this is the moment to go and look.
      dispatchRef.current(
        baseApi.util.invalidateTags([{ type: "Notifications", id: NOTIFICATION_INBOX_TAG }]),
      );
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
