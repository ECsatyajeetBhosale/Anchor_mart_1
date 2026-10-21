import { describe, expect, it } from "vitest";
import {
  dateTimeText,
  dayText,
  formatDateRange,
  sgtDateKey,
  sgtDayEndIso,
  sgtDayStartIso,
  sgtDaysUntil,
  sgtMonthDay,
  sgtTimeText,
  shortDate,
  stampText,
  toInstant,
} from "./dates";
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

/** The 2026-09-29 contract: Singapore wall-clock with a trailing zone. */
const SGT_STAMP = "September 10, 2026, 07:33 PM SGT";

describe("SGT display strings", () => {
  it("shortDate and dateTimeText read the SGT suffix without parsing", () => {
    expect(shortDate(SGT_STAMP)).toBe("Sep 10, 2026");
    expect(dateTimeText(SGT_STAMP)).toBe(SGT_STAMP);
  });

  it("dayText handles both contracts in Singapore time", () => {
    expect(dayText(SGT_STAMP)).toBe("Sep 10, 2026");
    // 20:00 UTC on the 9th is already the 10th in Singapore.
    expect(dayText("2026-09-09T20:00:00Z")).toBe("Sep 10, 2026");
    // A bare calendar day is never shifted.
    expect(dayText("2026-09-10")).toBe("Sep 10, 2026");
    expect(dayText(null)).toBe(DASH);
  });

  it("stampText passes display strings through and renders ISO to the same shape", () => {
    expect(stampText(SGT_STAMP)).toBe(SGT_STAMP);
    expect(stampText("2026-09-10T11:33:00Z")).toBe(SGT_STAMP);
    expect(stampText("")).toBe(DASH);
  });

  it("toInstant reads a display string as Singapore wall-clock", () => {
    expect(toInstant(SGT_STAMP)?.toISOString()).toBe("2026-09-10T11:33:00.000Z");
    expect(toInstant("September 10, 2026")?.toISOString()).toBe("2026-09-09T16:00:00.000Z");
    expect(toInstant("not a date")).toBeNull();
  });

  it("sgtDaysUntil counts Singapore calendar days", () => {
    const now = new Date("2026-09-08T12:00:00Z"); // Sep 8, 20:00 SGT
    expect(sgtDaysUntil(SGT_STAMP, now)).toBe(2);
    expect(sgtDaysUntil("September 7, 2026", now)).toBe(-1);
    expect(sgtDaysUntil("garbage", now)).toBeNull();
  });
});

describe("sgtDateKey", () => {
  it("seeds a picker with the Singapore day, not the UTC one", () => {
    expect(sgtDateKey("2026-09-09T16:00:00Z")).toBe("2026-09-10");
    expect(sgtDateKey("2026-09-10T00:00:00+08:00")).toBe("2026-09-10");
    expect(sgtDateKey("2026-09-10")).toBe("2026-09-10");
    expect(sgtDateKey(null)).toBe("");
  });
});

describe("sgtTimeText / sgtMonthDay (BUG-044)", () => {
  it("shows a chat time in Singapore time, labelled", () => {
    // 10:24Z is 15:54 IST and 18:24 SGT.
    expect(sgtTimeText("2026-10-12T10:24:00Z")).toBe("6:24 PM SGT");
    expect(sgtTimeText("")).toBe("");
  });

  it("takes the day in Singapore, not UTC", () => {
    expect(sgtMonthDay("2026-10-11T17:00:00Z")).toBe("Oct 12");
    expect(sgtMonthDay(null)).toBe("");
  });
});

describe("formatDateRange", () => {
  it("reads like the QA expectation", () => {
    expect(formatDateRange(new Date(2026, 8, 1), new Date(2026, 8, 25))).toBe(
      "Sep 1 – Sep 25, 2026",
    );
    expect(formatDateRange(new Date(2025, 11, 30), new Date(2026, 0, 2))).toBe(
      "Dec 30, 2025 – Jan 2, 2026",
    );
  });
});

describe("sgtDayStartIso / sgtDayEndIso", () => {
  it("bounds the picked calendar day by Singapore midnight, whatever the browser zone", () => {
    const day = new Date(2026, 9, 20); // 20 Oct, as the picker builds it
    expect(sgtDayStartIso(day)).toBe("2026-10-19T16:00:00.000Z");
    expect(sgtDayEndIso(day)).toBe("2026-10-20T15:59:59.999Z");
  });
});
