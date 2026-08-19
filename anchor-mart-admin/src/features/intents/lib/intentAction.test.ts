import { describe, expect, it } from "vitest";
import { canRejectIntent, canRequestReverification, deriveIntentAction } from "./intentAction";

describe("deriveIntentAction — the situation split", () => {
  it("offers the bill once the sailor has confirmed the substitutions", () => {
    // One status, two situations: `status` alone cannot tell a settled basket
    // from an unanswered one, which is what `situation` exists to say.
    expect(deriveIntentAction("pending_customer_response", true, "ready_to_bill")).toBe("bill");
  });

  it("keeps waiting while the sailor has not answered", () => {
    expect(deriveIntentAction("pending_customer_response", true, "awaiting_customer")).toBe(
      "waiting_customer",
    );
  });

  it("waits rather than guesses when no situation is sent", () => {
    // The safe reading: offering a bill the backend would refuse with a 409 is
    // worse than showing nothing to do.
    expect(deriveIntentAction("pending_customer_response", true)).toBe("waiting_customer");
    expect(deriveIntentAction("pending_customer_response", true, "")).toBe("waiting_customer");
  });

  it("waits on a situation the frontend has not been taught", () => {
    expect(deriveIntentAction("pending_customer_response", true, "something_new")).toBe(
      "waiting_customer",
    );
  });

  it("ignores `situation` on every other status", () => {
    // Only `pending_customer_response` covers more than one situation, so a
    // stray value elsewhere must not redirect the action.
    expect(deriveIntentAction("partner_verifying", false, "ready_to_bill")).toBe("waiting_partner");
    expect(deriveIntentAction("payment_pending", false, "ready_to_bill")).toBe("awaiting_payment");
    expect(deriveIntentAction("intent_received", false, "ready_to_bill")).toBe("assign");
  });
});

describe("deriveIntentAction — the rest of the funnel", () => {
  it("routes the pre-verification statuses to partner assignment", () => {
    // `new` and `sourcing` are both `intent_received` — unclaimed and claimed.
    // What the row needs next is a verifier either way.
    for (const status of ["intent_received", "sourcing"]) {
      expect(deriveIntentAction(status, false)).toBe("assign");
      expect(deriveIntentAction(status, false, "new")).toBe("assign");
      expect(deriveIntentAction(status, false, "sourcing")).toBe("assign");
    }
  });

  it("splits a submitted verification on whether anything is short", () => {
    expect(deriveIntentAction("verification_submitted", true)).toBe("suggest");
    expect(deriveIntentAction("verification_submitted", false)).toBe("bill");
  });

  it("has nothing to offer on terminal or unknown statuses", () => {
    expect(deriveIntentAction("intent_rejected", false)).toBe("rejected");
    expect(deriveIntentAction("cancelled", false)).toBe("none");
    expect(deriveIntentAction("", false)).toBe("none");
  });
});

describe("canRejectIntent", () => {
  it("allows reject only before substitutions are released", () => {
    for (const status of [
      "intent_received",
      "sourcing",
      "partner_verifying",
      "verification_submitted",
    ]) {
      expect(canRejectIntent(status)).toBe(true);
    }
  });

  it("refuses once the sailor has been shown replacements — cancel from there", () => {
    // The API 400s with "use cancel instead"; the screen decides from the
    // status rather than probing for that error.
    expect(canRejectIntent("pending_customer_response")).toBe(false);
    expect(canRejectIntent("payment_pending")).toBe(false);
    expect(canRejectIntent("intent_rejected")).toBe(false);
    expect(canRejectIntent("cancelled")).toBe(false);
  });

  it("no longer counts the retired pending_intent status", () => {
    // The status has no writer and no live rows; it survives only so historical
    // timelines resolve.
    expect(canRejectIntent("pending_intent")).toBe(false);
  });
});

describe("canRequestReverification", () => {
  it("allows it only where a report exists to dispute", () => {
    expect(canRequestReverification("verification_submitted", false)).toBe(true);
    expect(canRequestReverification("pending_customer_response", false)).toBe(true);
  });

  it("withholds it before verification — assign a partner instead", () => {
    // Four more statuses are legal in the state machine, but there the answer
    // is to assign a partner, not to re-ask one.
    for (const status of ["intent_received", "sourcing", "partner_verifying", "payment_pending"]) {
      expect(canRequestReverification(status, false)).toBe(false);
    }
  });

  it("withholds it when no partner is assigned — the endpoint 409s there", () => {
    expect(canRequestReverification("verification_submitted", true)).toBe(false);
  });

  it("does not read an absent partner flag as 'no partner'", () => {
    // `null` means the API omitted the field, which is not the same as saying
    // one is needed — withholding the control on that would hide a legal action.
    expect(canRequestReverification("verification_submitted", null)).toBe(true);
  });
});
