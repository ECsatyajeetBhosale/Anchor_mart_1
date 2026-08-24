import { describe, expect, it } from "vitest";
import type { BadgeCounts } from "../types/realtime.types";
import reducer, { applyBadge, resetRealtime, setAuthError, setSocketStatus } from "./realtimeSlice";

const FIRST: BadgeCounts = {
  intents: 3,
  orders: 12,
  express_orders: 1,
  special_requests: 4,
  seller_requests: 2,
  verifications: 5,
  delivery_failed: 0,
};

const SECOND: BadgeCounts = {
  intents: 1,
  orders: 9,
  express_orders: 0,
  special_requests: 4,
  seller_requests: 2,
  verifications: 6,
  delivery_failed: 1,
};

describe("applyBadge", () => {
  it("starts with no counts at all, not with zeroes", () => {
    // "Not heard yet" and "nothing outstanding" are different states; rendering
    // the second while meaning the first shows an all-clear nobody sent.
    expect(reducer(undefined, { type: "@@init" }).counts).toBeNull();
  });

  /**
   * The single most likely way to get this feature wrong. `counts` is absolute
   * and complete on every frame — a second frame must *replace* the first, and
   * accumulating would send every badge climbing forever.
   */
  it("overwrites the previous counts rather than accumulating them", () => {
    let state = reducer(undefined, applyBadge({ counts: FIRST, at: "2026-08-24T11:00:00Z" }));
    state = reducer(state, applyBadge({ counts: SECOND, at: "2026-08-24T11:05:00Z" }));

    expect(state.counts).toEqual(SECOND);
    expect(state.counts?.orders).toBe(9);
    expect(state.counts?.intents).toBe(1);
  });

  it("records the frame timestamp", () => {
    const state = reducer(undefined, applyBadge({ counts: FIRST, at: "2026-08-24T11:00:00Z" }));
    expect(state.lastAt).toBe("2026-08-24T11:00:00Z");
  });

  it("keeps a zero as a zero", () => {
    const state = reducer(undefined, applyBadge({ counts: FIRST, at: "x" }));
    expect(state.counts?.delivery_failed).toBe(0);
  });
});

describe("status and errors", () => {
  it("tracks socket status", () => {
    const state = reducer(undefined, setSocketStatus("open"));
    expect(state.status).toBe("open");
  });

  it("holds a terminal auth failure until cleared", () => {
    let state = reducer(undefined, setAuthError({ code: "blocked", detail: "Account blocked." }));
    expect(state.authError).toBe("Account blocked.");
    // The code is kept beside the prose: it is what anything branches on, and
    // `no_badge_scope` in particular must be distinguishable from an outage.
    expect(state.authCode).toBe("blocked");

    state = reducer(state, setAuthError(null));
    expect(state.authError).toBeNull();
    expect(state.authCode).toBeNull();
  });
});

describe("resetRealtime", () => {
  it("clears the counts on logout", () => {
    // Global counts are still privileged: leaving them on screen behind a login
    // form tells the next person how much work is outstanding.
    let state = reducer(undefined, applyBadge({ counts: FIRST, at: "x" }));
    state = reducer(state, setSocketStatus("open"));
    state = reducer(state, resetRealtime());

    expect(state.counts).toBeNull();
    expect(state.status).toBe("idle");
    expect(state.lastAt).toBeNull();
  });
});

describe("re-render churn", () => {
  it("keeps the same counts object when nothing moved", () => {
    // Snapshots re-deliver numbers we already have on every sync and reconnect;
    // a fresh object each time re-renders the whole nav for nothing.
    const first = reducer(undefined, applyBadge({ counts: FIRST, at: "2026-08-24T11:00:00Z" }));
    const again = reducer(first, applyBadge({ counts: { ...FIRST }, at: "2026-08-24T11:02:00Z" }));

    expect(again.counts).toBe(first.counts);
    // Still records that we heard — it is a "last heard", not a "last changed".
    expect(again.lastAt).toBe("2026-08-24T11:02:00Z");
  });

  it("swaps the object as soon as one number differs", () => {
    const first = reducer(undefined, applyBadge({ counts: FIRST, at: "a" }));
    const moved = reducer(first, applyBadge({ counts: { ...FIRST, orders: 13 }, at: "b" }));

    expect(moved.counts).not.toBe(first.counts);
    expect(moved.counts?.orders).toBe(13);
  });
});

describe("owner-scoped counts", () => {
  const MINE = {
    intents: 1,
    orders: 4,
    express_orders: 0,
    verifications: 2,
    delivery_failed: 0,
  };

  it("starts null — absent is not the same as none", () => {
    // A server that does not report `mine` must not render as "none of it is
    // mine"; the two are different statements.
    expect(reducer(undefined, { type: "@@init" }).mine).toBeNull();
  });

  it("stores mine alongside counts, never instead of them", () => {
    const state = reducer(undefined, applyBadge({ counts: FIRST, mine: MINE, at: "x" }));
    expect(state.counts).toEqual(FIRST);
    expect(state.mine).toEqual(MINE);
  });

  it("keeps the last known mine when a frame omits it", () => {
    let state = reducer(undefined, applyBadge({ counts: FIRST, mine: MINE, at: "a" }));
    state = reducer(state, applyBadge({ counts: SECOND, at: "b" }));
    expect(state.mine).toEqual(MINE);
  });

  it("clears mine on logout", () => {
    let state = reducer(undefined, applyBadge({ counts: FIRST, mine: MINE, at: "x" }));
    state = reducer(state, resetRealtime());
    expect(state.mine).toBeNull();
  });
});
