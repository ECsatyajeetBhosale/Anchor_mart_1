/// <reference types="vitest/config" />
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Strip trailing /api from the base URL to get the raw backend origin
  const backendTarget = (env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(
    /\/api\/?$/,
    "",
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Unit tests run under the same aliases and plugins the app builds with, so
    // a test importing "@/lib/stats" resolves exactly as the app does.
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
    server: {
      port: 3000,
      open: true,
      // Allow the dev server to be reached through an ngrok tunnel (Vite 6 blocks
      // unknown hosts by default, otherwise showing a "Blocked request" page).
      // Free ngrok tunnels now use *.ngrok-free.dev.
      allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.dev", ".ngrok.io", ".ngrok.app"],
      proxy: {
        // Proxy all /api/* requests to the backend server-side — no CORS needed
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
        // Uploaded media, proxied for the same reason the API is — but the
        // header matters more here. A free ngrok tunnel answers any *browser*
        // request that lacks `ngrok-skip-browser-warning` with its interstitial
        // HTML page, at status 200. An `<img>` therefore receives a web page
        // where a JPEG should be, fails to decode it, and falls back to the
        // "no picture" glyph — which reads as missing data rather than as a
        // tunnel warning. Requests routed through here carry the header and get
        // the file. Only useful for media served by the backend itself (local
        // `MEDIA_ROOT`); S3/CloudFront URLs bypass this origin entirely.
        "/media": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
        // Chat websocket (Flow 23 §2). `ws: true` is what makes Vite forward the
        // HTTP Upgrade handshake; without it the socket 404s in dev while every
        // REST call keeps working, which reads as "chat is broken".
        "/ws": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});
