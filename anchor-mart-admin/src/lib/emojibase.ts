/**
 * Emoji reference data, from Emojibase.
 *
 * Fetched at runtime from a CDN rather than bundled: the full set is ~1,950
 * entries and well over a megabyte of JSON, which would dwarf every other
 * asset this app ships for a control used in one composer.
 *
 * ⚠️ **Deliberately not an RTK Query endpoint**, unlike everything under
 * a feature's `api` folder. Those rules exist for *this application's* API — one
 * `baseApi`, one base URL, an `Authorization` header attached to every call.
 * This is a third-party static asset on someone else's origin, and routing it
 * through `baseApi` would either send the admin's token to a CDN or need a
 * `queryFn` that bypasses the base query entirely, leaving an endpoint that
 * shares nothing with the layer it sits in. The promise below is memoised, so
 * the data is fetched once per session and every later open is instant —
 * which is the caching that mattered.
 */

/** One emoji, reduced to what the picker actually renders. */
export interface Emoji {
  /** The character itself, e.g. `"👋"`. */
  emoji: string;
  /** Human name, e.g. `"waving hand"` — shown as the tooltip and searched. */
  label: string;
  /** Search keywords supplied by Emojibase. */
  tags: string[];
}

/**
 * Emojibase's group numbers, in its own order.
 *
 * Group `2` ("component") is absent on purpose: it holds skin-tone and hair
 * modifiers, which are not emoji anyone picks on their own.
 */
export const EMOJI_GROUPS = {
  smileys: 0,
  people: 1,
  animals: 3,
  food: 4,
  travel: 5,
  activities: 6,
  objects: 7,
  symbols: 8,
  flags: 9,
} as const;

export type EmojiGroupId = keyof typeof EMOJI_GROUPS;

/** Emoji indexed by group id, which is the shape the picker renders from. */
export type EmojiByGroup = Record<EmojiGroupId, Emoji[]>;

/** The raw Emojibase record, of which only these fields are used. */
interface EmojibaseRecord {
  emoji?: string;
  label?: string;
  tags?: string[];
  group?: number;
  order?: number;
  version?: number;
}

const EMOJIBASE_URL = "https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/data.json";

/**
 * Newest Emoji version to show.
 *
 * Anything newer is dropped rather than rendered as a tofu box on a machine
 * whose fonts predate it. 15.0 is old enough to be drawn essentially
 * everywhere and new enough to lose almost nothing worth picking.
 */
const MAX_EMOJI_VERSION = 15;

/** Empty index — also what a failed load falls back to. */
function emptyGroups(): EmojiByGroup {
  return {
    smileys: [],
    people: [],
    animals: [],
    food: [],
    travel: [],
    activities: [],
    objects: [],
    symbols: [],
    flags: [],
  };
}

/** Group number → our id, for the groups we render. */
const GROUP_BY_NUMBER = new Map<number, EmojiGroupId>(
  Object.entries(EMOJI_GROUPS).map(([id, number]) => [number, id as EmojiGroupId]),
);

/** Buckets the raw payload by group, preserving Emojibase's own ordering. */
function indexByGroup(records: EmojibaseRecord[]): EmojiByGroup {
  const grouped = emptyGroups();

  for (const record of records) {
    if (record.group === undefined || !record.emoji || !record.label) continue;
    if ((record.version ?? 0) > MAX_EMOJI_VERSION) continue;

    const id = GROUP_BY_NUMBER.get(record.group);
    if (!id) continue;

    grouped[id].push({ emoji: record.emoji, label: record.label, tags: record.tags ?? [] });
  }

  for (const list of Object.values(grouped)) {
    list.sort((a, b) => a.label.localeCompare(b.label));
  }

  return grouped;
}

/**
 * In-flight or settled load, kept at module scope so the data is fetched once
 * for the session however many pickers mount. A failed attempt is cleared so
 * the next open retries rather than caching the failure forever.
 */
let pending: Promise<EmojiByGroup> | null = null;

export function loadEmoji(): Promise<EmojiByGroup> {
  if (!pending) {
    pending = fetch(EMOJIBASE_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Emojibase responded ${response.status}`);
        return response.json() as Promise<EmojibaseRecord[]>;
      })
      .then(indexByGroup)
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
