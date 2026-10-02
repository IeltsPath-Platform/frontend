---
title: FE Auth + Learning Reading BE wire
description: >-
  Ghép FE React+Vite với BE Gateway: hybrid Auth (cookie refresh + Bearer
  memory) rồi Learning Reading /learn theo lesson-learning-v1.
status: completed
priority: P1
branch: ''
tags:
  - frontend
  - auth
  - learning
  - integration
blockedBy: []
blocks: []
created: '2026-10-02T13:48:47.221Z'
createdBy: 'ck:plan'
source: skill
---

# FE Auth + Learning Reading BE wire

## Overview

Thay demo `authSession` + mock Learning bằng HTTP thật qua Gateway `:8080`. Auth hybrid theo BE hiện tại: `credentials: 'include'` (HttpOnly refresh cookie) + `Authorization: Bearer` từ **access token memory-only**; refresh 1 lần khi 401. Learning: `httpLearningApi` + flag mock, map DTO theo `backend/docs/contracts/lesson-learning-v1.md`. Không forgot/reset/OAuth/Writing UI mới; practice-tests mock chỉ thêm guard auth.

## Decisions (pinned)

| # | Choice |
|---|--------|
| Auth | **1A Hybrid** — Bearer bắt buộc (Gateway); cookie cho refresh/logout |
| Access token | **Memory-only** (mất khi F5 → `POST /auth/refresh` với cookie) |
| Pending reviews | Chỉ từ `403 REVIEW_REQUIRED.reviews[]` — không gọi `/reviews/pending` |
| Env docs | `.env.example` + README; không commit secret |
| Tooling | `npm install` trước verify |

## Expected output

- `src/lib/httpClient.ts` + token memory + auth API
- Route guards: protected → `/login`; guest-only `/login|/register` → `/learn` hoặc `/overview`
- `httpLearningApi` + DTO adapters; `VITE_USE_MOCK_LEARNING`
- Checklist tay: register → login → me → topics → lesson → review (nếu có) → test → logout

## Acceptance criteria

1. Login/register gọi BE; session hydrate qua `GET /api/users/me`.
2. 401 → single-flight refresh (cookie-first) → retry 1 lần; fail → clear session → `/login`.
3. `/learn`, `/overview`, … yêu cầu login; đã login không vào lại `/login|/register`.
4. Learning HTTP dùng cùng httpClient; mock khi `VITE_USE_MOCK_LEARNING=true`.
5. DTO map đúng: `topicId`, `blockPassed`, `questionVersionId`, assessment `mode`/`channel`.
6. `npm run typecheck && npm run lint && npm run build` pass.

## Out of scope

- Forgot/reset password, email verify, OAuth
- Gateway cookie→Bearer converter (BE change)
- Writing/Listening/hint UI mới (trừ block BE đã trả + renderer hiện có)
- Practice-tests mock content (chỉ auth guard)
- Points wallet UI (`/api/access/me/points`) — optional later

## Architecture (short)

```
AuthForm → authApi (login/register/logout/me)
              ↓
         httpClient (credentials:include, Bearer memory, 401 refresh once)
              ↓
         Gateway :8080 → /auth/**, /api/users/**, /api/learning/**, /api/assessments/**
```

Adapter layer: BE DTO ↔ FE `learningPath` types (giữ UI types ổn định khi có thể).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Env and httpClient](./phase-01-env-and-httpclient.md) | Completed |
| 2 | [Phase A Auth](./phase-02-phase-a-auth.md) | Completed |
| 3 | [Phase B Learning HTTP](./phase-03-phase-b-learning-http.md) | Completed |
| 4 | [Verify typecheck lint build](./phase-04-verify-typecheck-lint-build.md) | Completed |

## Dependencies

- BE Gateway + user/learning/assessment chạy local (`VITE_API_BASE_URL=http://localhost:8080`)
- Contract: `backend/docs/contracts/lesson-learning-v1.md`, `backend/docs/fe-main-flow-guide.md`
- Tham chiếu (không copy omit): `mobile/src/lib/api-client.ts`
