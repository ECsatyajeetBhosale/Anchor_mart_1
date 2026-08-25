import { resolveSocketUrl } from "@/lib/socketUrl";
import type {
  ArrivalFrame,
  BadgeFrame,
  EventsAuthErrorCode,
  EventsInboundFrame,
  EventsSyncFrame,
  SignalFrame,
  SocketStatus,
} from "../types/realtime.types";

/**
 * Client for the realtime badge socket (`ws/events/`).
 *
 * Built on the native `WebSocket` for the same reason the chat socket is: the
 * endpoint is a raw Django Channels consumer with a bespoke JSON envelope, and
 * the one genuinely tricky part — "accept, send an auth frame, then close" — is
 * exactly what a generic reconnecting wrapper gets wrong.
 *
 * It is a **sibling of `ChatSocket`, not a reuse of it**, because four things
 * differ and each one is a bug if copied across:
 *
 *  1. Two more fatal auth codes (`token_expired`, `no_badge_scope`).
 *  2. A second fatal frame type (`forbidden`).
 *  3. Fatal **close codes** must halt us too. The chat socket trusts the frame
 *     alone; if that frame is lost or malformed we would reconnect forever into
 *     a dead token, which is the failure the contract calls out by name.
 *  4. No outbound queue. The only message is `sync`, and a queued `sync` is
 *     worthless — the server pushes a full snapshot on connect anyway — besides
 *     risking the 5s rate limit at the exact moment we reconnect.
 */

/** Auth codes after which reconnecting can never succeed. */
const FATAL_AUTH_CODES: ReadonlySet<string> = new Set<EventsAuthErrorCode>([
  "missing_token",
  "invalid_token",
  "token_expired",
  "blocked",
  "no_badge_scope",
]);

/**
 * Close codes that mean the same thing, read independently of the frame.
 *
 * 4001 bad/missing token · 4003 expired · 4403 blocked or no badge scope.
 */
const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set([4001, 4003, 4403]);

/** Backoff schedule in ms. Capped and exponential — many tabs, one restart. */
const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];

/** This consumer's path. Origin and scheme come from `@/lib/socketUrl`. */
const EVENTS_SOCKET_PATH = "/ws/events/";

/** Server-side limit on `sync`. Guarded client-side so we never spend a refusal. */
const SYNC_MIN_GAP_MS = 5_000;

export interface EventsSocketHandlers {
  /** A badge frame — counts to apply, and which queue moved. */
  onBadge: (frame: BadgeFrame) => void;
  /**
   * A signal frame — work was handed to this admin. Carries no counts; it is
   * about *who owes the next move*, which the counters cannot express.
   */
  onSignal: (frame: SignalFrame) => void;
  /**
   * An arrival frame — something new landed in a queue. No counts, no rows,
   * no direction: receiving one is itself the news.
   */
  onArrival: (frame: ArrivalFrame) => void;
  onStatus: (status: SocketStatus) => void;
  /** Fired once per terminal failure so the UI can explain and stop. */
  onAuthError: (code: string, detail: string) => void;
  /** In-band refusals (`rate_limited`, `unknown_type`). Never fatal. */
  onError: (code: string, detail: string) => void;
}

export class EventsSocket {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set on a terminal failure; suppresses every future reconnect. */
  private halted = false;
  /** Set by `close()` so an intentional teardown never schedules a retry. */
  private disposed = false;
  /** Timestamp of the last `sync` we actually sent. */
  private lastSyncAt = 0;

  constructor(
    private readonly token: string,
    private readonly handlers: EventsSocketHandlers,
  ) {}

  connect(): void {
    if (this.disposed || this.halted) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.handlers.onStatus("connecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket(resolveSocketUrl(EVENTS_SOCKET_PATH, this.token));
    } catch {
      // A malformed URL throws synchronously; treat it as a failed attempt so
      // the caller still sees a status change rather than a silent no-op.
      this.handlers.onStatus("error");
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.handlers.onStatus("open");
      // No replay: the server pushes a complete snapshot the moment we connect,
      // so a dropped socket self-heals and there is nothing to catch up on.
    };

    socket.onmessage = (event) => {
      let frame: EventsInboundFrame;
      try {
        frame = JSON.parse(event.data as string) as EventsInboundFrame;
      } catch {
        // A non-JSON frame is a server bug, not something the user can act on.
        return;
      }

      // Auth failures arrive as a frame *before* the close, which is why they
      // are read here rather than inferred from the close code alone. Both are
      // honoured: whichever signal reaches us first halts the socket.
      if (frame.type === "auth_error" || frame.type === "forbidden") {
        const code = frame.code ?? "invalid_token";
        if (FATAL_AUTH_CODES.has(code)) this.halted = true;
        this.handlers.onAuthError(code, frame.detail ?? "");
        return;
      }

      if (frame.type === "error") {
        this.handlers.onError(frame.code ?? "error", frame.detail ?? "");
        return;
      }

      if (frame.type === "badge") {
        this.handlers.onBadge(frame);
        return;
      }

      // Signals are a separate frame type, not a variant of `badge` — they
      // carry no counts, and until this branch existed one matched nothing here
      // and was silently discarded.
      if (frame.type === "signal") {
        this.handlers.onSignal(frame);
        return;
      }

      if (frame.type === "arrival") this.handlers.onArrival(frame);

      // Anything else falls through unhandled, and must keep doing so. New
      // frame types are promised, and an old client that throws on one is worse
      // than an old client that ignores it — the socket is shared, so a throw
      // here would cost the badges and signals as well.
    };

    socket.onerror = () => {
      this.handlers.onStatus("error");
    };

    socket.onclose = (event) => {
      this.ws = null;
      this.handlers.onStatus("closed");
      // The frame may never have arrived — a close code is the other half of the
      // same signal, and reconnecting past one is an infinite loop.
      if (FATAL_CLOSE_CODES.has(event.code)) {
        this.halted = true;
        return;
      }
      this.scheduleReconnect();
    };
  }

  /**
   * Asks for a fresh snapshot. Use it when the tab regains focus after an idle
   * spell; it is rarely needed otherwise, since connecting already snapshots.
   *
   * Dropped rather than queued when the socket is down — a reconnect brings a
   * snapshot of its own. Returns whether the frame went out.
   */
  sync(): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    // The server answers a faster one with `rate_limited`; there is no reason to
    // spend a round-trip discovering a limit we already know.
    const now = Date.now();
    if (now - this.lastSyncAt < SYNC_MIN_GAP_MS) return false;
    this.lastSyncAt = now;
    try {
      const frame: EventsSyncFrame = { type: "sync" };
      this.ws.send(JSON.stringify(frame));
      return true;
    } catch {
      // Socket died between the readyState check and the write. The reconnect
      // snapshot covers it, so there is nothing to recover here.
      return false;
    }
  }

  close(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    // Drop handlers first so the teardown doesn't fire a status update into an
    // unmounted component.
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, "client disposed");
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.halted || this.reconnectTimer) return;
    const delay = RECONNECT_DELAYS[Math.min(this.attempt, RECONNECT_DELAYS.length - 1)];
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
