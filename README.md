# React web scaffold

React application foundation with Tailwind CSS v4 and shadcn/ui ready for feature work. Exact versions below come from the current `package-lock.json`.

## Prerequisites

- Node.js 24.21.0 (recorded in `.nvmrc`)
- npm 11.19.0

## Getting started

```bash
npm ci
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and create the production bundle. |
| `npm run typecheck` | Run strict TypeScript checks without bundling. |
| `npm run lint` | Run ESLint for TypeScript and React code. |
| `npm run preview` | Preview the production bundle locally. |

## Source layout

```text
src/
  app/          # Application composition
  components/   # Reusable UI; shadcn components are added under ui/
  features/     # Domain feature modules
  lib/          # Shared utilities, including the shadcn cn helper
  styles/       # Global CSS, Tailwind imports, and shadcn theme tokens
  types/        # Cross-feature types
```

Import aliases are available for `@/`, `~components/`, `~features/`, and `~types/`.

## UI foundation

Tailwind CSS v4 is integrated through `@tailwindcss/vite`; its CSS entry point is `src/styles/globals.css`. shadcn/ui uses the Radix Nova preset, neutral CSS variables, the existing `@/` alias, and selects Lucide for generated components. `lucide-react` is available for future icons, but no source-owned shadcn component has been installed yet. Add one only when a feature needs it:

```bash
npx shadcn@4.21.0 add button
```

## Technology inventory

### Application runtime dependencies

| Technology | Version | Purpose |
|---|---:|---|
| React | 19.3.0 | UI runtime. |
| React DOM | 19.3.0 | Browser renderer. |
| `cn` | 0.3.0 | Class composition utility re-exported by `src/lib/utils.ts`. |
| `lucide-react` | 1.46.0 | Icon components for the application and future shadcn components. |
| `react-hook-form` | 7.88.0 | Performant, type-friendly form state and validation integration. |
| `react-router-dom` | 7.18.3 | Client-side routing primitives for navigable views. |
| `zod` | 4.6.5 | TypeScript-first schema validation. |
| `zustand` | 5.0.15 | Lightweight shared client-state management. |

### Development and authoring

| Technology | Version | Purpose |
|---|---:|---|
| Node.js | 24.21.0 | Project runtime, recorded in `.nvmrc`. |
| npm | 11.19.0 | Package manager and lockfile producer. |
| Vite | 8.3.0 | Development server and production build. |
| `@vitejs/plugin-react` | 6.1.1 | React transform for Vite. |
| TypeScript | 6.0.3 | Strict static type checking. |
| `@types/node` | 24.13.4 | Vite configuration typings. |
| `@types/react` | 19.3.0 | React TypeScript declarations. |
| `@types/react-dom` | 19.3.0 | React DOM TypeScript declarations. |
| Tailwind CSS | 4.3.3 | Utility-first styling engine. |
| `@tailwindcss/vite` | 4.3.3 | Tailwind v4 Vite integration. |
| shadcn/ui | 4.21.0 | CLI and CSS layer used to author source-owned UI components. |
| `tw-animate-css` | 1.4.0 | Tailwind-compatible animation utilities. |

### Code quality

| Technology | Version | Purpose |
|---|---:|---|
| ESLint | 9.39.5 | JavaScript and TypeScript linting. |
| `@eslint/js` | 9.39.5 | ESLint base recommended rules. |
| `typescript-eslint` | 8.70.0 | TypeScript-aware ESLint rules. |
| `eslint-plugin-react-hooks` | 7.1.1 | React Hook correctness rules. |
| `eslint-plugin-react-refresh` | 0.4.26 | Vite Fast Refresh safety rules. |
| `globals` | 16.5.0 | Browser globals for ESLint. |

## Dependencies intentionally deferred

Server-state/query libraries, a test framework, CI, and deployment configuration are added only when a feature justifies them. The installed routing, form, validation, icon, and state libraries are available for the first feature, but are not configured or adopted in source yet.
