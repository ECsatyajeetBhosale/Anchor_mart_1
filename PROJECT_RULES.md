# 📜 Project Rules — Anchor Mart Frontend

> These rules keep the codebase consistent, readable, and easy to work with for everyone on the team.
> Please read this before writing any code.

---

## 🏗️ Structure

- **Feature-based folder structure.** All features live in `src/features/<feature-name>/`.
  Each feature owns its own API, components, hooks, slice, types, and schemas.
- **Only export what's needed.** Every feature must have an `index.ts` that re-exports only
  the public API of that feature. Do not import from deep internal paths outside the feature.

## 🧠 State Management

- **RTK Query for all API/server data.** Do not use `fetch` or `axios` directly. Define
  endpoints in `src/features/<feature>/api/<feature>Api.ts` using `createApi`.
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
- **Reusable UI elements** (Button, Input, etc.) live in `src/components/ui/`.
- **Shared layout/structural components** live in `src/components/common/`.
- **Use existing shadcn UI components first.** When building new features or components,
  prefer the shared shadcn-style components from `src/components/ui/` instead of creating
  raw HTML controls or one-off UI. For example, use the existing `Button`, `Input`,
  `Sheet`, `Table`, `DataTable`, `Pagination`, and `SearchInput` components where they fit.
- **Reuse common table, search, and navigation components.** If a feature needs a table,
  use the shared table/data-table components. If it needs search or pagination, use
  `SearchInput` and `Pagination`/`DataTable` rather than rebuilding them. Navigation links
  should use the existing route constants and shared navigation/sidebar patterns.

## 📦 Imports

- **Use absolute imports with `@/`** instead of relative `../../` paths.
  Example: `import { Button } from "@/components/ui/Button"`.

## 🧪 Testing

- Write at least a basic smoke test for each new component (does it render?).
- Test files live next to the component: `ComponentName.test.tsx`.

## 🔤 Language & i18n

- Default language is **English**.
- Avoid hardcoding display strings inside components. Move them to a constants file or a
  translation file so the app is easy to internationalize (i18n) in the future.

## ✅ Code Quality

- Run `npm run check` (Biome) before committing. The Husky pre-commit hook does this
  automatically.
- Keep functions small and focused. If a function does more than one thing, split it.
- Add a short comment above any non-obvious logic.
