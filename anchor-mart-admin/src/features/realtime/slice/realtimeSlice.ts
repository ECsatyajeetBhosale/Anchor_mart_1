import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  type BadgeCounts,
  type MineCounts,
  type SocketStatus,
  sameCounts,
} from "../types/realtime.types";

export interface RealtimeState {
  /**
   * The seven counters, or null before the first frame.
   *
   * Null rather than zeroes on purpose: "we have not heard yet" and "the queues
   * are empty" are different states, and rendering the second while we mean the
   * first shows an all-clear the server never sent.
   */
  counts: BadgeCounts | null;
  /**
   * The five owner-scoped counts, or null before any frame carried them.
   *
   * Null is meaningful and distinct from zeroes. The contract sends `mine` on
   * every admin frame — an admin who owns nothing gets five real zeroes — so
   * null here means "we have not been told", which must never render as "none
   * of it is yours". The two queues with no owner column are absent from the
   * type entirely rather than zeroed, for the same reason at a smaller scale.
   */
  mine: MineCounts | null;
  status: SocketStatus;
  /** Human-readable detail of a terminal auth failure; null when healthy. */
  authError: string | null;
  /**
   * The failure's `code`, kept alongside the detail.
   *
   * The detail is server prose meant for a human; the code is what anything
   * branches on. `no_badge_scope` in particular has to be told apart from a real
   * outage — it means this account type has no badges, so reporting it as a
   * broken connection would send someone chasing a fault that does not exist.
   */
  authCode: string | null;
  /** `at` from the last frame — how stale the numbers on screen are. */
  lastAt: string | null;
}

const initialState: RealtimeState = {
  counts: null,
  mine: null,
  status: "idle",
  authError: null,
  authCode: null,
  lastAt: null,
};

const realtimeSlice = createSlice({
  name: "realtime",
  initialState,
  reducers: {
    /**
     * Applies a badge frame's counters.
     *
     * **Overwrite, never accumulate.** `counts` is always the complete set and
     * always absolute — it is not a delta, and adding it to what is already
     * there is the single most likely way to get this wrong.
     */
    applyBadge: (
      state,
      action: PayloadAction<{ counts: BadgeCounts; mine?: MineCounts; at: string }>,
    ) => {
      // Identical counts keep the existing object, so the sidebar re-renders only
      // when a number actually moves. Snapshots make this the common case: every
      // `sync` and every reconnect re-delivers numbers we already have, and a
      // fresh object each time would re-render the whole nav for nothing.
      if (!sameCounts(state.counts, action.payload.counts)) {
        state.counts = action.payload.counts;
      }
      // Only overwritten when the frame carried it, so a server that stops
      // sending `mine` leaves the last known values rather than blanking them.
      if (action.payload.mine) {
        state.mine = action.payload.mine;
      }
      // Advances either way — it records when we last *heard*, not when the
      // numbers last changed, and no component selects it.
      state.lastAt = action.payload.at;
    },
    setSocketStatus: (state, action: PayloadAction<SocketStatus>) => {
      state.status = action.payload;
    },
    setAuthError: (state, action: PayloadAction<{ code: string; detail: string } | null>) => {
      state.authError = action.payload?.detail ?? null;
      state.authCode = action.payload?.code ?? null;
    },
    /**
     * Clears everything on logout.
     *
     * The counts are global rather than per-admin in v1, but they are still
     * privileged data — leaving them on the screen behind a login form would
     * show the next person how much work is outstanding.
     */
    resetRealtime: () => initialState,
  },
});

export const { applyBadge, setSocketStatus, setAuthError, resetRealtime } = realtimeSlice.actions;
export default realtimeSlice.reducer;
