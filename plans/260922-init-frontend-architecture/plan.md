---
title: Initial frontend architecture and mock learning workspace
status: completed
priority: P1
branch: feat/init-frontend-architecture
---

# Initial frontend architecture and mock learning workspace

## Scope

Deliver a mock-first React learning workspace: cookie-safe Axios client, auth session state, shared layouts, exam hub/testing workspace, dashboard and AI Writing review.

## Acceptance criteria

- The application renders independently with mock data and does not put tokens in browser storage.
- Protected routing, session discovery, retry-after-refresh flow, and concurrent refresh queue are represented in the HTTP/auth layer.
- Exam, dashboard and AI-review pages are keyboard-operable, responsive and use shadcn primitives plus Lucide icons.
- Lint, typecheck and production build pass.
