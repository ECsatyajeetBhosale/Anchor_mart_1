import authReducer from "@/features/auth/slice/authSlice";
import chatUnreadReducer from "@/features/chat/slice/chatUnreadSlice";
import realtimeReducer from "@/features/realtime/slice/realtimeSlice";
import { baseApi } from "@/lib/fetchUtils";
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    // Badge counters pushed over `ws/events/`. Not RTK Query: nothing is fetched
    // — the socket is the only writer, and every frame replaces the whole set.
    realtime: realtimeReducer,
    // The chat red dot (Flow 23 §9). Seeded by `unread-summary/` and kept live
    // by the app-level chat socket — not RTK Query state, because the socket
    // writes to it far more often than the endpoint does.
    chatUnread: chatUnreadReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
});

/**
 * Enables RTK Query's `refetchOnFocus` / `refetchOnReconnect` behaviour.
 *
 * These are opt-in *per query*, but they are inert until this is called — which
 * it never was. `features/chat/hooks/useChatPresence.ts` had set both flags to
 * `true` and neither did anything; presence stayed live only because that hook
 * also polls. With the listeners attached, the flags work as written, and any
 * query may now opt into refreshing when the operator tabs back to the browser
 * or the network comes back.
 */
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
