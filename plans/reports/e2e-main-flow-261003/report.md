# QA Report — FE main flow ↔ Gateway :8080

- Date: 2026-10-03
- Scope: `frontend/` HTTP mode (`VITE_API_BASE_URL=http://localhost:8080`, `VITE_USE_MOCK_LEARNING=false`)
- Demo preferred: `dr.nam.tmh@clinic.com` / `Password@123` → **401** (không có trên seed)
- Account used: `learner@ielts.demo` / `Demo@123`
- Tools: `npm run typecheck|lint|build`, `node --test`, `agent-browser`
- Code changes: **none** (report-only; không `/ck-fix`)

## Verdict: **FAIL**

Reading lesson flow (login → topics → lessons → exercise) **OK**. **Blocked on final assessment runner**: structure API 200 nhưng UI **Phần 1 0/0 câu** — không nộp đề / result / unlock topic kế.

---

## A — Technical verification

| Check | Result | Notes |
|-------|--------|-------|
| `npm run typecheck` | **PASS** | exit 0 |
| `npm run lint` | **PASS** | exit 0 |
| `npm run build` | **PASS** | exit 0 |
| `node --test tests/learning-path.test.mjs` | **FAIL** 17/18 | `unknown blocks` placeholder count Expected 4 ≠ 3 |
| `node --test tests/pages-render.test.mjs` | **FAIL** 20/22 | stale asserts (`120 Points` / forgot-password dialog) |
| Gateway `GET /actuator/health` | **UP** | `application/vnd.spring-boot.actuator.v3+json` (Spring Gateway, not EDB) |

---

## B — E2E checklist (HTTP thật)

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | Login → cookie/refresh + vào app | **OK*** | `learner@ielts.demo` → `/learn`. `POST /auth/login` 200; sau đó `POST /auth/refresh` + `GET /api/users/me` 200. Clinic creds: `POST /auth/login` **401**. Screenshot: `01-after-login.png` |
| 2 | GET/hiện `/learn` topics | **OK** | `GET /api/learning/topics` 200. DEMO_READING IN_PROGRESS; các chặng sau LOCKED. |
| 3 | Topic IN_PROGRESS → lessons | **OK** | Topic detail 4 bài; mở lesson. `02-topic-detail.png`, `03-lesson.png` |
| 4 | Nộp exercise (đúng/sai), ẩn đáp án trước khi đạt | **OK** | Sai → feedback, chưa lộ solution; đúng → pass. `04-exercise-wrong.png`, `05-exercise-pass.png` |
| 5 | REVIEW_REQUIRED → review → học tiếp | **N/A** | Seed path không trigger `REVIEW_REQUIRED` (hoàn bài không mở review gate) |
| 6 | test-assignment → assessment → result → reload topics | **FAIL** | Assignment + attempt tạo được; `GET /api/assessments/attempts/{id}/structure` **200**, section title “Street trees”, **4 items**. UI: **Phần 1 0/0 câu**, không radio. Không nộp / result / PASSED. `11-test-start.png`, `12-test-runner.png`, `test-snap.txt` |
| 7 | F5: session còn (refresh cookie) | **OK*** | Reload `/learn` vẫn login (`Đăng xuất` + topics). Network: `POST /auth/refresh` 200 → `GET /api/users/me` 200. `13-f5-session.png`. *Cảnh báo: nhiều cặp refresh/me trên một load (Strict Mode / multi-hydrate) — xem P1 |
| 8 | Logout sạch | **OK** | `POST /auth/logout` 200 → `/login`. Cookie/LS trống. `/learn` → AuthGuard `/login`; `POST /auth/refresh` **401** một lần (không loop). `14-logout.png`, `15-post-logout-guard.png` |
| — | Writing essay / Listening play audio | **SKIPPED** | `DEMO_LISTENING` LOCKED (chưa mở sau Reading). Không fail Reading vì optional |

\*Clinic demo account không dùng được trên BE hiện tại.

Screenshots: `plans/reports/e2e-main-flow-261003/*.png`

---

## C — UX / resilience

| Check | Observation |
|-------|-------------|
| Loading / empty / error + retry | Learn/topics load ổn; test runner **không** empty-state rõ (“Đề này chưa có câu hỏi”) vì section vẫn render (0/0) — UX lệch |
| Không trắng trang | **OK** trên login/learn/lesson/test shell |
| Spam 401 | Logout: **1** refresh 401 rồi dừng — **OK** |
| Refresh chỉ 1 lần khi 401 | `httpClient` dedupe `refreshInFlight` — hành vi đúng khi 401; boot hydrate vẫn gọi refresh nhiều lần (không phải 401 spam) |
| Exercise submit | Không còn kẹt “Đang nộp…” trên luồng Reading đã chạy |

---

## Findings

| ID | Sev | Kind | Detail |
|----|-----|------|--------|
| E2E-P0-01 | **P0** | FE↔BE contract | Assessment runner **0 câu**: BE trả `questionSnapshot` kiểu **JSON string** (`typeof === 'string'`). `normalizeQuestionSnapshot` early-return khi không phải object → không gắn `number` / không map `optionKey`→`value`. `toQuestion` trong `attemptSnapshot.ts` yêu cầu `number`/`sortOrder` → **null** hết items. URL: `GET http://localhost:8080/api/assessments/attempts/{attemptId}/structure` 200. UI: `/learn/...` test runner “Phần 1 0/0 câu”. |
| E2E-P1-01 | **P1** | UX / auth boot | F5/`/learn` hydrate: nhiều `POST /auth/refresh` + `GET /api/users/me` lặp (quan sát ≥5 cặp / một navigation) — session vẫn đúng nhưng ồn network. |
| E2E-P1-02 | **P1** | seed / credentials | `dr.nam.tmh@clinic.com` / `Password@123` → login **401**; phải dùng `learner@ielts.demo`. |
| E2E-P1-03 | **P1** | test debt | `learning-path.test.mjs` unknown-block count 3 vs 4. |
| E2E-P1-04 | **P1** | test debt | `pages-render.test.mjs` 2 asserts lệch UI hiện tại. |
| E2E-P2-01 | **P2** | product/seed | Sau L2 có hiện tượng báo hoàn sớm / cần complete L3–L4 qua API để `testStatus=AVAILABLE` (nếu tái hiện) — không chặn Reading submit. |

### P0 repro (network)

```
POST /auth/login                          200
POST /api/learning/topics/{id}/test-assignments  200
POST /api/assessments/attempts            200  → attemptId
GET  /api/assessments/attempts/{id}/structure  200
  sections[0].items[0].questionSnapshot  typeof "string"
  payload: {"stem":"...","options":[{"optionKey":"A","content":"...","sortOrder":1},...]}
  → FE parse → question=null × N → UI "0/0 câu"
```

---

## Conclusion

**FAIL** — typecheck/lint/build xanh; Reading học + exercise + session/logout **PASS**; **final test không làm được** vì snapshot string không normalize → blocker mở topic kế. Cần `/ck-fix` (parse string trong `normalizeQuestionSnapshot` hoặc fallback `item.sortOrder` trong `toQuestion`) trước khi re-run step 6.
