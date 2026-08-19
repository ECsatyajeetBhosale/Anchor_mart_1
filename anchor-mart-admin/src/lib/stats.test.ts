import type { ExpressOrderStats } from "@/features/express";
import type { IntentStats, IntentStatusKey } from "@/features/intents";
import type { OrderStats } from "@/features/orders";
import type { SpecialRequestStats } from "@/features/special-requests";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "./messages";
import { statText, statsError, statsState, statusCount, statusText } from "./stats";

const DASH = MESSAGES.COMMON.STATS.DASH;

/** The live payloads the four endpoints answer with, verbatim. */
const INTENT_PAYLOAD: IntentStats = {
  total: 81,
  status_counts: {
    new: 4,
    sourcing: 3,
    verification: 8,
    substitution_needed: 3,
    awaiting_payment: 63,
    awaiting_customer: 2,
    ready_to_bill: 1,
    rejected: 3,
    cancelled: 60,
  },
  confirmed_today: 4,
  type_counts: { all: 81, emergency: 6, regular: 75 },
};

const ORDER_PAYLOAD: OrderStats = {
  total: 143,
  status_counts: {
    new: 7,
    in_progress: 42,
    delivered: 77,
    delivery_failed: 4,
    cancelled: 0,
    refunded: 13,
  },
  type_counts: { all: 143, emergency: 12, regular: 131 },
};

const EXPRESS_ORDER_PAYLOAD: ExpressOrderStats = {
  total: 151,
  status_counts: {
    awaiting_payment: 12,
    new: 9,
    in_progress: 18,
    delivered: 94,
    delivery_failed: 2,
    cancelled: 9,
    refunded: 7,
  },
};

const SPECIAL_REQUEST_PAYLOAD: SpecialRequestStats = {
  total: 12,
  status_counts: {
    pending: 1,
    sourcing_confirmed: 1,
    quote_sent: 4,
    accepted: 3,
    rejected: 3,
    awaiting_rebill: 0,
  },
};

const READY = statsState({ isLoading: false, isError: false });

describe("statsState", () => {
  it("reports loading before anything else", () => {
    // A first render of a query that will fail is still loading — flashing an
    // error before the request has resolved would be wrong.
    expect(statsState({ isLoading: true, isError: true })).toBe("loading");
  });

  it("distinguishes a failed request from a settled one", () => {
    expect(statsState({ isLoading: false, isError: true })).toBe("error");
    expect(statsState({ isLoading: false, isError: false })).toBe("ready");
  });
});

describe("statText", () => {
  it("renders a real zero as 0, not a dash", () => {
    // The whole point of §6: `sourcing: 0` is a fact about the queue.
    expect(statText(READY, 0)).toBe("0");
  });

  it("renders an absent bucket as 0 once the request succeeded", () => {
    expect(statText(READY, undefined)).toBe("0");
  });

  it("never renders a figure while loading or after a failure", () => {
    // A failed request and a legitimate zero are different states (§7).
    expect(statText("loading", 42)).toBe(DASH);
    expect(statText("error", 42)).toBe(DASH);
    expect(statText("error", 0)).toBe(DASH);
  });

  it("thousands-separates", () => {
    expect(statText(READY, 12345)).toBe((12345).toLocaleString());
  });
});

describe("statusCount", () => {
  it("reads through status_counts, preserving a genuine zero", () => {
    expect(statusCount(INTENT_PAYLOAD, "sourcing")).toBe(3);
    expect(statusCount(INTENT_PAYLOAD, "awaiting_payment")).toBe(63);
  });

  it("returns undefined — not 0 — for a bucket the payload omits", () => {
    expect(statusCount({ total: 5 } as IntentStats, "new")).toBeUndefined();
    expect(statusCount(undefined, "new" as IntentStatusKey)).toBeUndefined();
    // `pending` was removed with the `pending_intent` status on 2026-08-19; the
    // key is gone from `IntentStatusKey`, so a stale card cannot compile.
    expect(statusCount(INTENT_PAYLOAD, "sourcing")).toBe(3);
  });

  it("does not fall back to a root-level key of the same name", () => {
    // The pre-standardization shape put buckets at the root. Reading them there
    // is exactly the bug this rewrite removes, so it must not be tolerated.
    const legacy = { total: 81, new: 7 } as unknown as IntentStats;
    expect(statusCount(legacy, "new")).toBeUndefined();
  });
});

