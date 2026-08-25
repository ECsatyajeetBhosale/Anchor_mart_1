import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { ChatCategory, ChatUnreadSummary } from "../types/chat.types";

/** The categories the badge breaks down by — `group` included. */
export type UnreadCategory = ChatCategory | "group";

const EMPTY_BY_CATEGORY: Record<UnreadCategory, number> = {
  user_support: 0,
  delivery_support: 0,
  order: 0,
  order_delivery: 0,
  group: 0,
};

export interface ChatUnreadState {
  /** Unread messages across every thread this admin can reach. */
  total: number;
  /** The server's own answer, from the last summary fetch. */
  hasUnread: boolean;
  threadsWithUnread: number;
  byCategory: Record<UnreadCategory, number>;
  /**
   * Threads a socket frame lit since the last authoritative fetch.
   *
   * Kept as ids rather than a count so that reading one thread can retract
   * exactly that thread's contribution. A bare counter could not: the same
   * thread receiving three messages must clear in one read, not three.
   *
   * **In-memory only.** Persisting it would resurrect a dot for a message the
   * admin already handled in another tab, and the summary fetch at launch is the
   * honest source at that moment.
   */
  unreadChatIds: string[];
  /** True once the first summary has landed — before that, "we have not heard". */
  loaded: boolean;
}

const initialState: ChatUnreadState = {
  total: 0,
  hasUnread: false,
  threadsWithUnread: 0,
  byCategory: { ...EMPTY_BY_CATEGORY },
  unreadChatIds: [],
  loaded: false,
};

const chatUnreadSlice = createSlice({
  name: "chatUnread",
  initialState,
  reducers: {
    /**
     * Replaces everything from `unread-summary/` (§9.1).
     *
     * **Overwrite, and drop the local ids.** The server has just told us the
     * truth including every socket frame we counted locally; keeping those ids
     * would double-count them into the next read.
     */
    applyUnreadSummary: (state, action: PayloadAction<ChatUnreadSummary>) => {
      state.total = action.payload.total;
      state.hasUnread = action.payload.hasUnread;
      state.threadsWithUnread = action.payload.threadsWithUnread;
      state.byCategory = { ...EMPTY_BY_CATEGORY, ...action.payload.byCategory };
      state.unreadChatIds = [];
      state.loaded = true;
    },

    /**
     * A `chat_message` arrived from someone else (§9.2 rule 2).
     *
     * Applied **whatever screen is showing** — the dot is app-level. The caller
     * is responsible for never dispatching this for the admin's own message
     * (rule 3) or for the thread currently open and being read.
     *
     * `category` is null when it could not be resolved: the frame carries
     * `chat_type` (`private` / `order` / `group`), which cannot tell
     * `user_support` from `delivery_support`, nor `order` from `order_delivery`.
     * The app-level dot still lights — it reads `unreadChatIds` — and the
     * reconciling fetch corrects the per-icon breakdown a moment later.
     */
    chatMessageArrived: (
      state,
      action: PayloadAction<{ chatId: string; category: UnreadCategory | null }>,
    ) => {
      const { chatId, category } = action.payload;
      if (!state.unreadChatIds.includes(chatId)) state.unreadChatIds.push(chatId);
      state.total += 1;
      state.hasUnread = true;
      if (category) state.byCategory[category] += 1;
    },

    /**
     * The admin read a thread — its local contribution is retracted.
     *
     * Only the ids are touched. The counts are left for the next summary fetch
     * rather than decremented by a guess: this panel does not know how many of
     * that thread's messages were unread, and a badge that drifts is worse than
     * one that lags by a request (§9.2 rule 6).
     */
    chatThreadRead: (state, action: PayloadAction<string>) => {
      state.unreadChatIds = state.unreadChatIds.filter((id) => id !== action.payload);
    },

    /** Clears on logout — unread counts are privileged data like any other. */
    resetChatUnread: () => initialState,
  },
});

export const { applyUnreadSummary, chatMessageArrived, chatThreadRead, resetChatUnread } =
  chatUnreadSlice.actions;
export default chatUnreadSlice.reducer;
