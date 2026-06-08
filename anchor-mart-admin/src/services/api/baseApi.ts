import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";

/**
 * RTK Query base API — the single source of truth for all API calls.
 *
 * Auth: Django REST Framework Token Auth
 * Header: Authorization: Token <token>
 *
 * All feature APIs must extend this via injectEndpoints() — never
 * create a new createApi() instance.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    // Dev: empty baseUrl → relative URLs hit Vite proxy (no CORS)
    // Prod: full URL → requests go directly to backend
    baseUrl: import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE_URL as string),
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        // Django REST Framework Token Auth — NOT Bearer
        headers.set("Authorization", `Token ${token}`);
      }
      headers.set("Content-Type", "application/json");
      headers.set("Accept", "application/json");
      // Skip ngrok browser interstitial in development
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  tagTypes: [
    "Dashboard",
    "Sailors",
    "Orders",
    "Intents",
    "Products",
    "Partners",
    "Coupons",
    "Assignments",
    "Verifications",
    "Notifications",
    "Sellers",
    "Support",
  ],
  endpoints: () => ({}),
});
