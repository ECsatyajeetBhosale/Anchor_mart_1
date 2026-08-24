import { useAppSelector } from "@/hooks/useAppDispatch";
import { MESSAGES } from "@/lib/messages";
import { IconPlugConnectedX, IconRefreshAlert } from "@tabler/icons-react";
import { authFailureAction } from "../lib/authFailure";

const R = MESSAGES.REALTIME;

/**
 * Says so when the badge counts have stopped being live.
 *
 * §9 of the contract is explicit that this socket is best-effort: *"a user who
 * leaves a screen open for an hour with a broken socket sees stale numbers"*. We
 * tracked that state from the start and rendered it nowhere, so a dead socket
 * and a healthy one looked identical — the numbers simply stopped, with no way
 * for the admin to know the difference between "quiet morning" and "disconnected
 * an hour ago". The Phase 2 safety-net `sync` narrows that window but cannot
 * close it: a socket halted by a terminal auth failure never syncs again.
 *
 * **Renders nothing while the socket is healthy.** A permanent "Live" pill would
 * be chrome the admin learns to ignore, which is the state where it matters
 * least; the whole value is in the exception. It also stays quiet before the
 * first connection, so a page load does not flash a warning during the second it
 * takes to connect.
 */
export function ConnectionStatus() {
  const status = useAppSelector((s) => s.realtime.status);
  const authCode = useAppSelector((s) => s.realtime.authCode);
  const counts = useAppSelector((s) => s.realtime.counts);

  // A terminal refusal is only worth reporting as a fault if it left the admin
  // signed in. `no_badge_scope` did: nothing is broken, this account type simply
  // has no badges, and there is nothing to retry. The session-ending codes are
  // not handled here at all — the panel has already signed the admin out.
  const inertFailure = authCode !== null && authFailureAction(authCode) === "inert";

  if (status === "open") return null;
  // Nothing has ever arrived: this is a page still connecting, not a failure.
  if (counts === null && (status === "idle" || status === "connecting")) return null;

  const reconnecting = status === "connecting";
  const label = reconnecting ? R.RECONNECTING : inertFailure ? R.NO_BADGES : R.OFFLINE;

  return (
    // `<output>` rather than a div with role="status": it carries that role
    // natively, and it is announced politely — this is context for numbers
    // already on screen, not an interruption worth pulling a screen-reader user
    // out of their task for.
    <output
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-[12px] font-medium text-[var(--t2)]"
      title={R.STALE_HINT}
    >
      {reconnecting ? (
        <IconRefreshAlert size={15} className="shrink-0" />
      ) : (
        <IconPlugConnectedX size={15} className="shrink-0" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </output>
  );
}

export default ConnectionStatus;
