import { describe, expect, it } from "vitest";
import type { ChatThread } from "../types/chat.types";
import { sortByLastMessage } from "./chatApi";

/** Only the field under test matters; the rest is filler the sort never reads. */
function thread(id: string, lastMessageAt: string): ChatThread {
  return { id, lastMessageAt } as ChatThread;
}

describe("sortByLastMessage", () => {
  it("puts the newest thread first", () => {
    const out = sortByLastMessage([
      thread("old", "2026-08-24T10:00:00Z"),
      thread("new", "2026-08-26T10:00:00Z"),
      thread("mid", "2026-08-25T10:00:00Z"),
    ]);
    expect(out.map((t) => t.id)).toEqual(["new", "mid", "old"]);
  });

  it("sorts a thread with no timestamp last, not first", () => {
    // The failure this guards: treating a missing date as 0 or as NaN-compares
    // silently parks unknown rows above real traffic at the top of the inbox.
    const out = sortByLastMessage([
      thread("none", ""),
      thread("old", "2026-08-24T10:00:00Z"),
      thread("new", "2026-08-26T10:00:00Z"),
    ]);
    expect(out.map((t) => t.id)).toEqual(["new", "old", "none"]);
  });

  it("treats an unparseable timestamp the same as a missing one", () => {
    const out = sortByLastMessage([
      thread("junk", "not-a-date"),
      thread("real", "2026-08-24T10:00:00Z"),
    ]);
    expect(out.map((t) => t.id)).toEqual(["real", "junk"]);
  });

  it("does not mutate the array RTK Query is about to cache", () => {
    const input = [thread("old", "2026-08-24T10:00:00Z"), thread("new", "2026-08-26T10:00:00Z")];
    sortByLastMessage(input);
    expect(input.map((t) => t.id)).toEqual(["old", "new"]);
  });
});
