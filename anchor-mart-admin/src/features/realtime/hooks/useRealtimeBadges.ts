import { logout } from "@/features/auth/slice/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppDispatch";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { authFailureAction } from "../lib/authFailure";
import { tagsForQueues } from "../lib/badgeRefetch";
import { EventsSocket } from "../lib/eventsSocket";
import { RefetchCoalescer } from "../lib/refetchCoalescer";
import { applyBadge, resetRealtime, setAuthError, setSocketStatus } from "../slice/realtimeSlice";
import { isBadgeQueue } from "../types/realtime.types";

/**
 * How often to re-snapshot while the tab is visible.
 *
 * The contract documents one publish gap — **soft-deleting an order sends no
 * frame** — whose stated cure is "the next snapshot: reconnect or `sync`". A tab
 * left open and focused gets neither, so without this the badge stays overstated
 * indefinitely: the one failure the contract names, with no path back.
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
