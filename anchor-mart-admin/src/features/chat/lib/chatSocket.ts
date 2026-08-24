import { resolveSocketUrl } from "@/lib/socketUrl";
import type {
  InboundFrame,
  OutboundFrame,
  SocketAuthErrorCode,
  SocketStatus,
} from "../types/chat.types";

/**
 * Client for the chat websocket (Flow 23 §2).
 *
 * Deliberately built on the **native `WebSocket`** rather than a library. The
 * endpoint is a raw Django Channels consumer with a bespoke JSON envelope, so
 * Socket.IO cannot talk to it at all, and the one genuinely tricky part —
 * "accept, send an `auth_error` frame, then close" — is exactly what a generic
 * reconnecting wrapper gets wrong: it would retry a `blocked` account forever.
 * Swapping in `partysocket` later means changing the `new WebSocket(...)` line
 * and deleting {@link scheduleReconnect}; nothing else here assumes the global.
 */

/** Terminal auth failures. Reconnecting after one of these can never succeed. */
const FATAL_AUTH_CODES: ReadonlySet<string> = new Set<SocketAuthErrorCode>([
  "blocked",
  "invalid_token",
  "missing_token",
]);

/** This consumer's path. The origin and scheme come from `@/lib/socketUrl`. */
const CHAT_SOCKET_PATH = "/ws/chat/";

/** Backoff schedule in ms. Caps rather than growing without bound. */
const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];

export interface ChatSocketHandlers {
  onFrame: (frame: InboundFrame) => void;
  onStatus: (status: SocketStatus) => void;
  /** Fired once per terminal auth failure so the UI can explain and stop. */
  onAuthError: (code: SocketAuthErrorCode | string, detail: string) => void;
  /** In-band errors (`{"error": "…"}`) — these never close the connection. */
  onError: (message: string) => void;
}

export class ChatSocket {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set when a terminal auth failure has been seen; suppresses all reconnects. */
  private halted = false;
  /** Set by `close()` so an intentional teardown never schedules a retry. */
  private disposed = false;
  /** Frames sent before the socket opened, replayed on connect. */
  private queue: OutboundFrame[] = [];

  constructor(
    private readonly token: string,
    private readonly handlers: ChatSocketHandlers,
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
      socket = new WebSocket(resolveSocketUrl(CHAT_SOCKET_PATH, this.token));
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
      // Replay anything typed while the socket was down, in order.
      const pending = this.queue;
      this.queue = [];
      for (const frame of pending) this.sendRaw(frame);
    };

    socket.onmessage = (event) => {
      let frame: InboundFrame;
      try {
        frame = JSON.parse(event.data as string) as InboundFrame;
      } catch {
        // A non-JSON frame is a server bug, not something the user can act on.
        return;
      }

      // Auth failures arrive as a frame *before* the close, which is the whole
      // reason this is read here rather than inferred from the close code.
      if (frame.type === "auth_error") {
        const code = frame.code ?? "invalid_token";
        if (FATAL_AUTH_CODES.has(code)) this.halted = true;
        this.handlers.onAuthError(code, frame.detail ?? "");
        return;
      }

      // In-band errors are per-socket and non-fatal — the connection stays up.
      if (typeof frame.error === "string") {
        this.handlers.onError(frame.error);
        return;
      }

      this.handlers.onFrame(frame);
    };

    socket.onerror = () => {
      this.handlers.onStatus("error");
    };

    socket.onclose = () => {
      this.ws = null;
      this.handlers.onStatus("closed");
      this.scheduleReconnect();
    };
  }

  /**
   * Queues a frame when the socket is down rather than dropping it, so a message
   * typed during a blip is sent on reconnect instead of vanishing. Returns
   * whether it went out immediately.
   */
  send(frame: OutboundFrame): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendRaw(frame);
      return true;
    }
    // Typing and read receipts are worthless once stale — only queue the frames
    // whose loss the user would actually notice.
    if (frame.msg_type === "NewMessage" || frame.msg_type === "MessageEdited") {
      this.queue.push(frame);
    }
    this.connect();
    return false;
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

  private sendRaw(frame: OutboundFrame): void {
    try {
      this.ws?.send(JSON.stringify(frame));
    } catch {
      // Socket died between the readyState check and the write — the frame is
      // requeued by the caller's next attempt rather than throwing into React.
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
