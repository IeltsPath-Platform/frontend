---
date: 2026-09-15
session: tailwind-shadcn-setup
plan: 260915-tailwind-shadcn-setup
status: completed
---

# Journal: 2026-09-15 — Tailwind CSS and shadcn/ui setup

## Context

Extend the completed React/Vite scaffold with the current Tailwind CSS and shadcn/ui foundation, while retaining the existing strict TypeScript, aliases, and accessibility baseline. The requested scope was setup and documentation only, not a product UI redesign.

## What happened

- Added Tailwind CSS 4.3.3 through `@tailwindcss/vite` 4.3.3 and the CSS-first entry in `src/styles/globals.css`; no legacy Tailwind config was introduced.
- Initialized shadcn/ui 4.21.0 with the Radix Nova preset, neutral CSS variables, the existing `@/` alias, `components.json`, and the source `cn` helper. It remains source-owned: no component was installed under `src/components/ui`.
- The shadcn CLI could not initially resolve the referenced Vite TypeScript configuration on Windows. Adding the existing aliases to root `tsconfig.json` gave the CLI a direct alias map without changing the application's alias contract.
- Reviewed the generator output and removed packages it had added beyond the source-only setup (`class-variance-authority`, `radix-ui`, `lucide-react`, and the Geist font package). The legacy text-muted token was renamed to `--color-text-muted` so it does not collide with shadcn's `--color-muted` semantic utility.
- Rewrote the README as a direct dependency/version inventory from the resolved lockfile and explained the intentional deferrals.

## Decisions

| Decision | Rationale | Impact |
|---|---|---|
| Tailwind v4 via the Vite plugin | Matches the current CSS-first Tailwind integration | Keeps the build small and avoids a compatibility-only config file |
| Initialize shadcn without a component | shadcn components are copied into the application and should be added only when needed | No unused primitives or design assumptions enter the starter |
| Root TypeScript aliases for CLI compatibility | Windows CLI lookup reads the root config rather than Vite's referenced app config | `shadcn add` works while existing imports remain valid |
| Remove CLI-excess dependencies and preserve token meanings | The project does not yet use component primitives, icons, variants, or Geist | Dependency graph and current shell styling remain intentional |

## Validation

- `npm ci` succeeded and npm audited 445 packages with zero vulnerabilities.
- `npm run lint`, `npm run typecheck`, and `npm run build` all passed after the cleanup.
- The production build compiled the Tailwind CSS layer; `components.json`, source aliases, and the original focus-visible accessibility rule were checked as part of the completed plan.

## Next

- Add shadcn components selectively through `npx shadcn@4.21.0 add <component>` when a feature needs one.
- Keep the README table synchronized with deliberate package changes.
- Continue to defer routing, state/query, forms, tests, CI, and deployment until concrete requirements justify them.
