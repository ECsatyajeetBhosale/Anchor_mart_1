# AnchorMart Admin

A static, single-file admin dashboard demo for AnchorMart — a maritime
provisioning platform (sailor orders, delivery-partner operations,
inventory, and port logistics).

## Project structure

```
.
├─ index.html                  # The entire app — self-contained (HTML + CSS + JS inline)
├─ serve.js                    # Tiny zero-dependency static file server
├─ assets/                     # Brand SVGs (source files)
│  ├─ logo-wordmark.svg        #   full "ANCHORMART" wordmark — navy (on light)
│  ├─ logo-wordmark-white.svg  #   full wordmark — white (on dark)
│  ├─ logo-icon.svg            #   anchor icon mark — navy
│  └─ logo-icon-white.svg      #   anchor icon mark — white
├─ legacy/                     # Archived earlier split-file version — NOT used by the app
│  ├─ css/                     #   old extracted stylesheets
│  └─ js/                      #   old extracted application logic
├─ README.md
└─ AGENTS.md                   # Notes for AI coding agents
```

> **Note:** `index.html` is fully self-contained — all styles and scripts are
> embedded inline, and the logos are inlined as base64 data-URIs. It does **not**
> load anything from `assets/` or `legacy/` at runtime. The files in `legacy/`
> are an older multi-file build kept only for reference.

## Run locally

### Option 1 — bundled Node server (recommended)

```powershell
node serve.js
```

Then open <http://localhost:8000/> in your browser.

### Option 2 — Python

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/>.

### Option 3 — VS Code

Open `index.html` and use the **Live Server** (or **Live Preview**) extension.

## Notes

- Login is mocked. Any valid-format email + a 6+ character password signs in
  (pre-filled with `admin@anchormart.io` / `password123`).
- The project is fully static — no backend or build step is required.
