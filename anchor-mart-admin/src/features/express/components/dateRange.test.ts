import { describe, expect, it } from "vitest";
import { isPartialRange } from "./ExpressOrdersPage";

const JAN_1 = new Date(2026, 0, 1);
const JAN_9 = new Date(2026, 0, 9);

/**
 * The express filters live in the URL, and a half-picked range must not go
 * there — `date_from` with no `date_to` widens the query to "everything after
 * X" while the picker still looks pending. But the picker is controlled by what
 * this screen holds, so treating "not publishable" as "not worth keeping" meant
 * the first pick was thrown away and a range could never be completed at all.
 * This is the line between the two.
 */
describe("isPartialRange", () => {
  it("calls a start-only range partial — the usual first pick", () => {
    expect(isPartialRange({ from: JAN_1, to: undefined })).toBe(true);
  });

  it("calls an end-only range partial too", () => {
    // `DateRangeCalendar` is two independent calendars, so the end date can be
    // picked first. That half was discarded just as thoroughly as the other.
    expect(isPartialRange({ from: undefined, to: JAN_9 })).toBe(true);
  });

  it("does not call a complete range partial — that one gets published", () => {
    expect(isPartialRange({ from: JAN_1, to: JAN_9 })).toBe(false);
  });

  it("does not call an empty range partial — that one clears the filter", () => {
    expect(isPartialRange(undefined)).toBe(false);
    expect(isPartialRange({ from: undefined, to: undefined })).toBe(false);
  });

  it("treats a single-day range as complete", () => {
    expect(isPartialRange({ from: JAN_1, to: JAN_1 })).toBe(false);
  });
});
