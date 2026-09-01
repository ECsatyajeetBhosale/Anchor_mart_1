import { describe, expect, it } from "vitest";
import type { NotificationHistoryApi } from "../types/notification.types";
import { toHistoryRow } from "./notificationApi";

const base: NotificationHistoryApi = { id: "c-1", channels: ["inapp", "email", "whatsapp"] };

const dispatch = (channel: string, sent: boolean, error = "") => ({
  channel,
  channel_display: channel === "inapp" ? "In-app + push" : channel,
  is_dispatched: sent,
  dispatched_at: sent ? "2026-09-01T10:05:55Z" : null,
  dispatch_error: error,
  recipients_enqueued: channel === "inapp" ? null : 1,
});

/**
 * The status badge must come from the per-channel rows, never from the flat
 * `is_dispatched`. That flag became *derived* on 2026-09-01 — true only once
 * every channel is out — so a half-sent campaign reads `false`, exactly like
 * one that never started. Rendering it flat reports a half-delivered campaign
 * as "not sent", which is the same false-audit-record failure the per-channel
 * rows were introduced to close.
 */
describe("toHistoryRow — dispatch status", () => {
  it("reads Sent only when every channel is out", () => {
    const row = toHistoryRow({
      ...base,
      is_dispatched: true,
      dispatches: [dispatch("email", true), dispatch("inapp", true), dispatch("whatsapp", true)],
    });
    expect(row.dispatchLabel).toBe("Sent");
    expect(row.dispatchTone).toBe("success");
  });

  it("reports partial progress rather than rounding to not-sent", () => {
    // The trap: the flat flag is false here, identical to a campaign that never
    // started. Two of three channels are actually out.
    const row = toHistoryRow({
      ...base,
      is_dispatched: false,
      dispatches: [dispatch("email", true), dispatch("inapp", true), dispatch("whatsapp", false)],
    });
    expect(row.isDispatched).toBe(false);
    expect(row.dispatchLabel).toBe("Sending (2/3)");
    expect(row.dispatchTone).toBe("warning");
  });

  it("names the failure count when a channel errored", () => {
    const row = toHistoryRow({
      ...base,
      is_dispatched: false,
      dispatches: [
        dispatch("email", true),
        dispatch("inapp", true),
        dispatch("whatsapp", false, "Twilio rejected: outside the service window"),
      ],
    });
    expect(row.dispatchLabel).toBe("Failed on 1 of 3 channels");
    expect(row.dispatchTone).toBe("danger");
  });

  it("keeps a null recipient count as null for in-app", () => {
    // `0` would read as "nobody got it"; the truth is that a topic push has no
    // per-recipient count to report at all.
    const row = toHistoryRow({ ...base, dispatches: [dispatch("inapp", true)] });
    expect(row.dispatches[0].recipientsEnqueued).toBeNull();
    expect(row.dispatches[0].channelLabel).toBe("In-app + push");
  });

  it("counts a real recipient number on a measurable channel", () => {
    const row = toHistoryRow({ ...base, dispatches: [dispatch("email", true)] });
    expect(row.dispatches[0].recipientsEnqueued).toBe(1);
  });

  it("falls back to the flat flag when the array is absent", () => {
    // The contract says backfill makes this impossible, but a missing array
    // must degrade to the old behaviour rather than to a blank badge.
    expect(toHistoryRow({ ...base, is_dispatched: true }).dispatchLabel).toBe("Sent");
    expect(toHistoryRow({ ...base, is_dispatched: false }).dispatchLabel).toBe("Queued");
    expect(
      toHistoryRow({ ...base, is_dispatched: false, dispatch_error: "boom" }).dispatchLabel,
    ).toBe("Failed");
  });
});
