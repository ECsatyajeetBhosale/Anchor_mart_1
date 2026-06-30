# Design Rules

Visual/design conventions for the **anchor-mart-admin** app. Read this when applying,
building, or matching any UI. Complements `PROJECT_RULES.md` (code conventions) and
the design-token section of `CLAUDE.md`.

## Reference design = source of truth
The **AnchorMart-1-react-migration** project is the visual reference for this app
(`AnchorMart-1-react-migration/web/src/styles/index.css` + its page markup). When a
color, border, radius, spacing, or component style is ambiguous or needs to "match the
design," mirror the reference's token values and class structure rather than inventing
new ones.

## Design tokens are authoritative
All colors, radii, borders, shadows, and surfaces live as CSS custom properties in
`anchor-mart-admin/src/index.css`. **Never hardcode hex/px** for these — reference the
token (`var(--token)`, the `--color-*` Tailwind mapping, or the `.btn`/`.card`/
`.form-input` utility classes).

> **Two definitions per token.** Many tokens are declared twice: once in the Tailwind v4
> `@theme` block as `--color-<name>` and once in `:root` as `--<name>`. When changing a
> token value, **update BOTH** (e.g. `--color-border-md` *and* `--border-md`), or the
> Tailwind utilities and the raw `var(--…)` references will disagree.

## Borders (matched to the reference project)
The four border tokens mirror AnchorMart-1-react-migration exactly:

| Token | Value | Used for |
|---|---|---|
| `--border-xs` | `#f0f2f5` | table row dividers (`tbody td`) |
| `--border-sm` | `#e8edf5` | card / table outline (`.card`), table header divider (`thead th`) |
| `--border-md` | `#FBCDBD` | **input / control resting borders** |
| `--border-lg` | `#b0bcce` | hover / emphasis borders |

### Input fields
Text inputs, selects, textareas, and search boxes use a **`1.5px solid var(--border-md)`**
(`#FBCDBD`) resting border. State changes:
- **Focus** → `border-color: var(--teal-500)` + `box-shadow: var(--sh-focus-teal)`
- **Error** → `border-color: var(--danger-icon)` + `box-shadow: var(--sh-focus-red)`

This applies to `.fi` (login), `.form-input`, `.form-select`, and any shadcn `Input`/
`Select`/`Textarea` wrapper. `--border-md` is also the resting border for `.btn-secondary`,
toggles, and segmented controls — keep them consistent (do not special-case one input).

### Tables
- Outer card / table outline and the header divider use **`var(--border-sm)`** at rest.
- Row dividers (`tbody td`) use **`var(--border-xs)`**.
- Do **not** put `--border-md` on table grid lines at rest — tables stay on the cool grey
  `--border-sm`/`--border-xs`, only inputs/controls use the warmer `--border-md`.

### Card / table hover
On hover, the card/table outline switches to the **input border colour**:
`.card:hover { border-color: var(--border-md); box-shadow: var(--sh-md); }`
(`--border-md` = `#FBCDBD`). So a table's outline turns the same warm tone as input
borders on hover. This mirrors the existing `.stat-card:hover` and the reference project.
Keep card/table hover borders on `--border-md` — don't introduce a separate hover colour.

### Don't
- Don't introduce new border colors — reuse these four tokens.
- Don't scope a one-off border hex onto a single component to "match" the reference;
  fix the shared token so every instance matches at once.
- Don't use `--border-md` for scrollbar thumbs. `--border-md` is the warm input tone
  (`#FBCDBD`) and tints scrollbars orange. Scrollbar thumbs use the neutral grey `#d4dce9`
  (resting) / `--border-lg` (hover), matching the reference.

## Avatars / static profile images
People (sailors, partners, etc.) get a **deterministic static avatar**, not a single
repeated icon. The backend exposes no profile-image field, so apply the avatar directly —
do **not** add a per-user "has an image?" check.
- The avatar set lives in `src/assets/avatars/avatar-1.svg … avatar-6.svg` (sourced from
  the AnchorMart-1 reference project) and is served through the helper in `src/lib/avatar.ts`.
- Use `getFallbackAvatar(key)` — `key` is a stable identifier (user `id`, falling back to
  name). The same key always yields the same image; different keys spread across the set, so
  a list shows varied avatars.
- Render inside the avatar primitive: `<div class="av av-img"><img src={…} alt={name} /></div>`
  (`.av` clips to a circle; `.av-img` gives the neutral placeholder frame). Don't hand-roll an
  initial-letter circle.
- If/when an endpoint adds a real profile-image field, resolve it at that call site (real
  image when present, else `getFallbackAvatar(key)`) rather than baking a global check in now.
