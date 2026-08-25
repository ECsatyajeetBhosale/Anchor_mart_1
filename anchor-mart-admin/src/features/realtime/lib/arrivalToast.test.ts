import { beforeEach, describe, expect, it, vi } from "vitest";

const info = vi.fn();
vi.mock("sonner", () => ({ toast: { info: (...a: unknown[]) => info(...a) } }));

import type { SignalFrame } from "../types/realtime.types";
import { showArrivalToast, showSignalToast } from "./arrivalToast";

const deps = { route: "/intents", onView: vi.fn() };

function signal(over: Partial<SignalFrame> = {}): SignalFrame {
  return {
    type: "signal",
    scope: "admin",
    stage: "verification_submitted",
    screen: "intents",
    order_id: "abc",
    order_number: "AM202608250003",
    at: "2026-08-25T06:51:00Z",
    ...over,
  };
}

describe("arrivalToast", () => {
  beforeEach(() => info.mockClear());

  it("titles a signal with the human stage label and lists the order", () => {
    showSignalToast(signal({ previous_stage: "partner_verifying" }), deps);
    const [title, opts] = info.mock.calls[0];
    expect(title).toBe("Verification Submitted");
    expect(opts.description).toBe("AM202608250003 · moved from Partner Verifying");
  });

  it("falls back to a readable form of an unknown stage from a newer server", () => {
    showSignalToast(signal({ stage: "awaiting_tugboat", order_number: null }), deps);
    expect(info.mock.calls[0][0]).toBe("Awaiting tugboat");
  });

  it("omits the description when the frame carries no detail", () => {
    showSignalToast(signal({ order_number: null, previous_stage: null }), deps);
    expect(info.mock.calls[0][1].description).toBeUndefined();
  });

  it("shares one toast id between a signal and the badge frame for the same order", () => {
    // The dedupe that stops one arrival producing two notices.
    showSignalToast(signal(), deps);
    showArrivalToast("intents", "abc", deps);
    expect(info.mock.calls[0][1].id).toBe("arrival-abc");
    expect(info.mock.calls[1][1].id).toBe("arrival-abc");
  });

  it("lets anonymous arrivals stack, since there is nothing to collapse on", () => {
    showArrivalToast("orders", null, deps);
    expect(info.mock.calls[0][1].id).toBeUndefined();
  });

  it("names the parent screen for a folded queue", () => {
    showArrivalToast("delivery_failed", null, deps);
    expect(info.mock.calls[0][0]).toBe("New activity in Orders");
  });

  it("navigates to the bound route when View is clicked", () => {
    showArrivalToast("intents", null, deps);
    info.mock.calls[0][1].action.onClick();
    expect(deps.onView).toHaveBeenCalledWith("/intents");
  });
});
