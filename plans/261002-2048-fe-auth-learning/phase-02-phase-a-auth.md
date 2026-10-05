---
phase: 2
title: Phase A Auth
status: completed
priority: P1
effort: M
dependencies:
  - 1
---

# Phase 2: Phase A Auth

## Overview

Thay demo session bằng auth API thật; guard routes; giữ AuthPage/AuthForm UI; ẩn/disable forgot-password.

## Requirements

- Functional: register → login → me; logout; guest/auth redirects.
- Non-negotiable: **không** forgot/reset/email/OAuth; me = **`GET /api/users/me`** only.
- Access token memory-only; refresh cookie.

## Architecture

```
boot → refresh (cookie) → GET /api/users/me → set session
login → setAccessToken(body.accessToken) → me → navigate /learn|/overview
logout → POST /auth/logout (cookie) → clear memory + session → /login
```

Protected: `/learn/**`, `/overview`, (và các route nav yêu cầu login hiện có).  
Guest-only: `/login`, `/register` → redirect nếu đã login.

## Related Code Files

- Create: `src/features/auth/api/authApi.ts`, types
- Modify: `src/features/auth/authSession.ts` (real session + signOut)
- Modify: `AuthPage.tsx`, `AuthForm.tsx` (wire API; disable forgot link)
- Modify: `App.tsx` / layout — `RequireAuth`, `GuestOnly`
- Modify: `SiteNavbar.tsx`, `LearnLayout.tsx` (bỏ fake MOCK_LEARNER login)
- Modify: `DemoControls` nếu lộ demo-only (ẩn khi không mock)

## Implementation Steps

1. `authApi`: login `{email|username,password}`, register `{email,password,fullName}`, logout, me.
2. Session store: `isLoggedIn`, `userName`/`email`/`roles` từ me; bỏ `signInForDemo` hoặc giữ stub unused.
3. AuthForm submit → API; lỗi hiện message; success navigate.
4. Bootstrapping: App wrapper hydrate session trước render protected.
5. Guards: unauth → `/login?redirect=...`; auth on login/register → `/learn` (hoặc `/overview` nếu prefer — default **`/learn`** sau login).
6. Ẩn/disable forgot-password link (phase sau).
7. Session expired listener → clear + navigate login.

## Success Criteria

- [x] Register 201 → auto login hoặc prompt login rồi vào app
- [x] Login set Bearer memory + cookie; me OK
- [x] Guard: /learn cần login; /login khi đã login → /learn
- [x] Logout clear session
- [x] Forgot link disabled/hidden

## Risk Assessment

- Register không trả token → luôn login ngay sau register.
- LoginRequest: gửi `email` (FE form hiện dùng email).
