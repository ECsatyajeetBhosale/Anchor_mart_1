/**
 * The lifecycle rail now lives in `components/common/LifecycleRail` — the
 * Orders review drawer renders the same ladder, and a shared drawer cannot
 * import from a feature. Nothing about it was intent-specific: it has always
 * taken a raw order status plus the milestone steps.
 *
 * Kept as an alias so the intents feature's public surface is unchanged.
 */
export {
  LifecycleRail as IntentLifecycleRail,
  LifecycleRail,
  type LifecycleRailProps,
  type LifecycleRailProps as IntentLifecycleRailProps,
} from "@/components/common/LifecycleRail";
