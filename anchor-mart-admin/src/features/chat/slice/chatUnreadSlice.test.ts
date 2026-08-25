import { describe, expect, it } from "vitest";
import type { ChatUnreadSummary } from "../types/chat.types";
import reducer, {
  applyUnreadSummary,
  chatMessageArrived,
  chatThreadRead,
  resetChatUnread,
} from "./chatUnreadSlice";

/** A summary as the mapper produces one — every category present. */
function summary(over: Partial<ChatUnreadSummary> = {}): ChatUnreadSummary {
  return {
    total: 3,
    hasUnread: true,
    threadsWithUnread: 2,
    byCategory: {
      user_support: 1,
      delivery_support: 0,
      order: 2,
      order_delivery: 0,
      group: 0,
    },
    ...over,
  };
}

const initial = reducer(undefined, { type: "@@INIT" });

describe("initial state", () => {
  it("starts clean and unloaded", () => {
    expect(initial.hasUnread).toBe(false);
    expect(initial.total).toBe(0);
    expect(initial.unreadChatIds).toEqual([]);
    expect(initial.loaded).toBe(false);
  });
});

describe("applyUnreadSummary", () => {
  it("overwrites the counts and marks the badge loaded", () => {
    const state = reducer(initial, applyUnreadSummary(summary()));
    expect(state.total).toBe(3);
    expect(state.hasUnread).toBe(true);
    expect(state.byCategory.order).toBe(2);
    expect(state.loaded).toBe(true);
  });

  it("drops locally-counted ids, which the server has now accounted for", () => {
    // Without this the same message is counted twice: once by the socket frame
    // and again in the summary that already includes it.
    let state = reducer(initial, chatMessageArrived({ chatId: "42", category: "order" }));
    expect(state.unreadChatIds).toEqual(["42"]);
    state = reducer(state, applyUnreadSummary(summary()));
    expect(state.unreadChatIds).toEqual([]);
  });

  it("zeroes a category the payload omitted rather than leaving the old number", () => {
    let state = reducer(initial, applyUnreadSummary(summary()));
    state = reducer(
      state,
      applyUnreadSummary(
        summary({
          total: 0,
          hasUnread: false,
          byCategory: {
            user_support: 0,
            delivery_support: 0,
            order: 0,
            order_delivery: 0,
            group: 0,
          },
        }),
      ),
    );
    expect(state.byCategory.order).toBe(0);
    expect(state.hasUnread).toBe(false);
  });
});

describe("chatMessageArrived", () => {
  it("lights the dot and counts the category (§9.2 rule 2)", () => {
    const state = reducer(initial, chatMessageArrived({ chatId: "42", category: "user_support" }));
    expect(state.hasUnread).toBe(true);
    expect(state.total).toBe(1);
    expect(state.byCategory.user_support).toBe(1);
    expect(state.unreadChatIds).toEqual(["42"]);
  });

  it("still lights the app-level dot when the category is unknown", () => {
    // The frame carries `chat_type`, which cannot separate user_support from
    // delivery_support — the dot must not wait for the reconciling fetch.
    const state = reducer(initial, chatMessageArrived({ chatId: "42", category: null }));
    expect(state.hasUnread).toBe(true);
    expect(state.unreadChatIds).toEqual(["42"]);
    expect(state.byCategory.user_support).toBe(0);
  });

  it("records a thread once however many messages it receives", () => {
    let state = reducer(initial, chatMessageArrived({ chatId: "42", category: "order" }));
    state = reducer(state, chatMessageArrived({ chatId: "42", category: "order" }));
    // One read clears the thread, so the id list must not grow per message —
    // but the message count genuinely did go up by two.
    expect(state.unreadChatIds).toEqual(["42"]);
    expect(state.total).toBe(2);
  });
});

describe("chatThreadRead", () => {
  it("retracts only that thread's contribution (§9.2 rule 4)", () => {
    let state = reducer(initial, chatMessageArrived({ chatId: "42", category: "order" }));
    state = reducer(state, chatMessageArrived({ chatId: "43", category: "order" }));
    state = reducer(state, chatThreadRead("42"));
    // Reading one thread of two clears that thread, never the dot.
    expect(state.unreadChatIds).toEqual(["43"]);
  });

  it("leaves the counts to the next fetch rather than guessing a decrement", () => {
    // The panel does not know how many of the thread's messages were unread, and
    // a badge that drifts is worse than one that lags by a request (§9.2 rule 6).
    let state = reducer(initial, chatMessageArrived({ chatId: "42", category: "order" }));
    state = reducer(state, chatThreadRead("42"));
    expect(state.total).toBe(1);
  });

  it("ignores a thread it was never tracking", () => {
    const state = reducer(initial, chatThreadRead("nope"));
    expect(state.unreadChatIds).toEqual([]);
  });
});

describe("resetChatUnread", () => {
  it("clears everything on logout", () => {
    let state = reducer(initial, applyUnreadSummary(summary()));
    state = reducer(state, chatMessageArrived({ chatId: "42", category: "order" }));
    state = reducer(state, resetChatUnread());
    expect(state).toEqual(initial);
  });
});
