# AnchorMart Admin — Complete Design System Documentation
> Reverse-engineered from codebase. Theme: **Cloud Dock Light** — white surfaces, deep navy brand, teal action accent, amber data highlight.
> Font Stack: **Nunito** (UI) + **JetBrains Mono** (code/IDs). Icon Library: **Tabler Icons** (`@tabler/icons-webfont@3.31.0`).

---

## 1. COLOR SYSTEM

### Primary Brand Color — Navy
| Token | Hex | Usage |
|---|---|---|
| `--navy-950` | `#050e1c` | Deepest dark |
| `--navy-900` | `#0a1628` | **Primary CTA buttons**, sidebar avatar, login button |
| `--navy-800` | `#112240` | Button hover state |
| `--navy-700` | `#1a3058` | Active nav item text, heading accents |
| `--navy-600` | `#1e3c70` | Active nav indicator bar, icon tints |
| `--navy-500` | `#2551a3` | Active nav item icons |
| `--navy-400` | `#3b6fd4` | Chart bars (highlight), links |
| `--navy-300` | `#6593e0` | Chart bars (mid) |
| `--navy-200` | `#9db8ec` | Chart bars (light), stat stripe end |
| `--navy-100` | `#ccdaf5` | Chart bars (base) |
| `--navy-50`  | `#eaf1fb` | Active nav background, badge bg, icon bg |
| `--navy-25`  | `#f4f7fd` | Hover row tint, mini section bg |

### Accent Color — Teal
| Token | Hex | Usage |
|---|---|---|
| `--teal-700` | `#0d7470` | ID cell text color (`.td-id`), teal text |
| `--teal-600` | `#0e9e93` | **Accent CTA buttons**, focus eyebrow text, links |
| `--teal-500` | `#0ab5a8` | Input focus border, switch ON state, stat stripe |
| `--teal-400` | `#14cfc0` | Media primary badge, chart bar hover |
| `--teal-300` | `#40e0d2` | Stat stripe end, sidebar mark icon |
| `--teal-200` | `#86eee6` | Chart bars |
| `--teal-100` | `#c6f7f2` | Border tints |
| `--teal-50`  | `#edfafa` | Badge bg, icon bg, OTP filled bg |

### Data Highlight — Amber
| Token | Hex | Usage |
|---|---|---|
| `--amber-700` | `#92400e` | Toast warning bg, dark amber text |
| `--amber-600` | `#b45309` | Amber text, icon color, stat sub |
| `--amber-500` | `#d97706` | Stat stripe start |
| `--amber-400` | `#f59e0b` | Star ratings, timeline active dot, chart bars |
| `--amber-300` | `#fbbf24` | Stat stripe end |
| `--amber-200` | `#fde68a` | Chart bars (light), warning border |
| `--amber-100` | `#fef3c7` | Badge borders |
| `--amber-50`  | `#fffbeb` | Warning bg, badge bg |

### Semantic Colors
| Role | BG | Border | Text | Icon |
|---|---|---|---|---|
| **Success** (teal-based) | `#f0fdf9` | `#99f6e4` | `#065f46` | `#14b8a6` |
| **Green** (green-based) | `#f0fdf4` | `#bbf7d0` | `#166534` | `#22c55e` |
| **Warning** | `#fffbeb` | `#fde68a` | `#78350f` | `#f59e0b` |
| **Danger** | `#fef2f2` | `#fecaca` | `#991b1b` | `#ef4444` |
| **Info** | `#eff6ff` | `#bfdbfe` | `#1e40af` | `#3b82f6` |
| **Neutral** | `#f8fafc` | `#cbd5e1` | `#475569` | — |
| **Purple** | `#f5f3ff` | `#ddd6fe` | `#5b21b6` | `#8b5cf6` |

### Surface / Background Colors
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#f0f4f9` | Page background (app shell) |
| `--surface` | `#ffffff` | Cards, sidebar, topbar, inputs |
| `--surface-alt` | `#f8fafc` | Table header, card footer, form sections, pill toggle track |
| `--surface-hover` | `#f1f5f9` | Sortable header hover |
| `--surface-input` | `#ffffff` | Form input background |
| `--surface-raised` | `#ffffff` | Raised elements |

### Border Colors
| Token | Hex | Usage |
|---|---|---|
| `--border-xs` | `#f0f2f5` | Table row dividers, card body dividers |
| `--border-sm` | `#e8edf5` | Card borders, sidebar dividers, inputs default |
| `--border-md` | `#d4dce9` | Input borders, filter chips, button secondary |
| `--border-lg` | `#b0bcce` | Input/button hover borders, scrollbar thumb hover |

### Text Colors
| Token | Hex | Usage |
|---|---|---|
| `--t1` | `#0f172a` | Primary text, page title, table primary cell |
| `--t2` | `#1e293b` | Secondary text, label text, modal title |
| `--t3` | `#475569` | Body text, nav item default, table cell |
| `--t4` | `#94a3b8` | Muted/disabled text, placeholders, section labels, icon tint |
| `--t5` | `#cbd5e1` | Placeholder text in login form, separator colors |

### Focus Ring Colors
| Token | Value |
|---|---|
| `--sh-focus-teal` | `0 0 0 3px rgba(10,181,168,.22)` |
| `--sh-focus-navy` | `0 0 0 3px rgba(37,81,163,.2)` |
| `--sh-focus-red`  | `0 0 0 3px rgba(239,68,68,.18)` |

---

## 2. TYPOGRAPHY SYSTEM

### Font Families
| Role | Family | Fallback |
|---|---|---|
| **Body / UI** | `Nunito` | `Nunito Sans`, `system-ui`, `sans-serif` |
| **Monospace** | `JetBrains Mono` | `monospace` |
| CSS variable | `--font-body` | `--font-mono` |

### Font Weights Used
| Value | Name | Usage |
|---|---|---|
| `500` | Medium | Body text, input values, table cell secondary |
| `600` | SemiBold | Nav items, sub-labels, notification time, feed text |
| `700` | Bold | Buttons, badges, table primary cells, filter chips, tabs |
| `800` | ExtraBold | Page titles, card titles, stat values, labels, section headers |

