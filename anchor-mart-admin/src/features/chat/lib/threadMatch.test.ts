import { describe, expect, it } from "vitest";
import type { ChatThread } from "../types/chat.types";
import {
  matchesOrderThread,
  matchesSupportThread,
  orderThreadCategory,
  supportInboxFor,
} from "./threadMatch";

const ORDER_UUID = "2d5d2085-04cc-4821-8f7f-aa24f0a3f92b";
const SAILOR = "9c1e0000-0000-4000-8000-000000000001";
const PARTNER = "9c1e0000-0000-4000-8000-000000000002";

/** Only the fields the matcher reads; the rest of a row is filler. */
function orderThread(id: string, orderId: string, ownerId: string | null): ChatThread {
  return {
    id,
    ownerId,
    order: { id: orderId, orderNumber: "AM-100234" },
  } as ChatThread;
}

describe("orderThreadCategory", () => {
  it("keeps the two sides apart", () => {
    // The failure this guards is silent and severe: a wrong category opens the
    // *other* party's conversation rather than erroring.
    expect(orderThreadCategory("customer")).toBe("order");
    expect(orderThreadCategory("delivery_partner")).toBe("order_delivery");
  });
});

describe("supportInboxFor", () => {
  it("sends a partner to the delivery inbox, not the sailor one", () => {
    expect(supportInboxFor("customer")).toBe("support");
    expect(supportInboxFor("delivery_partner")).toBe("delivery");
  });
});

describe("matchesOrderThread", () => {
  it("matches on the order UUID", () => {
    expect(matchesOrderThread(orderThread("42", ORDER_UUID, SAILOR), ORDER_UUID)).toBe(true);
  });

  it("does not match the human order number", () => {
    // The bug this pins: the drawer passed `OrderDetail.id`, which is
    // "AM-100234", where every endpoint and every row means the UUID.
    expect(matchesOrderThread(orderThread("42", ORDER_UUID, SAILOR), "AM-100234")).toBe(false);
  });

  it("does not match a different order", () => {
    expect(matchesOrderThread(orderThread("42", ORDER_UUID, SAILOR), "other-uuid")).toBe(false);
  });

  it("never matches on a blank order id", () => {
    // Guards the "disabled button fired anyway" path: an empty id must find
    // nothing rather than matching the first row with no order.
    expect(matchesOrderThread(orderThread("42", "", null), "")).toBe(false);
  });

  it("ignores a support row, which carries no order", () => {
    expect(
      matchesOrderThread({ id: "7", ownerId: SAILOR, order: null } as ChatThread, ORDER_UUID),
    ).toBe(false);
  });

  it("picks the named partner when one order has several partner threads", () => {
    const current = orderThread("50", ORDER_UUID, PARTNER);
    const previous = orderThread("49", ORDER_UUID, SAILOR);
    expect(matchesOrderThread(current, ORDER_UUID, PARTNER)).toBe(true);
    expect(matchesOrderThread(previous, ORDER_UUID, PARTNER)).toBe(false);
  });

  it("matches any thread on the order when no owner is named", () => {
    expect(matchesOrderThread(orderThread("50", ORDER_UUID, PARTNER), ORDER_UUID)).toBe(true);
  });
});

describe("matchesSupportThread", () => {
  it("matches the thread whose owner is that user", () => {
    expect(matchesSupportThread({ id: "7", ownerId: SAILOR } as ChatThread, SAILOR)).toBe(true);
  });

  it("does not match another user's thread", () => {
    expect(matchesSupportThread({ id: "7", ownerId: PARTNER } as ChatThread, SAILOR)).toBe(false);
  });

  it("never matches a row with no resolvable owner", () => {
    // A row whose owner id could not be recovered must not become a wildcard
    // that opens a stranger's conversation.
    expect(matchesSupportThread({ id: "7", ownerId: null } as ChatThread, SAILOR)).toBe(false);
    expect(matchesSupportThread({ id: "7", ownerId: SAILOR } as ChatThread, "")).toBe(false);
  });
});
