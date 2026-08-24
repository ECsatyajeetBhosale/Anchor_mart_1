import { describe, expect, it } from "vitest";
import { authFailureAction } from "./authFailure";

/**
 * §3's "What to do" column, verbatim. These are the contract's instructions
 * rather than our judgement, so each row is asserted individually.
 */
describe("authFailureAction", () => {
  it("sends an invalid token to login", () => {
    expect(authFailureAction("invalid_token")).toBe("logout-to-login");
  });

  it("sends an expired token to login", () => {
    expect(authFailureAction("token_expired")).toBe("logout-to-login");
  });

  it("logs a blocked account out with its own message", () => {
    expect(authFailureAction("blocked")).toBe("logout-blocked");
  });

  it("leaves the session alone for no_badge_scope", () => {
    // Not a login problem: this account type has no badges at all. Signing in
    // again changes nothing, and the REST session behind the panel is fine.
    expect(authFailureAction("no_badge_scope")).toBe("inert");
  });

  it("leaves the session alone for missing_token", () => {
    // Our own bug — we connected without a token. Destroying a good session over
    // a defect in our connect URL would be the worse outcome.
    expect(authFailureAction("missing_token")).toBe("inert");
  });

  it.each(["", "something_new", "SESSION_REVOKED", "invalid token"])(
    "is inert for the unrecognised code %o",
    (code) => {
      // A code this frontend has not been taught must never log anyone out:
      // failing to sign someone out is recoverable, the reverse is not.
      expect(authFailureAction(code)).toBe("inert");
    },
  );
});
