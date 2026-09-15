---
title: React web project scaffold
description: >-
  Initialize an intentionally lean React + TypeScript web application foundation
  with a reproducible toolchain and quality gates.
status: completed
priority: P2
branch: main
tags:
  - frontend
  - infra
blockedBy: []
blocks: []
created: '2026-09-15T07:08:03.705Z'
createdBy: 'ck:plan'
source: skill
---

# React web project scaffold

## Overview

Create the first commit-ready React web foundation in the currently empty `frontend` repository. Scope is deliberately reduced: build tooling, a typed application shell, import aliases, linting, and reproducible verification only. It will not pre-commit to routing, a component library, data fetching, authentication, or global state before an actual product requirement exists.

## Confirmed Decisions

- Runtime: Node.js 24 LTS, tracked in `.nvmrc`; npm is the package manager.
- Framework: React 19.3 and React DOM 19.3, rendered as a client-side Vite app.
- Toolchain: Vite 8.3 with `@vitejs/plugin-react` 6 and TypeScript 6.0 in strict mode.
- Styling: native CSS only. Global tokens/reset live in `src/styles`; a component may use a colocated CSS module when it gains its own styling.
- Version policy: constrain direct dependencies to the agreed major/minor ranges, then commit `package-lock.json` to make every installation reproducible. Do not use floating `latest` ranges.

## Package Baseline

| Group | Packages | Why included |
|---|---|---|
| Runtime | `react@19.3.x`, `react-dom@19.3.x` | Required UI runtime and DOM renderer. |
| Build | `vite@8.3.x`, `@vitejs/plugin-react@6.x` | Fast dev server, production bundle, modern JSX transform. |
| Types | `typescript@6.0.x`, `@types/node@24.x`, `@types/react@19.3.x`, `@types/react-dom@19.3.x` | Strict static checking, Vite config typings, and React typings. |
| Lint | `eslint@9.x`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | Catch unsafe TypeScript and React hook/HMR issues before review. |

## Deliberately Deferred Packages

| Package family | Add only when |
|---|---|
| `react-router` | The product has two or more navigable views. |
| `@tanstack/react-query` | The first server-backed feature needs caching, mutations, or async state. |
| MUI or another component library | A real design system requires its component coverage. |
| State library (Zustand, Redux, etc.) | State must be shared across unrelated feature trees. |
| Vitest / Testing Library | The first user-visible behavior is ready for an automated assertion; the empty shell has no business behavior to test. |

## Scope Challenge

- Existing code: no source files, package manifest, or docs; only an empty Git repository exists.
- Minimum change set: Vite scaffold, strict TypeScript, ESLint, a small `src` topology, aliases, and documented commands.
- Deferred scope: routing, UI framework, API client, state, tests, CI, and deployment configuration.
- Selected mode: reduction / fast plan, accepted by the user.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Project foundation](./phase-01-project-foundation.md) | Completed |
| 2 | [Application skeleton](./phase-02-application-skeleton.md) | Completed |
| 3 | [Quality verification](./phase-03-quality-verification.md) | Completed |

## Dependencies

- No cross-plan dependencies.
- Node.js 24 LTS is the local prerequisite. Vite supports Node.js 20.19+ and 22.12+; Node 24 satisfies that floor and remains an LTS release. [Vite requirements](https://vite.dev/guide/) · [Node releases](https://nodejs.org/en/about/previous-releases)
- React 19.3 is the stable React line. [React versions](https://react.dev/versions)
- TypeScript 6.0 is selected because the current `typescript-eslint` peer range supports TypeScript `<6.1`; this preserves the planned TypeScript-aware ESLint checks.

## Definition of Done

- A clean clone can run `npm ci`, `npm run dev`, `npm run lint`, `npm run typecheck`, and `npm run build` successfully.
- The default page renders a small, accessible placeholder and no Vite demo assets remain.
- New feature code has clear homes without introducing unused framework dependencies.
