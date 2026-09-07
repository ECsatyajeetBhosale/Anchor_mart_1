import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, type Country, countryForDialCode } from "@/lib/countries";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";

const M = MESSAGES.COMMON.COUNTRY_CODE_SELECT;

/**
 * Row geometry, in pixels. These are not decoration — the windowing below
 * computes which rows exist from them, so a row whose real height drifts from
 * `ROW_HEIGHT` makes the list scroll to the wrong place.
 */
const ROW_HEIGHT = 34;
const VIEWPORT_HEIGHT = ROW_HEIGHT * 8;
/** Rows rendered beyond the viewport, so a fast scroll doesn't show a gap. */
const OVERSCAN = 4;

export interface CountryCodeSelectProps {
  /** The dialling prefix, in the `+NN` form the API stores. `""` when unset. */
  value: string;
  onChange: (dialCode: string) => void;
  onBlur?: () => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Offers a "no country code" row — for forms where the contact is optional. */
  allowEmpty?: boolean;
}

/**
 * The country-code half of a phone field: a searchable list of flags and
 * dialling prefixes.
 *
 * Replaces the free-text box that used to sit here. That box asked an operator
 * to know the prefix by heart and accepted anything shaped like `+NNNN`, so
 * `+999` — a code belonging to no country — saved cleanly, and nothing on the
 * screen connected the prefix to the number typed beside it.
 *
 * **The value stays a plain `"+91"` string.** The picker resolves a flag from it
 * for display and hands back the same shape, so the schemas, payloads and stored
 * records are untouched by this being a dropdown rather than an input.
 *
 * The list is windowed. Each flag is a separate SVG fetched on demand, so
 * rendering all 245 rows would fire 245 requests the moment the list opened —
 * on a phone, for a control the operator uses once per record.
 */