### Type Scale
| Element | Size | Weight | Token/Class |
|---|---|---|---|
| Hero headline (login) | `32px` | 800 | `.lh-headline` |
| Page title (H1) | `22px` | 800 | `.pg-title` |
| Login form title | `24px` | 800 | `.lf-title` |
| Card title / section title | `14px` | 800 | `.card-ttl` |
| Topbar title | `15.5px` | 800 | `.topbar-title` |
| Modal title | `16px` | 800 | `.modal-title` |
| Drawer title | `15px` | 800 | `.drawer-title` |
| Confirm title | `17px` | 800 | `.confirm-title` |
| Stat value | `34px` | 800 | `.stat-val` |
| Metric value | `22px` | 800 | `.metric-val` |
| Mini stat value | `20px` | 800 | `.mini-stat-val` |
| Body (base) | `14px` | — | `html` |
| Table body cell | `13.5px` | 500 | `tbody td` |
| Table header | `10.5px` | 800, UPPERCASE | `thead th` |
| Nav item | `13.5px` | 600 | `.nav-item` |
| Button (default) | `13.5px` | 700 | `.btn` |
| Button (large) | `14.5px` | 700 | `.btn-lg` |
| Button (small) | `12.5px` | 700 | `.btn-sm` |
| Button (xs) | `11.5px` | 700 | `.btn-xs` |
| Badge | `11.5px` | 700 | `.badge` |
| Form label | `11.5px` | 800, UPPERCASE | `.fg-label` |
| Login field label | `12px` | 800, UPPERCASE | `.fg-label (login)` |
| Filter chip | `13px` | 700 | `.fchip` |
| Tab item | `13.5px` | 700 | `.tab-item` |
| Pill button | `12.5px` | 700 | `.pill-btn` |
| Pagination button | `13px` | 700 | `.pg-btn` |
| Section label | `10px` | 800, UPPERCASE | `.sec-label` |
| Sidebar section label | `9.5px` | 800, UPPERCASE | `.sb-section` |
| Stat label | `11px` | 800, UPPERCASE | `.stat-lbl` |
| Eyebrow label | `11px` | 800, UPPERCASE | `.lf-eyebrow` |
| Caption / hint | `11.5px` | — | `.fg-hint`, `.td-m` |
| Extra small | `11px` | — | `.xs` utility |
| Small | `12.5px` | — | `.sm` utility |
| Monospace (IDs, codes) | `12px` | 600 | `.td-id`, `.mono` |
| OTP input | `24px` | 800, mono | `.otp-input` |

### Line Heights
| Context | Value |
|---|---|
| Base / body | `1.55` |
| Headlines | `1.18–1.2` |
| Descriptions / paragraphs | `1.65–1.72` |
| Confirm message | `1.65` |
| Chat bubble | `1.55` |

### Letter Spacing
| Context | Value |
|---|---|
| Page title | `-0.4px` |
| Card title | `-0.2px` |
| Topbar title | `-0.2px` |
| Modal title | `-0.2px` |
| Hero headline | `-0.5px` |
| Stat value | `-2px` |
| Metric value | `-1px` |
| Button | `-0.1px` |
| UPPERCASE labels | `0.5px – 1.6px` |
| Eyebrow | `2px` |
| Sidebar section | `1.6px` |
| Stat label | `1.1px` |
| Nav badge | `—` |

---

## 3. SPACING SYSTEM

### Base Unit
`4px` base grid. All spacing is multiples of 4.

### Standard Spacing Values
| Value | Usage |
|---|---|
| `4px` | Tiny gaps, badge padding top/bottom, icon margin |
| `6px` | Small gaps (`.g6`), filter chip padding vertical |
| `7px` | Button gap between icon and text |
| `8px` | Small margin (`.mb8`), component gap (`.g8`) |
| `10px` | Button sm padding, gap (`.g10`), input horizontal padding |
| `12px` | Medium padding (`.p12`), gap (`.g12`), button padding |
| `14px` | Form row gap, stats row gap, card body-sm padding |
| `16px` | Modal padding, form group margin, page padding desktop, gap (`.g16`) |
| `18px` | Login form field margin-bottom, sidebar nav padding left |
| `20px` | Card body padding, section margin, gap (`.g20`) |
| `22px` | Stats row margin-bottom, card body padding |
| `24px` | Page header margin-bottom, topbar padding, section spacing |
| `26px` | Main content vertical padding |
| `28px` | Main content horizontal padding |

### Page / Content Spacing
| Element | Value |
|---|---|
| Main content padding | `26px top/bottom, 28px left/right` |
| Page header margin-bottom | `24px` |
| Stats row gap | `14px` |
| Stats row margin-bottom | `22px` |
| Card gap in grid | `16px` |
| Grid section margin-bottom | `20px` |

### Card Spacing
| Element | Value |
|---|---|
| Card header padding | `16px 20px` |
| Card body padding | `20px` |
| Card body-sm padding | `14px 18px` |
| Card footer padding | `12px 20px` |

### Form Spacing
| Element | Value |
|---|---|
| Form group margin-bottom | `16px` (modal), `18px` (login) |
| Form row gap | `14px` |
| Label margin-bottom | `7px` |
| Input height (default) | `40px` |
| Input height (login `.fi`) | `48px` |
| Textarea padding | `10px 12px` |
| Input padding | `0 12px` |
| Hint margin-top | `5px` |

### Table Spacing
| Element | Value |
|---|---|
| Table header cell padding | `11px 16px` |
| Table body cell padding | `13px 16px` |
| Table toolbar padding | `14px 20px` |
| Action buttons gap | `4px` |

### Modal / Drawer Spacing
| Element | Value |
|---|---|
| Modal header padding | `20px 24px` |
| Modal body padding | `22px 24px` |
| Modal footer padding | `16px 24px` |
| Drawer header padding | `18px 22px` |
| Drawer body padding | `20px 22px` |
| Drawer footer padding | `14px 22px` |
| Confirm dialog padding | `28px` |

