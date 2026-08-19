import { describe, expect, it } from "vitest";
import { dateTimeText, shortDate } from "./dates";
import { MESSAGES } from "./messages";

const DASH = MESSAGES.COMMON.STATS.DASH;

/** The format the four admin lists send, pinned by a backend test. */
const ARRIVAL = "August 22, 2026, 11:47 AM";
const MIDNIGHT = "August 29, 2026, 12:00 AM";

describe("shortDate", () => {
  it("shortens the documented list format", () => {
    expect(shortDate(ARRIVAL)).toBe("Aug 22, 2026");
    expect(shortDate(MIDNIGHT)).toBe("Aug 29, 2026");
  });

  it("covers all twelve months", () => {
    const expected = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    for (const [i, month] of months.entries()) {
      expect(shortDate(`${month} 03, 2026, 06:18 AM`)).toBe(`${expected[i]} 3, 2026`);
    }
  });

  it("does not shift the day", () => {
    // The backend renders a UTC instant as wall-clock with no offset marker, so
    // any parse would read it in the viewer's zone. The day is taken from the
    // text instead, which is why this holds in every timezone.
    expect(shortDate("August 22, 2026, 11:47 PM")).toBe("Aug 22, 2026");
    expect(shortDate("August 22, 2026, 12:01 AM")).toBe("Aug 22, 2026");
  });

  it("renders a dash for an absent value", () => {
    expect(shortDate(null)).toBe(DASH);
    expect(shortDate(undefined)).toBe(DASH);
    expect(shortDate("   ")).toBe(DASH);
  });

  it("passes an unrecognised format through rather than blanking it", () => {
    // An unexpected shape is worth seeing. Returning a dash would hide a
    // contract change behind what looks like missing data.
    expect(shortDate("2026-08-22T11:47:00Z")).toBe("2026-08-22T11:47:00Z");
    expect(shortDate("Augustus 22, 2026")).toBe("Augustus 22, 2026");
  });
});

describe("dateTimeText", () => {
  it("passes the full timestamp through as sent", () => {
    expect(dateTimeText(ARRIVAL)).toBe(ARRIVAL);
  });

  it("renders a dash for an absent value", () => {
    expect(dateTimeText(null)).toBe(DASH);
    expect(dateTimeText("")).toBe(DASH);
  });
});
