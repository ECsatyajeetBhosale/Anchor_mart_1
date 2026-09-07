import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The registration path, exercised the way the app actually mounts it.
 *
 * `main.tsx` renders inside `<StrictMode>`, which mounts every effect, tears it
 * down, and mounts it again. That is not a test artifact — it is what happens
 * in development on every load, and it is the difference between the token
 * reaching the backend and never being minted at all.
 */

const AUTH_TOKEN = "session-token";

const permission = { value: "default" as NotificationPermission };
const requestPermission = vi.fn(async () => permission.value);
const getDeviceToken = vi.fn<() => Promise<string | null>>(async () => "fcm-device-token");
const registerFcmToken = vi.fn(() => ({ unwrap: () => Promise.resolve({ message: "ok" }) }));

vi.mock("@/hooks/useAppDispatch", () => ({
  useAppSelector: (fn: (s: unknown) => unknown) => fn({ auth: { token: AUTH_TOKEN } }),
}));
vi.mock("../lib/firebaseConfig", () => ({ isPushConfigured: () => true }));
vi.mock("../lib/firebaseMessaging", () => ({
  isPushSupported: () => true,
  currentPermission: () => permission.value,
  requestPermission: () => requestPermission(),
  getDeviceToken: () => getDeviceToken(),
  onForegroundMessage: async () => () => {},
}));
vi.mock("../api/pushApi", () => ({
  useRegisterFcmTokenMutation: () => [registerFcmToken],
}));

const { usePushNotifications } = await import("./usePushNotifications");

function Harness() {
  usePushNotifications();
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  permission.value = "default";
  getDeviceToken.mockResolvedValue("fcm-device-token");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("registration on sign-in", () => {
  it("sends the token when permission is already granted", async () => {
    permission.value = "granted";
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));
    expect(registerFcmToken).toHaveBeenCalledWith({ fcm_token: "fcm-device-token" });
  });

  it("sends the token after the admin accepts the permission prompt", async () => {
    // The first sign-in on a browser: permission is "default", the prompt is
    // raised, the admin allows it, and the freshly minted token has to reach
    // the backend. This is the path that never completed.
    permission.value = "default";
    requestPermission.mockImplementation(async () => {
      permission.value = "granted";
      return "granted" as NotificationPermission;
    });

    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await waitFor(() => expect(requestPermission).toHaveBeenCalled());
    await waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));
  });

  it("does not register twice for one sign-in", async () => {
    permission.value = "granted";
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(registerFcmToken).toHaveBeenCalledTimes(1);
  });

  it("keeps the request out of the flow when the device has no token", async () => {
    // Every downstream step is failure-tolerant, so a null here has to end the
    // attempt rather than post an empty `fcm_token` the backend would reject.
    permission.value = "granted";
    getDeviceToken.mockResolvedValueOnce(null);

    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await waitFor(() => expect(getDeviceToken).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(registerFcmToken).not.toHaveBeenCalled();
  });

  it("never mints a token when the admin refuses", async () => {
    permission.value = "default";
    requestPermission.mockImplementation(async () => {
      permission.value = "denied";
      return "denied" as NotificationPermission;
    });

    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );

    await waitFor(() => expect(requestPermission).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(getDeviceToken).not.toHaveBeenCalled();
    expect(registerFcmToken).not.toHaveBeenCalled();
  });
});

describe("re-registration", () => {
  /** Brings the tab back to the foreground, which is one of the two triggers. */
  function foreground() {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  /** Just past the hour the two triggers share. */
  const PAST_THROTTLE_MS = 61 * 60 * 1000;

  it("sends the new token when FCM has rotated it", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    permission.value = "granted";
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await vi.waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));

    getDeviceToken.mockResolvedValue("rotated-device-token");
    await vi.advanceTimersByTimeAsync(PAST_THROTTLE_MS);

    await vi.waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(2));
    expect(registerFcmToken).toHaveBeenLastCalledWith({ fcm_token: "rotated-device-token" });
    vi.useRealTimers();
  });

  it("re-sends an unchanged token rather than assuming the backend still has it", async () => {
    // The row can be gone server-side while the string in this browser stays
    // the same — a sign-out on another device, the unregistered-token prune, a
    // handover and back. Registration is idempotent, so re-sending is the only
    // thing that recovers from any of them.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    permission.value = "granted";
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await vi.waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(PAST_THROTTLE_MS);

    await vi.waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(2));
    expect(registerFcmToken).toHaveBeenLastCalledWith({ fcm_token: "fcm-device-token" });
    vi.useRealTimers();
  });

  it("ignores a foreground inside the throttle window", async () => {
    // "Prefer too often over too rarely" is not "on every tab switch".
    permission.value = "granted";
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));

    foreground();
    foreground();

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(registerFcmToken).toHaveBeenCalledTimes(1);
  });

  it("re-sends when the tab comes back after the window has passed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    permission.value = "granted";
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    );
    await vi.waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(1));

    // Hidden for the whole window, so the timer is what would normally fire —
    // clear it first, then prove the foreground trigger stands on its own.
    vi.setSystemTime(Date.now() + PAST_THROTTLE_MS);
    foreground();

    await vi.waitFor(() => expect(registerFcmToken).toHaveBeenCalledTimes(2));
    vi.useRealTimers();
  });
});
