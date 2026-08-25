import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSoundMuted,
  playNotificationSound,
  resetNotificationSound,
  setSoundMuted,
  subscribeSoundMuted,
} from "./notificationSound";

/** A minimal WebAudio stub — jsdom ships none. */
function installAudioStub(state: AudioContextState = "running") {
  const started: number[] = [];
  const ctx = {
    state,
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: () => ({
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      connect: (n: unknown) => n,
      start: (t: number) => started.push(t),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: (n: unknown) => n,
    }),
    destination: {},
  };
  vi.stubGlobal(
    "AudioContext",
    vi.fn(() => ctx),
  );
  return { ctx, started };
}

describe("notificationSound", () => {
  beforeEach(() => {
    localStorage.clear();
    resetNotificationSound();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("plays a two-note chime", () => {
    const { started } = installAudioStub();
    expect(playNotificationSound(0)).toBe(true);
    expect(started).toHaveLength(2);
  });

  it("throttles a burst to one chime, then allows the next", () => {
    installAudioStub();
    expect(playNotificationSound(0)).toBe(true);
    // A signal and its badge frame for the same arrival.
    expect(playNotificationSound(200)).toBe(false);
    expect(playNotificationSound(2_999)).toBe(false);
    expect(playNotificationSound(3_000)).toBe(true);
  });

  it("stays silent when muted, and audible again when unmuted", () => {
    installAudioStub();
    setSoundMuted(true);
    expect(playNotificationSound(0)).toBe(false);
    setSoundMuted(false);
    expect(playNotificationSound(0)).toBe(true);
  });

  it("persists the mute preference across a reload", () => {
    setSoundMuted(true);
    resetNotificationSound(); // stands in for a fresh page load
    expect(isSoundMuted()).toBe(true);
  });

  it("defaults to audible when storage is unreadable", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    resetNotificationSound();
    expect(isSoundMuted()).toBe(false);
    spy.mockRestore();
  });

  it("notifies subscribers so the header icon tracks the real state", () => {
    const fn = vi.fn();
    const unsubscribe = subscribeSoundMuted(fn);
    setSoundMuted(true);
    expect(fn).toHaveBeenCalledTimes(1);
    unsubscribe();
    setSoundMuted(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not throw, or consume the throttle, when audio is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(playNotificationSound(0)).toBe(false);
  });

  it("waits for a suspended context to resume, then chimes", async () => {
    // The regression this covers: bailing on `state !== \"running\"` dropped the
    // first notification of every session, which is the one that matters most.
    const { ctx, started } = installAudioStub("suspended");
    expect(playNotificationSound(0)).toBe(true);
    expect(ctx.resume).toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toHaveLength(2);
  });

  it("survives a resume the browser refuses", async () => {
    const { ctx, started } = installAudioStub("suspended");
    ctx.resume.mockRejectedValue(new Error("no gesture"));
    expect(() => playNotificationSound(0)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toHaveLength(0);
  });
});
