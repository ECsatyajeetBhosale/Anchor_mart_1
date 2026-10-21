import { toInstant } from "@/lib/dates";
import type { ApiCoupon } from "../types/reward.types";

const MS_PER_DAY = 86_400_000;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Past its `valid_to`. `null` never expires.
 *
 * An expired coupon keeps `is_active: true` — nothing switches it off when the
 * date passes — so every screen that shows a coupon as running has to read the
 * date too (BUG-043, BUG-060). A bare `YYYY-MM-DD` runs to the end of that
 * Singapore day, matching how the backend stores it (23:59:59 SGT).
 */
export function isExpiredCoupon(coupon: Pick<ApiCoupon, "valid_to">, now = new Date()): boolean {
  const ends = toInstant(coupon.valid_to);
  if (!ends) return false;
  const endMs = ISO_DATE_ONLY.test(coupon.valid_to?.trim() ?? "")
    ? ends.getTime() + MS_PER_DAY
    : ends.getTime();
  return endMs < now.getTime();
}

/** Live right now: switched on, and not past its expiry. */
export function isLiveCoupon(
  coupon: Pick<ApiCoupon, "is_active" | "valid_to">,
  now = new Date(),
): boolean {
  return coupon.is_active && !isExpiredCoupon(coupon, now);
}

/**
 * Worth handing to one sailor: live and private (BUG-061). A public coupon is
 * already open to every sailor, so the backend refuses to assign it.
 */
export function isAssignableCoupon(
  coupon: Pick<ApiCoupon, "is_active" | "valid_to" | "is_public">,
  now = new Date(),
): boolean {
  return !coupon.is_public && isLiveCoupon(coupon, now);
}
