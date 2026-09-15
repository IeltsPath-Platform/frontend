---
title: Runtime dependency foundation
description: Add the requested client-side libraries and document their exact resolved versions.
status: proposed
priority: P2
branch: main
tags:
  - frontend
  - dependencies
created: '2026-09-15T09:00:00.000Z'
createdBy: ck:cook
---

# Runtime dependency foundation

## Scope

Install `react-router-dom`, `react-hook-form`, `zod`, `zustand`, and `lucide-react` as runtime dependencies. Update the README inventory from the resolved npm lockfile. No application code, routing, state store, form, or icon component is introduced.

## Acceptance criteria

- All five packages are direct entries in `dependencies` and are resolved in `package-lock.json`.
- README lists the exact resolved version and intended purpose of every new dependency.
- README no longer describes routing, global state, or form libraries as deferred.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass.

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | [Install and document dependencies](./phase-01-install-and-document.md) | Proposed |
| 2 | [Verify the dependency update](./phase-02-verify-dependency-update.md) | Proposed |

## Constraints

- Use npm and retain the existing Node 24 / npm 11 toolchain.
- Record lockfile-resolved versions, not an assumed registry latest version.
- Limit implementation changes to `package.json`, `package-lock.json`, and `README.md`.
