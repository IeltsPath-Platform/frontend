---
phase: 1
title: Tailwind and shadcn setup
status: completed
priority: P1
dependencies: []
---

# Phase 1: Tailwind and shadcn setup

## Overview

Add the Tailwind v4 Vite integration and initialize shadcn/ui without adding a product-level UI component.

## Requirements

- Install `tailwindcss@4.3.3` and `@tailwindcss/vite@4.3.3`.
- Register the Tailwind Vite plugin in `vite.config.ts`.
- Initialize shadcn/ui 4.21.0 with CSS variables and the existing `@/` source alias.
- Keep the CSS entry point at `src/styles/globals.css`; preserve the established focus-visible accessibility rule.
- Do not introduce a Tailwind v3 config, component code, a framework change, or unused component dependencies.

## Related Code Files

- Modify: `package.json`, `package-lock.json`, `vite.config.ts`, `src/styles/globals.css`.
- Create: `components.json` and shadcn CLI-generated source helpers only.

## Implementation Steps

1. Install the pinned Tailwind CSS and Vite plugin versions.
2. Add the official Vite plugin while preserving React plugin and aliases.
3. Run `shadcn@4.21.0 init` in non-interactive default mode, targeting the existing Vite project and `src` alias.
4. Review CLI-generated CSS and utility files; retain accessibility baseline and remove no current contract unless the generator replaces it with an equivalent shadcn token.
5. Inspect package changes to ensure only Tailwind, shadcn initialization helpers, and their required transitive dependencies were added.

## Success Criteria

- [x] Tailwind v4 compiles through the Vite build.
- [x] `components.json` correctly maps the existing `@/` alias and `src/styles/globals.css`.
- [x] shadcn initialization produces no product component or unused UI primitive.
- [x] Current React, TypeScript, aliases, and accessibility baseline remain functional.

## Risk Assessment

- shadcn initialization can replace global CSS. Mitigation: inspect its diff and explicitly retain the existing focus-visible treatment.
- A newer CLI may choose helper dependencies differently. Mitigation: derive the documentation inventory from the final lockfile instead of guessing.
