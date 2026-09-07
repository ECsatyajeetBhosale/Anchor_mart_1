import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_TOKEN_STORAGE_KEY } from "../slice/authSlice";
import {
  SESSION_CHANNEL_NAME,
  publishLogout,
  resetSessionChannelForTests,
  subscribeToRemoteLogout,
} from "./sessionChannel";

/** Stands in for a second tab on the same wire. */
function otherTab() {
  const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  return {
    signOut: () => channel.postMessage("logout"),
    listen: (onMessage: (data: unknown) => void) => {
      channel.addEventListener("message", (event) => onMessage(event.data));
    },
    close: () => channel.close(),
  };
}

/** Fires the event the browser raises in other tabs when a key is written. */
function storageEvent(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

const cleanups: Array<() => void> = [];
function track<T extends () => void>(off: T): T {
  cleanups.push(off);
  return off;
}

afterEach(() => {
  for (const off of cleanups.splice(0)) off();
  resetSessionChannelForTests();
});

describe("subscribeToRemoteLogout — BroadcastChannel", () => {
  it("hears another tab signing out", async () => {
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    const other = otherTab();
    track(other.close);
    other.signOut();

    await vi.waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });

  it("ignores traffic that is not a sign-out", async () => {
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
    track(() => channel.close());
    channel.postMessage("something-else");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("does not echo back to the tab that published", async () => {
    // The tab that signs itself out has already cleared its own session; being
    // told about it again is how a broadcast turns into a loop.
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    publishLogout();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onLogout).not.toHaveBeenCalled();
  });
});

describe("publishLogout", () => {
  it("reaches the other tabs", async () => {
    const seen: unknown[] = [];
    const other = otherTab();
    track(other.close);
    other.listen((data) => seen.push(data));

    publishLogout();

    await vi.waitFor(() => expect(seen).toEqual(["logout"]));
  });
});

describe("subscribeToRemoteLogout — storage fallback", () => {
  it("treats the token's removal as a sign-out", () => {
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    storageEvent(AUTH_TOKEN_STORAGE_KEY, null);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("treats a cleared store as a sign-out", () => {
    // `localStorage.clear()` reports a null key, and it takes the token with it.
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    storageEvent(null, null);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("ignores a write to the token — that is a sign-in, not a sign-out", () => {
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    storageEvent(AUTH_TOKEN_STORAGE_KEY, "a-fresh-token");
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("ignores keys that are not the token", () => {
    const onLogout = vi.fn();
    track(subscribeToRemoteLogout(onLogout));

    storageEvent("am_admin_user", null);
    storageEvent("some-other-app", null);
    expect(onLogout).not.toHaveBeenCalled();
  });
});

describe("unsubscribe", () => {
  it("stops both transports", async () => {
    const onLogout = vi.fn();
    const off = subscribeToRemoteLogout(onLogout);
    off();

    const other = otherTab();
    track(other.close);
    other.signOut();
    storageEvent(AUTH_TOKEN_STORAGE_KEY, null);

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onLogout).not.toHaveBeenCalled();
  });
});
