import { SegmentedToggle } from "@/components/common/SegmentedToggle";
import { Input } from "@/components/ui/input";
import { useGetPartnersQuery } from "@/features/partners";
import { useGetSailorsQuery } from "@/features/sailors";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconCheck, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

const M = MESSAGES.CHAT.START;

/** Which directory is being browsed. */
export type PickerAudience = "sailor" | "partner";

const AUDIENCE_OPTIONS: { value: PickerAudience; label: string }[] = [
  { value: "sailor", label: M.AUDIENCE_SAILOR },
  { value: "partner", label: M.AUDIENCE_PARTNER },
];

/**
 * One person, flattened from whichever directory produced them.
 *
 * `id` is always the **backing user UUID**, because that is what every chat
 * endpoint takes. For a partner that is `userId`, not the `DP-00124` code the
 * row is keyed by — sending the display code is a 400.
 */
export interface PickedUser {
  id: string;
  name: string;
  subtitle: string;
  audience: PickerAudience;
}

export interface ChatUserPickerProps {
  /** Currently selected user ids. */
  selectedIds: readonly string[];
  /** Called with the row that was clicked; the caller decides what selection means. */
  onToggle: (user: PickedUser) => void;
  /** Only fetch while the surrounding drawer is open. */
  enabled: boolean;
  /** Shows a tick per selected row instead of a single highlighted one. */
  multi?: boolean;
}

/**
 * Picks sailors and delivery partners for a chat, from the real directories.
 *
 * Both audiences come from their own list endpoints — `sailor/list/` and
 * `partner/list/` — which is the only way to turn a person into the user UUID
 * the chat endpoints want. The alternative this replaced was asking an admin to
 * paste UUIDs, which cannot be done from memory and fails silently on a typo.
 *
 * Search is **server-side** on both endpoints, so the box reaches the whole
 * table rather than filtering whichever page happened to load.
 *
 * Shared by the start-a-conversation drawer and the group drawer so the two
 * cannot drift: the same id semantics, the same search behaviour, the same
 * empty states, in one place.
 */
export function ChatUserPicker({
  selectedIds,
  onToggle,
  enabled,
  multi = false,
}: ChatUserPickerProps) {
  const [audience, setAudience] = useState<PickerAudience>("sailor");
  const [search, setSearch] = useState("");

  const term = search.trim();
  // Blocked accounts are refused by the create-chat endpoint with a 400, so they
  // are filtered out here rather than offered and then failed. An admin who has
  // already chosen someone has spent the decision; discovering the account is
  // unreachable afterwards wastes it and explains nothing.
  const sailors = useGetSailorsQuery(
    { page: 1, limit: API_MAX_PAGE_SIZE, search: term, status: "active" },
    { skip: !enabled || audience !== "sailor" },
  );
  const partners = useGetPartnersQuery(
    { page: 1, limit: API_MAX_PAGE_SIZE, search: term, is_active: true },
    { skip: !enabled || audience !== "partner" },
  );

  const isFetching = audience === "sailor" ? sailors.isFetching : partners.isFetching;

  const rows = useMemo<PickedUser[]>(() => {
    if (audience === "sailor") {
      return (sailors.data?.sailors ?? []).map((row) => ({
        id: row.id,
        name: row.n || row.e || row.id,
        subtitle: row.e || M.NO_EMAIL,
        audience: "sailor" as const,
      }));
    }
    return (
      (partners.data?.partners ?? [])
        // A row whose user id did not resolve cannot be messaged at all — the
        // endpoint keys on the user UUID, and the partner profile id is a 400.
        // Dropping it beats offering a name that can only fail.
        .filter((row) => Boolean(row.userId))
        .map((row) => ({
          id: row.userId,
          name: row.n,
          subtitle: row.email || row.p,
          audience: "partner" as const,
        }))
    );
  }, [audience, sailors.data, partners.data]);

  return (
    <div className="flex flex-col gap-3">
      <SegmentedToggle value={audience} options={AUDIENCE_OPTIONS} onChange={setAudience} fill />

      <div className="relative">
        <IconSearch
          size={15}
          className="-translate-y-1/2 absolute top-1/2 left-3 text-[var(--t4)]"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={M.SEARCH_PEOPLE}
          className="pl-9"
        />
      </div>

      <div className="flex max-h-[42vh] flex-col gap-1 overflow-y-auto">
        {isFetching && <p className="xs c4 w6 px-3 py-2">{MESSAGES.COMMON.LOADING}</p>}

        {!isFetching && rows.length === 0 && (
          <p className="xs c4 w6 px-3 py-2">{term ? M.NO_MATCHES : M.NO_PEOPLE}</p>
        )}

        {!isFetching &&
          rows.map((row) => {
            const selected = selectedIds.includes(row.id);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onToggle(row)}
                className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] border-[1.5px] px-3 py-2 text-left transition-colors ${
                  selected
                    ? "border-[var(--teal-500)] bg-[var(--teal-50)]"
                    : "border-transparent hover:bg-[var(--surface-alt)]"
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="w7 c1 truncate text-[13px]">{row.name}</span>
                  <span className="xs c4 w6 truncate">{row.subtitle}</span>
                </span>
                {/* A tick only earns its place when several rows can be on at
                    once; single-select already says so with the highlight. */}
                {multi && selected && (
                  <IconCheck size={16} className="shrink-0 text-[var(--teal-600)]" />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

export default ChatUserPicker;
