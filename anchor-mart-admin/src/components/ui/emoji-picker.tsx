import { type Emoji, type EmojiByGroup, type EmojiGroupId, loadEmoji } from "@/lib/emojibase";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

const M = MESSAGES.COMMON.EMOJI_PICKER;

/** The category tabs, in Emojibase's own group order. */
const CATEGORIES: { id: EmojiGroupId; icon: string; label: string }[] = [
  { id: "smileys", icon: "😀", label: M.CATEGORY.SMILEYS },
  { id: "people", icon: "👋", label: M.CATEGORY.PEOPLE },
  { id: "animals", icon: "🐻", label: M.CATEGORY.ANIMALS },
  { id: "food", icon: "🍔", label: M.CATEGORY.FOOD },
  { id: "travel", icon: "✈️", label: M.CATEGORY.TRAVEL },
  { id: "activities", icon: "⚽", label: M.CATEGORY.ACTIVITIES },
  { id: "objects", icon: "💡", label: M.CATEGORY.OBJECTS },
  { id: "symbols", icon: "❤️", label: M.CATEGORY.SYMBOLS },
  { id: "flags", icon: "🏳️", label: M.CATEGORY.FLAGS },
];

/** Matches a search term against an emoji's name and its Emojibase keywords. */
function matches(emoji: Emoji, term: string): boolean {
  return emoji.label.includes(term) || emoji.tags.some((tag) => tag.includes(term));
}

export interface EmojiPickerProps {
  /** Called with the chosen character, e.g. `"👋"`. */
  onSelect: (emoji: string) => void;
  className?: string;
}

/**
 * Emoji picker — one category at a time, with search across all of them.
 *
 * Hand-rolled on the Emojibase data rather than wrapping a picker library.
 * `frimousse` was tried first and removed: its list always renders every
 * category as one continuous scroll, so a category tab could only ever jump
 * to a position, and scrolling a few rows past the end of a section landed in
 * the next one. No prop on it changes that. Rendering a single group is also
 * what makes virtualisation unnecessary — the largest group is a few hundred
 * emoji, and the list is only mounted while the popover is open.
 *
 * ⚠️ **The emoji data is fetched at runtime** (see `@/lib/emojibase`), so the
 * picker needs network access the first time it is opened in a session. It is
 * then cached at module scope for every subsequent open.
 *
 * Deliberately **not** a popover. Anchoring is the caller's business — this is
 * the panel, and the composer already owns a `Popover` to put it in.
 */
export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [groups, setGroups] = useState<EmojiByGroup | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EmojiGroupId>("smileys");
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadEmoji().then(
      (data) => !cancelled && setGroups(data),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const term = search.trim().toLowerCase();

  /**
   * What the grid shows: the active category, or — while searching — matches
   * from every category, since someone typing "rocket" wants the rocket
   * wherever it lives rather than to be told it is not in this tab.
   */
  const visible = useMemo(() => {
    if (!groups) return [];
    if (!term) return groups[activeCategory];
    return CATEGORIES.flatMap((category) =>
      groups[category.id].filter((emoji) => matches(emoji, term)),
    );
  }, [groups, activeCategory, term]);

  // Switching category starts at the top; leaving the previous scroll position
  // would open a new section part-way down for no reason the user can see.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the scroll reset is keyed on the category, not on the list contents.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [activeCategory]);

  return (
    <div className={cn("flex h-[352px] w-full flex-col", className)}>
      <div className="relative shrink-0 px-2 pt-2">
        <IconSearch
          size={15}
          className="pointer-events-none absolute top-1/2 left-4 mt-1 -translate-y-1/2 text-[var(--t4)]"
        />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={M.SEARCH_PLACEHOLDER}
          className="h-9 w-full rounded-[var(--radius-sm)] border-[1.5px] border-[var(--border-md)] bg-[var(--surface-input)] pr-2.5 pl-8 text-[12.5px] font-medium text-[var(--t1)] outline-none transition-colors placeholder:text-[var(--t4)] focus:border-[var(--teal-500)] focus:shadow-[var(--sh-focus-teal)]"
        />
      </div>

      {/* Category tabs. These *filter* — the grid below holds one group and
          nothing else — so there is no heading to repeat what the pressed tab
          already says, and no way to scroll out of the section on view.
          The row scrolls sideways so nine targets stay full size at any width;
          its scrollbar is hidden, being taller than it is worth under 28px
          tabs. */}
      <div className="mt-1.5 flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-[var(--border-xs)] px-2 pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((category) => {
          // While searching the grid spans every category, so no tab is the
          // one being shown and none is drawn as pressed.
          const isActive = !term && activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              title={category.label}
              aria-label={category.label}
              aria-pressed={isActive}
              onClick={() => {
                // A tab is also how you leave a search — otherwise pressing one
                // appears to do nothing while results are still on screen.
                setSearch("");
                setActiveCategory(category.id);
              }}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[15px] transition-colors",
                isActive ? "bg-[var(--navy-50)]" : "opacity-55 hover:bg-[var(--surface-hover)]",
              )}
            >
              {category.icon}
            </button>
          );
        })}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1">
        {failed ? (
          <p className="p-4 text-center text-[12.5px] font-semibold text-[var(--danger-text)]">
            {M.FETCH_ERROR}
          </p>
        ) : !groups ? (
          <p className="p-4 text-center text-[12.5px] font-medium text-[var(--t4)]">
            {MESSAGES.COMMON.LOADING}
          </p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-center text-[12.5px] font-medium text-[var(--t4)]">{M.EMPTY}</p>
        ) : (
          <div className="grid grid-cols-8">
            {visible.map((emoji) => (
              <button
                key={emoji.emoji}
                type="button"
                title={emoji.label}
                aria-label={emoji.label}
                onClick={() => onSelect(emoji.emoji)}
                className="flex h-9 w-full items-center justify-center rounded-[var(--radius-sm)] text-[20px] transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none"
              >
                {emoji.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmojiPicker;