---

## 4. BORDER RADIUS SCALE

| Token | Value | Usage |
|---|---|---|
| `--radius-xs` | `4px` | Tiny elements, `.btn-xs`, kbd shortcuts |
| `--radius-sm` | `7px` | Small buttons, tags, nav badge, pagination, pill buttons (inner) |
| `--radius-md` | `10px` | **Default** — inputs, buttons, cards (inner), modal icon, topbar actions |
| `--radius-lg` | `14px` | **Cards** — main card component, stat cards |
| `--radius-xl` | `20px` | Modals |
| `--radius-2xl` | `28px` | Login card |
| `20px` | Pills | Badge, filter chip, status dot, nav badge |
| `50%` | Circles | Avatars, confirm icon, live dot, OTP success icon |

---

## 5. SHADOW SYSTEM

| Token | Value | Usage |
|---|---|---|
| `--sh-xs` | `0 1px 2px rgba(15,23,42,.05)` | Stat cards (default), form input, active pill |
| `--sh-sm` | `0 1px 3px rgba(15,23,42,.07), 0 1px 2px rgba(15,23,42,.05)` | Entry card hover, tooltip |
| `--sh-md` | `0 4px 12px rgba(15,23,42,.09), 0 2px 4px rgba(15,23,42,.05)` | Card hover, stat card hover |
| `--sh-lg` | `0 10px 30px rgba(15,23,42,.12), 0 4px 8px rgba(15,23,42,.06)` | Toasts, dropdown menus |
| `--sh-xl` | `0 20px 60px rgba(15,23,42,.18), 0 8px 24px rgba(15,23,42,.08)` | Modals, drawers, login card |
| Focus - teal | `0 0 0 3px rgba(10,181,168,.22)` | Input focus, teal button focus |
| Focus - navy | `0 0 0 3px rgba(37,81,163,.2)` | Primary button focus |
| Focus - red | `0 0 0 3px rgba(239,68,68,.18)` | Danger/error input focus |
| Button primary hover | `0 3px 10px rgba(10,22,40,.22)` | `.btn-primary:hover` |
| Button accent hover | `0 3px 10px rgba(10,181,168,.25)` | `.btn-accent:hover` |
| Login button hover | `0 6px 20px rgba(10,22,40,.28)` | `.l-btn:hover` |
| Topbar | `0 6px 18px rgba(10,22,40,.04)` | Sticky topbar |

---

## 6. COMPONENT STANDARDS

### Buttons

#### Sizes
| Size | Height | Padding | Font | Border Radius | Icon Size |
|---|---|---|---|---|---|
| `.btn-xs` | `26px` | `0 10px` | `11.5px` | `4px` | `—` |
| `.btn-sm` | `32px` | `0 12px` | `12.5px` | `7px` | `14px` |
| `.btn` (default) | `38px` | `0 16px` | `13.5px` | `10px` | `16px` |
| `.btn-lg` | `44px` | `0 22px` | `14.5px` | `10px` | `—` |
| `.btn-icon` | `38px` | `0` (width=38px) | — | `10px` | — |
| `.btn-icon.btn-sm` | `32px` | `0` (width=32px) | — | `7px` | — |

#### Variants
| Class | Background | Text | Border | Hover |
|---|---|---|---|---|
| `.btn-primary` | `#0a1628` (navy-900) | `#fff` | `#0a1628` | Bg → navy-800, translateY(-1px), shadow |
| `.btn-accent` | `#0e9e93` (teal-600) | `#fff` | `#0e9e93` | Bg → teal-500, translateY(-1px), shadow |
| `.btn-secondary` | `#ffffff` | `--t2` | `--border-md` | Border → border-lg, shadow-xs |
| `.btn-ghost` | `transparent` | `--t3` | `transparent` | Bg → surface-alt, border → border-sm |
| `.btn-danger` | `--danger-bg` | `--danger-text` | `--danger-border` | Bg → #fee2e2, border → #fca5a5 |
| `.btn-success` | `--success-bg` | `--success-text` | `--success-border` | — |
| `.btn-warning` | `--warning-bg` | `--warning-text` | `--warning-border` | — |

All buttons: `border: 1.5px solid`, `font-weight: 700`, `transition: all .16s`, `white-space: nowrap`, `disabled: opacity .5`.

---

### Form Inputs

