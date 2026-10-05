---
phase: 3
title: Phase B Learning HTTP
status: completed
priority: P1
effort: L
dependencies:
  - 1
  - 2
---

# Phase 3: Phase B Learning HTTP

## Overview

Thêm `httpLearningApi` cùng httpClient; map DTO BE ↔ FE; flag mock; assessment theo contract; pending reviews chỉ từ `REVIEW_REQUIRED`.

## Requirements

- Functional: topics → lessons → lesson submit → review (từ error) → test-assignment → attempt → result → reload topics.
- `VITE_USE_MOCK_LEARNING` default false khi có base URL.
- Không Writing/Listening/hint UI mới trừ block BE + renderer chịu được.
- Không đụng practice-tests mock trừ auth guard (đã ở phase 2).

## Architecture

- `LearningApi` interface giữ; factory: mock | http.
- Adapter map:
  - Topic: `topicId`→`id`, `name`→`title`; fill defaults cho `description`/`totalLessons`/`lockedReason` nếu UI cần.
  - Lessons list: flat `{topicId,testStatus,lessons}` → shape UI (`topic`, `finalTest`, `pendingReviews: []`).
  - Questions: `questionVersionId`→`id`, `stem`→`prompt`, `optionKey`→`value`.
  - Submit: `blockPassed`↔`passed`; answers dùng `questionVersionId`.
  - Assessment start: `{packageVersionId, mode:'STANDARD', channel:'WEB'}`.
- `getPendingReviews()`: return `[]` trên HTTP (REVIEW_REQUIRED only); mock giữ hành vi cũ.
- `useSyncPendingReviews` / banner: populate khi catch `REVIEW_REQUIRED`.

## Related Code Files

- Create: `src/features/learning-path/api/httpLearningApi.ts`, `adapters.ts` (optional)
- Modify: `api/index.ts` factory
- Modify: `types/learningPath.ts` nếu cần (prefer adapters để ít phá UI)
- Modify: `apiError.ts` parse `detail`/`code`/`reviews`
- Modify: Lesson/Topic/Review/Test pages nếu field lệch
- Modify: `blockGuards` / renderers nếu block shape BE khác (`blockId`, `blockType`, nested `asset`)
- Reference: `mobile/.../http-learning-api.ts`, `lesson-learning-v1.md`

## Implementation Steps

1. Factory: `createLearningApi()` theo env flag.
2. Implement HTTP methods matching `LearningApi` (assessment included).
3. Adapters cho list/detail/submit/review/attempt.
4. `ApiError` đọc `code`, `detail`, `reviews[]` (`reviewId`, `lessonId`, `knowledgePointId`).
5. Lesson flow: on `REVIEW_REQUIRED` → store review refs → banner/navigate `/learn/reviews/:id`.
6. After attempt result → `listTopics` / `getTopicLessons` reload.
7. Keep mock path for local UI without BE.

## Success Criteria

- [x] HTTP path gọi `/api/learning/**` + `/api/assessments/attempts`
- [x] Mock vẫn chạy khi flag true
- [x] DTO gaps mapped; typecheck clean
- [x] REVIEW_REQUIRED → review UI; no `/reviews/pending`
- [x] No new Writing/Listening UI

## Risk Assessment

- FE mock types lệch nhiều → adapters lớn; ưu tiên map tại boundary.
- Structure snapshot: BE object vs FE string — parse trong adapter.
- Essay blocks: render Unsupported hoặc skip nếu renderer chưa chịu (không build Writing UI).
