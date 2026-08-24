import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  type BadgeCounts,
  type BadgeQueue,
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
  /**
   * Which queues have gained work the admin has not looked at yet.
   *
   * The sidebar's activity marker, and the reason the counts are no longer
   * rendered there: a count answers "how much work exists", which for a queue
   * like Orders is never zero and so can never draw the eye. This answers
   * "has something *arrived* since you last looked", which is the question a
   * sidebar indicator is actually for.
   *
   * **In-memory by design.** It cannot be rebuilt after a reload — a reconnect
   * snapshot arrives as `changed: "connect"` with no queue name, so there is
   * nothing to replay from — and persisting it would resurrect markers whose
   * cause the admin may have handled in another tab. A fresh session starts
   * clean, which is the honest default.
   */
  activity: Partial<Record<BadgeQueue, boolean>>;
  /** `at` from the last frame — how stale the numbers on screen are. */
  lastAt: string | null;
}

const initialState: RealtimeState = {
  counts: null,
  mine: null,
  status: "idle",
  authError: null,
  authCode: null,
  activity: {},
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
    /** A queue gained work while the admin was looking at something else. */
    markActivity: (state, action: PayloadAction<BadgeQueue>) => {
      state.activity[action.payload] = true;
    },
    /**
     * The admin opened a screen — everything it covers is now "looked at".
     *
     * Takes a list because one entry can watch several queues: Intents covers
     * both `intents` and `verifications`, and opening it answers for both.
     */
    clearActivity: (state, action: PayloadAction<BadgeQueue[]>) => {
      for (const queue of action.payload) {
        if (state.activity[queue]) state.activity[queue] = false;
      }
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

export const {
  applyBadge,
  markActivity,
  clearActivity,
  setSocketStatus,
  setAuthError,
  resetRealtime,
} = realtimeSlice.actions;
export default realtimeSlice.reducer;
