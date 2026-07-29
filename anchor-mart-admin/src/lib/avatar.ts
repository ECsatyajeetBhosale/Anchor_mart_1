import avatar1 from "@/assets/avatars/avatar-1.svg";
import avatar2 from "@/assets/avatars/avatar-2.svg";
import avatar3 from "@/assets/avatars/avatar-3.svg";
import avatar4 from "@/assets/avatars/avatar-4.svg";
import avatar5 from "@/assets/avatars/avatar-5.svg";
import avatar6 from "@/assets/avatars/avatar-6.svg";

/**
 * Static profile pictures (sourced from the AnchorMart-1 reference project). The
 * backend has no profile-image field, so these are applied directly to every
 * person. Bundled via Vite so the URLs are stable in dev and production.
 */
const FALLBACK_AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

/** Stable string hash (same algorithm as the reference project). */
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministically picks one of the static avatars for a given key (a user id or
 * name). The same key always returns the same image, but different keys spread
 * across the set — so a list of users shows varied avatars rather than one repeated
 * icon. The API exposes no profile-image field, so callers apply this directly
 * (no per-user "has an image?" check needed).
 */
export function getFallbackAvatar(key: string): string {
  const safe = key || "";
  return FALLBACK_AVATARS[hashKey(safe) % FALLBACK_AVATARS.length];
}
