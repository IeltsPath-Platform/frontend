---
phase: 1
title: Project foundation
status: completed
priority: P1
dependencies: []
---

# Phase 1: Project foundation

## Overview

Generate a reproducible React + TypeScript Vite project from the empty repository, then pin the agreed toolchain contract. This phase owns dependency selection and configuration only; it must not add product features.

## Requirements

- Use Node.js 24 LTS and npm. Add `.nvmrc` with major `24` and `package.json` engine metadata that rejects unsupported Node majors.
- Create the project using Vite's React + TypeScript template, in the existing repository root.
- Retain only these dependency families: React, Vite/plugin, TypeScript/types, and ESLint/React lint plugins listed in the overview plan.
- Commit npm's generated lockfile. Package manifest ranges must stay inside the specified version bands.
- Provide scripts: `dev`, `build`, `preview`, `lint`, and `typecheck`.

## Architecture

`npm` resolves the lockfile under the Node 24 runtime. Vite handles development and production bundling; `@vitejs/plugin-react` provides the modern React transform. TypeScript's project configuration type-checks source separately from Vite's build, and ESLint runs as an independent static-analysis gate.

No plugin that adds routing, data fetching, browser persistence, state management, CSS processing, or test execution belongs in this phase.

## Related Code Files

- Create: `package.json`, `package-lock.json`, `.nvmrc`, `.gitignore`, `index.html`.
- Create: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`.
- Create: `src/vite-env.d.ts` and Vite template entry files required by the selected generator.

## Implementation Steps

1. Verify that Node 24 and npm are available; record the Node major in `.nvmrc` and the supported range in `package.json`.
2. Generate the Vite React TypeScript template without overwriting existing user files.
3. Align `package.json` dependency ranges to the agreed package baseline and add the `typecheck` script using TypeScript project build mode.
4. Configure ESLint flat config for TypeScript, React Hooks, and React Refresh; retain strict TypeScript compiler settings.
5. Install once with npm and commit the resulting `package-lock.json`; do not edit transitive dependencies manually.

## Success Criteria

- [x] `package.json` contains only the approved baseline package families.
- [x] `package-lock.json` resolves a reproducible dependency graph.
- [x] Node, typecheck, lint, Vite development, and production scripts are declared.
- [x] Project configuration has no requirement for a global package manager beyond npm.

## Risk Assessment

- Vite or TypeScript may revise peer support after this plan. Mitigation: install from the explicit ranges once, keep the lockfile, and resolve any peer warning before continuing.
- A developer may use an older Node version. Mitigation: `.nvmrc`, `engines`, and README prerequisites make the failure immediate and understandable.

## Security Considerations

- Do not create `.env` files, API keys, or client secrets in the scaffold.
- Keep `node_modules`, local environment files, and generated coverage artifacts ignored.
