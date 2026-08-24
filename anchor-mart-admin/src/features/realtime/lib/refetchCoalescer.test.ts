import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RefetchCoalescer } from "./refetchCoalescer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("RefetchCoalescer", () => {
  it("collapses a burst into a single flush", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    // Twelve frames for one queue — a partner submitting a batch, say.
    for (let i = 0; i < 12; i += 1) c.push("orders");
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(["orders"]);
  });

  it("carries every distinct queue seen during the window", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    c.push("orders");
    c.push("intents");
    c.push("orders");
    vi.advanceTimersByTime(300);

    expect(onFlush).toHaveBeenCalledWith(["orders", "intents"]);
  });

  it("is trailing — the window does not extend as more frames arrive", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    c.push("orders");
    vi.advanceTimersByTime(200);
    c.push("intents");
    // 100ms left on the original window; a leading-edge-reset would still wait.
    vi.advanceTimersByTime(100);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it("opens a fresh window for a later burst", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    c.push("orders");
    vi.advanceTimersByTime(300);
    c.push("verifications");
    vi.advanceTimersByTime(300);

    expect(onFlush).toHaveBeenCalledTimes(2);
    expect(onFlush).toHaveBeenNthCalledWith(2, ["verifications"]);
  });

  it("does not fire when nothing was pushed", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);
    c.flush();
    vi.advanceTimersByTime(10_000);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("flushes early on demand and cancels the pending window", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    c.push("orders");
    c.flush();
    expect(onFlush).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it("drops a pending flush on dispose rather than firing into a dead store", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    c.push("orders");
    c.dispose();
    vi.advanceTimersByTime(10_000);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("ignores pushes after dispose", () => {
    const onFlush = vi.fn();
    const c = new RefetchCoalescer(onFlush, 300);

    c.dispose();
    c.push("orders");
    vi.advanceTimersByTime(10_000);
    expect(onFlush).not.toHaveBeenCalled();
  });
});
