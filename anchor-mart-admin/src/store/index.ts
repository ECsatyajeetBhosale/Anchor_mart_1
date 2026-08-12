import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "@/lib/fetchUtils";
import authReducer from "@/features/auth/slice/authSlice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
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
