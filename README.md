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

- Login is mocked. Use `admin@anchormart.io` and `password123`.
- The project is static; no backend is required.