export function CountryCodeSelect({
  value,
  onChange,
  onBlur,
  error,
  disabled,
  placeholder = M.PLACEHOLDER,
  allowEmpty = false,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = countryForDialCode(value);

  return (
    <Popover
      // `modal` is what makes the list scrollable.
      //
      // Every caller renders this inside a drawer, and a drawer is a Radix
      // Dialog, which mounts `react-remove-scroll`: a non-passive `wheel`
      // listener on `document` that cancels any scroll originating outside the
      // dialog's own subtree. This content is portalled to `document.body`, so
      // it counts as outside — the rows stayed clickable while the wheel did
      // nothing, which is the shape of the bug that was reported.
      //
      // A modal popover mounts its own `RemoveScroll` and so becomes the top of
      // that library's lock stack, at which point the drawer's lock steps aside
      // and wheel and touch reach the list. It is the same escape hatch Radix's
      // own `Select` takes, which is why the port and role dropdowns in these
      // drawers never had this problem.
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Closing is the operator leaving the field, which is what react-hook-form
        // needs to move the entry out of its "untouched" state and show errors.
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-label={M.LABEL}
          title={selected ? `${selected.name} (${selected.dialCode})` : placeholder}
          className={cn(
            "flex w-full h-10 items-center gap-2 px-3 bg-[var(--surface-input)] border-[1.5px] border-[var(--border-md)] rounded-[var(--radius-md)] text-[var(--t1)] font-medium font-body text-[13.5px] outline-none transition-all duration-200 focus:border-[var(--teal-500)] focus:shadow-[var(--shadow-focus-teal)] disabled:opacity-60 disabled:cursor-not-allowed",
            error &&
              "border-[var(--danger-icon)] bg-[var(--danger-bg)] focus:border-[var(--danger-icon)] focus:shadow-[var(--shadow-focus-red)]",
          )}
        >
          {/* Flag and prefix only. The country's name is the searchable thing in
              the list, but spelling it out here would not survive the 120px
              column the ship-agent forms give this field. */}
          {selected ? (
            <>
              <Flag iso={selected.iso} />
              <span className="mono">{selected.dialCode}</span>
            </>
          ) : (
            <span className="truncate text-[var(--t4)]">{value || placeholder}</span>
          )}
          <IconChevronDown size={15} className="ml-auto shrink-0 text-[var(--t4)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        {/* Mounted only while open, so the query resets by construction rather
            than by an effect that has to remember to fire. */}
        <CountryList
          selectedIso={selected?.iso}
          allowEmpty={allowEmpty}
          onPick={(dialCode) => {
            onChange(dialCode);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Flag artwork, resolved to asset URLs at build time.
 *
 * Deliberately *not* `flag-icons`' stylesheet, which is the documented way to
 * use the package and would have been a quiet disaster here: this app already
 * owns `.fi`, `.fi-il` and `.fi-ir` for the login form's inputs and their inner
 * icons, and the stylesheet defines all three — `.fi-il` is Israel, `.fi-ir` is
 * Iran. Importing it globally puts a flag behind the login page's mail and
 * password icons and hands two libraries the same `.fi` to fight over.
 *
 * Taking the files and leaving the class names sidesteps all of it. Only the
 * 4x3 set is referenced, so the square variants are never emitted, and each
 * flag stays a separate file rather than a data URI — see `assetsInlineLimit`
 * in `vite.config.ts`.
 */
const FLAG_DIR = "/node_modules/flag-icons/flags/4x3";
const FLAG_URLS = import.meta.glob("/node_modules/flag-icons/flags/4x3/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** One flag. Decorative — the country's name is the text beside it. */
function Flag({ iso }: { iso: string }) {
  const src = FLAG_URLS[`${FLAG_DIR}/${iso.toLowerCase()}.svg`];
  const box = "shrink-0 rounded-[2px] border border-[var(--border-sm)]";
  const size = { width: 20, height: 15 };
  // A country libphonenumber knows and flag-icons does not still has to be
  // selectable, so the placeholder keeps the row's alignment rather than
  // collapsing it.
  if (!src)
    return <span aria-hidden="true" className={`${box} bg-[var(--surface-alt)]`} style={size} />;
  return <img src={src} alt="" loading="lazy" className={`${box} object-cover`} style={size} />;
}

function CountryList({
  selectedIso,
  allowEmpty,
  onPick,
}: {
  selectedIso?: string;
  allowEmpty: boolean;
  onPick: (dialCode: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [scrollTop, setScrollTop] = useState(0);
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Matches on name and on prefix, with or without the "+".
   *
   * Both are things an operator actually types: they know the country ("sing")
   * or they know the code ("65"), and being made to guess which the box wants is
   * the failure this dropdown exists to remove.
   */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/^\+/, "");
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(q) ||
        country.iso.toLowerCase() === q ||
        (digits !== "" && country.dialCode.slice(1).startsWith(digits)),
    );
  }, [query]);

  // A new query means a new list; keeping the old offset would open it scrolled
  // past results that are now only three rows long.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetting *because* the query changed
  useEffect(() => {
    setScrollTop(0);
    setActive(0);
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, [query]);

  function moveActive(delta: number) {
    const next = Math.min(matches.length - 1, Math.max(0, active + delta));
    setActive(next);
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const top = next * ROW_HEIGHT;
    if (top < scroller.scrollTop) scroller.scrollTop = top;
    else if (top + ROW_HEIGHT > scroller.scrollTop + VIEWPORT_HEIGHT) {
      scroller.scrollTop = top + ROW_HEIGHT - VIEWPORT_HEIGHT;
    }
  }

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    matches.length,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN,
  );
  const visible = matches.slice(start, end);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[var(--border-sm)] px-2.5 py-2">
        <IconSearch size={14} className="shrink-0 text-[var(--t4)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveActive(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveActive(-1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const country = matches[active];
              if (country) onPick(country.dialCode);
            }
          }}
          placeholder={M.SEARCH_PLACEHOLDER}
          aria-label={M.SEARCH_PLACEHOLDER}
          className="h-6 w-full bg-transparent text-[13px] text-[var(--t1)] outline-none placeholder:text-[var(--t4)]"
        />
      </div>

      {allowEmpty && (
        <button
          type="button"
          onClick={() => onPick("")}
          className="flex w-full items-center px-3 text-left text-[12.5px] text-[var(--t3)] border-b border-[var(--border-sm)] hover:bg-[var(--surface-alt)]"
          style={{ height: ROW_HEIGHT }}
        >
          {M.NONE}
        </button>
      )}

      {matches.length === 0 ? (
        <div className="px-3 py-4 text-center text-[12.5px] text-[var(--t4)]">{M.NO_MATCHES}</div>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          style={{ height: VIEWPORT_HEIGHT }}
          className="overflow-y-auto overscroll-contain"
        >
          {/* Spacers stand in for the rows that are not rendered, so the
              scrollbar reflects the whole list rather than the window. */}
          <div style={{ height: start * ROW_HEIGHT }} />
          {visible.map((country, index) => (
            <CountryRow
              key={country.iso}
              country={country}
              selected={country.iso === selectedIso}
              active={start + index === active}
              onPick={onPick}
            />
          ))}
          <div style={{ height: (matches.length - end) * ROW_HEIGHT }} />
        </div>
      )}
    </div>
  );
}

function CountryRow({
  country,
  selected,
  active,
  onPick,
}: {
  country: Country;
  selected: boolean;
  active: boolean;
  onPick: (dialCode: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onPick(country.dialCode)}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "flex w-full items-center gap-2 px-3 text-left text-[13px] text-[var(--t1)] hover:bg-[var(--surface-alt)]",
        active && "bg-[var(--surface-alt)]",
        selected && "font-semibold",
      )}
    >
      <Flag iso={country.iso} />
      <span className="truncate">{country.name}</span>
      <span className="mono ml-auto shrink-0 text-[var(--t3)]">{country.dialCode}</span>
    </button>
  );
}

export default CountryCodeSelect;
