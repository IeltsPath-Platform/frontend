# QA Report — FE main flow ↔ Gateway :8080

- Date: 2026-10-02
- Scope: `frontend/` HTTP mode (`VITE_API_BASE_URL=http://localhost:8080`, `VITE_USE_MOCK_LEARNING=false`)
- Demo attempted: `dr.nam.tmh@clinic.com` / `Password@123`
- Tools: `npm run typecheck|lint|build`, `node --test`, `npx agent-browser`
- Code changes: **none**

## Verdict: **FAIL**

Blocked by **P0 infra**: port `8080` is **EnterpriseDB Apache (`httpd`)**, not IeltsPath API Gateway. Learning/auth APIs are unreachable. Steps 2–8 not executable.

---

## A — Technical verification

| Check | Result | Notes |
|-------|--------|-------|
| `npm run typecheck` | **PASS** | exit 0 |
| `npm run lint` | **PASS** | exit 0 |
| `npm run build` | **PASS*** | exit 0; Vite warn single JS chunk ~785 kB |
| `node --test tests/learning-path.test.mjs` | **FAIL** 17/18 | `unknown blocks render a placeholder` Expected 4 !== 3 |
| `node --test tests/pages-render.test.mjs` | **FAIL** 20/22 | expects `120 Points`; forgot-password `aria-haspopup="dialog"` |
| `npm test` script | **N/A** | not defined in `package.json` |

\*Build warning only — not treated as build failure.

---

## B — E2E checklist (HTTP thật)

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | Login → cookie/refresh + vào app | **FAIL** | UI status: `Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API.` · Network: `POST http://localhost:8080/auth/login` · PowerShell: **HTTP 404** `text/html` (EDB) · Browser `fetch`: `TypeError: Failed to fetch` · Screenshot: `08-status-after-login.png` |
| 2 | GET/hiện `/learn` topics | **BLOCKED** | `/learn` redirects → `/login` (AuthGuard OK). No Gateway → no topics. `06-learn-guest.png` |
| 3 | Topic IN_PROGRESS → lessons | **BLOCKED** | Needs step 1–2 |
| 4 | Nộp exercise + ẩn đáp án | **BLOCKED** | — |
| 5 | REVIEW_REQUIRED → review | **BLOCKED** | — |
| 6 | test-assignment → assessment → result | **BLOCKED** | — |
| 7 | F5 session / refresh cookie | **BLOCKED** | Never logged in; `POST /auth/refresh` also fired against :8080 and failed |
| 8 | Logout sạch | **BLOCKED** | — |
| — | Writing essay / Listening audio | **SKIPPED** | Out of scope until Reading path works |

Screenshots: `plans/reports/e2e-main-flow-261002/01-login.png` … `08-status-after-login.png`

### Port 8080 identity (root cause)

```
GET http://localhost:8080/ → 200 text/html
Body: EnterpriseDB "Server is up and running."
Process: httpd PID 5576
```

Other BE ports (`8081–8086`, `8761`, `8888`): **down**. Gateway stack not running.

---

## C — UX / resilience notes (observed)

| Check | Observation |
|-------|-------------|
| Loading / empty / error retry on learn | Not reached |
| Không trắng trang | Login form remains; status message shown — **OK** |
| AuthGuard | Unauthenticated `/learn` → `/login` — **OK** |
| Spam 401 / single refresh | N/A (never authenticated). Boot still attempts `POST /auth/refresh` against wrong host |
| Error copy | Network message surfaces correctly via `.auth-status` |

---

## Findings

| ID | Sev | Kind | Detail |
|----|-----|------|--------|
| E2E-P0-01 | **P0** | infra | `:8080` occupied by EDB Apache, not API Gateway → FE HTTP mode cannot login/learn |
| E2E-P1-01 | **P1** | test debt | `learning-path.test.mjs` unsupported-block count stale (3 vs 4) |
| E2E-P1-02 | **P1** | test debt | `pages-render.test.mjs` expects old `120 Points` / forgot-password dialog semantics |
| E2E-P2-01 | **P2** | perf | Build chunk >500 kB warning (known) |

---

## Unblock checklist (ops, not FE code)

1. Stop/disable EnterpriseDB httpd on **8080** (or move it).
2. Start BE MVP (`docker-compose.mvp.yml` or config-server → eureka → **api-gateway:8080** → services).
3. Confirm `http://localhost:8080/actuator/health` (or Swagger) is Spring Gateway — not EDB HTML.
4. Re-run this E2E with same FE env (`VITE_USE_MOCK_LEARNING=false`).

Optional while waiting for Docker: `VITE_USE_MOCK_LEARNING=true` for UI-only — **does not** validate BE main flow.

---

## Conclusion

**FAIL** — technical FE checks mostly green (typecheck/lint/build), but **main-flow E2E against Gateway cannot start** until port 8080 serves the real API Gateway.
