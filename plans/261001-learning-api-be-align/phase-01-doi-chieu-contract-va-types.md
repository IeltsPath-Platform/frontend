---
phase: 1
title: "Đối chiếu contract và chỉnh types"
status: pending
priority: P1
dependencies: []
effort: "0.5–1 ngày"
---

# Phase 1: Đối chiếu contract và chỉnh types

## Overview

Cập nhật `src/types/learningPath.ts` (và types phụ) cho khớp [`lesson-learning-v1.md`](../../../../backend/docs/contracts/lesson-learning-v1.md). Tách **DTO wire** (đúng BE) khỏi **view model** UI nếu cần để khỏi đập hết renderer một lúc.

## Requirements

- Functional: mọi field FE gửi/nhận HTTP sau này trùng tên camelCase với contract.
- Non-functional: mock hiện tại vẫn compile; test `learning-path.test.mjs` cập nhật theo types mới hoặc qua adapter.

## Related Code Files

- Modify: `src/types/learningPath.ts`
- Modify: `src/features/learning-path/api/learningApi.ts`, `apiError.ts`
- Possibly create: `src/features/learning-path/api/dto.ts` (wire types) + `mapToView.ts`

## Implementation Steps

1. Đọc lại contract BE (learner routes + assessment table + error body).
2. Đổi tên / shape theo bảng gap trong `plan.md` (ưu tiên: `topicId`/`lessonId`/`blockId`/`questionVersionId`/`blockPassed`/`reviewSetId`/`detail`).
3. `StartAttemptRequest` → `{ packageVersionId, mode, channel }` (`STANDARD` + `WEB`); bỏ tin `attemptType` từ client.
4. `AttemptItem`: bỏ `answerSnapshot` khỏi type learner.
5. `AttemptResult`: bám BE (`items[].correct`, `solutions?`); bỏ giả định `topicStatus`/`nextTopicId` trên cùng response (đánh dấu deprecated hoặc chuyển sang bước reload topics).
6. `ApiError`: map `{ detail, code, reviews? }` → UI message; giữ `status` từ HTTP.
7. Cập nhật bảng gap trong `plan.md` nếu còn lệch sau khi sửa types.
8. `npm run typecheck` — sửa chỗ gọi type cũ tối thiểu (cast tạm ở mock OK nếu phase 3 sẽ adapter).

## Success Criteria

- [ ] Types phản ánh contract approved; không còn field chỉ có ở mock mà ghi là "BE thật".
- [ ] `ApiError` hiểu `detail` + `reviews` cho `REVIEW_REQUIRED`.
- [ ] `typecheck` pass (mock có thể qua mapper mỏng).

## Risk Assessment

- Đổi type lớn → mock + pages vỡ nhiều chỗ. Giảm rủi ro: giữ alias tạm 1 phase hoặc mapper `toTopicSummaryView()`.
