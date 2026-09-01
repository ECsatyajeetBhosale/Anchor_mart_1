import type { ReactNode } from "react";

import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.DASHBOARD;

/**
 * The band itself.
 *
 * The gradient is the sidebar's own declaration, verbatim (`.sidebar`), so the
 * band and the nav read as one surface rather than as two different navies that
 * happen to sit next to each other. Kept as a literal copy — sharing a variable
 * would let a future change to one silently move the other.
 *
 * The two layers on top are decorative and both `pointer-events-none`:
 *
 * - `before` is a single wide, very low-opacity teal wash. Not a "glow effect"
 *   — it stops the navy reading as a flat rectangle at large widths, and it is
 *   invisible at small ones where the band is already short.
 * - `after` is a hairline grid, 1px lines at 3% white on a 32px pitch.
 *   Deliberately closer to a plan drawing than to a texture: it should be
 *   noticeable only if looked for. Masked so it fades before the right edge
 *   rather than butting into it.
 *
 * Held in a constant rather than inline because the two gradients and the mask
 * are long enough to bury the markup they belong to.
 */
const BAND =
  "relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--navy-700)] " +
  "bg-[linear-gradient(135deg,var(--navy-900)_0%,var(--navy-700)_65%,var(--navy-500)_130%)] " +
  "p-[18px_20px] mb-[18px] max-[620px]:p-[15px_16px] " +
  "before:content-[''] before:absolute before:inset-[-60%_-20%_auto_40%] before:h-[220%] " +
  "before:bg-[radial-gradient(closest-side,rgba(10,181,168,0.18),transparent_70%)] " +
  "before:pointer-events-none " +
  "after:content-[''] after:absolute after:inset-0 after:bg-[length:32px_32px] " +
  "after:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] " +
  "after:[mask-image:linear-gradient(90deg,#000_0%,transparent_78%)] " +
  "after:[-webkit-mask-image:linear-gradient(90deg,#000_0%,transparent_78%)] " +
  "after:pointer-events-none";

/**
 * The live indicator: a solid 7px dot with a pulsing ring.
 *
 * The ring pulses; the core does not, so the dot stays a readable mark rather
 * than blinking in and out of visibility. `motion-reduce` stops the ring for
 * anyone who has asked the OS for less motion — it is the only animation on
 * this screen, and it would otherwise run all day.
 */
const LIVE_DOT =
  "relative inline-flex h-[7px] w-[7px] rounded-[999px] bg-[var(--teal-400)] " +
  "after:content-[''] after:absolute after:inset-[-3px] after:rounded-[999px] " +
  "after:border after:border-[var(--teal-400)] after:animate-occ-pulse " +
  "motion-reduce:after:animate-none";

/** The status line's separator. Quieter than the text it divides. */
const SEP = "mx-[8px] text-[var(--navy-300)]";

export interface CommandHeaderProps {
  /** Formatted long date, e.g. "Tuesday, 27 August 2026". */
  today: string;
  /**
   * Raw counts for the status line, or null until **both** have arrived.
   *
   * All-or-nothing, unchanged from the banner this replaces: a half-loaded
   * sentence states one real figure beside a zero, which reads as fact rather
   * than as loading.
   */
  summary: { verifications: number; inFlight: number } | null;
  /** The window the server actually resolved, echoed back. Null when unknown. */
  period: string | null;
  /** The existing period pills, range picker and reset button, passed through. */
  controls: ReactNode;
}

/**
 * The command band — title, date, live status line, period controls.
 *
 * Replaces the full-bleed teal welcome hero. It is a band rather than a hero on
 * purpose: nothing in it is acted on, so it should cost as little vertical space
 * as it can while still orienting someone who has just opened the screen.
 *
 * The period controls moved *into* it. They used to sit in a separate strip
 * below, which read as a filter belonging to the first group of tiles rather
 * than to the screen — and left an explanatory sentence stranded beside them.
 * Placing them beside the resolved period puts the control and its effect in one
 * place. They are passed in as a node and rendered untouched: the toggle, the
 * picker and the reset button behave exactly as before.
 *
 * On the dark ground the shared PillToggle/DateRangePicker keep their own
 * styling — they are wrapped in a light panel, not restyled, so the controls
 * behave identically to every other screen.
 */
export function CommandHeader({ today, summary, period, controls }: CommandHeaderProps) {
  return (
    <header className={BAND}>
      <div className="relative flex flex-wrap items-end justify-between gap-[14px] max-[860px]:items-stretch">
        <div className="min-w-0">
          <div className="flex items-center gap-[7px] text-[10.5px] font-bold uppercase tracking-[0.09em] text-[var(--teal-300)]">
            <span className={LIVE_DOT} aria-hidden="true" />
            {M.OCC.EYEBROW}
            {/* Unstyled: the eyebrow's own gap does the spacing, and a coloured
                separator here would compete with the teal it sits in. */}
            <span aria-hidden="true">·</span>
            {today}
          </div>

          <h1 className="mt-[5px] text-[21px] font-extrabold leading-[1.15] tracking-[-0.015em] text-white max-[620px]:text-[18px]">
            {M.OCC.TITLE}
          </h1>

          {/* The old heading, demoted to its proper rank: a status line. It says
              what is outstanding, which is a fact about today rather than the
              name of the screen. The figures are bold and white; the words
              around them stay quieter so a glance lands on the number. */}
          <p className="mt-[6px] text-[12.5px] leading-[1.45] text-[var(--navy-100)]">
            {summary === null ? (
              M.OCC.LOADING
            ) : (
              <>
                <b className="font-extrabold text-white">
                  {summary.verifications.toLocaleString()}
                </b>{" "}
                {M.OCC.NEEDS_ATTENTION(summary.verifications)}
                <span className={SEP}>·</span>
                <b className="font-extrabold text-white">{summary.inFlight.toLocaleString()}</b>{" "}
                {M.OCC.IN_FLIGHT_LINE(summary.inFlight)}
              </>
            )}
          </p>
        </div>

        <div className="relative flex flex-wrap items-center gap-[8px] rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.94)] p-[6px] shadow-[var(--sh-sm)] max-[860px]:w-full">
          {controls}
        </div>
      </div>

      {/* The resolved window, read out of the response rather than from local
          state — on a custom range it is the only confirmation that the server
          read the same dates the picker sent. */}
      {period && <span className="sr-only">{M.OCC.PULSE_NOTE(period)}</span>}
    </header>
  );
}

export default CommandHeader;
