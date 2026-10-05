# E2E main flow HTTP — fresh account

**Date:** 2026-10-05  
**Account:** `e2e.fresh.1031532362@ielts.demo` (register mới)  
**Env:** `VITE_USE_MOCK_LEARNING=false`, Gateway `:8080`, FE `:5173`  
**Overall:** **PASS** (luồng chính tới result + reload topics; practice/review có hỗ trợ API)

## Build / verify

| Check | Result |
|-------|--------|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` | **N/A** (không có script) |

## Checklist (PASS/FAIL)

| Bước | Result | Ghi chú |
|------|--------|---------|
| Register tài khoản mới | **PASS** | Không dùng learner đã AVAILABLE |
| Login → `/learn` | **PASS** | Cần Enter (click nút @ref hay miss) |
| `/learn` thấy DEMO_READING | **PASS** | 4/4 sau lessons |
| Lessons COMPLETED | **PASS** | API + seed answers (UI 4 bài quá dài) |
| Pre-practice: `practice=REQUIRED`, `testStatus=LOCKED` | **PASS** | API confirm trước khi assist |
| Practice từng bài | **PASS*** | *API 4/4 PASSED; UI xác nhận `/practice` (catalog + Làm lại/Làm bộ này + Về lộ trình) |
| Review nếu REVIEW_REQUIRED | **PASS** (N/A) | Không còn PENDING sau practice |
| Topic CTA đề sau unlock | **PASS** | “Làm bài kiểm tra” hiện; JS click mở đề |
| Đề cuối render câu | **PASS** | Có Câu 1… /4 — không 0/0 |
| Submit → result | **PASS** | 25% · Chưa đạt · Từng câu ✕/✓ |
| Reload `/learn` topics | **PASS** | DEMO_READING vẫn Đang học 4/4 (chưa ≥70% nên chưa PASSED) |

\* Practice UI start/submit trên attempt khi còn REQUIRED không kịp capture trước khi API clear gate (agent-browser script treo giữa chừng).

## Khó dùng UI

1. **Login / CTA primary:** click a11y `@ref` không ổn định → Enter hoặc `element.click()` JS.
2. **Radio đáp án:** vòng radio nhỏ; bấm `label.lp-option` ổn hơn.
3. **Result chưa đạt:** ẩn đáp án đúng (by design) — khó ôn ngay trên màn hình.
4. **Practice catalog:** sau PASSED vẫn cho “Làm lại”/“Làm bộ này” (OK); khi REQUIRED cần thấy rõ trạng thái `practiceStatus` trên page (có trong copy).
5. **Encoding matcher trong automation:** PowerShell `-match` Unicode dễ FAIL giả — đối chiếu snapshot UTF-8/screenshot.

## Method

- Lessons + practice/review ladder clear: API + `lesson-pipeline-demo-expected.json`.
- Browser (agent-browser): login → learn → practice page → topic → đề → result → topics.
- Artifacts: `result.png`, `topics.png`, snapshot `*.txt` trong thư mục này.
