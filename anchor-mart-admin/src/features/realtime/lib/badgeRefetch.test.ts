import { describe, expect, it } from "vitest";
import { queuesForRoute, tagsForQueues, tagsForRoute, tagsToInvalidate } from "./badgeRefetch";

describe("tagsToInvalidate", () => {
  it("returns the queue's list and stats caches when its screen is open", () => {
    expect(tagsToInvalidate("intents", "/intents")).toEqual([
      { type: "Intents", id: "PARTIAL-LIST" },
      { type: "Intents", id: "STATS" },
    ]);
  });

  /**
   * The discipline the whole feature rests on: a frame for a queue nobody is
   * looking at moves the badge and nothing else. Refetching all seven lists per
   * frame would be polling again, with extra steps.
   */
  it("refetches nothing for a queue that is off screen", () => {
    expect(tagsToInvalidate("intents", "/orders")).toEqual([]);
    expect(tagsToInvalidate("seller_requests", "/dashboard")).toEqual([]);
  });

  it("still counts a detail route nested under the queue's screen", () => {
    expect(tagsToInvalidate("orders", "/orders/AM202608190002")).toHaveLength(2);
  });

  it("does not read /express-orders as being under /express", () => {
    // Different screens entirely — the express catalog is not the order queue,
    // and a plain prefix test would conflate them.
    expect(tagsToInvalidate("express_orders", "/express")).toEqual([]);
    expect(tagsToInvalidate("express_orders", "/express-orders")).toHaveLength(2);
  });

  it("routes verifications to the Intents caches, not a screen of its own", () => {
    // `verification_submitted` is an intent status and those rows are already
    // on the Intents list. Binding it to a screen that is no longer routed
    // would mean the frame refetched nothing at all.
    expect(tagsToInvalidate("verifications", "/intents")).toEqual([
      { type: "Intents", id: "PARTIAL-LIST" },
      { type: "Intents", id: "STATS" },
    ]);
    expect(tagsToInvalidate("verifications", "/verification")).toEqual([]);
  });

  it("routes delivery_failed to the orders caches", () => {
    // Failed deliveries are orders; the contract's own answer is the orders
    // list filtered to failed, so they share a screen and a cache.
    expect(tagsToInvalidate("delivery_failed", "/orders")).toEqual([
      { type: "Orders", id: "PARTIAL-LIST" },
      { type: "Orders", id: "STATS" },
    ]);
  });

  it("covers every queue with a binding", () => {
    const queues = [
      "intents",
      "orders",
      "express_orders",
      "special_requests",
      "seller_requests",
      "verifications",
      "delivery_failed",
    ] as const;
    for (const q of queues) {
      // Each must resolve somewhere; an unbound queue would silently never
      // refresh its screen.
      expect(tagsForRoute("/nowhere")).toEqual([]);
      expect(tagsToInvalidate(q, "/nowhere")).toEqual([]);
    }
  });
});

describe("tagsForRoute", () => {
  it("collects the caches behind the open screen", () => {
    expect(tagsForRoute("/sellers")).toEqual([
      { type: "Sellers", id: "PARTIAL-LIST" },
      { type: "Sellers", id: "STATS" },
    ]);
  });

  it("collapses the two queues an Intents visit covers", () => {
    // intents + verifications both bind here; the shared tags appear once.
    expect(tagsForRoute("/intents")).toEqual([
      { type: "Intents", id: "PARTIAL-LIST" },
      { type: "Intents", id: "STATS" },
    ]);
  });

  it("de-duplicates when two queues share a screen", () => {
    // `orders` and `delivery_failed` both bind to /orders — invalidating the
    // same tag twice is harmless but the pair should collapse.
    expect(tagsForRoute("/orders")).toEqual([
      { type: "Orders", id: "PARTIAL-LIST" },
      { type: "Orders", id: "STATS" },
    ]);
  });

  it("returns nothing for a screen with no realtime queue", () => {
    expect(tagsForRoute("/settings")).toEqual([]);
  });
});

describe("tagsForQueues", () => {
  const ALL = [
    "intents",
    "orders",
    "express_orders",
    "special_requests",
    "seller_requests",
    "verifications",
    "delivery_failed",
  ] as const;

  it("unions a batch spanning several queues", () => {
    expect(tagsForQueues(["intents", "orders"], "/intents")).toEqual([
      { type: "Intents", id: "PARTIAL-LIST" },
      { type: "Intents", id: "STATS" },
    ]);
  });

  it("de-duplicates queues that share a screen", () => {
    // A burst touching both must invalidate the shared Orders caches once.
    expect(tagsForQueues(["orders", "delivery_failed"], "/orders")).toEqual([
      { type: "Orders", id: "PARTIAL-LIST" },
      { type: "Orders", id: "STATS" },
    ]);
  });

  describe("the dashboard binding", () => {
    it.each(ALL)("refreshes the dashboard cards for a %s frame", (queue) => {
      // The dashboard renders the same counts the badges do; refreshing one and
      // not the other puts two disagreeing numbers on one screen.
      expect(tagsForQueues([queue], "/dashboard")).toEqual([
        { type: "Dashboard", id: "STATS" },
        { type: "Dashboard", id: "ACTION-REQUIRED" },
        { type: "Orders", id: "DASHBOARD-LIVE" },
      ]);
    });

    it("does not touch the dashboard from any other screen", () => {
      expect(tagsForQueues(["orders"], "/orders")).not.toContainEqual({
        type: "Dashboard",
        id: "STATS",
      });
    });

    it("adds the dashboard cards once for a multi-queue burst", () => {
      expect(tagsForQueues(["orders", "intents", "verifications"], "/dashboard")).toHaveLength(3);
    });

    it("stays quiet when the batch is empty", () => {
      expect(tagsForQueues([], "/dashboard")).toEqual([]);
    });
  });
});

describe("tagsForRoute on the dashboard", () => {
  it("covers the cards, so the manual refresh works there too", () => {
    expect(tagsForRoute("/dashboard")).toEqual([
      { type: "Dashboard", id: "STATS" },
      { type: "Dashboard", id: "ACTION-REQUIRED" },
      { type: "Orders", id: "DASHBOARD-LIVE" },
    ]);
  });
});

describe("queuesForRoute", () => {
  it("reports every queue a screen covers", () => {
    // Opening Intents answers for verifications too — which is what lets one
    // marker stand for both, and what clears both when the admin arrives.
    expect(queuesForRoute("/intents").sort()).toEqual(["intents", "verifications"]);
    expect(queuesForRoute("/orders").sort()).toEqual(["delivery_failed", "orders"]);
  });

  it("reports a single queue where a screen covers one", () => {
    expect(queuesForRoute("/sellers")).toEqual(["seller_requests"]);
  });

  it("reports nothing for a screen with no queue behind it", () => {
    expect(queuesForRoute("/settings")).toEqual([]);
  });

  it("does not read /express-orders as being under /express", () => {
    expect(queuesForRoute("/express")).toEqual([]);
    expect(queuesForRoute("/express-orders")).toEqual(["express_orders"]);
  });
});
