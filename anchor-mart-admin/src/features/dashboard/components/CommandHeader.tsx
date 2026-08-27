import type { ReactNode } from "react";

import { MESSAGES } from "@/lib/messages";

const M = MESSAGES.DASHBOARD;

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
 */
export function CommandHeader({ today, summary, period, controls }: CommandHeaderProps) {
  return (
    <header className="occ-head">
      <div className="occ-head-inner">
        <div className="min-w-0">
          <div className="occ-head-eyebrow">
            <span className="occ-live" aria-hidden="true" />
            {M.OCC.EYEBROW}
            <span className="occ-sep" aria-hidden="true">
              ·
            </span>
            {today}
          </div>

          <h1 className="occ-head-title">{M.OCC.TITLE}</h1>

          {/* The old heading, demoted to its proper rank: a status line. It says
              what is outstanding, which is a fact about today rather than the
              name of the screen. */}
          <p className="occ-head-status">
            {summary === null ? (
              M.OCC.LOADING
            ) : (
              <>
                <b>{summary.verifications.toLocaleString()}</b>{" "}
                {M.OCC.NEEDS_ATTENTION(summary.verifications)}
                <span className="occ-sep">·</span>
                <b>{summary.inFlight.toLocaleString()}</b> {M.OCC.IN_FLIGHT_LINE(summary.inFlight)}
              </>
            )}
          </p>
        </div>

        <div className="occ-head-controls">{controls}</div>
      </div>

      {/* The resolved window, read out of the response rather than from local
          state — on a custom range it is the only confirmation that the server
          read the same dates the picker sent. */}
      {period && <span className="sr-only">{M.OCC.PULSE_NOTE(period)}</span>}
    </header>
  );
}

export default CommandHeader;
