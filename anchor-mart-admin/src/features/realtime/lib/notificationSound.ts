/**
 * The audible half of the activity marker.
 *
 * The sidebar marker only helps an admin who is looking at the panel. The whole
 * point of a queue screen is that it is *not* the window in front of you all
 * day, so arrivals were reaching a marker nobody was watching. This makes the
 * same event — and **only** the same event — audible.
 *
 * It fires on the same arrivals the marker does, with one deliberate exception:
 * the marker is suppressed when the admin is already on the screen, and the
 * chime is not. Being on a screen makes a *marker* redundant — the refetch has
 * already put the row there — but says nothing about whether anyone is looking
 * at the tab, which is the whole case for a sound. The direction gate
 * (`delta === "up"`) and the snapshot gate still apply to both, so an admin's
 * own completions and the connect/sync snapshots stay silent.
 *
 * **No audio file.** A two-note chime synthesised through WebAudio is a few
 * lines, ships nothing, and cannot 404 behind a CDN — and there is no asset
 * pipeline in this app to put a wav into.
 */

const MUTE_KEY = "am_admin_sound_muted";

/**
 * Floor between two chimes.
 *
 * Frames arrive in bursts — one order moving can raise a signal *and* a badge,
 * and a backlog draining publishes several in a second. The refetches are
 * coalesced for the same reason; a stutter of overlapping chimes is the audible
 * version of that, and reads as a malfunction rather than as work arriving.
 * One sound per burst says the same thing.
 */
const MIN_GAP_MS = 3_000;

/** `-Infinity`, not `0`: nothing has played yet, and `0` is a real clock value. */
let lastPlayedAt = Number.NEGATIVE_INFINITY;
let ctx: AudioContext | null = null;
let muted = loadMuted();

/**
 * Says why a chime did not sound, in dev only.
 *
 * Every early return below is a deliberate decision, which makes silence
 * indistinguishable from a bug from the outside — the marker lights either way.
 * This is the difference.
 */
function debug(reason: string): void {
  if (import.meta.env.DEV) console.info(`[notification-sound] silent: ${reason}`);
}

/** Listeners for the header toggle, so the icon tracks the real state. */
const subscribers = new Set<() => void>();

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // Storage unavailable (private mode, blocked cookies): audible is the safer
    // default — a preference that silently fails closed loses the alert.
    return false;
  }
}

/** Is the chime currently muted? */
export function isSoundMuted(): boolean {
  return muted;
}

/** Set the preference and persist it. Survives reloads; per browser, not per account. */
export function setSoundMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    // Preference holds for this tab only. Not worth telling the admin about.
  }
  for (const fn of subscribers) fn();
}

/** Subscribe to mute changes (for `useSyncExternalStore` in the header). */
export function subscribeSoundMuted(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/**
 * Browsers refuse to start an `AudioContext` that no gesture asked for, and a
 * context created before one is stuck `suspended` — so the first chime of a
 * session would be silent no matter how correct the code above it.
 *
 * Called from a real click/keypress by {@link installAudioUnlock}. Resuming an
 * already-running context is a no-op, so calling it often is harmless.
 */
function ensureContext(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Arms audio on the admin's first interaction with the page.
 *
 * Mount once from the shell. Signing in is itself a click, so in practice the
 * context is live well before the first frame; this covers the reloaded tab that
 * rehydrates a token and never gets one.
 */
export function installAudioUnlock(): () => void {
  const unlock = () => {
    ensureContext();
  };
  // `once` is not enough on its own: a context can be suspended again by the
  // browser when the tab is backgrounded, so we keep listening cheaply.
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/**
 * Two short notes, rising.
 *
 * Rising because it announces arrival; short and quiet (gain peaks at 0.06)
 * because this fires in an office, repeatedly, all day. Anything longer or
 * louder is the first thing an admin mutes, and a muted alert is no alert.
 *
 * Returns whether a sound was actually started, which is what the tests assert
 * on — every early return here is a real decision, not a failure.
 */
export function playNotificationSound(now: number = Date.now()): boolean {
  if (muted) {
    debug("muted");
    return false;
  }
  if (now - lastPlayedAt < MIN_GAP_MS) {
    debug("throttled — a chime already played within the last 3s");
    return false;
  }

  // A hidden tab is the case this feature exists for, so we do *not* skip on
  // visibility — that would silence exactly the admin who needs telling.

  const audio = ensureContext();
  if (!audio) {
    debug("no AudioContext — this browser has no WebAudio");
    return false;
  }

  lastPlayedAt = now;

  // `resume()` is a promise, and a context that has never seen a gesture is
  // `suspended` when the frame lands. Bailing on the state here dropped exactly
  // the notification this feature exists for — the first one — so we wait for
  // the resume instead of testing a state that has not settled yet. A context
  // already running resolves immediately.
  if (audio.state !== "running") {
    audio
      .resume()
      .then(() => emit(audio))
      .catch(() => debug("resume refused — no user gesture yet"));
    return true;
  }

  return emit(audio);
}

/** Schedules the two notes on an already-running context. */
function emit(audio: AudioContext): boolean {
  try {
    const start = audio.currentTime;
    // A5 then E6 — a plain interval that carries over office noise without
    // sounding like an alarm.
    for (const [index, freq] of [880, 1318.5].entries()) {
      const at = start + index * 0.13;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, at);
      // Ramped, not switched: a gain that jumps to full produces an audible
      // click at the note edge on most hardware.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.06, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + 0.2);
    }
    return true;
  } catch (err) {
    // Audio is a courtesy on top of the marker, which has already been raised.
    // Never let it take the frame handler down with it.
    debug(`could not schedule the chime: ${String(err)}`);
    return false;
  }
}

/** Test seam — drops the throttle and the cached context. */
export function resetNotificationSound(): void {
  lastPlayedAt = Number.NEGATIVE_INFINITY;
  ctx = null;
  muted = loadMuted();
}

/**
 * `__amTestChime()` in the dev console — plays one, bypassing the throttle.
 *
 * The chime is only reachable through a real backend event otherwise, which is a
 * slow and awkward loop to debug output devices and volume against.
 */
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__amTestChime = () => {
    lastPlayedAt = Number.NEGATIVE_INFINITY;
    const was = muted;
    muted = false;
    const played = playNotificationSound();
    muted = was;
    return played;
  };
}
