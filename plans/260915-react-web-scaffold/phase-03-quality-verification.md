---
phase: 3
title: Quality verification
status: completed
priority: P2
dependencies:
  - 1
  - 2
---

# Phase 3: Quality verification

## Overview

Validate that a fresh checkout is runnable and that the small toolchain has clear, documented maintenance commands. No test runner is added because the empty application shell contains no business behavior; tests begin with the first interactive feature.

## Requirements

- Document prerequisites, installation, scripts, source layout, and deferred package triggers in `README.md`.
- Run the narrow quality gates: clean install, lint, typecheck, production build, and manual development-server smoke test.
- Ensure repository status contains only intended scaffold and plan changes; never commit `node_modules`, local settings, or credentials.

## Architecture

The validation contract is intentionally tool-native:

```
npm ci → npm run lint → npm run typecheck → npm run build → npm run dev (manual smoke)
```

The lockfile makes the first four steps repeatable. The manual smoke test verifies that the browser entry point and Vite server work together without prematurely adding an end-to-end test dependency.

## Related Code Files

- Create: `README.md`.
- Verify: `package.json`, `package-lock.json`, Vite/TypeScript/ESLint configuration, and the `src/` application shell.
- Verify: `.gitignore` does not allow dependencies, secrets, or build output to enter version control.

## Implementation Steps

1. Write a concise README with Node 24 LTS prerequisite, `npm ci` bootstrap, each npm script, alias conventions, and the package families intentionally deferred.
2. Remove the existing dependency directory if one was created outside npm's lockfile workflow, then perform the clean reproducibility install through `npm ci`.
3. Run lint, typecheck, and production build. Fix real configuration or source errors; do not weaken rules or suppress failures.
4. Start the dev server and confirm the placeholder page renders at the displayed local address.
5. Inspect Git status and confirm only project files, plan files, and the lockfile are candidates for commit.

## Success Criteria

- [x] A new developer can bootstrap the app using README instructions alone.
- [x] `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build` exit successfully.
- [x] The dev server renders the root application shell with no console errors.
- [x] No test, router, UI-kit, query, or state dependency is present without an associated feature requirement.

## Risk Assessment

- A dependency update can make a new installation diverge. Mitigation: commit the lockfile and update versions deliberately.
- Omitting tests may leave later behavior unprotected. Mitigation: add Vitest and Testing Library in the same change as the first behavior that warrants tests; do not treat this empty scaffold as coverage.

## Security Considerations

- Review `.gitignore` before the first commit and use `.env.example` only if a non-secret public configuration contract is introduced later.
- Never place real environment values in README examples, source code, or the lockfile.
