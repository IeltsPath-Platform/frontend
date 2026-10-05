---
phase: 1
title: Env and httpClient
status: completed
priority: P1
effort: S
dependencies: []
---

# Phase 1: Env and httpClient

## Overview

Thiết lập biến môi trường, tài liệu, và HTTP client dùng chung (credentials + Bearer memory + single-flight refresh).

## Requirements

- Functional: mọi request authenticated gửi Bearer; cookie đi kèm; 401 → refresh 1 lần.
- Non-functional: không log token; timeout hợp lý; type-safe errors.

## Architecture

- Module-scoped `accessToken: string | null` (memory).
- `fetch(baseURL + path, { credentials: 'include', headers: { Authorization } })`.
- Concurrent 401 share one `refreshInFlight` Promise; retry original once; else `onSessionExpired`.

## Related Code Files

- Create: `src/lib/env.ts`, `src/lib/httpClient.ts`, `src/lib/tokenMemory.ts` (hoặc gộp)
- Create: `.env.example`
- Modify: `README.md`, `AGENTS.md` (nếu cần ghi env)
- Run: `npm install` trong `frontend/`

## Implementation Steps

1. `npm install` để có `vite` trên PATH npm scripts.
2. `.env.example`:
   - `VITE_API_BASE_URL=http://localhost:8080`
   - `VITE_USE_MOCK_LEARNING=false`
3. `env.ts`: đọc base URL; default mock learning = true nếu thiếu base URL, else false (hoặc theo flag explicit).
4. `httpClient.ts` theo mobile nhưng **`credentials: 'include'`**; refresh `POST /auth/refresh` body `{}` (cookie-first); parse learning `{detail,code}` và gateway `{message}`.
5. Export `setAccessToken` / `clearAccessToken` / `onSessionExpired`.
6. README: BE prerequisites (gateway, DBs), không commit `.env`.

## Success Criteria

- [x] `.env.example` có `VITE_API_BASE_URL` + `VITE_USE_MOCK_LEARNING`
- [x] httpClient gửi credentials + Bearer; refresh single-flight
- [x] `npm run dev` chạy được (vite recognized)
- [x] README mô tả env + BE stack

## Risk Assessment

- Cross-origin cookie: localhost:5173 → :8080 same-site với SameSite=Lax — OK với CORS `allowCredentials`.
- F5 mất access → boot gọi refresh rồi me (phase 2).
