# AnchorMart Admin Demo

This repository contains the AnchorMart admin UI demo in a split multi-file structure.

## Files

- `index.html` — entry point for the admin UI
- `css/style.css` — extracted stylesheet
- `js/app.js` — application logic and page renderers

## Run locally

### Option 1: Use Python HTTP server

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Use VS Code Live Server

Install the Live Server extension, then open `index.html` and click **Open with Live Server**.

## Notes

- Login is mocked. Use `admin@gmail.com` and `Admin@123`.
- The project is static; no backend is required.

What I did
Step	Result
npm install	304 packages, exit 0
Created .env	It was missing — only .env.example existed
npm run dev	Up in 375ms on port 3000
Verified /api proxy	POST /api/superadmin/admin/login/ → 400 {"error":"Email and password are required"} — backend is live
A Django/uvicorn backend was already running on :8000 (pid 9856) — it's not in this repo, so I left it alone.

Commands

cd /home/abc/Desktop/Frontend_Anchormart/Anchor_mart_1/anchor-mart-admin

npm install        # deps (already done)
npm run dev        # dev server → http://localhost:3000 (auto-opens browser)
npm run build      # tsc -b && vite build  ← currently FAILS, see below
npm run preview    # serve dist/ after a successful build
npm run lint       # biome lint
npm run format     # biome format --write
npm run check      # biome check --write (lint + format + fix)
Restart / stop. The server I started is pid 22990, owned by this session — not your terminal, so Ctrl+C won't reach it:


kill 22990                     # stop it
# or, generically:
pkill -f "vite"

npm run dev                    # start again
npm run dev -- --host          # expose on your LAN
npm run dev -- --port 3001     # different port
rm -rf node_modules/.vite && npm run dev   # clear Vite cache if HMR gets weird