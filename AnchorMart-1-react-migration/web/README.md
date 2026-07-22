# AnchorMart Admin — React

A React + TypeScript + Vite port of the AnchorMart admin dashboard (originally the
single-file `../index.html`). The UI is reproduced 1:1 by reusing the original CSS
verbatim (`src/styles/index.css`); all logic is restructured into components, contexts,
typed data, and React Router.

## Run

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Login is mocked — any valid-format email + 6+ character password signs in
(pre-filled: `admin@anchormart.io` / `password123`).

## Structure

```
src/
  styles/index.css        # the original design system, verbatim (tokens unchanged)
  types/                  # shared domain types
  data/                   # mock data + reference tables (notifs, products, page titles)
  lib/images.tsx          # offline image helpers (ProductThumb, Avatar) — bundled SVGs only
  context/                # Auth, Toast, Modal (+confirm), Drawer, Menu providers
  components/
    layout/               # AppShell, Sidebar, Topbar, NotifPanel, nav config
    ui/                   # Modal chrome, Segmented
    modals/               # 15 modal components + useUi() central opener hook
    drawers/              # OrderDetail, Profile, Ticket drawers
  pages/                  # Login + 19 app pages
  routes.tsx              # route table (path → page)
```

Images are bundled SVGs under `public/assets/` — no external CDN image loaders.
Icons use the Tabler webfont and fonts use Google Fonts (loaded via CDN in `index.html`).

## Deploy (GitHub Pages)

Set `VITE_BASE=/AnchorMart-1/` when building for project-Pages hosting:

```bash
VITE_BASE=/AnchorMart-1/ npm run build
```

Then publish `dist/`. (Left at `/` by default so dev/preview work without config.)
