---
phase: 2
title: Application skeleton
status: completed
priority: P2
dependencies:
  - 1
---

# Phase 2: Application skeleton

## Overview

Replace the Vite demo with a small, accessible application shell and a future-proof but dependency-free source layout. The result is a starting surface, not a dashboard or product design.

## Requirements

- Render the app from `src/main.tsx` into an `App` shell.
- Remove Vite logos, counter/demo code, and unused static assets.
- Provide a minimal semantic placeholder with an H1 and a short description so the app has a meaningful smoke target.
- Use CSS without a framework: global reset/design tokens in `src/styles`, component-local CSS only when a component needs it.
- Define and verify aliases: `@/` → `src/`, `~components` → `src/components`, `~features` → `src/features`, `~types` → `src/types`.

## Architecture

```
src/
  app/          # App composition and application-level providers when needed
  components/   # Reusable, presentation-focused UI
  features/     # Domain modules; created only when a feature exists
  lib/          # Framework-agnostic shared utilities
  styles/       # Global CSS reset and design tokens
  types/        # Cross-feature TypeScript types
  main.tsx      # Browser entry point
```

`App` contains only the root landmark and placeholder content. Future dependencies are introduced at the edge where they become necessary: a router wraps `App` only once multiple routes exist, and a query provider appears only alongside the first API-backed feature.

## Related Code Files

- Modify: `src/main.tsx` and Vite-generated `src/App.tsx` / styles.
- Create: `src/app/`, `src/components/`, `src/features/`, `src/lib/`, `src/styles/`, `src/types/` as required to establish the documented layout.
- Create: alias configuration in `vite.config.ts` and the app TypeScript configuration.
- Delete: Vite demo assets and any now-unused demo CSS.

## Implementation Steps

1. Move or replace the generated root component with the application shell, preserving a direct and accessible render path.
2. Add minimal global CSS for browser-consistent sizing, typography inheritance, and neutral color tokens; avoid a design system or visual identity not supplied by the user.
3. Establish the documented source folders without filler components or placeholder hooks.
4. Configure aliases in both Vite and TypeScript so editor resolution and build resolution agree.
5. Confirm a representative alias import compiles, then remove any temporary verification-only code if it is not part of the shell.

## Success Criteria

- [x] The browser shows an accessible React application shell with no Vite demo branding.
- [x] Alias resolution succeeds in the editor, typecheck, dev server, and production build.
- [x] New application code has clear locations with no unused router, UI, query, or state package.

## Risk Assessment

- Misaligned Vite and TypeScript aliases fail only during a build. Mitigation: define both from the same mapping and run the full verification phase.
- Empty folders are not tracked by Git. Mitigation: create them only when they contain a real file, or use a documented `.gitkeep` only where the directory itself is intentional.

## Security Considerations

- Do not render user-supplied HTML or add browser storage in the starter shell.
- Keep all runtime configuration behind Vite's public `VITE_` convention when an actual configuration need arises; never expose secret values to the client.