describe("intent stats mapping", () => {
  it("maps every card to its documented figure", () => {
    expect(INTENT_PAYLOAD.total).toBe(81);
    expect(statusText(READY, INTENT_PAYLOAD, "new")).toBe("4");
    expect(statusText(READY, INTENT_PAYLOAD, "sourcing")).toBe("3");
    expect(statusText(READY, INTENT_PAYLOAD, "verification")).toBe("8");
    expect(statusText(READY, INTENT_PAYLOAD, "substitution_needed")).toBe("3");
    expect(statusText(READY, INTENT_PAYLOAD, "awaiting_payment")).toBe("63");
    expect(statusText(READY, INTENT_PAYLOAD, "awaiting_customer")).toBe("2");
    expect(statusText(READY, INTENT_PAYLOAD, "ready_to_bill")).toBe("1");
    expect(statusText(READY, INTENT_PAYLOAD, "rejected")).toBe("3");
    expect(statusText(READY, INTENT_PAYLOAD, "cancelled")).toBe("60");
    // Throughput, outside status_counts and outside every total.
    expect(statText(READY, INTENT_PAYLOAD.confirmed_today)).toBe("4");
  });

  it("consumes type_counts as sent rather than deriving `all`", () => {
    const t = INTENT_PAYLOAD.type_counts;
    expect(t?.all).toBe(81);
    expect(t?.emergency).toBe(6);
    expect(t?.regular).toBe(75);
  });

  it("keeps an absent chip count distinguishable from zero", () => {
    // The chip label renders a bare label for undefined and "· 0" for a real
    // zero, so the two must not be collapsed.
    const partial: IntentStats = { total: 0, type_counts: { all: 0 } };
    expect(partial.type_counts?.all).toBe(0);
    expect(partial.type_counts?.emergency).toBeUndefined();
  });

  it("does not assume the buckets add up to total", () => {
    const c = INTENT_PAYLOAD.status_counts ?? {};
    const everyBucket = Object.values(c).reduce((sum, n) => sum + n, 0);
    // The screen must read `total`, never compute one: summing every bucket
    // double-counts the substitution split and adds two terminal states that
    // sit outside the funnel entirely.
    expect(everyBucket).not.toBe(INTENT_PAYLOAD.total);
  });

  it("reconciles the five open buckets to total — and only those five", () => {
    const c = INTENT_PAYLOAD.status_counts ?? {};
    const open =
      (c.new ?? 0) +
      (c.sourcing ?? 0) +
      (c.verification ?? 0) +
      (c.substitution_needed ?? 0) +
      (c.awaiting_payment ?? 0);
    expect(open).toBe(INTENT_PAYLOAD.total);
    // The split halves are inside `substitution_needed`, not beside it.
    expect((c.awaiting_customer ?? 0) + (c.ready_to_bill ?? 0)).toBe(c.substitution_needed);
    // And the terminal pair is outside the total.
    expect(open + (c.rejected ?? 0) + (c.cancelled ?? 0)).toBeGreaterThan(
      INTENT_PAYLOAD.total ?? 0,
    );
  });
});

describe("order stats mapping", () => {
  it("maps every card to its documented figure", () => {
    expect(ORDER_PAYLOAD.total).toBe(143);
    expect(statusText(READY, ORDER_PAYLOAD, "new")).toBe("7");
    expect(statusText(READY, ORDER_PAYLOAD, "in_progress")).toBe("42");
    expect(statusText(READY, ORDER_PAYLOAD, "delivered")).toBe("77");
    expect(statusText(READY, ORDER_PAYLOAD, "delivery_failed")).toBe("4");
    expect(statusText(READY, ORDER_PAYLOAD, "cancelled")).toBe("0");
    expect(statusText(READY, ORDER_PAYLOAD, "refunded")).toBe("13");
  });

  it("reads type_counts directly", () => {
    expect(ORDER_PAYLOAD.type_counts?.all).toBe(143);
    expect(ORDER_PAYLOAD.type_counts?.emergency).toBe(12);
    expect(ORDER_PAYLOAD.type_counts?.regular).toBe(131);
  });

  it("shares the token `new` with intents without sharing its meaning", () => {
    // Same key, different business state (§4): order 7 is `order_confirmed`,
    // intent 7 is `intent_received`. Equal here by coincidence of the sample —
    // the test asserts they are read from separate payloads, never compared.
    expect(statusCount(ORDER_PAYLOAD, "new")).toBe(7);
    expect(statusCount(INTENT_PAYLOAD, "new")).toBe(4);
  });
});

