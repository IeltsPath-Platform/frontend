# Lộ trình học theo topic (mock API trong FE)

- **Status:** implemented (nền UI)
- **Scope:** Chỉ frontend. Màn danh sách topic, chi tiết topic, bài học (renderer block), bài ôn bắt buộc, bài kiểm tra cuối topic và kết quả; mock API in-memory chạy được kịch bản demo học viên "Lan".
- **Quyết định đã chốt (01/10/2026):** prefix `/learn` + mục "Lộ trình" trong `SiteNavbar`; interface `LearningApi` + bản mock (chưa làm bản HTTP); tiến độ mock lưu `localStorage` + nút "Đặt lại demo"; giữ shell và token hiện có, điểm nhấn là danh sách topic dạng đường mòn; nội dung IELTS Reading tự soạn; thêm `tests/learning-path.test.mjs`.
- **Sau review (01/10/2026):** hydrate banner ôn bằng `getPendingReviews()` trên `LearnLayout`; đồng bộ `pendingReviews` qua `useSyncPendingReviews` sau khi load settled (không gọi `setPendingReviews` trong loader); giả lỗi 500 là toggle `setServerFailing` (StrictMode); navbar nằm ngoài `.lp-root`.
- **Đồng bộ BE (01/10/2026):** contract thật đã duyệt ở backend `docs/contracts/lesson-learning-v1.md` (`/api/learning/**`, learning-service Java). Mock DTO **lệch tên field** so với BE — việc nối HTTP, chỉnh types và Writing/Listening/gợi ý theo lộ trình MVP BE nằm ở plan kế tiếp: [`../261001-learning-api-be-align/plan.md`](../261001-learning-api-be-align/plan.md). Plan này giữ làm nền UI + mock offline; không mở rộng mock thay cho contract BE.

## Ngoài phạm vi

Đăng nhập (user cố định "Lan"), tutor/chat, flashcard, game, Writing, Listening, gợi ý câu, giới hạn giờ, bản HTTP client thật, công thức mastery thật. Không thêm dependency, không sửa `package.json`/config. (HTTP + kỹ năng tiếp theo → `261001-learning-api-be-align`.)

## Hợp đồng dữ liệu (FE tự định nghĩa, ghi trong `src/types/learningPath.ts`)

| Endpoint (mock) | Trả về chính |
| --- | --- |
| `GET /topics` | `TopicSummary[]`: `id, code, title, description, sequenceOrder, status (PASSED/IN_PROGRESS/LOCKED), completedLessons, totalLessons, lockedReason?` |
| `GET /topics/{id}/lessons` | `{ topic, lessons: LessonSummary[] (sortOrder, status LOCKED/AVAILABLE/COMPLETED), finalTest: { testStatus LOCKED/AVAILABLE/PASSED, questionCount, lastPercent? }, pendingReviews }` |
| `GET /lessons/{id}` | `{ id, topicId, title, sortOrder, status, blocks: LessonBlock[], nextLessonId }`; khối EXERCISE có `state (NOT_ATTEMPTED/FAILED/PASSED)`, `savedAnswers?`, `solutions?` (chỉ khi PASSED) |
| `POST /lessons/{id}/exercises/{blockId}/submissions` | body `{ requestId, answers[] }` → `{ passed, correctCount, totalCount, percent, results[] (questionId, correct, correctAnswer?, explanation?), lessonCompleted, nextLessonId, pendingReviews }` |
| `POST /lessons/{id}/complete` | `{ lessonCompleted, nextLessonId, pendingReviews }` |
| `GET /reviews/{id}` | `{ reviewId, status PENDING/DONE/SKIPPED, knowledgePoint, theory: LessonBlock[], set: { setId, packageCode, attemptNumber, maxAttempts: 3, passage, questions } }` |
| `POST /reviews/{id}/submissions` | body `{ requestId, setId, answers[] }` → `{ status, passed, percent, results[] (solutions chỉ khi passed) }` |
| `POST /topics/{id}/test-assignments` | `{ assignmentId, packageVersionId, packageCode }` |
| `createAttempt / getAttemptStructure / saveItemResponse / submitAttempt` | Bám DTO thật của `assessment-service` (`AssessmentAttemptResponse`, `AttemptStructureResponse` với `snapshot`/`questionSnapshot` là chuỗi JSON, `SaveAttemptResponseRequest { payload, schemaVersion, expectedRevision }`) |
| `getAttemptResult` | `{ score, maxScore, percent, passed, items[] (number, correct, yourAnswer, correctAnswer?, explanation?), topicStatus, nextTopicId }`. Backend thật hiện chỉ có `overallBand` → đây là hợp đồng đề xuất |

Lỗi: `ApiError { status, code, message, details }` với `code` ∈ `TOPIC_LOCKED, LESSON_LOCKED, TEST_LOCKED, TEST_UNAVAILABLE, REVIEW_REQUIRED (details.reviews), REVIEW_SET_CLOSED, NOT_FOUND, VALIDATION (422), SERVER (5xx)`.

**Giả định cần backend xác nhận:** `createAttempt` thật bắt buộc gửi `sections`; mock cho phép chỉ gửi `packageVersionId` (giả định assignment phía server đã gắn section). Ghi rõ trong code của interface.

## Luật mock rút gọn

