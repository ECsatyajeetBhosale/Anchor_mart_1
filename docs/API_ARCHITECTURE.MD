# API Architecture — Complete Reference Guide

> Full analysis of the Anchor Mart codebase. Use this as the definitive blueprint to recreate
> the exact same API architecture in any new project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Folder Structure](#2-folder-structure)
3. [Dependencies](#3-dependencies)
4. [Environment Configuration](#4-environment-configuration)
5. [API Client Setup](#5-api-client-setup)
6. [Endpoint Organization](#6-endpoint-organization)
7. [API Request Flow](#7-api-request-flow)
8. [Authentication Flow](#8-authentication-flow)
9. [State Management](#9-state-management)
10. [Custom Hooks Pattern](#10-custom-hooks-pattern)
11. [Form Handling & Validation](#11-form-handling--validation)
12. [Error Handling Strategy](#12-error-handling-strategy)
13. [Toast Notification System](#13-toast-notification-system)
14. [Routing & Route Protection](#14-routing--route-protection)
15. [Reusable Patterns](#15-reusable-patterns)
16. [Code Examples](#16-code-examples)
17. [New Project Setup Guide](#17-new-project-setup-guide)

---

## 1. Architecture Overview

The project uses a **feature-based architecture** where each domain (auth, catalog, products, dashboard) is a self-contained module. The API layer is built entirely on **RTK Query** (Redux Toolkit Query) — there is no Axios, no custom fetch wrapper, and no service class layer.

### Core Technology Choices

| Concern | Solution | Why |
|---|---|---|
| HTTP requests | RTK Query (`fetchBaseQuery`) | Auto caching, auto refetching, loading/error states, cache invalidation |
| State management | Redux Toolkit | Single source of truth, DevTools, TypeScript-first |
| Auth state persistence | `localStorage` + Redux slice | Token and user survive page refresh |
| Form handling | React Hook Form + Zod | Performant forms, schema-based validation |
| Toast notifications | Sonner (via thin wrapper) | Non-blocking, promise-aware notifications |
| Routing | React Router v7 | Protected routes, nested layouts |
| Dev CORS bypass | Vite proxy | All `/api/*` calls proxied server-side — no CORS headers needed in dev |

### Key Architectural Decisions

**No service layer** — RTK Query API slices ARE the service layer. No intermediate `categoryService.ts` files exist.

**One `createApi` per feature** — Each feature owns its own RTK Query API slice. They are merged in the Redux store.

**`transformResponse` on every query** — Raw API responses are normalized inside the API slice before reaching any component or hook.

**Tag-based cache invalidation** — Mutations use `invalidatesTags` / queries use `providesTags` so the cache automatically refetches after create/update/delete.

**Feature barrel exports** — Every feature folder has an `index.ts` that re-exports its public API so consumers import from `@/features/catalog` rather than deep paths.

---

## 2. Folder Structure

```
src/
├── App.tsx                         # Root component — renders AppRouter + Toaster
├── main.tsx                        # Entry point — Redux Provider, BrowserRouter
├── index.css                       # Global CSS (Tailwind v4 entry)
│
├── lib/                            # Shared utilities (no business logic)
│   ├── apiEndpoints.ts             # ALL endpoint URL strings in one place
│   ├── constants.ts                # App route paths (APP_ROUTES)
│   ├── messages.ts                 # All user-facing strings (APP_TEXT)
│   ├── toast.ts                    # Thin wrapper around Sonner
│   ├── utils.ts                    # cn() helper (clsx + tailwind-merge)
│   └── fetchUtils.ts               # getApiBaseUrl() helper (dev vs prod)
│
├── store/
│   └── index.ts                    # configureStore — registers all API reducers
│
├── hooks/                          # App-level shared hooks (NOT feature hooks)
│   ├── useAppDispatch.ts           # Typed useDispatch + useSelector
│   └── use-mobile.ts              # Responsive breakpoint hook
│
├── types/
│   └── index.ts                    # Global shared types (ApiError, etc.)
│
├── routes/
│   ├── AppRouter.tsx               # All route definitions
│   └── ProtectedRoute.tsx          # Auth guard — redirects to /login if logged out
│
├── pages/                          # Page-level components (thin wrappers)
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── HomePage.tsx
│
├── components/
│   ├── common/                     # Layout, Header, AppSidebar
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   └── AppSidebar.tsx
│   └── ui/                         # shadcn/ui components + custom UI primitives
│       ├── button.tsx
│       ├── data-table.tsx          # Generic reusable data table
│       ├── app-drawer.tsx          # Generic form drawer
│       ├── sonner.tsx
│       └── ...
│
└── features/                       # ONE folder per domain feature
    ├── auth/
    │   ├── api/
    │   │   └── authApi.ts          # RTK Query slice for auth
    │   ├── components/
    │   │   └── LoginForm.tsx
    │   ├── hooks/
    │   │   └── useAuth.ts          # Read auth state from Redux
    │   ├── schemas/
    │   │   └── auth.schema.ts      # Zod validation schema
    │   ├── slice/
    │   │   └── authSlice.ts        # Redux slice (login/logout reducers)
    │   ├── types/
    │   │   └── auth.types.ts       # LoginRequest, LoginResponse, AuthState
    │   └── index.ts                # Barrel exports
    │
    ├── catalog/
    │   ├── api/
    │   │   └── categoryApi.ts      # RTK Query slice (CRUD)
    │   ├── components/
    │   │   ├── CategoriesPage.tsx  # Orchestrator component
    │   │   ├── CategoriesTable.tsx # Uses useDeleteCategoryMutation directly
    │   │   ├── CategoriesFilters.tsx
    │   │   ├── CategoryDrawer.tsx  # View details drawer
    │   │   ├── CategoryFormDrawer.tsx # Create/edit form drawer
    │   │   └── CategoryRow.tsx
    │   ├── hooks/
    │   │   └── useCategories.ts    # useCategories, useCategoryFilters, usePagination
    │   ├── types/
    │   │   └── category.ts         # Category, CategoryPayload, CategoriesResponse, etc.
    │   └── index.ts
    │
    ├── products/
    │   ├── api/
    │   │   └── productApi.ts       # RTK Query slice (CRUD)
    │   ├── components/
    │   │   ├── ProductsPage.tsx
    │   │   ├── ProductsTable.tsx
    │   │   ├── ProductsFilters.tsx
    │   │   ├── ProductDrawer.tsx
    │   │   └── ProductFormDrawer.tsx
    │   ├── hooks/
    │   │   └── useProducts.ts      # useProducts, useProductFilters, usePagination
    │   ├── types/
    │   │   └── product.ts
    │   └── index.ts
    │
    ├── dashboard/
    │   ├── api/
    │   │   └── dashboardApi.ts     # RTK Query slice (GET only, mock fallback)
    │   ├── components/
    │   │   ├── DashboardCard.tsx
    │   │   └── DashboardGrid.tsx
    │   ├── types/
    │   │   └── dashboard.types.ts
    │   └── index.ts
    │
    └── notifications/
        ├── api/                    # (empty — not yet implemented)
        ├── hooks/                  # (empty)
        ├── types/                  # (empty)
        ├── components/
        │   └── NotificationsPage.tsx
        └── index.ts
```

### Responsibility of Each Folder

| Folder | Responsibility |
|---|---|
| `src/lib/` | Stateless utilities with no React dependency. Pure functions, string constants, endpoint URLs. |
| `src/store/` | The single Redux store. Registers all feature reducers and middleware. |
| `src/hooks/` | Hooks shared across multiple features (typed Redux hooks, viewport hooks). |
| `src/types/` | Global TypeScript interfaces reused by multiple features. |
| `src/routes/` | Routing configuration and auth guards. |
| `src/pages/` | Thin page components that wire a feature into a route. |
| `src/components/common/` | Layout shell: sidebar, header, content wrapper. |
| `src/components/ui/` | Design system primitives. shadcn/ui + custom components. |
| `features/<name>/api/` | RTK Query `createApi` slice. All endpoint definitions, `transformResponse`, tags. |
| `features/<name>/hooks/` | React hooks that consume the API slice and present a clean data interface to components. |
| `features/<name>/types/` | TypeScript interfaces for this feature's data shapes. |
| `features/<name>/slice/` | Standard Redux slices for client-side state (auth only currently). |
| `features/<name>/schemas/` | Zod validation schemas for forms in this feature. |
| `features/<name>/components/` | UI components that belong to this feature. |
| `features/<name>/index.ts` | Public barrel export — only items in here are usable outside the feature. |

---

## 3. Dependencies

### Production Dependencies

```json
{
  "@reduxjs/toolkit": "^2.8.2",
  "react-redux": "^9.2.0",
  "react-router-dom": "^7.6.0",
  "react-hook-form": "^7.56.4",
  "@hookform/resolvers": "^5.0.1",
  "zod": "^3.24.4",
  "sonner": "^2.0.7",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.6.0",
  "class-variance-authority": "^0.7.1",
  "lucide-react": "^1.14.0",
  "radix-ui": "^1.4.3",
  "@radix-ui/react-alert-dialog": "^1.1.15",
  "next-themes": "^0.4.6",
  "tailwindcss": "^4.1.7",
  "tw-animate-css": "^1.4.0",
  "@fontsource-variable/geist": "^5.2.8",
  "shadcn": "^4.7.0"
}
```

### Dev Dependencies

```json
{
  "@biomejs/biome": "^2.4.15",
  "@tailwindcss/vite": "^4.1.7",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/react": "^16.3.2",
  "@testing-library/user-event": "^14.6.1",
  "@vitest/coverage-v8": "^4.1.6",
  "husky": "^9.1.7",
  "jsdom": "^29.1.1",
  "lint-staged": "^16.4.0",
  "typescript": "~6.0.2",
  "vite": "^8.0.12",
  "vitest": "^4.1.6",
  "@vitejs/plugin-react": "^6.0.1"
}
```

### Package Explanations

**`@reduxjs/toolkit` + `react-redux`**
- Core state management. RTK Query (built into `@reduxjs/toolkit`) handles all API calls.
- Configured in `src/store/index.ts`.
- Auth UI state lives in `authSlice.ts`.

**`react-router-dom` v7**
- `BrowserRouter` wraps the whole app in `main.tsx`.
- `Routes` + `Route` + `Outlet` + `Navigate` used in `AppRouter.tsx` and `ProtectedRoute.tsx`.
- `useNavigate` used in login form for redirect after login.

**`react-hook-form` + `@hookform/resolvers`**
- Used for all forms (login, category create/edit).
- `zodResolver` connects RHF to Zod for validation.
- Simpler cases (CategoryFormDrawer) use controlled `useState` instead of RHF.

**`zod`**
- Validation schemas in `features/<name>/schemas/`.
- Used with `z.infer<typeof schema>` to derive TypeScript types from schemas.

**`sonner`**
- Toast notification library.
- Wrapped in `src/lib/toast.ts` to provide a stable, opinionated API.
- `<Toaster />` mounted once in `App.tsx`.

**`clsx` + `tailwind-merge`**
- Combined in `src/lib/utils.ts` as the `cn()` helper.
- Used everywhere: `cn("base-class", { "conditional-class": bool }, className)`.

**`class-variance-authority`**
- Used inside shadcn/ui button and badge variants.

**`lucide-react`**
- Icon library. Used in all UI components.

**`@biomejs/biome`**
- Replaces ESLint + Prettier. Linting + formatting in one tool.
- Configured in `biome.json`.
- Run via `npm run check` or `npm run check:write`.

**`husky` + `lint-staged`**
- Pre-commit hook runs `biome check --write` on staged `.ts`/`.tsx`/`.json` files.

**`vitest` + `@testing-library/react`**
- Unit testing. `vitest` configured inside `vite.config.ts`.
- `jsdom` environment simulates the browser.

---

## 4. Environment Configuration

### `.env.example`

```bash
# Copy this file to .env and fill in the values.
# Never commit your real .env file to git.
VITE_API_BASE_URL=https://your-api-url.com/

# Optional: default shop UUID
# VITE_DEFAULT_SHOP_ID=36e18b1a-09dc-429e-862a-0d0af6096167
```

### Variable Usage

| Variable | Used In | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | All `createApi` `baseQuery` configs | Base URL for all API calls in production |
| `import.meta.env.MODE` | `baseQuery` + `fetchUtils.ts` | Switches between dev (Vite proxy) and prod (full URL) |

### How Dev vs Prod URL Switching Works

```ts
// Pattern used in every createApi:
baseQuery: fetchBaseQuery({
  baseUrl: import.meta.env.MODE === "development"
    ? ""                              // "" = use relative URLs, proxied by Vite
    : import.meta.env.VITE_API_BASE_URL,  // production: full URL
})
```

In development: `baseUrl` is `""`, so a request to `/api/superadmin/catalog/get-categories/` becomes relative. Vite's dev server proxies it to `VITE_API_BASE_URL/api/superadmin/catalog/get-categories/` server-side — solving CORS completely.

In production: `baseUrl` is `https://your-api.com/`, requests go directly.

### Vite Proxy Configuration (`vite.config.ts`)

```ts
server: {
  host: true,
  allowedHosts: [".ngrok-free.app"],
  proxy: {
    "/api": {
      target: backendTarget,     // VITE_API_BASE_URL from .env
      changeOrigin: true,
      secure: false,
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    },
  },
},
```

All requests matching `/api/*` are proxied. The `ngrok-skip-browser-warning` header skips ngrok's browser interstitial in development.

---

## 5. API Client Setup

There is no single shared "API client" file. Each feature creates its own RTK Query API slice with `createApi`. The pattern is identical across all features:

### The Standard `createApi` Template

```ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import type { MyResponse, MyQueryParams } from "../types/myFeature";

export const myFeatureApi = createApi({
  reducerPath: "myFeatureApi",     // unique key in Redux store
  tagTypes: ["MyEntity"],          // for cache invalidation

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.MODE === "development"
      ? ""
      : import.meta.env.VITE_API_BASE_URL,

    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) {
        headers.set("Authorization", `Token ${token}`);  // Note: "Token" not "Bearer"
      }
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),

  endpoints: (builder) => ({
    // ... see sections below
  }),
});
```

### `prepareHeaders` Details

Every API slice attaches the same two headers to every outgoing request:

1. **`Authorization: Token <token>`** — reads the token from `localStorage.getItem("token")`. The backend uses Django REST Framework which expects the `Token` scheme (not `Bearer`).
2. **`ngrok-skip-browser-warning: true`** — bypasses the ngrok browser interstitial when using ngrok tunnels in development.

---

## 6. Endpoint Organization

All endpoint URLs are centralized in **one file**: `src/lib/apiEndpoints.ts`.

```ts
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/superadmin/admin/login/",
  },
  DASHBOARD: {
    HEADER: "/api/superadmin/dashboard/dashboard/",
  },
  CATALOG: {
    GET_CATEGORIES: "/api/superadmin/catalog/get-categories/",
    ADD_CATEGORY: "/api/superadmin/catalog/add-category/",
    UPDATE_CATEGORY: (id: string) => `/api/superadmin/catalog/update-category/${id}/`,
    DELETE_CATEGORY: (id: string) => `/api/superadmin/catalog/delete-category/${id}/`,
    GET_PRODUCTS: "/api/superadmin/catalog/get-products/",
    ADD_PRODUCT: "/api/superadmin/catalog/add-product/",
    UPDATE_PRODUCT: (id: string) => `/api/superadmin/catalog/update-product/${id}/`,
    DELETE_PRODUCT: (id: string) => `/api/superadmin/catalog/delete-product/${id}/`,
  },
} as const;
```

**Conventions:**
- All endpoints start with `/api/` (matches the Vite proxy rule).
- Static endpoints are strings. Dynamic endpoints (with IDs) are functions.
- `as const` makes the entire object readonly and gives literal types.
- Never hardcode a URL string inside a component or hook — always use `API_ENDPOINTS`.

All app navigation paths live in `src/lib/constants.ts`:

```ts
export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  NOTIFICATIONS: "/notifications",
  CATEGORIES: "/categories",
  PRODUCTS: "/products",
} as const;
```

---

## 7. API Request Flow

### Complete Flow Diagram

```
User Action (button click / page load)
  ↓
UI Component (CategoriesPage.tsx)
  ↓
Custom Hook (useCategories.ts)
  ↓
RTK Query hook (useGetCategoriesQuery)
  ↓
categoryApi endpoint definition
  ↓
fetchBaseQuery → prepareHeaders (attaches token)
  ↓
Vite proxy (dev) / direct request (prod)
  ↓
Backend API
  ↓
transformResponse (normalizes raw response)
  ↓
providesTags (registers cache entry)
  ↓
RTK Query cache → Redux store
  ↓
useGetCategoriesQuery returns { data, isLoading, isError }
  ↓
useCategories hook unwraps and reshapes for component
  ↓
Component re-renders with new data
```

### Concrete Example: Loading Categories

**Step 1 — Component calls custom hook**
```tsx
// CategoriesPage.tsx
const { categories, total, pages, isLoading, isError, error, refetch } = useCategories({
  page,
  limit,
  search: search || undefined,
});
```

**Step 2 — Custom hook calls RTK Query hook**
```ts
// hooks/useCategories.ts
export function useCategories(params) {
  const { data, isLoading, isFetching, isError, refetch } = useGetCategoriesQuery({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });

  const categories = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, pages: 0 };

  return { categories, total: pagination.total, ..., isLoading, isFetching, isError };
}
```

**Step 3 — RTK Query builds URL and fires request**
```ts
// api/categoryApi.ts
getCategories: builder.query<CategoriesResponse, CategoryQueryParams>({
  query: (params) => {
    const searchParams = new URLSearchParams();
    searchParams.append("page", (params.page || 1).toString());
    searchParams.append("page_size", (params.limit || 10).toString());
    if (params.search) searchParams.append("search", params.search);
    return {
      url: `${API_ENDPOINTS.CATALOG.GET_CATEGORIES}?${searchParams.toString()}`,
      method: "GET",
    };
  },
  // ...
})
```

**Step 4 — `transformResponse` normalizes the backend payload**
```ts
transformResponse: (rawResult: unknown, _meta, arg) => {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  if (!isRecord(rawResult)) {
    return { data: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } };
  }

  const raw = rawResult as Record<string, unknown>;
  const payload = isRecord(raw.results) ? raw.results : raw;
  const resultsArray = Array.isArray(payload.data) ? payload.data : [];
  const total = typeof raw.count === "number" ? raw.count : resultsArray.length;

  return {
    data: resultsArray,
    pagination: {
      total,
      page: arg?.page || 1,
      limit: arg?.limit || 10,
      pages: Math.max(1, Math.ceil(total / (arg?.limit || 10))),
    },
  };
},
```

### Mutation Flow (Create/Update/Delete)

**Mutation trigger → cache invalidation → automatic refetch**

```ts
// In CategoryFormDrawer.tsx
const [addCategory, { isLoading: isCreating }] = useAddCategoryMutation();

const handleSubmit = async (event) => {
  event.preventDefault();
  try {
    await addCategory(createPayload).unwrap();  // .unwrap() throws on error
    toast.success("Category created successfully");
    onSuccess();
    onClose();
  } catch (error) {
    toast.error("Failed to create category");
  }
};

// In categoryApi.ts — after addCategory runs, RTK Query automatically
// refetches all queries tagged with "Categories"
addCategory: builder.mutation({
  query: (payload) => ({
    url: API_ENDPOINTS.CATALOG.ADD_CATEGORY,
    method: "POST",
    body: payload,
  }),
  invalidatesTags: ["Categories"],  // ← triggers refetch of getCategories
}),
```

---

## 8. Authentication Flow

### Login Flow

```
User submits form
  ↓
react-hook-form validates with Zod schema
  ↓
loginUser(values).unwrap() called (RTK Query mutation)
  ↓
POST /api/superadmin/admin/login/
  ↓
transformResponse: normalizeLoginResponse(rawResult, request)
  ↓  (extracts token, handles multiple API response shapes)
LoginResponse { token, refreshToken?, user }
  ↓
dispatch(login(result))
  ↓
authSlice.login reducer:
  - sets state.isLoggedIn = true
  - stores token in state.token
  - writes token to localStorage.setItem("token", token)
  - writes user to localStorage.setItem("user", JSON.stringify(user))
  ↓
navigate(APP_ROUTES.HOME)
```

### Logout Flow

```
User clicks logout
  ↓
dispatch(logout())
  ↓
authSlice.logout reducer:
  - sets state.isLoggedIn = false
  - sets state.token = null
  - state.user = null
  - localStorage.removeItem("token")
  - localStorage.removeItem("user")
  ↓
ProtectedRoute detects isLoggedIn = false
  ↓
<Navigate to="/login" replace />
```

### Token Storage

| Item | Storage | Key | Format |
|---|---|---|---|
| Access token | `localStorage` | `"token"` | Raw string |
| User object | `localStorage` | `"user"` | `JSON.stringify(user)` |

### Hydration on App Start

`authSlice.ts` reads from `localStorage` as the initial Redux state:

```ts
const storedToken = localStorage.getItem("token");
const storedUser = localStorage.getItem("user");

const initialState: AuthState = {
  isLoggedIn: Boolean(storedToken),
  token: storedToken,
  user: parseStoredUser(),  // safe JSON.parse with try/catch
};
```

### Token Attached to Requests

Every API slice's `prepareHeaders` reads the token from `localStorage` and attaches it:

```ts
prepareHeaders: (headers) => {
  const token = localStorage.getItem("token");
  if (token) {
    headers.set("Authorization", `Token ${token}`);
  }
  return headers;
},
```

**Note:** There are no RTK Query request interceptors or response interceptors. Token expiration is not explicitly handled — the user stays logged in until they explicitly log out or the token fails server-side.

### `normalizeLoginResponse` — Flexible Token Extraction

The auth API handles multiple backend response shapes because different API versions may return the token under different key names:

```ts
const token = firstString(
  payload.token,
  payload.access,
  payload.accessToken,
  payload.access_token,
);

const rawUser = payload.user ?? payload.admin ?? null;
```

This makes the auth implementation resilient to backend API variations.

---

## 9. State Management

### Store Registration

```ts
// src/store/index.ts
export const store = configureStore({
  reducer: {
    auth: authReducer,                           // Client-side auth state
    [authApi.reducerPath]: authApi.reducer,      // RTK Query cache for auth
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [productApi.reducerPath]: productApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,       // Handles cache lifetimes, refetching, etc.
      dashboardApi.middleware,
      categoryApi.middleware,
      productApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### State Shape

```
Redux Store
├── auth                        ← authSlice (login/logout state)
│   ├── isLoggedIn: boolean
│   ├── token: string | null
│   └── user: { id, email, name } | null
│
├── authApi                     ← RTK Query cache (login mutation results)
├── dashboardApi                ← RTK Query cache (dashboard data)
├── categoryApi                 ← RTK Query cache (categories list + individual tags)
└── productApi                  ← RTK Query cache (products list + individual tags)
```

### Typed Redux Hooks (`src/hooks/useAppDispatch.ts`)

```ts
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";

// Always use these instead of plain useDispatch / useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);
```

---

## 10. Custom Hooks Pattern

Every feature has hooks that wrap RTK Query hooks. The component never calls `useGetCategoriesQuery` directly — it goes through `useCategories`.

### The Three-Hook Pattern per Feature

Each feature with a list view exports three hooks:

```ts
// 1. Data hook — wraps RTK Query, exposes clean interface
export function useCategories(params): UseCategoriesReturn { ... }

// 2. Filter state hook — manages search/filter UI state
export function useCategoryFilters(): UseCategoryFiltersReturn { ... }

// 3. Pagination hook — manages page/limit state
export function usePagination(initialPage, initialLimit): UsePaginationReturn { ... }
```

**Why custom hooks over direct RTK Query usage?**
- Components stay clean — they see `categories`, `isLoading`, `error`, not RTK Query internals.
- Consistent return interface regardless of which API is backing the data.
- Easy to change the data source without touching component code.

### `useCategories` Full Implementation

```ts
export function useCategories(params: { page: number; limit: number; search?: string }) {
  const { data, isLoading, isFetching, isError, refetch } = useGetCategoriesQuery({
    page: params.page,
    limit: params.limit,
    search: params.search,
  });

  const categories = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, pages: 0 };

  return {
    categories,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    pages: pagination.pages,
    isLoading,
    isFetching,
    isError,
    error: isError ? "Failed to load categories" : null,
    refetch: () => refetch(),
  };
}
```

### `useAuth` — Reading Auth State

```ts
// features/auth/hooks/useAuth.ts
export function useAuth() {
  const auth = useAppSelector((state) => state.auth);
  return {
    isLoggedIn: auth.isLoggedIn,
    token: auth.token,
    user: auth.user,
  };
}
```

---

## 11. Form Handling & Validation

### Pattern 1: React Hook Form + Zod (for complex forms)

Used for: Login form.

**Step 1 — Define Zod schema**
```ts
// features/auth/schemas/auth.schema.ts
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required").min(6, "Min 6 characters"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;
```

**Step 2 — Connect to form**
```ts
const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: "", password: "" },
});
```

**Step 3 — Submit handler**
```ts
const onSubmit = async (values: LoginFormValues) => {
  try {
    const result = await loginUser(values).unwrap();
    dispatch(login(result));
    navigate(APP_ROUTES.HOME);
  } catch {
    // apiError state is captured by RTK Query's isError flag
  }
};
```

### Pattern 2: Controlled `useState` form (for simpler forms)

Used for: CategoryFormDrawer, ProductFormDrawer.

```ts
type CategoryFormState = { name: string; description: string; image: string; is_active: boolean };

const [form, setForm] = useState<CategoryFormState>(() => getFormState(category));

const updateField = <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) => {
  setForm((current) => ({ ...current, [key]: value }));
};

// In JSX:
<Input value={form.name} onChange={(e) => updateField("name", e.target.value)} />
```

### Validation Strings Location

All validation messages live in `src/lib/messages.ts`:
```ts
export const APP_TEXT = {
  VALIDATION: {
    EMAIL_REQUIRED: "Email is required",
    EMAIL_INVALID: "Please enter a valid email address",
    PASSWORD_REQUIRED: "Password is required",
    PASSWORD_MIN_LENGTH: "Password must be at least 6 characters",
  },
  // ...
} as const;
```

---

## 12. Error Handling Strategy

### API Error Handling in Mutations

The standard pattern in all form/mutation components:

```ts
try {
  await someApiMutation(payload).unwrap();  // .unwrap() re-throws RTK errors as exceptions
  toast.success("Success message");
  onSuccess();
  onClose();
} catch (error) {
  console.error("Operation error:", error);
  toast.error("Failed to do the thing");
}
```

`.unwrap()` is critical — without it, RTK Query mutations don't throw on error, they return an error object in the result.

### API Error Handling in Queries

RTK Query queries surface `isError: boolean` and `error: unknown` in their return value. The custom hook normalizes this:

```ts
return {
  isError,
  error: isError ? "Failed to load categories" : null,
};
```

The component receives a simple `string | null` error message, not an RTK Query error object.

### Global Error Type (`src/types/index.ts`)

```ts
export interface ApiError {
  status: number;
  data: {
    message: string;
  };
}
```

Use this when you need to read the error message from a caught RTK error:
```ts
} catch (err) {
  const apiError = err as ApiError;
  toast.error(apiError.data?.message ?? "Unknown error");
}
```

### Dashboard Mock Fallback

The dashboard API has a unique pattern — it falls back to mock data on any API error:

```ts
async onQueryStarted(_, { dispatch, queryFulfilled }) {
  try {
    await queryFulfilled;
  } catch (_error) {
    dispatch(
      dashboardApi.util.updateQueryData("getDashboardHeader", undefined, () => MOCK_DASHBOARD_DATA),
    );
  }
},
```

This lets the dashboard UI work even when the API is unreachable.

### Form-Level Error Display

For login, `apiError` from RTK Query is displayed inline:
```tsx
{apiError && (
  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
    {APP_TEXT.AUTH.LOGIN_ERROR}
  </div>
)}
```

---

## 13. Toast Notification System

### Thin Wrapper (`src/lib/toast.ts`)

All toast calls go through this wrapper — never import from `sonner` directly in components:

```ts
import { toast as sonnerToast } from "sonner";

export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, { description, duration: 3000 }),

  error: (message: string, description?: string) =>
    sonnerToast.error(message, { description, duration: 4000 }),

  warning: (message: string, description?: string) =>
    sonnerToast.warning(message, { description, duration: 3000 }),

  info: (message: string, description?: string) =>
    sonnerToast.info(message, { description, duration: 3000 }),

  loading: (message: string, description?: string) =>
    sonnerToast.loading(message, { description }),

  promise: <T>(promise: Promise<T>, options: { loading, success, error }) =>
    sonnerToast.promise(promise, options),

  dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
};
```

### Mounting in App

```tsx
// App.tsx
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />       {/* Sonner toast container */}
    </>
  );
}
```

### Usage in Components

```ts
import { toast } from "@/lib/toast";

// Success
toast.success("Category created successfully");

// Error
toast.error("Failed to delete category");

// Warning
toast.warning("Please fill all required fields");

// Promise-based (shows loading → success/error automatically)
toast.promise(apiCall(), {
  loading: "Saving...",
  success: "Saved!",
  error: "Failed to save",
});
```

---

## 14. Routing & Route Protection

### Route Definitions (`src/routes/AppRouter.tsx`)

```tsx
export function AppRouter() {
  return (
    <Routes>
      {/* Protected routes — require auth */}
      <Route element={<ProtectedRoute />}>          {/* auth guard */}
        <Route element={<Layout />}>                {/* shared layout */}
          <Route path={APP_ROUTES.HOME} element={<DashboardPage />} />
          <Route path={APP_ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={APP_ROUTES.CATEGORIES} element={<CategoriesPage />} />
          <Route path={APP_ROUTES.PRODUCTS} element={<ProductsPage />} />
          {/* Add new protected pages here */}
        </Route>
      </Route>

      {/* Public routes — no auth required */}
      <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
    </Routes>
  );
}
```

### Protected Route (`src/routes/ProtectedRoute.tsx`)

```tsx
export function ProtectedRoute() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to={APP_ROUTES.LOGIN} replace />;
  }

  return <Outlet />;  // renders child routes if authenticated
}
```

### Adding a New Protected Page

1. Create `src/pages/NewPage.tsx`
2. Add route constant to `APP_ROUTES` in `src/lib/constants.ts`
3. Add `<Route path={APP_ROUTES.NEW_PAGE} element={<NewPage />} />` inside the `ProtectedRoute` block in `AppRouter.tsx`

---

## 15. Reusable Patterns

### Pattern: Cache Invalidation with Tags

```ts
// Provider — registers what a query owns
providesTags: (result) => {
  const tags = ["Categories"];
  result?.data?.forEach((item) => tags.push({ type: "Categories", id: item.id }));
  return tags;
},

// Invalidator — tells RTK which queries to refetch
invalidatesTags: ["Categories"]                    // invalidate all
invalidatesTags: [{ type: "Categories", id }]     // invalidate specific item
invalidatesTags: ["Categories", { type: "Categories", id }]  // both
```

### Pattern: Query Param Builder

```ts
query: (params) => {
  const searchParams = new URLSearchParams();
  searchParams.append("page", (params.page || 1).toString());
  searchParams.append("page_size", (params.limit || 10).toString());
  if (params.search) searchParams.append("search", params.search);

  const queryString = searchParams.toString();
  return {
    url: `${API_ENDPOINTS.CATALOG.GET_CATEGORIES}${queryString ? `?${queryString}` : ""}`,
    method: "GET",
  };
},
```

### Pattern: `transformResponse` with Safe Type Narrowing

```ts
transformResponse: (rawResult: unknown) => {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  if (!isRecord(rawResult)) return fallbackValue;

  const raw = rawResult as RawType;
  const payload = raw.data ?? raw;  // handles both nested and flat responses

  return {
    // map fields with fallbacks
    name: payload.name ?? "",
  };
},
```

### Pattern: Feature Barrel Export (`index.ts`)

```ts
// features/catalog/index.ts
export { categoryApi } from "./api/categoryApi";
export { CategoriesPage } from "./components/CategoriesPage";
export { useCategories, useCategoryFilters, usePagination } from "./hooks/useCategories";
export type { Category, CategoryPayload, CategoriesResponse } from "./types/category";
```

Consumers import like this — never from deep paths:
```ts
import { CategoriesPage } from "@/features/catalog";  // ✓
import { CategoriesPage } from "@/features/catalog/components/CategoriesPage";  // ✗
```

### Pattern: `cn()` Utility

```ts
import { cn } from "@/lib/utils";

// Merge Tailwind classes conditionally
<div className={cn("base-class", { "conditional": isActive }, className)} />
```

### Pattern: `useAppDispatch` / `useAppSelector`

```ts
// Always use typed versions
const dispatch = useAppDispatch();
const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn);

// Never use raw versions
const dispatch = useDispatch();  // ✗ — loses TypeScript inference
```

---

## 16. Code Examples

### Complete API Slice (CRUD)

```ts
// features/orders/api/orderApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import type { Order, OrdersResponse, OrderQueryParams } from "../types/order";

export const orderApi = createApi({
  reducerPath: "orderApi",
  tagTypes: ["Orders"],

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.MODE === "development" ? "" : import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("token");
      if (token) headers.set("Authorization", `Token ${token}`);
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),

  endpoints: (builder) => ({
    getOrders: builder.query<OrdersResponse, OrderQueryParams>({
      query: (params) => {
        const sp = new URLSearchParams();
        sp.append("page", (params.page || 1).toString());
        sp.append("page_size", (params.limit || 10).toString());
        if (params.search) sp.append("search", params.search);
        return { url: `${API_ENDPOINTS.ORDERS.LIST}?${sp.toString()}`, method: "GET" };
      },
      providesTags: (result) => {
        const tags: Array<"Orders" | { type: "Orders"; id: string }> = ["Orders"];
        result?.data?.forEach((o) => tags.push({ type: "Orders", id: o.id }));
        return tags;
      },
      transformResponse: (raw: unknown) => { /* normalize */ },
    }),

    addOrder: builder.mutation<Order, Partial<Order>>({
      query: (body) => ({ url: API_ENDPOINTS.ORDERS.CREATE, method: "POST", body }),
      invalidatesTags: ["Orders"],
    }),

    updateOrder: builder.mutation<Order, { id: string; payload: Partial<Order> }>({
      query: ({ id, payload }) => ({
        url: API_ENDPOINTS.ORDERS.UPDATE(id), method: "PATCH", body: payload,
      }),
      invalidatesTags: (_r, _e, { id }) => ["Orders", { type: "Orders", id }],
    }),

    deleteOrder: builder.mutation<void, string>({
      query: (id) => ({ url: API_ENDPOINTS.ORDERS.DELETE(id), method: "DELETE" }),
      invalidatesTags: ["Orders"],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useAddOrderMutation,
  useUpdateOrderMutation,
  useDeleteOrderMutation,
} = orderApi;
```

### Complete Custom Hook

```ts
// features/orders/hooks/useOrders.ts
import { useState } from "react";
import { useGetOrdersQuery } from "../api/orderApi";
import type { Order } from "../types/order";

export function useOrders(params: { page: number; limit: number; search?: string }) {
  const { data, isLoading, isFetching, isError, refetch } = useGetOrdersQuery(params);

  return {
    orders: data?.data || [],
    total: data?.pagination?.total || 0,
    page: data?.pagination?.page || 1,
    limit: data?.pagination?.limit || 10,
    pages: data?.pagination?.pages || 0,
    isLoading,
    isFetching,
    isError,
    error: isError ? "Failed to load orders" : null,
    refetch: () => refetch(),
  };
}

export function useOrderFilters() {
  const [search, setSearch] = useState("");
  return {
    search,
    setSearch,
    resetFilters: () => setSearch(""),
    hasActiveFilters: search !== "",
  };
}

export function usePagination(initialPage = 1, initialLimit = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  return {
    page,
    limit,
    goToPage: setPage,
    setPageSize: (size: number) => { setLimit(size); setPage(1); },
  };
}
```

### Register New API in Store

```ts
// src/store/index.ts — add new API slice
import { orderApi } from "@/features/orders/api/orderApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,  // ← add here
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      categoryApi.middleware,
      orderApi.middleware,  // ← add here
    ),
});
```

---

## 17. New Project Setup Guide

Follow these steps exactly to create a new project with the same architecture.

### Step 1 — Scaffold with Vite

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
```

### Step 2 — Install Dependencies

```bash
# Core
npm install @reduxjs/toolkit react-redux react-router-dom

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# UI
npm install sonner clsx tailwind-merge class-variance-authority lucide-react

# Tailwind v4
npm install tailwindcss @tailwindcss/vite

# Dev tools
npm install -D @biomejs/biome husky lint-staged vitest @vitest/coverage-v8 jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @types/node
```

### Step 3 — Create Folder Structure

```bash
mkdir -p src/{lib,store,hooks,types,routes,pages,components/{common,ui},features}
mkdir -p src/features/auth/{api,components,hooks,schemas,slice,types}
# Repeat for each feature: catalog, products, dashboard, etc.
mkdir -p src/features/catalog/{api,components,hooks,types}
```

### Step 4 — Configure Vite (`vite.config.ts`)

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
          headers: { "ngrok-skip-browser-warning": "true" },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
```

### Step 5 — Create Environment File

```bash
cp .env.example .env
```

`.env.example`:
```bash
VITE_API_BASE_URL=https://your-api-url.com/
```

### Step 6 — Create Core Library Files

**`src/lib/apiEndpoints.ts`**
```ts
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/your-prefix/auth/login/",
  },
  // Add your feature endpoints here
} as const;
```

**`src/lib/constants.ts`**
```ts
export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
} as const;
```

**`src/lib/messages.ts`**
```ts
export const APP_TEXT = {
  AUTH: {
    LOGIN_ERROR: "Login failed. Please check your credentials.",
    MISSING_TOKEN_ERROR: "Login response did not include an auth token.",
  },
  VALIDATION: {
    EMAIL_REQUIRED: "Email is required",
    EMAIL_INVALID: "Please enter a valid email address",
    PASSWORD_REQUIRED: "Password is required",
    PASSWORD_MIN_LENGTH: "Password must be at least 6 characters",
  },
} as const;
```

**`src/lib/utils.ts`**
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**`src/lib/toast.ts`** — copy exactly from this project.

### Step 7 — Set Up Redux Store

**`src/store/index.ts`**
```ts
import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "@/features/auth/api/authApi";
import authReducer from "@/features/auth/slice/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    // Add more API slices here as you build features
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**`src/hooks/useAppDispatch.ts`** — copy exactly from this project.

### Step 8 — Set Up Auth Feature

Copy these files from this project (adapt strings only):
1. `src/features/auth/types/auth.types.ts`
2. `src/features/auth/slice/authSlice.ts`
3. `src/features/auth/api/authApi.ts`
4. `src/features/auth/hooks/useAuth.ts`
5. `src/features/auth/schemas/auth.schema.ts`
6. `src/features/auth/index.ts`

### Step 9 — Set Up Routing

**`src/routes/ProtectedRoute.tsx`** — copy exactly.

**`src/routes/AppRouter.tsx`** — copy and adapt route paths.

### Step 10 — Set Up Entry Point

**`src/main.tsx`**
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "@/store";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
```

**`src/App.tsx`**
```tsx
import { Toaster } from "sonner";
import { AppRouter } from "@/routes/AppRouter";

function App() {
  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}

export default App;
```

### Step 11 — Add a New Feature (Checklist)

For every new feature (e.g., `orders`):

- [ ] Create `src/features/orders/types/order.ts` — TypeScript interfaces
- [ ] Add endpoints to `src/lib/apiEndpoints.ts`
- [ ] Create `src/features/orders/api/orderApi.ts` — RTK Query slice
- [ ] Register the API in `src/store/index.ts` (reducer + middleware)
- [ ] Create `src/features/orders/hooks/useOrders.ts` — `useOrders`, `useOrderFilters`, `usePagination`
- [ ] Create components under `src/features/orders/components/`
- [ ] Create `src/features/orders/index.ts` — barrel exports
- [ ] Add route to `APP_ROUTES` and `AppRouter.tsx`

### Step 12 — Configure Biome (Linter/Formatter)

```bash
npx @biomejs/biome init
```

Configure `biome.json` to match project standards. Set up husky pre-commit hook:

```bash
npx husky init
echo 'npx lint-staged' > .husky/pre-commit
```

Add to `package.json`:
```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,json}": ["biome check --write --no-errors-on-unmatched"]
}
```

---

## Best Practices Summary

1. **Always use `API_ENDPOINTS`** — never hardcode URL strings in components or hooks.
2. **Always use `APP_ROUTES`** — never hardcode path strings in `<Link>` or `navigate()`.
3. **Always use `APP_TEXT`** — never hardcode user-facing strings in components.
4. **Always use `toast` from `@/lib/toast`** — never import from `sonner` directly.
5. **Always use `useAppDispatch` and `useAppSelector`** — never the raw react-redux versions.
6. **Always call `.unwrap()`** on mutations in try/catch blocks.
7. **Always normalize** raw API responses in `transformResponse` — never in components.
8. **Provide and invalidate tags** on every list query and mutation respectively.
9. **One `createApi` per feature** — never put multiple domain APIs in a single slice.
10. **Register every API slice** in both `reducer` and `middleware` in the store.
11. **Feature barrel exports only** — consumers import from `@/features/featureName`, not deep paths.
12. **Keep `src/lib/` pure** — no React hooks, no business logic, no API calls.
13. **Use `as const`** on all constant objects to get literal types.