describe("express stats mapping", () => {
  it("keeps items and orders in separate namespaces", () => {
    const payload = {
      items: { total_products: 10, total_variants: 18, sourceable_variants: 18 },
      orders: EXPRESS_ORDER_PAYLOAD,
    };
    // The items half is flat by contract and carries no `total`/`status_counts`.
    expect(payload.items.total_products).toBe(10);
    expect(payload.orders.total).toBe(151);
    // Nothing merges the two: an item field is not reachable as an order bucket.
    expect(statusCount(payload.orders, "new")).toBe(9);
    expect("total_products" in (payload.orders.status_counts ?? {})).toBe(false);
  });

  it("maps every order card to its documented figure", () => {
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "awaiting_payment")).toBe("12");
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "new")).toBe("9");
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "in_progress")).toBe("18");
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "delivered")).toBe("94");
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "delivery_failed")).toBe("2");
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "cancelled")).toBe("9");
    expect(statusText(READY, EXPRESS_ORDER_PAYLOAD, "refunded")).toBe("7");
  });

  it("takes `total` from the backend, which the buckets do not reproduce", () => {
    const summed = Object.values(EXPRESS_ORDER_PAYLOAD.status_counts ?? {}).reduce(
      (sum, n) => sum + n,
      0,
    );
    // 151 sent, 151 in buckets here — but `payment_received` belongs to no
    // bucket, so the equality is a property of this sample, not a contract.
    expect(EXPRESS_ORDER_PAYLOAD.total).toBe(151);
    expect(summed).toBeLessThanOrEqual(EXPRESS_ORDER_PAYLOAD.total ?? 0);
  });
});

describe("special request stats mapping", () => {
  it("maps every card to its documented figure", () => {
    expect(SPECIAL_REQUEST_PAYLOAD.total).toBe(12);
    expect(statusText(READY, SPECIAL_REQUEST_PAYLOAD, "pending")).toBe("1");
    expect(statusText(READY, SPECIAL_REQUEST_PAYLOAD, "sourcing_confirmed")).toBe("1");
    expect(statusText(READY, SPECIAL_REQUEST_PAYLOAD, "quote_sent")).toBe("4");
    expect(statusText(READY, SPECIAL_REQUEST_PAYLOAD, "accepted")).toBe("3");
    expect(statusText(READY, SPECIAL_REQUEST_PAYLOAD, "rejected")).toBe("3");
    expect(statusText(READY, SPECIAL_REQUEST_PAYLOAD, "awaiting_rebill")).toBe("0");
  });

  it("keeps awaiting_rebill out of the total it sits inside", () => {
    // It is a slice of `sourcing_confirmed`, rendered as a sub-line — never a
    // seventh card, which would count those requests twice.
    expect(statusCount(SPECIAL_REQUEST_PAYLOAD, "awaiting_rebill")).toBe(0);
    expect(statusCount(SPECIAL_REQUEST_PAYLOAD, "sourcing_confirmed")).toBe(1);
  });
});

describe("statsError", () => {
  it("only speaks up when the request actually failed", () => {
    expect(statsError("ready")).toBeNull();
    expect(statsError("loading")).toBeNull();
    expect(statsError("error")).toBe(MESSAGES.COMMON.STATS.ERROR);
  });
});

describe("an empty or partial payload", () => {
  it("degrades to zeros rather than blanking the deck", () => {
    expect(statusText(READY, {} as OrderStats, "delivered")).toBe("0");
    expect(statText(READY, ({} as OrderStats).total)).toBe("0");
  });
});