- Đạt khối khi ≥ 70%. Điền chữ chấm không phân biệt hoa thường, bỏ khoảng trắng thừa, chấp nhận danh sách đáp án thay thế.
- Lần nộp **đầu** của khối dạy KP1–KP4 có câu sai → đánh dấu KP; khi bài hoàn thành thì tạo bài ôn cho KP đó (gói `PS-KPn-A → B → C`). KP5 (TFNG) không có gói nên không bao giờ chèn bài ôn.
- Khi có review PENDING: bài kế vẫn LOCKED; `GET` bài chưa hoàn thành hoặc `test-assignments` → 403 `REVIEW_REQUIRED`.
- Review: đạt → DONE, mở bài kế; trượt → set kế (PENDING); trượt set thứ 3 → SKIPPED, vẫn mở bài kế. `setId` cũ → `REVIEW_SET_CLOSED`.
- Cùng `requestId` gửi lại → trả kết quả đã lưu, không chấm lần hai.
- Test: mỗi lần giao lấy mã đề kế tiếp (`X1`, `X2`…). Đạt → topic PASSED, topic kế IN_PROGRESS. `expiresAt` luôn `null`.
- Nội dung: topic `DEMO_READING` (L1 KP2 paraphrase Q1–Q3, L2 KP1 scanning Q4–Q6 với Q5 "bẫy", L3 KP3 ý chính + KP4 điền từ Q7–Q9 + khối VOCABULARY chưa hỗ trợ, L4 KP5 TFNG Q10–Q11 + ASSET có `mediaUrl`), đề `X1` Q12–Q15; `TFNG_SKILLS` (bài đầu chỉ có TEXT → nút "Hoàn thành bài"; đề chưa có → `TEST_UNAVAILABLE`); `MATCHING_HEADINGS` LOCKED để hoàn thiện đường mòn.

## Các phase

### Phase 1 — Kiểu, interface API, mock engine ✅
### Phase 2 — Hạ tầng màn hình ✅
### Phase 3 — Màn topic ✅
### Phase 4 — Bài học và renderer block ✅
### Phase 5 — Bài ôn, bài kiểm tra, lỗi ✅
### Phase 6 — Kiểm thử ✅

<details><summary>Chi tiết phase (đã triển khai)</summary>

### Phase 1 — Kiểu, interface API, mock engine
- `src/types/learningPath.ts`; `src/features/learning-path/api/{learningApi.ts, apiError.ts, index.ts}`.
- `src/features/learning-path/api/mock/{mockLearningApi.ts, mockState.ts, grading.ts}` (factory nhận `storage` và `latencyMs` để test chạy trong Node).
- Nội dung: `src/mocks/learning-path/{topics.ts, lessons.ts, reviewPacks.ts, topicTests.ts}`.

### Phase 2 — Hạ tầng màn hình
- `lib/useApiResource.ts` (loading/error/data/reload), `lib/reviewGate.ts` (store `useSyncExternalStore` như `authSession.ts`), `lib/groupBlocks.ts` (gộp PASSAGE + EXERCISE kế tiếp thành bố cục chia đôi).
- `components/`: `LearnLayout` (SiteNavbar ngoài `.lp-root`, ErrorBoundary, banner chặn hydrate `getPendingReviews`, panel demo), `ReviewGateBanner`, `StatusBadge`, `PageState`, `DemoControls` (Đặt lại demo, bật/tắt giả lỗi 500).

### Phase 3 — Màn topic
- `TopicListPage` (đường mòn theo `sequenceOrder`, LOCKED không bấm được + lý do), `TopicDetailPage` (bài theo `sortOrder`, thẻ "Bài kiểm tra cuối", nút "Làm bài kiểm tra").

### Phase 4 — Bài học và renderer block
- `blocks/blockRegistry.tsx` (map `type`/`assetType` → renderer; kiểu lạ → `UnsupportedBlock`), `TextBlock`, `PassageBlock`, `ExerciseBlock`, `QuestionField` (radio hoặc ô chữ).
- `LessonPage`: nộp khối (requestId mới mỗi lần, khóa nút khi đang gửi), chưa đạt chỉ đánh dấu đúng/sai, đạt hiện đáp án + giải thích, `lessonCompleted` → "Bài tiếp theo", không có EXERCISE → "Hoàn thành bài".

### Phase 5 — Bài ôn, bài kiểm tra, lỗi
- `ReviewPage` (lý thuyết → set câu, xử lý DONE/PENDING/SKIPPED/REVIEW_SET_CLOSED).
- `TopicTestPage` (parse chuỗi JSON, passage trái/câu phải theo section, lưu từng câu với `expectedRevision`, nộp) và `TopicTestResultPage`.
- Route trong `App.tsx`, mục "Lộ trình" trong `SiteNavbar`, `learning-path.css` (token khai báo một lần ở gốc feature, có `prefers-reduced-motion`).

### Phase 6 — Kiểm thử
- `tests/learning-path.test.mjs`: kịch bản Lan đầy đủ; nhánh trượt 3 set → SKIPPED; học viên làm đúng ngay không gặp bài ôn; requestId trùng; lỗi khóa; hydrate pending reviews; SSR render renderer block.
- `npm run lint`, `npm run typecheck`, `npm run build`, `node --test …` và kiểm tra tay trên trình duyệt.

</details>

## Tiêu chí chấp nhận

1. Chạy tay được toàn bộ kịch bản Lan từ `/learn` tới khi `TFNG_SKILLS` chuyển IN_PROGRESS; nhánh SKIPPED và nhánh "đúng hết" cũng chạy được.
2. Mọi luật hiển thị 1–7 trong yêu cầu đều có hành vi tương ứng; mỗi màn có trạng thái chờ, lỗi (thử lại) và rỗng.
3. Thêm kiểu block mới chỉ cần đăng ký renderer, không sửa `LessonPage`.
4. Các route và test hiện có không đổi hành vi; lint, typecheck, build pass.

## Rủi ro

- Lượng nội dung soạn tay lớn (4 KP × 3 set ôn) → giữ mỗi set ngắn (1 đoạn + 2 câu).
- `SiteNavbar` thêm một mục: test navbar hiện có chỉ kiểm tra nhãn có/không, không bị ảnh hưởng.
