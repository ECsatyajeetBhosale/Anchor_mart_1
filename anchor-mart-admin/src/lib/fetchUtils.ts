import type { RootState } from "@/store";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
    // Use VITE_API_BASE_URL if provided, otherwise fallback to relative '/api' for dev and prod
    // Use relative '/api' during development (proxy handles CORS), fallback to VITE_API_BASE_URL in production
    baseUrl: import.meta.env.DEV ? "/api" : (import.meta.env.VITE_API_BASE_URL as string),
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        // Django REST Framework Token Auth — NOT Bearer
        headers.set("Authorization", `Token ${token}`);
      }
      headers.set("Content-Type", "application/json");
      // Default to JSON, but let an endpoint override `Accept` (e.g. file exports
      // that return xlsx — forcing application/json makes DRF reply 406).
      if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
      }
      // Skip ngrok browser interstitial in development
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  tagTypes: [
    "Dashboard",
    "Analytics",
    "Sailors",
    "Orders",
    "Intents",
    "Products",
    "Variants",
    "ExpressItems",
    "Categories",
    "EmergencyCategories",
    "Partners",
    "Coupons",
    "Loyalty",
    "Deals",
    "BonusPoints",
    "Assignments",
    "Verifications",
    "Notifications",
    "Sellers",
    "Support",
    "Faqs",
    "FaqTypes",
    "SpecialRequests",
    "Spares",
    "ShipAgents",
    "Ratings",
    "Chats",
    "Ports",
    "Gifts",
    "AccountDeletions",
    "Audit",
    "OutboundMessages",
    "SavedProducts",
  ],
  endpoints: () => ({}),
});
