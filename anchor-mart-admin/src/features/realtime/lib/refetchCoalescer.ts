import type { BadgeQueue } from "../types/realtime.types";

/**
 * Collapses a burst of badge frames into a single refetch.
 *
 * Frames are independent messages, so a naive `invalidateTags` per frame becomes
 * one list request per frame — and bursts are normal: a partner submitting a
 * batch, a Celery timer sweeping, two admins working the same queue. Honouring
 * "refetch only the visible list" while still issuing twelve requests for twelve
 * frames satisfies the letter of the rule and misses its point, which is not
 * turning a fix for polling back into polling.
 *
 * Trailing rather than leading: the last frame in a burst carries the truest
 * counts, and waiting a beat for it costs less than refetching against the first
 * and again against the rest. The window is short enough to read as instant.
 */
const DEFAULT_WINDOW_MS = 300;

export class RefetchCoalescer {
  private pending = new Set<BadgeQueue>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  /**
   * @param onFlush Receives every distinct queue seen during the window, in
   *   arrival order.
   */
  constructor(
    private readonly onFlush: (queues: BadgeQueue[]) => void,
    private readonly windowMs: number = DEFAULT_WINDOW_MS,
  ) {}

  /** Records a queue that moved. Starts the window if one is not already open. */
  push(queue: BadgeQueue): void {
    if (this.disposed) return;
    this.pending.add(queue);
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), this.windowMs);
  }

  /** Fires now with whatever has accumulated, cancelling the pending window. */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.size === 0) return;
    const queues = [...this.pending];
    this.pending.clear();
    this.onFlush(queues);
  }

  /**
   * Drops any pending flush without firing it.
   *
   * The socket is going away, so there is nothing worth refetching for: whatever
   * replaces it snapshots on connect, and firing into an unmounting tree would
   * dispatch against a store the caller has stopped listening to.
   */
  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
  }
}
