# AnchorMart Admin — Agent Instructions

This is a static admin dashboard demo. There is no frontend build system and no
backend service.

## Key facts
- **Entry point and single source of truth: `index.html`.**
  It is fully self-contained — all CSS lives in its `<style>` block, all
  JavaScript in its `<script>` block, and the logos are embedded as base64
  data-URIs. There are no runtime dependencies on `assets/` or `legacy/`.
- `serve.js` — tiny static server for local preview (`/` serves `index.html`).
- `assets/` — brand SVG source files (`logo-wordmark[-white].svg`,
  `logo-icon[-white].svg`). Not loaded at runtime; edit only the source assets.
- `legacy/` — an older split-file version (`legacy/css/`, `legacy/js/`). **Dead
  code, kept for reference only. Do not edit it expecting the app to change.**

## What to do
- Make all UI/logic/style changes in **`index.html`** — markup, the inline
  `<style>`, and the inline `<script>` all live there.
- Treat this as a plain HTML/CSS/JavaScript project. Do not add React, Svelte,
  or other framework scaffolding unless the user explicitly asks.
- Preserve the static/site-demo nature of the repo; do not introduce package
  tooling or a build step.

## Local preview
- `node serve.js`, then open <http://localhost:8000/>, or
- `python -m http.server 8000`, or VS Code **Live Server** / **Live Preview**.

## References
- `README.md` — project overview, structure, and run instructions.
