import { MESSAGES } from "@/lib/messages";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { Component, type ReactNode } from "react";

const M = MESSAGES.COMMON.ERROR_BOUNDARY;

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  /** The error that took the tree down, or null while everything is fine. */
  error: Error | null;
}

/**
 * Catches a render-time throw and shows a recoverable screen instead of nothing.
 *
 * **The one place this codebase uses a class component.** `PROJECT_RULES.md`
 * says functional-only, and this is the documented exception rather than a
 * lapse: React exposes error boundaries through `getDerivedStateFromError` and
 * has no hook equivalent, so a boundary cannot be written any other way.
 *
 * Without one, a single bad row — a field the API sent as null where the type
 * says string — unmounts the entire app. React's default for an uncaught render
 * error is to tear down the whole tree, so the operator gets a white page with
 * no message and no way back except discovering that a refresh helps. On a
 * console that runs live order queues that failure is worse than the bug that
 * caused it.
 *
 * Deliberately does **not** try to be clever:
 *  - It does not reset itself on navigation. Re-rendering the subtree that just
 *    threw usually throws again, and a screen that flickers between broken and
 *    blank is harder to report than one that stays put.
 *  - Recovery is a full reload, because the store may be mid-update and the
 *    honest way back to a known state is to start over.
 *  - It catches **render** errors only. An async rejection in a thunk or an
 *    event handler never reaches it; those are already handled where they
 *    happen, by RTK Query's error state and the toast helpers.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
        <div className="card flex max-w-[440px] flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)]">
            <IconAlertTriangle size={24} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="pg-title">{M.TITLE}</div>
            <div className="pg-sub">{M.BODY}</div>
          </div>

          {/*
            The message is shown, not hidden behind a toggle. An operator
            reporting this to whoever maintains the panel has nothing else to
            quote, and a bare "something went wrong" turns a five-minute fix
            into a reproduction hunt.
          */}
          <div className="mono w-full break-words rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-3 py-2 text-left text-[11.5px] text-[var(--t3)]">
            {error.message || String(error)}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => window.location.reload()}
          >
            <IconRefresh size={16} />
            {M.RELOAD}
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
