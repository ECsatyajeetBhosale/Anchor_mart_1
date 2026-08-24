import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventsSocket } from "./eventsSocket";

/**
 * A stand-in for the browser `WebSocket`, letting a test drive the frames and
 * closes the real server would send. Only the surface `EventsSocket` touches is
 * implemented.
 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  closedWith: number | null = null;

  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((e: { code: number }) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number) {
    this.closedWith = code ?? 1000;
    this.readyState = FakeWebSocket.CLOSED;
  }

  // — test drivers —
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  receive(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  receiveRaw(data: string) {
    this.onmessage?.({ data });
  }
  serverClose(code: number) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}

/** The most recent fake socket. `Array.at` is above this project's lib target. */
function latest(): FakeWebSocket {
  return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
}

function handlers() {
  return {
    onBadge: vi.fn(),
    onStatus: vi.fn(),
    onAuthError: vi.fn(),
    onError: vi.fn(),
  };
}

const COUNTS = {
  intents: 3,
  orders: 12,
  express_orders: 1,
  special_requests: 4,
  seller_requests: 2,
  verifications: 5,
  delivery_failed: 0,
};

/** The socket after `connect()`, plus its fake transport. */
function connected() {
  const h = handlers();
  const socket = new EventsSocket("tok", h);
  socket.connect();
  const ws = latest();
  return { socket, ws, h };
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("connection", () => {
  it("connects to ws/events/ with the token in the query string", () => {
    const { ws } = connected();
    expect(ws.url).toContain("/ws/events/");
    expect(ws.url).toContain("token=tok");
  });

  it("reports status through the lifecycle", () => {
    const { ws, h } = connected();
    expect(h.onStatus).toHaveBeenCalledWith("connecting");
    ws.open();
    expect(h.onStatus).toHaveBeenCalledWith("open");
  });
});

describe("badge frames", () => {
  it("hands the frame to onBadge", () => {
    const { ws, h } = connected();
    ws.open();
    const frame = {
      type: "badge",
      scope: "admin",
      changed: "orders",
      id: "abc",
      counts: COUNTS,
      at: "2026-08-24T11:02:33.421Z",
    };
    ws.receive(frame);
    expect(h.onBadge).toHaveBeenCalledWith(frame);
  });

  it("ignores a non-JSON frame rather than throwing", () => {
    const { ws, h } = connected();
    ws.open();
    expect(() => ws.receiveRaw("<html>gateway error</html>")).not.toThrow();
    expect(h.onBadge).not.toHaveBeenCalled();
  });
});

describe("fatal auth codes", () => {
  // The whole set, because two of them (`token_expired`, `no_badge_scope`) are
  // exactly what a copy of the chat socket would have retried forever.
  it.each(["missing_token", "invalid_token", "token_expired", "blocked", "no_badge_scope"])(
    "halts on %s and never reconnects",
    (code) => {
      const { ws, h } = connected();
      ws.open();
      ws.receive({ type: "auth_error", code, detail: "nope" });
      expect(h.onAuthError).toHaveBeenCalledWith(code, "nope");

      ws.serverClose(1006);
      vi.advanceTimersByTime(120_000);
      expect(FakeWebSocket.instances).toHaveLength(1);
    },
  );

  it("treats a forbidden frame exactly like auth_error", () => {
    const { ws, h } = connected();
    ws.open();
    ws.receive({ type: "forbidden", code: "no_badge_scope", detail: "no badges" });
    expect(h.onAuthError).toHaveBeenCalledWith("no_badge_scope", "no badges");

    ws.serverClose(1006);
    vi.advanceTimersByTime(120_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe("fatal close codes", () => {
  // The frame may be lost or malformed; the close code is the other half of the
  // same signal, and reconnecting past one is the documented infinite loop.
  it.each([4001, 4003, 4403])("halts on a %i close with no frame at all", (code) => {
    const { ws } = connected();
    ws.open();
    ws.serverClose(code);
    vi.advanceTimersByTime(120_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it.each([1006, 1001, 1012])("reconnects after a %i network close", (code) => {
    const { ws } = connected();
    ws.open();
    ws.serverClose(code);
    vi.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});

describe("close codes never imply an auth failure", () => {
  /**
   * The rule the panel's logout depends on: sign out on an `auth_error` /
   * `forbidden` **frame**, never on a close code alone. Conflating the two
   * would sign an admin out every time their wifi dropped, since a transport
   * failure arrives as a close code and never as an auth frame.
   */
  it.each([4001, 4003, 4403])("halts on %i without reporting an auth error", (code) => {
    const { ws, h } = connected();
    ws.open();
    ws.serverClose(code);
    expect(h.onAuthError).not.toHaveBeenCalled();
  });

  it("reports no auth error on a network close either", () => {
    const { ws, h } = connected();
    ws.open();
    ws.serverClose(1006);
    expect(h.onAuthError).not.toHaveBeenCalled();
  });
});

describe("backoff", () => {
  it("grows exponentially and then caps", () => {
    const { ws } = connected();
    ws.open();

    const delays = [1_000, 2_000, 5_000, 10_000, 30_000, 30_000];
    let expected = 1;
    for (const delay of delays) {
      latest().serverClose(1006);
      // One tick short of the delay: nothing yet.
      vi.advanceTimersByTime(delay - 1);
      expect(FakeWebSocket.instances).toHaveLength(expected);
      vi.advanceTimersByTime(1);
      expected += 1;
      expect(FakeWebSocket.instances).toHaveLength(expected);
    }
  });

  it("resets the ladder once a connection succeeds", () => {
    const { ws } = connected();
    ws.open();
    ws.serverClose(1006);
    vi.advanceTimersByTime(1_000);

    const second = latest();
    second.open();
    second.serverClose(1006);
    // Back to the first rung rather than continuing to 2s.
    vi.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });
});

describe("sync", () => {
  it("sends when open", () => {
    const { socket, ws } = connected();
    ws.open();
    expect(socket.sync()).toBe(true);
    expect(ws.sent).toEqual([JSON.stringify({ type: "sync" })]);
  });

  it("drops rather than queues while closed — a reconnect snapshots anyway", () => {
    const { socket, ws } = connected();
    expect(socket.sync()).toBe(false);

    ws.open();
    expect(ws.sent).toEqual([]);
  });

  it("refuses a second sync inside the 5s rate-limit window", () => {
    const { socket, ws } = connected();
    ws.open();
    expect(socket.sync()).toBe(true);
    expect(socket.sync()).toBe(false);
    expect(ws.sent).toHaveLength(1);

    vi.advanceTimersByTime(5_000);
    expect(socket.sync()).toBe(true);
    expect(ws.sent).toHaveLength(2);
  });
});

describe("in-band errors", () => {
  it("surfaces them without closing or halting", () => {
    const { socket, ws, h } = connected();
    ws.open();
    ws.receive({ type: "error", code: "rate_limited", detail: "Wait 5s." });
    expect(h.onError).toHaveBeenCalledWith("rate_limited", "Wait 5s.");

    // Still live: a refused sync must not have taken the connection down.
    ws.serverClose(1006);
    vi.advanceTimersByTime(1_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    socket.close();
  });
});

describe("teardown", () => {
  it("closes cleanly and cancels any pending reconnect", () => {
    const { socket, ws } = connected();
    ws.open();
    ws.serverClose(1006);
    socket.close();
    vi.advanceTimersByTime(120_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("never fires handlers after close", () => {
    const { socket, ws, h } = connected();
    ws.open();
    h.onStatus.mockClear();
    socket.close();
    expect(ws.closedWith).toBe(1000);
    expect(h.onStatus).not.toHaveBeenCalled();
  });
});
