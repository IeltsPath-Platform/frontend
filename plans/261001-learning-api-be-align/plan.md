---
title: "Đồng bộ lộ trình học FE với learning-service BE"
description: "Cập nhật FE theo contract BE đã duyệt: prefix /api/learning, DTO lesson-learning-v1, assessment TOPIC_GATE, rồi Writing/Listening/gợi ý theo lộ trình MVP BE. Mock UI hiện tại giữ làm nền; thêm HTTP client thật qua Gateway."
status: pending
priority: P1
branch: "feat/ui-main-flow"
tags: [learning-path, learning-service, contract, gateway, mvp]
blockedBy: []
blocks: []
created: "2026-10-01T16:25:16.924Z"
createdBy: "ck:plan"
source: skill
---

# Đồng bộ lộ trình học FE với learning-service BE

## Overview

Plan FE `261001-learning-path-mock` đã xong UI + mock in-memory. Backend đã chốt (2026-10-01):

| Nguồn BE | Nội dung FE phải bám |
| --- | --- |
| [`260930-2057` MVP roadmap](../../../backend/plans/260930-2057-mvp-reading-writing-listening-roadmap/plan.md) | Thứ tự MVP: Reading → Writing T2 → Writing T1 → Listening → gợi ý Reading; Speaking ngoài phạm vi |
| [`261001-1228` learning-service Java](../../../backend/plans/261001-1228-learning-service-java/plan.md) | Route **`/api/learning/**`** (không còn `/api/ai-learning/**`); bỏ tutor, `/status`, `/progress`, goal, LLM path |
| [`lesson-learning-v1.md`](../../../backend/docs/contracts/lesson-learning-v1.md) (**approved**) | Shape JSON camelCase, mã lỗi, luật ẩn đáp án, assessment `POST /attempts` |
| [`seed-content.md`](../../../backend/plans/260930-2057-mvp-reading-writing-listening-roadmap/seed-content.md) | Nội dung DEMO_READING / TFNG / Writing / Listening thay mock tự soạn khi nối API thật |

Plan này **không viết lại UI từ đầu**. Mục tiêu: khớp DTO + HTTP + auth với BE; giữ shell `/learn`; mock vẫn bật được khi chưa có backend.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Đối chiếu contract và chỉnh types](./phase-01-doi-chieu-contract-va-types.md) | Pending |
| 2 | [HTTP client `/api/learning`](./phase-02-http-client-api-learning.md) | Pending |
| 3 | [Adapter UI và assessment](./phase-03-adapter-ui-va-assessment.md) | Pending |
| 4 | [Writing, Listening, gợi ý theo roadmap BE](./phase-04-writing-listening-goi-y.md) | Pending |
| 5 | [Nghiệm thu E2E với Gateway](./phase-05-nghiem-thu-e2e-gateway.md) | Pending |

Thứ tự: 1 → 2 → 3. Phase 4 **chờ** BE merge từng plan con (0737 → 0812 → 0851 → 1006). Phase 5 chạy cùng / sau nghiệm thu BE phase 8.

## Gap mock FE ↔ contract BE (đã đối chiếu)

| Hạng mục | Mock FE hiện tại | Contract BE (`lesson-learning-v1`) |
| --- | --- | --- |
| Prefix API | Interface nội bộ, không HTTP | `/api/learning` qua Gateway + bearer |
| Topic list | `id, title, description, completedLessons, totalLessons, lockedReason` | `topicId, name, completedLessonCount` (không `description` / `totalLessons` / `lockedReason`) |
| Topic lessons | `{ topic, lessons, finalTest, pendingReviews }` | `{ topicId, lessons, testStatus }` — không nhúng `pendingReviews` / `finalTest` object |
| Lesson summary | `id, estimatedMinutes, lockedReason` | `lessonId, code, title, sortOrder, status` |
| Lesson detail blocks | `type`, `questions[].id/number/prompt`, `state`, `savedAnswers` | `blockType`, `questions[].questionVersionId/stem/options[{optionKey,content}]`, `passed`, `solutions` tách khi đạt |
| Submit exercise | `passed, correctCount, totalCount, percent, pendingReviews` | `blockPassed, lessonCompleted, results[]` — không `pendingReviews` trên response này |
| Complete lesson | Luôn có path mock | Chỉ lesson **không** có EXERCISE; có exercise → `409 LESSON_HAS_EXERCISES` |
| Review GET | `theory: LessonBlock[]`, `setId`, `knowledgePoint.code` | `theory: string[]`, `reviewSetId`, `reviewStatus`, `lessonId` |
| Review submit body | `{ requestId, setId, answers }` | `{ reviewSetId, requestId, answers }` |
| Test assignment | Có `packageCode` | `{ assignmentId, packageId, packageVersionId }` |
| Create attempt | `{ packageVersionId, attemptType, mode: PRACTICE, … }` | `{ packageVersionId, mode: STANDARD\|TIMED, channel }` — BE tự suy `TOPIC_GATE` |
| Attempt structure | Có `answerSnapshot` | **Bỏ** `answerSnapshot` khỏi DTO learner |
| Attempt result | FE tự gắn `topicStatus, nextTopicId, yourAnswer…` | BE: `score, maxScore, percent, items[{correct}]`, `solutions[]` chỉ khi `percent >= 70`; topic PASSED do consumer learning — FE phải `GET /topics` lại |
| Errors | `ApiError { status, code, message, details }` | `{ detail, code, reviews? }` — `reviews` chỉ với `REVIEW_REQUIRED` |
| Mastery | Không có | `GET /api/learning/mastery` (optional UI) |
| Auth | User cố định "Lan" | Bearer qua Gateway; cookie/refresh theo auth FE hiện có |

## Ngoài phạm vi

- Tutor chat, practice notebook, learner memory, placement, sắp path bằng LLM (BE đã bỏ).
- Speaking, premium entitlement, upload audio signed URL.
- Viết lại toàn bộ CSS đường mòn / shell (chỉ sửa chỗ DTO/flow vỡ).
- Sửa BE contract (chỉ báo lệch nếu BE đổi).

## Dependencies

- **Nền UI:** [`261001-learning-path-mock`](../261001-learning-path-mock/plan.md) (đã implemented) — giữ mock flag.
- **BE sẵn sàng Reading E2E:** learning-service phase 2–4 + 1640 assessment (xem roadmap `260930-2057`). Phase 2–3 FE có thể code sớm với contract + mock dual-mode; E2E thật ở phase 5.
- **Phase 4 FE** blockedBy tiến độ BE: `260930-0737`, `0812`, `0851`, `1006`.

## Tiêu chí nghiệm thu (plan)

1. Types + HTTP client khớp `lesson-learning-v1` (field name, mã lỗi, không lộ `answerSpec`/`explanation` trước khi đạt).
2. Cùng UI `/learn` chạy được **mock** hoặc **HTTP** qua một `LearningApi` (env/flag).
3. Kịch bản Lan Reading trên stack BE + Gateway pass (đồng bộ bước 2 của BE phase 8).
4. Writing / Listening / hint chỉ hiện khi BE tương ứng đã có API; không hardcode Python `/api/ai-learning`.

## Rủi ro

- BE assessment DTO đổi trước khi deploy → phase 1 giữ bảng gap, cập nhật khi contract đổi.
- Consumer learning chậm → sau submit đề FE poll/reload topics thay vì tin `nextTopicId` trên result.
- FE mock và seed BE khác nội dung → khi bật HTTP, tắt / thay mock content bằng seed IDs thật.
