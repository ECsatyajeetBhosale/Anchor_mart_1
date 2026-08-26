import type { PlatformKey } from "../types/analytics.types";

/**
 * The one place the platform series colours are defined.
 *
 * Both platform charts read from here, which is what makes the donut and the
 * trend agree: a colour that means "app" in one has to mean "app" in the other,
 * or reading the pair across the screen requires re-learning the legend twice.
 *
 * Keyed on the machine `platform` value, never on `label` — the label is
 * display text and may be reworded server-side, and colour has to follow the
 * entity rather than its position in the list, so a quiet period can't repaint
 * the survivors.
 *
 * `unknown` is deliberately the only neutral. It is a data-quality bucket rather
 * than a product surface, and giving it a hue of its own would put it in
 * competition with the two things the chart is actually comparing.
 *
 * Validated as a categorical palette: worst adjacent pair ΔE 28.5 under deuteran
 * simulation, well clear of the 8 threshold. Teal falls below 3:1 against the
 * card surface, which is why the breakdown card carries a labelled table under
 * the donut rather than relying on the wedges alone.
 */
const PLATFORM_COLORS: Record<PlatformKey, string> = {
  app: "var(--teal-500)",
  web: "var(--navy-500)",
  unknown: "var(--t4)",
};

/** Brighter counterparts, for the hovered mark. */
const PLATFORM_HOVER_COLORS: Record<PlatformKey, string> = {
  app: "var(--teal-400)",
  web: "var(--navy-400)",
  unknown: "var(--t5)",
};

/**
 * A platform's colour.
 *
 * Takes a plain `string` because the trend endpoint hands its series list over
 * as `string[]`, and the instruction there is to build the legend from what the
 * server sent rather than from a hardcoded list. A key outside the three known
 * ones is therefore possible, and gets the neutral rather than a generated hue —
 * a series nobody has designed for should read as "not classified", which is
 * exactly what an unrecognised platform is.
 */
export function platformColor(platform: string, hovered = false): string {
  const table = hovered ? PLATFORM_HOVER_COLORS : PLATFORM_COLORS;
  return table[platform as PlatformKey] ?? table.unknown;
}

/**
 * Fallback display name for a series the breakdown didn't name.
 *
 * The trend response carries platform keys without labels, so the label comes
 * from the breakdown call where both are loaded. This covers the gap while that
 * is still in flight, and titlecasing the key is a better guess than showing a
 * lowercase machine value.
 */
export function platformFallbackLabel(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}
