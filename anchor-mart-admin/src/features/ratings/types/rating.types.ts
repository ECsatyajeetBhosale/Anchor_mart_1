/**
 * Flow 16 — Post-Delivery Feedback & Ratings (admin read surfaces).
 *
 * Two independent feedback streams that share a screen but nothing else:
 *   - **Delivery ratings** — one per delivered/partially-delivered order.
 *   - **App ratings** — one revisable rating per user (a OneToOne), so the app
 *     average can't be skewed by someone submitting repeatedly.
 *
 * Product ratings are deliberately out of scope for this flow.
 */

/**
 * The only accepted `tags` values on a delivery rating
 * (`DeliveryRating.QuickTag`). Anything else is a 400 at submit time, so this
 * list is exhaustive for display purposes.
 */
export const DELIVERY_QUICK_TAGS = [
  "on_time",
  "correct_items",
  "careful_handling",
  "friendly",
  "late",
  "wrong_items",
] as const;

export type DeliveryQuickTag = (typeof DELIVERY_QUICK_TAGS)[number];

/** Tags that describe a problem — rendered in a warning colour, not neutral. */
export const NEGATIVE_QUICK_TAGS: ReadonlySet<string> = new Set(["late", "wrong_items"]);

/** One row of `GET /superadmin/ratings/delivery/`. */
export interface DeliveryRating {
  id: string;
  order: string;
  order_number: string;
  sailor_email: string | null;
  sailor_name: string | null;
  /**
   * The partner **snapshotted at submit time**, not whoever is assigned now — an
   * order can be reassigned over its life, and the KPI rollups must credit the
   * person who actually delivered. All three partner fields are `null` when no
   * partner could be resolved.
   */
  delivery_partner: string | null;
  partner_email: string | null;
  partner_name: string | null;
  /** 1–5. */
  rating: number;
  tags: string[];
  comment: string | null;
  /** Pre-formatted, e.g. "July 27, 2026, 03:14 PM". */
  created_at: string;
}

/** One row of `GET /superadmin/ratings/app/`. */
export interface AppRating {
  id: string;
  user: string;
  user_email: string | null;
  user_name: string | null;
  rating: number;
  feedback: string | null;
  /** Client surface the rating came from, e.g. "ios" / "android" / "web". */
  platform: string | null;
  app_version: string | null;
  created_at: string;
}

/**
 * `GET /superadmin/ratings/summary/`.
 *
 * `average` is **`null`, never `0`, when nothing was rated** — "nobody rated"
 * and "everybody rated zero" are different facts and must render differently.
 */
export interface RatingsSummary {
  window: {
    /** `null` → all-time. */
    days: number | null;
    start: string | null;
    end: string | null;
  };
  /**
   * The response also carries `delivery.tag_counts` (quick-tag tallies across
   * the window). No surface renders it, so it is deliberately not parsed —
   * add it back alongside whatever would display it.
   */
  delivery: {
    average: number | null;
    count: number;
  };
  app: {
    average: number | null;
    count: number;
  };
}
