import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` is set for GitHub Pages project hosting (repo: AnchorMart-1).
// Dev server ignores it; production build prefixes asset URLs with it.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
