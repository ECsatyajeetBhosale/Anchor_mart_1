import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../types/chat.types";
import { EDIT_WINDOW_MS, canEditMessage, canModerateMessage, isOwnMessage } from "./chatRoles";

const ME = "admin-1";
const COLLEAGUE = "admin-2";
const NOW = Date.parse("2026-09-02T12:00:00Z");

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    senderId: ME,
    senderName: "Me",
    messageType: "text",
    content: "hello",
    media: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    // Sent one minute ago — comfortably inside the window.
    createdAt: new Date(NOW - 60_000).toISOString(),
    ...overrides,
  };
}

describe("isOwnMessage", () => {
  it("claims a message sent from this account", () => {
    expect(isOwnMessage(message(), ME)).toBe(true);
  });

  it("does not claim a colleague's message on the same desk", () => {
    // Both render on the right — the admin side — but only one is ours.
    expect(isOwnMessage(message({ senderId: COLLEAGUE }), ME)).toBe(false);
  });

  it("claims an optimistic row, which is ours by construction", () => {
    expect(isOwnMessage(message({ senderId: null, pending: true }), ME)).toBe(true);
  });

  it("claims nothing when this account has no id", () => {
    // Without an id the question is unanswerable, and answering "yes" would
    // show moderation controls on everyone's messages.
    expect(isOwnMessage(message(), null)).toBe(false);
  });
});

describe("canModerateMessage", () => {
  it("allows moderating one's own message", () => {
    expect(canModerateMessage(message(), ME)).toBe(true);
  });

  it("refuses a colleague's message", () => {
    expect(canModerateMessage(message({ senderId: COLLEAGUE }), ME)).toBe(false);
  });

  it("refuses an already-deleted message", () => {
    expect(canModerateMessage(message({ isDeleted: true }), ME)).toBe(false);
  });

  it("refuses a pending message, which has no server id yet to act on", () => {
    expect(canModerateMessage(message({ pending: true }), ME)).toBe(false);
  });
});

describe("canEditMessage", () => {
  it("allows an edit just after sending", () => {
    expect(canEditMessage(message(), ME, NOW)).toBe(true);
  });

  it("allows an edit one second before the window closes", () => {
    const createdAt = new Date(NOW - EDIT_WINDOW_MS + 1_000).toISOString();
    expect(canEditMessage(message({ createdAt }), ME, NOW)).toBe(true);
  });

  it("refuses an edit once the window has passed", () => {
    const createdAt = new Date(NOW - EDIT_WINDOW_MS - 1_000).toISOString();
    expect(canEditMessage(message({ createdAt }), ME, NOW)).toBe(false);
  });

  it("closes exactly on the boundary, not a moment after", () => {
    const createdAt = new Date(NOW - EDIT_WINDOW_MS).toISOString();
    expect(canEditMessage(message({ createdAt }), ME, NOW)).toBe(false);
  });

  it("refuses a colleague's message however recent", () => {
    expect(canEditMessage(message({ senderId: COLLEAGUE }), ME, NOW)).toBe(false);
  });

  it("treats an undateable message as too old to edit", () => {
    // NaN comparisons are all false, so this fails closed rather than open.
    expect(canEditMessage(message({ createdAt: "not-a-date" }), ME, NOW)).toBe(false);
  });
});
