import { baseApi } from "@/lib/fetchUtils";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Imported for its side effect: injecting `getMe`, so the cache has a real
// endpoint to hold an entry under.
import "../api/authApi";
import authReducer, { AUTH_TOKEN_STORAGE_KEY, logout, setCredentials } from "../slice/authSlice";
import { SESSION_CHANNEL_NAME, resetSessionChannelForTests } from "./sessionChannel";
import { sessionSyncMiddleware, startSessionSync } from "./sessionSync";

const toastInfo = vi.fn();
vi.mock("sonner", () => ({ toast: { info: (...args: unknown[]) => toastInfo(...args) } }));

const ADMIN = { id: 1, email: "admin@example.com" } as never;

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware, sessionSyncMiddleware),
  });
}

/** Stands in for a second tab on the same wire; records everything it hears. */
function otherTab() {
  const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  const heard: unknown[] = [];
  channel.addEventListener("message", (event) => heard.push(event.data));
  return {
    heard,
    signOut: () => channel.postMessage("logout"),
    close: () => channel.close(),
  };
}

function storageEvent(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

const cleanups: Array<() => void> = [];

beforeEach(() => {
  localStorage.clear();
  toastInfo.mockClear();
});

afterEach(() => {
  for (const off of cleanups.splice(0)) off();
  resetSessionChannelForTests();
});

describe("sessionSyncMiddleware", () => {
  it("tells the other tabs when this one signs out", async () => {
    const other = otherTab();
    cleanups.push(other.close);
    const store = makeStore();
    store.dispatch(setCredentials({ token: "t", user: ADMIN }));

    store.dispatch(logout());

    await vi.waitFor(() => expect(other.heard).toEqual(["logout"]));
  });

  it("does not re-announce a sign-out it heard from another tab", async () => {
    // Otherwise one click puts one message on the wire per open tab, and each
    // of those wakes every other tab again.
    const other = otherTab();
    cleanups.push(other.close);
    const store = makeStore();
    store.dispatch(setCredentials({ token: "t", user: ADMIN }));

    store.dispatch(logout({ remote: true }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(other.heard).toEqual([]);
  });

  it("empties the query cache, so a signed-out tab holds no fetched data", async () => {
    const store = makeStore();
    store.dispatch(setCredentials({ token: "t", user: ADMIN }));
    await store.dispatch(baseApi.util.upsertQueryData("getMe" as never, undefined as never, ADMIN));
    expect(Object.keys(store.getState().api.queries).length).toBeGreaterThan(0);

    store.dispatch(logout());

    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it("clears the cache for a remote sign-out too", async () => {
    const store = makeStore();
    store.dispatch(setCredentials({ token: "t", user: ADMIN }));
    await store.dispatch(baseApi.util.upsertQueryData("getMe" as never, undefined as never, ADMIN));

    store.dispatch(logout({ remote: true }));

    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it("leaves the token cleared, so a refresh cannot restore the session", () => {
    const store = makeStore();
    store.dispatch(setCredentials({ token: "t", user: ADMIN }));
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("t");

    store.dispatch(logout({ remote: true }));

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});

/** A store stand-in, so the guard can be observed rather than inferred. */
function fakeStore(authenticated: boolean) {
  let isAuthenticated = authenticated;
  const dispatch = vi.fn((_action: { type: string; meta: { remote: boolean } }) => {
    isAuthenticated = false;
  });
  return { getState: () => ({ auth: { isAuthenticated } }), dispatch };
}

describe("startSessionSync", () => {
  it("signs this tab out when another tab does", async () => {
    const store = fakeStore(true);
    cleanups.push(startSessionSync(store));

    const other = otherTab();
    cleanups.push(other.close);
    other.signOut();

    await vi.waitFor(() => expect(store.dispatch).toHaveBeenCalledTimes(1));
    expect(store.dispatch.mock.calls[0][0]).toMatchObject({
      type: "auth/logout",
      // Marked remote so the middleware does not bounce it back onto the wire.
      meta: { remote: true },
    });
  });

  it("handles one sign-out once, however many transports report it", async () => {
    // The channel message and the token's removal describe the same event and
    // either can arrive first; acting on both would sign out twice and toast
    // twice.
    const store = fakeStore(true);
    cleanups.push(startSessionSync(store));

    const other = otherTab();
    cleanups.push(other.close);
    other.signOut();
    storageEvent(AUTH_TOKEN_STORAGE_KEY, null);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(toastInfo).toHaveBeenCalledTimes(1);
  });

  it("stays quiet in a tab that is already signed out", () => {
    // The login screen is open in three tabs; one of them signing in and out
    // must not make the other two announce anything.
    const store = fakeStore(false);
    cleanups.push(startSessionSync(store));

    storageEvent(AUTH_TOKEN_STORAGE_KEY, null);

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it("stops listening once unsubscribed", async () => {
    const store = fakeStore(true);
    startSessionSync(store)();

    storageEvent(AUTH_TOKEN_STORAGE_KEY, null);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(store.dispatch).not.toHaveBeenCalled();
  });
});
