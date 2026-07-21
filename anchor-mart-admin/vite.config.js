import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    // Strip trailing /api from the base URL to get the raw backend origin
    const backendTarget = (env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");
    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
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
            },
        },
    };
});