#### `.form-input` / `.form-select`
- Height: `40px`
- Padding: `0 12px`
- Font: `13.5px`, weight `500`, `--font-body`
- Border: `1.5px solid --border-md`
- Border radius: `--radius-md` (10px)
- Background: `--surface-input` (#ffffff)
- Focus: border → `--teal-500`, box-shadow → `--sh-focus-teal`
- Placeholder color: `--t4`
- Width: `100%` by default
- Select: custom chevron arrow SVG, `padding-right: 32px`, `appearance: none`

#### Login Input `.fi`
- Height: `48px`
- Padding: `0 44px` (icon both sides)
- Font: `14px`, weight `500`
- Error state: border → `--danger-icon`, box-shadow → `--sh-focus-red`, bg → `--danger-bg`

#### Textarea
- `height: auto`, `padding: 10px 12px`
- `resize: vertical`, `line-height: 1.5`
- Inherits all input styles

#### Input with Icon (`.input-wrap`)
- Icon: `position: absolute; left: 11px`, size `16px`, color `--t4`
- Input gets `padding-left: 36px` via `.has-icon`

#### OTP Input
- Width: `52px`, Height: `58px`
- Font: `24px`, weight `800`, monospace
- Color: `--navy-900`
- Filled state: border → `--teal-400`, bg → `--teal-50`, color → `--teal-700`

---

### Badges
- Padding: `3.5px 10px`
- Border radius: `20px` (pill)
- Font: `11.5px`, weight `700`
- Border: `1.5px solid`
- Icon size inside: `11px`

| Class | BG | Text | Border |
|---|---|---|---|
| `.badge-success` | `--success-bg` | `--success-text` | `--success-border` |
| `.badge-warning` | `--warning-bg` | `--warning-text` | `--warning-border` |
| `.badge-danger` | `--danger-bg` | `--danger-text` | `--danger-border` |
| `.badge-info` | `--info-bg` | `--info-text` | `--info-border` |
| `.badge-neutral` | `--neutral-bg` | `--neutral-text` | `--neutral-border` |
| `.badge-teal` | `--teal-50` | `--teal-700` | `--teal-100` |
| `.badge-navy` | `--navy-50` | `--navy-700` | `--navy-100` |
| `.badge-amber` | `--amber-50` | `--amber-700` | `--amber-100` |
| `.badge-purple` | `--purple-bg` | `--purple-text` | `--purple-border` |
| `.badge-green` | `--green-bg` | `--green-text` | `--green-border` |

---

### Cards
- Background: `--surface` (#fff)
- Border: `1px solid --border-sm`
- Border radius: `--radius-lg` (14px)
- Shadow: `--sh-xs`
- Overflow: `hidden`

**Card structure:**
```
.card
  .card-hd     → padding: 16px 20px, border-bottom: 1px solid --border-xs
    .card-ttl  → 14px, weight 800, icon 17px color --t4
    .card-acts → flex, gap 7px
  .card-body   → padding: 20px
  .card-body-sm → padding: 14px 18px
  .card-foot   → padding: 12px 20px, bg: --surface-alt, border-top: 1px solid --border-xs
```

---

### Stat Cards
- Inherits `.card` styles + `padding: 20px 22px`
- Top stripe: `3px` gradient bar (color varies by `.sc-*` modifier)
- Stat value: `34px`, weight `800`, `letter-spacing: -2px`, tabular-nums
- Stat label: `11px`, weight `800`, UPPERCASE, `letter-spacing: 1.1px`, color `--t4`
- Stat icon: `38x38px`, `--radius-md`, colored bg/icon per variant
- Hover: translateY(-1px), shadow-md, border-md
- Delta up: `--green-text`, delta down: `--danger-text`, font `12px` weight `700`

Color variants: `.sc-navy`, `.sc-teal`, `.sc-amber`, `.sc-red`, `.sc-green`, `.sc-purple`, `.sc-blue`

---

### Tables

| Element | Spec |
|---|---|
| Font size | `13.5px` |
| Header padding | `11px 16px` |
| Header font | `10.5px`, weight `800`, UPPERCASE, letter-spacing `1.1px` |
| Header color | `--t4` on `--surface-alt` background |
| Header border-bottom | `1px solid --border-sm` |
| Body cell padding | `13px 16px` |
| Body cell color | `--t3`, weight `500` |
| Row border | `1px solid --border-xs` (bottom, except last) |
| Row hover bg | `--surface-alt` |
| Row hover text | `--t2` |
| Clickable row | `.tr-click` → `cursor: pointer`, hover → `--navy-25` |
| Primary cell `.td-p` | color `--t1`, weight `700` |
| Muted cell `.td-m` | color `--t4`, font `12.5px`, weight `500` |
| ID cell `.td-id` | font-family mono, `12px`, color `--teal-700`, weight `600` |
| Action cell `.td-acts` | flex, gap `4px` |
| Sortable header | `.sortable` → cursor pointer, hover → `--t2` + `--surface-hover` |

**Product thumbnail in table:** `40x40px`, `--radius-sm`, `--surface-alt` bg, icon size `18px`

---

### Avatars
| Class | Size | Font |
|---|---|---|
| `.av-sm` | `26x26px` | `10px` |
| `.av` (default) | `32x32px` | `12px` |
| `.av-lg` | `40x40px` | `15px` |
| `.av-xl` | `52x52px` | `20px` |

All: `border-radius: 50%`, weight `800`. Colors via `.av-navy`, `.av-teal`, `.av-amber`, `.av-green`, `.av-purple`, `.av-red`, `.av-blue`.

---

### Tabs (`.tab-row` / `.tab-item`)
- Tab row: `border-bottom: 1.5px solid --border-sm`, `margin-bottom: 20px`
- Tab item: `padding: 10px 18px`, font `13.5px`, weight `700`, color `--t4`
- Active: color `--navy-800`, `border-bottom: 2.5px solid --navy-700`
- Hover: color `--t2`
- Position: `relative; top: 1.5px` (to overlap the row border)

---

### Filter Chips (`.fchip`)
- Padding: `6px 14px`, border-radius `20px`
- Font: `13px`, weight `700`
- Default: bg `--surface`, border `1.5px solid --border-md`, color `--t3`
- Active: bg `--navy-900`, color `#fff`, border `--navy-900`, shadow
- Hover: color `--t1`, border `--border-lg`, bg `--surface-alt`
- Active press: `transform: scale(.97)`

---

### Pill Toggle (`.pill-toggle` / `.pill-btn`)
- Track: bg `--surface-alt`, border `1.5px solid --border-md`, `--radius-md`, padding `3px`, gap `2px`
- Button: padding `5px 14px`, `--radius-sm`, font `12.5px`, weight `700`, color `--t3`
- Active: bg `--surface`, color `--t1`, shadow `--sh-xs`

---

### Segment Control (`.seg` / `.seg-btn`)
- Same structure as pill toggle
- Button: padding `6px 10px`, `flex: 1`, `text-align: center`

---

### Switch (`.switch`)
- Track: `40x22px`, bg `--border-md`, `border-radius: 20px`, transition `.2s`
- Thumb: `16x16px`, circle, bg `#fff`, `left: 3px; top: 3px`
- Checked: track → `--teal-500`, thumb shifts `translateX(18px)`
- Label: `13.5px`, weight `600`, color `--t2`

---

### Modals
- Overlay: `rgba(15,23,42,.45)`, `backdrop-filter: blur(2px)`
- Overlay transition: `opacity .22s ease`
- Modal: bg `--surface`, `--radius-xl` (20px), shadow `--sh-xl`, border `1px solid --border-sm`
- Default width: `520px`. `.sm` → `420px`, `.md` → `600px`, `.lg` → `760px`, `.xl` → `920px`
- Max width: `calc(100vw - 32px)`, max height: `calc(100vh - 64px)`
- Entry animation: `translateY(16px) scale(.97)` → `none`, `.22s cubic-bezier(.34,1.56,.64,1)`
- Modal icon: `40x40px`, `--radius-md`
- Close button: `32x32px`, `--radius-sm`, hover → `--danger-bg` + `--danger-icon`

---

### Confirm Dialog
- Width: `400px`, padding `28px`, text-align `center`
- Icon: `56x56px`, `border-radius: 50%`
- Title: `17px`, weight `800`
- Message: `13.5px`, weight `500`, color `--t3`, line-height `1.65`
- Buttons: centered flex, gap `10px`
- Entry animation: `scale(.92)` → `none`, `.22s cubic-bezier(.34,1.56,.64,1)`

---

### Drawers
- Width: `480px` (default), `.sm` → `360px`, `.lg` → `640px`
- Position: fixed right, full height
- Overlay: `rgba(15,23,42,.35)`, backdrop-filter `blur(2px)`
- Entry: `translateX(100%)` → `none`, `.28s cubic-bezier(.4,0,.2,1)`
- Header: `padding: 18px 22px`, border-bottom
- Body: `padding: 20px 22px`, scrollable
- Footer: `padding: 14px 22px`, bg `--surface-alt`, border-top

---

### Toasts
- Position: `fixed; bottom: 24px; right: 24px`
- Padding: `13px 18px`, `--radius-md`
- Font: `13.5px`, weight `600`
- Max width: `340px`
- Default bg: `--t1` (#0f172a, near black)
- `.success`: bg `--success-text` (#065f46)
- `.danger`: bg `--danger-text` (#991b1b)
- `.warning`: bg `--amber-700` (#92400e)
- Icon: `17px`, text in white
- Entry: `translateY(16px) scale(.94)` → normal, `.25s cubic-bezier(.34,1.56,.64,1)`
- Auto-dismiss: `3500ms`

---

### Action Menu (Dropdown)
- Position: fixed, anchored to trigger
- Bg `--surface`, border `1px solid --border-sm`, `--radius-md`, shadow `--sh-lg`
- Padding: `5px`, min-width `180px`
- Item: `padding: 9px 12px`, `--radius-sm`, font `13.5px`, weight `600`, color `--t2`
- Item hover: bg `--surface-alt`, color `--t1`
- Icon: `16px`, color `--t4`, hover → `--t2`
- Danger item: color `--danger-text`, icon `--danger-icon`, hover bg `--danger-bg`
- Separator: `1px solid --border-xs`, margin `4px 0`
- Entry animation: `fadeUp .15s ease`

---

### Pagination
- Container: `padding: 14px 20px`, border-top `1px solid --border-xs`, justify `flex-end`
- Button: `32x32px`, `--radius-sm`, font `13px`, weight `700`, color `--t3`
- Button border: `1.5px solid transparent`
- Hover: bg `--surface-alt`, color `--t1`, border `--border-sm`
- Active: bg `--navy-900`, color `#fff`, border `--navy-900`
- Disabled: `opacity: .35`
- Chevron icon: `14px`

---

### Detail Key-Value (`.detail-kv`)
- Layout: flex row, gap `12px`, padding `10px 0`, border-bottom `1px solid --border-xs`
- Key `.detail-k`: `11.5px`, weight `800`, UPPERCASE, color `--t4`, `letter-spacing: .6px`, width `140px`, flex-shrink 0
- Value `.detail-v`: `13.5px`, weight `600`, color `--t1`, flex 1

---

### Progress Bar (`.progress`)
- Height: `6px` (`.sm` → `4px`, `.lg` → `9px`)
- Background: `--surface-alt`
- Border-radius: `6px`
- Border: `1px solid --border-xs`
- Fill: `height: 100%`, border-radius `6px`, transition `width .45s ease`

---

### Timeline Compact
- Dot: `30x30px`, circle, icon `14px`
- Done: bg `--success-bg`, icon `--success-icon`, border `2px solid --success-border`
- Active: bg `--warning-bg`, icon `--warning-icon`, border `2px solid --warning-border`, pulse animation
- Pending: bg `--surface-alt`, icon `--t4`, border `2px solid --border-md`
- Connector line: `1.5px solid --border-sm` between items
- Body padding-bottom: `18px`
- Title: `13.5px`, weight `700`, color `--t1`
- Sub: `12px`, weight `500`, color `--t4`

---

### Upload Area
- Border: `2px dashed --border-md`, `--radius-md`
- Padding: `28px`, text-align center
- Color: `--t4`, weight `600`
- Hover: border → `--teal-400`, color → `--teal-600`, bg → `--teal-50`

---

### Empty State (`.es` / `.empty-state`)
- Padding: `52px 24px`, text-align center
- Icon: `64x64px` circle, font `28px`, `margin: 0 auto 16px`
- Heading: `16px`, weight `800`, color `--t2`, `margin-bottom: 8px`
- Description: `13.5px`, weight `500`, color `--t4`, max-width `280px`, line-height `1.65`

---

### Notifications
- Item: `padding: 14px 0`, border-bottom `1px solid --border-xs`
- Icon: `38x38px`, `--radius-md`, font `17px`
- Time: `11px`, weight `600`, color `--t4`

---

### Chat Bubbles
- Max width: `74%`, padding `11px 15px`
- Sent: bg `--navy-900`, color `#fff`, border-radius `16px 16px 4px 16px`
- Received: bg `--surface-alt`, color `--t1`, border-radius `16px 16px 16px 4px`, border `1px solid --border-sm`
- Font: `13.5px`, weight `500`, line-height `1.55`

---

## 7. ICON SYSTEM

- Library: **Tabler Icons** (`ti ti-*` class prefix, webfont)
- CDN: `@tabler/icons-webfont@3.31.0`

| Context | Size |
|---|---|
| Navigation icon | `17px` (collapsed: `18px`) |
| Button icon (default) | `16px` |
| Button icon (sm) | `14px` |
| Card title icon | `17px` |
| Modal icon (container) | `20px` inside 40px box |
| Confirm icon | `26px` inside 56px circle |
| Stat card icon | `19px` inside 38px box |
| Topbar action icon | default (`16–18px`) |
| Table action button icon | `14px` (btn-sm) |
| Notification icon | `17px` |
| Form input prefix icon | `16–17px` |
| Toast icon | `17px` |
| Empty state icon | `28px` (inside 64px circle) |
| Action menu item icon | `16px` |
| Sidebar avatar / logout | `18px` |

**Icon color rules:**
- Navigation icons: `--t4` (default), `--t3` (hover), `--navy-500` (active)
- Card title icons: `--t4`
- Button icons: inherit button text color
- Form prefix icons: `--t4`
- Table action icons: `--t4` on ghost, colored on danger
- Stat card icons: themed color per `.sc-*` variant

---

## 8. LAYOUT RULES

### App Shell
- Layout: CSS Grid `grid-template-columns: var(--sidebar-w) 1fr`
- Grid rows: `var(--topbar-h) 1fr`
- Height: `100vh`, overflow `hidden`

### Sidebar
- Width: `244px` (expanded), `72px` (collapsed)
- Collapsed trigger: `.app-shell.collapsed`
- Background: `--surface` (#fff)
- Border-right: `1px solid --border-sm`

### Topbar
- Height: `62px`
- Background: `--surface`, border-bottom `1px solid --border-sm`
- Padding: `0 24px`
- Sticky with `backdrop-filter: blur(6px)`
- Shadow: `0 6px 18px rgba(10,22,40,.04)`
- Search width: `268px`
- Action buttons: `38x38px`

### Main Content
- `overflow-y: auto`
- Padding: `26px 28px`

### Maximum Content Width
- No global max-width; content fills available grid area
- Product editor: `70/30` split (`.pe-left 70%` / `.pe-right 30%`)
- Sticky sidebar inside product editor: `top: 86px`

### Grid Utilities
| Class | Columns | Gap |
|---|---|---|
| `.grid-2` | `1fr 1fr` | `16px` |
| `.grid-3` | `1fr 1fr 1fr` | `16px` |
| `.grid-4` | `repeat(4,1fr)` | `14px` |
| `.grid-1-2` | `1fr 2fr` | `16px` |
| `.grid-2-1` | `2fr 1fr` | `16px` |
| `.stats-row` | `repeat(auto-fit, minmax(188px, 1fr))` | `14px` |
| `.form-row` | `1fr 1fr` | `14px` |
| `.form-row.triple` | `1fr 1fr 1fr` | `14px` |
| `.form-row.single` | `1fr` | `14px` |

### Media Manager Grid
- `repeat(auto-fill, minmax(84px, 1fr))`, gap `10px`
- Item: `84x84px`, `border-radius: 8px`

### Image Preview Grid
- `repeat(auto-fit, minmax(100px, 1fr))`, gap `12px`
- Item: min-height `110px`, `--radius-md`

### Responsive Breakpoints
| Breakpoint | Behavior |
|---|---|
| `≤ 1280px` | Stats row `.cols-7` → `auto-fit minmax(160px, 1fr)` |
| `≤ 1000px` | Product editor: stack columns vertically; sticky sidebar → static |
| `≤ 900px` | Page actions wrap; form inputs shrink |
| `≤ 720px` | Mobile wizard bar appears (`display: flex`) |

---

## 9. PAGE STRUCTURE PATTERN

Every page follows this exact structure:

```html
<!-- 1. Page Header -->
<div class="pg-header">
  <div class="pg-header-l">
    <h1 class="pg-title">Page Title</h1>
    <p class="pg-sub">Sub text · Metadata</p>
  </div>
  <div class="pg-actions">
    <!-- Search input, filters, CTA buttons -->
  </div>
</div>

<!-- 2. Stats Row (optional) -->
<div class="stats-row">
  <div class="stat-card sc-navy">...</div>
  ...
</div>

<!-- 3. Filter Chips or Tabs (optional) -->
<div class="filter-row">...</div>
<!-- OR -->
<div class="tab-row">...</div>

<!-- 4. Main Content (card with table, or grid of cards) -->
<div class="card">
  <div class="card-hd">...</div>
  <div class="tbl-wrap"><table>...</table></div>
  <div class="pagination">...</div>
</div>
```

---

## 10. FORM STANDARDS

- **Label position:** Above field
- **Label style:** `11.5px`, weight `800`, UPPERCASE, letter-spacing `.5px`, color `--t2`, `margin-bottom: 7px`
- **Required indication:** Not explicitly styled (no asterisk pattern found — labels are sufficient)
- **Field spacing:** `margin-bottom: 16px` per `.fg` group
- **Input height:** `40px` (app forms), `48px` (login)
- **Placeholder:** color `--t4`
- **Validation error:**
  - Input: border → `--danger-icon`, box-shadow → `--sh-focus-red`, bg → `--danger-bg`
  - Message: `.fg-err` — `11.5px`, color `--danger-icon`, hidden by default, `.show` to display
- **Hint text:** `.fg-hint` — `11.5px`, color `--t4`, `margin-top: 5px`
- **Form sections:** `padding: 16px 18px`, border `1px solid --border-sm`, `border-radius: 16px`, bg `--surface-alt`
- **Submit button placement:** Right-aligned in modal footer; full-width in login (`.l-btn`)
- **Two-column form:** `.form-row` (default for modals)
- **Three-column form:** `.form-row.triple`

---

## 11. ANIMATION STANDARDS

| Animation | Duration | Easing | Usage |
|---|---|---|---|
| Page enter | `0.22s` | `ease-out` | `.page-enter` — `fadeUp` |
| fadeUp | `from Y+8px opacity 0` → normal | ease | Pages, dropdowns |
| Login screen transition | `0.4s` | `cubic-bezier(.4,0,.2,1)` | Login in/out |
| App shell appear | `0.38s` | `cubic-bezier(.4,0,.2,1)` | Scale from .985 → 1 |
| Modal appear | `0.22s` | `cubic-bezier(.34,1.56,.64,1)` | Spring bounce |
| Drawer slide | `0.28s` | `cubic-bezier(.4,0,.2,1)` | Slide from right |
| Toast appear | `0.25s` | `cubic-bezier(.34,1.56,.64,1)` | Spring bounce |
| Toast dismiss | `0.2s` | `ease` | `toastOut` — auto after 3500ms |
| Confirm dialog | `0.22s` | `cubic-bezier(.34,1.56,.64,1)` | Scale from .92 |
| Button hover | `0.16s` | default | translateY(-1px) |
| Input focus | `0.2s` | default | Border + shadow |
| Nav item / chip | `0.15s` | default | Background/color |
| Overlay | `0.22s` | ease | Opacity |
| Live pulse | `2.5s` | `ease-in-out` infinite | Status dot (0%/100% opacity 1, 50% opacity .35) |
| Spinner | `0.7s` | linear infinite | rotate(360deg) |
| Success icon pop | `0.4s` | `cubic-bezier(.26,1.5,.5,1)` | Scale .5 → 1 |
| Progress bar | `0.45s` | ease | Width change |
| Chart bar hover | `0.15s` | default | Background + scaleY(1.03) |
| Switch toggle | `0.2s` | default | Transform + background |
| Sidebar collapse | CSS transition | `0.2s` | Grid column width |

---

## 12. REUSABLE PATTERNS

### CRUD / Listing Page
1. `pg-header` with title + search input + status filter select + primary CTA button
2. `stats-row` with 4–6 stat cards
3. `tab-row` or `filter-row` for status filtering
4. `.card` containing `.tbl-wrap > table` + `.pagination`
5. Row click → opens drawer (detail view)
6. Edit button → opens modal
7. Delete/block button → shows confirm dialog

### Detail View (Drawer)
1. Badges showing current status at top
2. `.tl-compact` timeline section
3. `.sec-label` + `.detail-kv` key-value grid
4. Footer with action buttons (secondary left, primary right, danger with `mla`)

### Add/Edit Modal
1. Modal header with icon + title + subtitle
2. `.form-row` two-column layout for related fields
3. Grouped sections for logical field grouping
4. Footer: Cancel (ghost/secondary, `btn-cancel` goes to left) + Submit (primary, right)

### Dashboard Page
1. Stats row (clickable, navigate to section)
2. Grid: live table (2fr) + activity feed (1fr)
3. Grid: chart card (span 2) + donut/status card
4. Grid: 3 columns — top products, active partners, action required

### Empty State
- Icon in colored circle
- Heading (16px, weight 800)
- Description (13.5px, max-width 280px)
- Optional CTA button

### Loading State
- Button: `.loading` class → spinner visible, label hidden, disabled
- Spinner: `20px` circle, border `2.5px`, top-color white, 0.7s linear spin

---

## 13. SIDEBAR STRUCTURE

```
.sidebar
  .sb-logo (height: 62px)         ← Logo + app name + collapse toggle
  .sb-scroll
    .sb-section                   ← "MAIN" section label (9.5px, 800, UPPERCASE)
    .nav-item [data-page="X"]     ← Icon + label + optional .nav-badge
    .sb-section                   ← "MANAGEMENT" section label
    .nav-item ...
  .sb-footer                      ← Avatar + name/role + logout icon
```

**Nav item active state:**
- Bg: `--navy-50`, color `--navy-700`, weight `700`
- Left indicator: `3px wide, 20px tall, --navy-600`, `border-radius: 0 3px 3px 0`
- Icon: `--navy-500`

**Nav badge:**
- Default (danger): `--danger-bg`, text `--danger-text`, border `--danger-border`
- `.info`: info colors
- `.success`: success colors
- `.warning`: warning colors
- Font: `10.5px`, weight `800`, padding `2px 7px`, border-radius `20px`

---

## 14. AI SCREEN GENERATION RULES

> **STRICT RULES** — Follow these exactly when generating any new screen, feature, form, table, modal, or dashboard widget.

### Colors
1. **Primary CTA buttons** always use `background: #0a1628` (navy-900), white text.
2. **Accent / secondary action buttons** use `background: #0e9e93` (teal-600), white text.
3. **Secondary buttons** use white background, `--border-md` border, `--t2` text.
4. **Never introduce new colors.** Only use tokens defined in the `:root` color palette.
5. **Status colors:** success → teal-based (`#065f46` text / `#f0fdf9` bg), warning → amber, danger → red, info → blue.
6. **Page background** is always `#f0f4f9`. Cards are always `#ffffff`.
7. **Table headers** always use `--surface-alt` (#f8fafc) background.

### Typography
8. **Page titles** are always `22px`, weight `800`, color `#0f172a`, `letter-spacing: -.4px`.
9. **Card titles** are always `14px`, weight `800`, with a Tabler icon prefix in `--t4`.
10. **Form labels** are always `11.5px`, weight `800`, UPPERCASE, `letter-spacing: .5px`, color `--t2`.
11. **Table headers** are always `10.5px`, weight `800`, UPPERCASE, `letter-spacing: 1.1px`, color `--t4`.
12. **Table body cells** are `13.5px`, weight `500`, color `--t3`.
13. **Badges** are always `11.5px`, weight `700`, pill shape (`border-radius: 20px`).
14. **Body font** is always `Nunito`. IDs, codes, SKUs use `JetBrains Mono`.
15. Never use font sizes or weights not already in the scale.

### Spacing
16. **Page content padding** is always `26px 28px`.
17. **Page header** always has `margin-bottom: 24px`.
18. **Stats row gap** is `14px`. Stats row `margin-bottom: 22px`.
19. **Card body padding** is `20px` (default) or `14px 18px` (compact `.card-body-sm`).
20. **Form groups** have `margin-bottom: 16px`. Labels have `margin-bottom: 7px`.
21. **Modal footer** has `padding: 16px 24px`, right-justified buttons.

### Components
22. **All inputs** are `height: 40px`, `border: 1.5px solid --border-md`, `--radius-md`, focus → teal ring.
23. **Default button height** is `38px`. Small is `32px`. Large is `44px`. XS is `26px`.
24. **All cards** use `border: 1px solid --border-sm`, `--radius-lg` (14px), shadow `--sh-xs`.
25. **Modals** use `--radius-xl` (20px), shadow `--sh-xl`. Always include header, scrollable body, and footer.
26. **Drawers** open from the right, default width `480px`. Large is `640px`.
27. **Toasts** appear bottom-right. Success = dark green bg. Danger = dark red bg. Default = near-black.
28. **Tables** are always wrapped in `.tbl-wrap` inside a `.card`. Always include `.pagination` at the bottom.
29. **Action buttons** in table rows use `.btn.btn-ghost.btn-sm.btn-icon`. Destructive uses `.btn-danger.btn-sm.btn-icon`.
30. **Pagination** always shows "Showing X of Y" count on the left, buttons on the right.

### Layout
31. **Every page** starts with `.pg-header` (title left, actions right).
32. **Stats rows** come immediately after the page header when metrics exist.
33. **Filter chips** (`.filter-row`) or **tabs** (`.tab-row`) precede the main table when filtering is needed.
34. **Two-column layouts** use `.grid-2` (gap `16px`). Three-column use `.grid-3`.
35. **Sidebar width** is `244px` expanded, `72px` collapsed.
36. **Topbar height** is `62px`.

### Icons
37. **Always use Tabler Icons** (`ti ti-*`). Never use other icon libraries.
38. **Button icons** are `16px`. Small button icons are `14px`.
39. **Card title icons** are `17px`, colored `--t4`.
40. **Nav icons** are `17px` default.
41. **Stat card icons** are `19px` inside a `38x38px` colored box.

### Tables — Specific Rules
42. **Product thumbnails** in tables are `40x40px` (`.prod-thumb`), `--radius-sm`, with icon inside.
43. **ID columns** (Order ID, Partner ID, etc.) always use `.td-id` class: mono font, `12px`, teal-700 color.
44. **Status column** always uses a `.badge` with the correct semantic color variant.
45. **Avatar + name** pattern in sailor/partner tables: `.av.av-sm` + `.td-p` name, `.td-m` for email below.

### Forms — Specific Rules
46. **Two-column form rows** (`.form-row`) for related fields side-by-side.
47. **Logical sections** inside modals use `border: 1px solid --border-sm`, `border-radius: 16px`, `background: --surface-alt`, `padding: 16px 18px`.
48. **Cancel button** in modal footer gets `.btn-cancel` (floated left via `margin-right: auto`).
49. **Submit button** is always `.btn-primary` and is the last/rightmost button.

### Modals — Specific Rules
50. **Modals always have an icon** in the header (`.modal-icon`, `40x40px`, `--radius-md`).
51. **Icon background color** matches the context: navy-50 for informational, teal-50 for actions, amber-50 for financial, danger-bg for destructive, success-bg for completion.
52. **Danger confirmations** use `.confirm-box`, not a full modal. Icon is `56x56px` circle.

### Animations
53. **Page transitions** always use `.page-enter` class with `fadeUp .22s ease-out`.
54. **Modals** use spring animation `cubic-bezier(.34,1.56,.64,1)`.
55. **Drawers** use `cubic-bezier(.4,0,.2,1)`.
56. **Button hover** always uses `translateY(-1px)` + shadow.
57. **Loading states** use the spinner pattern: `.loading` class on button, spinner visible, label hidden.

### What to NEVER Do
58. Never introduce a new color not already in the design token set.
59. Never use a font other than Nunito (UI) or JetBrains Mono (code).
60. Never use a shadow not in the `--sh-*` token set.
61. Never use border-radius values outside the `--radius-*` scale (4, 7, 10, 14, 20, 28px or 50%).
62. Never create a table outside of a `.card` component.
63. Never use inline color values — always reference CSS variables.
64. Never add a close button anywhere other than top-right using `.modal-close` or equivalent.
65. Never skip the `.pg-header` on any full page screen.
66. Never make a CTA button wider than needed — use `padding: 0 16px` (not `width: 100%`) except in login.
67. Never use a different icon library — always Tabler Icons.
68. Never create custom status colors — use the defined semantic badge classes.

---

## 15. QUICK REFERENCE CHEATSHEET

```
Primary CTA button:   height 38px · bg #0a1628 · white text · radius 10px
Accent button:        height 38px · bg #0e9e93 · white text · radius 10px
Secondary button:     height 38px · bg #fff · border #d4dce9 · radius 10px
Page title:           22px · weight 800 · #0f172a
Card title:           14px · weight 800 · icon 17px --t4
Form label:           11.5px · weight 800 · UPPERCASE · #1e293b
Input:                height 40px · border 1.5px #d4dce9 · radius 10px
Input focus:          border #0ab5a8 · shadow 0 0 0 3px rgba(10,181,168,.22)
Badge:                11.5px · weight 700 · radius 20px · border 1.5px
Table header:         10.5px · weight 800 · UPPERCASE · #94a3b8 on #f8fafc
Table cell:           13.5px · weight 500 · #475569 · padding 13px 16px
Table ID cell:        12px · mono · #0d7470 · weight 600
Card:                 bg #fff · border 1px #e8edf5 · radius 14px · shadow sh-xs
Stat card value:      34px · weight 800 · letter-spacing -2px
Page padding:         26px 28px
Card body padding:    20px
Modal:                radius 20px · shadow sh-xl · spring animation
Drawer:               480px width · right side · cubic-bezier(.4,0,.2,1)
Toast:                bottom-right 24px · radius 10px · 3500ms auto-dismiss
Sidebar:              244px · collapsed 72px · bg white
Topbar:               62px height · bg white · padding 0 24px
Font UI:              Nunito (weights 500/600/700/800)
Font Mono:            JetBrains Mono
Icons:                Tabler Icons ti-* · nav 17px · btn 16px · btn-sm 14px
```

---

*Generated by reverse-engineering AnchorMart Admin v3 codebase. Theme: Cloud Dock Light.*
