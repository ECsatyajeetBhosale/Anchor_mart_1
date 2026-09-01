import { describe, expect, it } from "vitest";
import { selectUnreadCount, toInbox, toNotification } from "./notificationInboxApi";

/**
 * The inbox payload is described by a flow document, not a schema this panel
 * owns, so the parser is written to survive the shapes the API plausibly uses.
 * These pin that tolerance — a field rename upstream should degrade one cell,
 * never blank the screen.
 */
describe("toNotification", () => {
  /** Copied verbatim from a live `GET /api/notifications/` response. */
  const LIVE_ROW = {
    id: "394875fa-22f0-45b6-a3bd-87cb37f18f5c",
    type: "order_update",
    category: "transactional",
    priority: "normal",
    title: "Availability report submitted",
    message: "Stock verified for order AM202608270001. All items available.",
    action_required: false,
    action: null,
    is_read: true,
    created_at: "August 27, 2026, 12:02 PM",
  };

  it("maps the live row exactly", () => {
    expect(toNotification(LIVE_ROW)).toEqual({
      id: "394875fa-22f0-45b6-a3bd-87cb37f18f5c",
      type: "order_update",
      category: "transactional",
      priority: "normal",
      title: "Availability report submitted",
      message: "Stock verified for order AM202608270001. All items available.",
      actionRequired: false,
      action: null,
      isRead: true,
      createdAt: "August 27, 2026, 12:02 PM",
      orderId: null,
      orderNumber: null,
    });
  });

  it("leaves the order null when the row names none", () => {
    // The observed rows carry no order field — the number appears only inside
    // the message prose, which is not something to parse out.
    const row = toNotification(LIVE_ROW);
    expect(row.orderId).toBeNull();
    expect(row.orderNumber).toBeNull();
  });

  it("still reads an order when a kind does carry one", () => {
    const row = toNotification({
      ...LIVE_ROW,
      type: "order_assigned",
      order: { id: "o-2", order_number: "AM-000999" },
    });
    expect(row.orderId).toBe("o-2");
    expect(row.orderNumber).toBe("AM-000999");
  });

  it("carries action_required through", () => {
    expect(toNotification({ ...LIVE_ROW, action_required: true }).actionRequired).toBe(true);
  });

  it("accepts the alternate field names in circulation", () => {
    const row = toNotification({
      id: "n-2",
      notification_type: "order_assigned",
      body: "body not message",
      read: true,
      timestamp: "2026-09-01T10:15:00Z",
    });
    expect(row.type).toBe("order_assigned");
    expect(row.message).toBe("body not message");
    expect(row.isRead).toBe(true);
    expect(row.createdAt).toBe("2026-09-01T10:15:00Z");
  });

  it("treats anything but an explicit true as unread", () => {
    // Read is the exceptional state. A flag we failed to parse must leave the
    // row visible rather than silently dropping it out of the badge.
    expect(toNotification({ id: "n-3" }).isRead).toBe(false);
    expect(toNotification({ id: "n-4", is_read: "yes" }).isRead).toBe(false);
  });
});

describe("toInbox", () => {
  const rows = [
    { id: "a", is_read: false },
    { id: "b", is_read: true },
    { id: "c", is_read: false },
  ];

  it("reads the live DRF page shape", () => {
    // `results` is a flat array here — not the `results.data` envelope some of
    // this API's other lists use.
    const inbox = toInbox({ count: 78, next: "…?page=2", previous: null, results: rows });
    expect(inbox.count).toBe(78);
    expect(inbox.items).toHaveLength(3);
  });

  it("reports no server unread total, because the payload carries none", () => {
    expect(toInbox({ count: 78, results: rows }).reportedUnread).toBeNull();
  });

  it("flags a page as unfiltered when a read row came back", () => {
    expect(toInbox({ count: 78, results: rows }).allUnread).toBe(false);
    expect(toInbox({ count: 2, results: [rows[0], rows[2]] }).allUnread).toBe(true);
  });

  it("picks up a real unread_count if the server ever sends one", () => {
    expect(toInbox({ count: 78, unread_count: 12, results: rows }).reportedUnread).toBe(12);
  });

  it("reads a bare array, the flattest envelope", () => {
    expect(toInbox(rows).items).toHaveLength(3);
  });

  it("drops a row with no id, which could never be marked read", () => {
    const inbox = toInbox([{ id: "a", is_read: false }, { is_read: false }]);
    expect(inbox.items).toHaveLength(1);
  });

  it("survives an empty or malformed payload", () => {
    expect(toInbox({}).items).toEqual([]);
    expect(toInbox(null).reportedUnread).toBeNull();
  });
});

describe("selectUnreadCount — the bell", () => {
  const unread = { id: "a", is_read: false };
  const read = { id: "b", is_read: true };

  it("trusts the filtered count when every row came back unread", () => {
    // The server honoured `is_read=false`, so `count` is the real unread total
    // across all pages — not just what fits on this one.
    const inbox = toInbox({ count: 42, results: [unread, unread] });
    expect(selectUnreadCount(inbox)).toBe(42);
  });

  it("does not trust the count when a read row came back", () => {
    // The filter was ignored, so `count` is the whole inbox. Trusting it would
    // light the bell permanently — the exact hardcoded always-on dot this
    // replaced. Fall back to what we can actually see.
    const inbox = toInbox({ count: 78, results: [unread, read, read] });
    expect(selectUnreadCount(inbox)).toBe(1);
  });

  it("is zero on an empty inbox", () => {
    expect(selectUnreadCount(toInbox({ count: 0, results: [] }))).toBe(0);
  });

  it("is zero before the query resolves", () => {
    expect(selectUnreadCount(undefined)).toBe(0);
  });

  it("prefers a real unread_count if the server ever sends one", () => {
    const inbox = toInbox({ count: 78, unread_count: 5, results: [unread] });
    expect(selectUnreadCount(inbox)).toBe(5);
  });
});
