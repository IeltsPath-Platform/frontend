---
title: Tailwind CSS and shadcn/ui setup
description: >-
  Add the current Tailwind CSS and shadcn/ui foundation to the existing Vite
  React application, then document exact installed versions.
status: completed
priority: P2
branch: main
tags:
  - frontend
  - infra
blockedBy: []
blocks: []
created: '2026-09-15T08:06:01.057Z'
createdBy: 'ck:plan'
source: skill
---

# Tailwind CSS and shadcn/ui setup

## Overview

Install Tailwind CSS 4.3.3 with its official Vite plugin, initialize shadcn/ui 4.21.0 against the existing TypeScript aliases, and make the README an exact technology/version inventory from the resolved npm lockfile. No product component is added: shadcn is initialized so later components can be added selectively.

## Confirmed Decisions

- Use Tailwind CSS v4's CSS-first setup and `@tailwindcss/vite`; do not add a legacy `tailwind.config` file.
- Use `shadcn@4.21.0` initialization defaults compatible with Vite, `src/`, CSS variables, and the existing `@/` alias.
- Preserve React 19.3, Vite 8.3, Node 24, TypeScript 6.0, and existing lint/typecheck scripts.
- Do not add a shadcn component, router, state/query library, dark-mode control, or a new visual redesign in this change.

## Expected Dependency Changes

| Group | Packages |
|---|---|
| Build | `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3` |
| shadcn authoring | `shadcn@4.21.0`, `tw-animate-css@1.4.0` as development dependencies. |
| Source helper | `cn@0.3.0`, re-exported from `src/lib/utils.ts`. |

The final README lists the exact resolved versions from `package-lock.json` and separates application runtime from development tooling.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Tailwind and shadcn setup](./phase-01-tailwind-and-shadcn-setup.md) | Completed |
| 2 | [Verification and documentation](./phase-02-verification-and-documentation.md) | Completed |

## Dependencies

- No cross-plan dependency. The completed `260915-react-web-scaffold` plan provides the Vite, React, TypeScript, CSS entry point, and aliases this plan extends.
- Latest versions were checked from the npm registry on 2026-09-15: Tailwind CSS 4.3.3, `@tailwindcss/vite` 4.3.3, shadcn CLI 4.21.0.
