# 📜 Project Rules — Anchor Mart Frontend

> These rules keep the codebase consistent, readable, and easy to work with for everyone on the team.
> Please read this before writing any code.

---

## 🏗️ Project Structure

The project follows a **feature-sliced architecture**. The canonical folder structure is:

```
src/
├── App.tsx                            # Root app component
├── main.tsx                           # Entry point
├── index.css                          # Global styles
├── vite-env.d.ts                      # Vite type declarations
│
├── assets/                            # Static assets (images, fonts, icons)
│
├── components/
│   ├── common/                        # Shared layout/structural components
│   │   ├── AppSidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   └── ...
│   ├── ui/                            # Reusable UI primitives (shadcn-style)
│   │   ├── button.tsx
│   │   ├── data-table.tsx
│   │   ├── pagination.tsx
│   │   ├── search-input.tsx
│   │   └── ...
│   └── examples/                      # Component usage examples
│
├── features/                          # Feature-sliced modules (see rules below)
│   ├── auth/
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── sailors/
│   └── ...
│
├── hooks/                             # Global/shared hooks
│
├── lib/                               # Utilities, constants, helpers
│   ├── constants.ts                   # APP_ROUTES, API_ROUTES
│   ├── fetchUtils.ts                  # RTK Query base API setup
│   ├── navigation.ts                  # Sidebar navigation config
│   ├── messages.ts                    # UI display strings
│   ├── toast.ts                       # Toast helper functions
│   └── utils.ts                       # cn() and general utilities
│
├── pages/                             # Thin route-level page wrappers (re-exports)
│
├── routes/                            # React Router config
│   ├── AppRouter.tsx
│   └── ProtectedRoute.tsx
│
├── store/                             # Redux store setup
│   └── index.ts
│
├── types/                             # Shared global types
│   └── index.ts
│
└── test/                              # Test setup & utilities
    └── setup.ts
```

### Feature Folder Rules

Every feature **MUST** follow this internal structure:

```
features/<feature-name>/
├── api/                               # RTK Query endpoint definitions
│   └── <feature>Api.ts
├── components/                        # ALL UI components for this feature
│   ├── <Feature>Page.tsx              # Main page component
│   ├── <Feature>Table.tsx             # Table/list component (if applicable)
│   ├── <Feature>Filters.tsx           # Filters component (if applicable)
│   ├── <Feature>Drawer.tsx            # Detail drawer (if applicable)
│   └── <Feature>FormDrawer.tsx        # Create/edit form drawer (if applicable)
├── hooks/                             # Feature-specific hooks
│   └── use<Feature>.ts
├── schemas/                           # Zod validation schemas
│   └── <feature>.schema.ts
├── slice/                             # Redux slice (if needed)
│   └── <feature>Slice.ts
├── types/                             # TypeScript type definitions
│   └── <feature>.types.ts
└── index.ts                           # Barrel exports (public API only)
```

### ⚠️ MANDATORY Rules for Features

1. **Page components live INSIDE their feature's `components/` folder.**
   - ✅ `features/auth/components/LoginPage.tsx`
   - ✅ `features/products/components/ProductsPage.tsx`
   - ❌ `pages/ProductsPage.tsx` with all logic inside it

2. **The `pages/` directory holds ONLY thin re-export wrappers** for routing:
   ```tsx
   // pages/ProductsPage.tsx — THIN WRAPPER ONLY
   export { ProductsPage } from "@/features/products";
   ```

3. **When creating a new feature, ALWAYS create the full folder structure:**
   ```
   features/<new-feature>/
   ├── api/
   ├── components/
   ├── hooks/
   ├── types/
   └── index.ts
   ```
   Even if some folders start empty, create them to maintain consistency.

4. **Every feature MUST have an `index.ts`** barrel file that re-exports only the public API:
   ```tsx
   // features/products/index.ts
   export { ProductsPage } from "./components/ProductsPage";
   export { useGetProductsQuery } from "./api/productApi";
   export type { Product } from "./types/product.types";
   ```

5. **Do NOT import from deep internal paths outside the feature.**
   - ✅ `import { ProductsPage } from "@/features/products"`
   - ❌ `import { ProductsPage } from "@/features/products/components/ProductsPage"`

6. **Keep feature folders self-contained.** A feature should own its API, components, hooks, types, and schemas. Cross-feature imports should go through the barrel `index.ts`.

---

## 🧠 State Management

- **RTK Query for all API/server data.** Do not use `fetch` or `axios` directly. Define
  endpoints in `src/features/<feature>/api/<feature>Api.ts` using `baseApi.injectEndpoints()`.
- **Single `baseApi` instance.** All feature APIs extend `src/lib/fetchUtils.ts` via
  `injectEndpoints()` — never create a new `createApi()` instance.
- **Redux slices for UI/global client state only.** Use `createSlice` for things like
  `isLoggedIn`, modal open/close, theme, etc. Do not store API response data in slices —
  that is RTK Query's job.

## 📝 Forms

- **Always use React Hook Form + Zod for forms.** Define the Zod schema in
  `src/features/<feature>/schemas/`. Derive the TypeScript type from the schema using
  `z.infer<typeof schema>`. Use `zodResolver` to connect the schema to RHF.

## 🌐 API & Routes

- **No hardcoded URLs or route strings.** All API paths live in `src/lib/constants.ts`
  under `API_ROUTES`. All app navigation paths live under `APP_ROUTES`.
- **Base URL comes from `.env`.** Use `import.meta.env.VITE_API_BASE_URL`. Never
  paste a URL directly into a component or API file.

## 🎨 Styling

- **Tailwind CSS classes only.** Do not write inline `style={{}}` props or random hex
  colors. Use Tailwind utility classes. For custom values, extend the theme.
- **No CSS-in-JS.** Avoid styled-components or emotion.
- **Consistent spacing across all pages.** The `Layout` component provides standard padding:
  - Main content area: `px-2 py-4`
  - Do NOT add extra padding/margin to page containers that would conflict with Layout's spacing.
  - All new pages and features must follow this standard spacing pattern.
  - Only add internal padding/gaps to section containers or specific UI elements, not to the root page wrapper.

## ⚛️ Components

- **Functional components with TypeScript only.** No class components.
- **Props must be typed.** Every component must have an explicit `interface Props` or
  `type Props` definition.
- **Reusable UI elements** (Button, Input, DataTable, etc.) live in `src/components/ui/`.
- **Shared layout/structural components** (AppSidebar, Header, Layout) live in `src/components/common/`.
- **Feature-specific components** live in `src/features/<feature>/components/`.
- **Use existing UI components first.** Prefer the shared components from `src/components/ui/`
  instead of creating raw HTML controls or one-off UI.

## 📦 Imports

- **Use absolute imports with `@/`** instead of relative `../../` paths.
  Example: `import { Button } from "@/components/ui/button"`.
- **Import features through their barrel `index.ts`**, not deep internal paths.

## 🧪 Testing

- Write at least a basic smoke test for each new component (does it render?).
- Test files live next to the component: `ComponentName.test.tsx`.

## 🔤 Language & i18n

- Default language is **English**.
- Avoid hardcoding display strings inside components. Move them to `src/lib/messages.ts`
  so the app is easy to internationalize (i18n) in the future.

## ✅ Code Quality

- Run `npm run check` (Biome) before committing. The Husky pre-commit hook does this
  automatically.
- Keep functions small and focused. If a function does more than one thing, split it.
- Add a short comment above any non-obvious logic.

## 📋 New Feature Checklist

When adding a new feature, follow this checklist:

1. [ ] Create `src/features/<name>/` with subdirs: `api/`, `components/`, `hooks/`, `types/`
2. [ ] Create `src/features/<name>/index.ts` barrel file
3. [ ] Create the main page component in `components/<Name>Page.tsx`
4. [ ] Create API endpoints in `api/<name>Api.ts` using `baseApi.injectEndpoints()`
5. [ ] Define types in `types/<name>.types.ts`
6. [ ] Add route to `src/routes/AppRouter.tsx`
7. [ ] Add navigation item to `src/lib/navigation.ts`
8. [ ] Add thin re-export wrapper in `src/pages/<Name>Page.tsx`
