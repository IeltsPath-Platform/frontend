---
phase: 3
title: "Adapter UI và assessment"
status: pending
priority: P1
dependencies: [2]
effort: "1–2 ngày"
---

# Phase 3: Adapter UI và assessment

## Overview

Chỉnh pages/components learning-path để tiêu thụ DTO BE (qua mapper). Luồng đề cuối: assign → createAttempt → structure → save items → submit → result → **reload topics** (không tin consumer đã mở topic trên cùng payload result).

## Requirements

- Functional: kịch bản Lan Reading chạy trên HTTP khi BE sẵn sàng; mock regression vẫn pass.
- UX: banner ôn, khóa bài, ẩn đáp án trước khi đạt — giữ hành vi plan mock.

## Related Code Files

- Modify: `LessonPage`, `ReviewPage`, `TopicDetailPage`, `TopicTestPage`, `TopicTestResultPage`, `TopicListPage`
- Modify: `blocks/*`, `blockGuards.ts`, `groupBlocks.ts` (đổi `type`→`blockType`, `stem`/`optionKey`)
- Modify: `tests/learning-path.test.mjs`
- Modify: `reviewGate.ts` — nguồn pending reviews: lỗi `REVIEW_REQUIRED` hoặc endpoint phụ (không giả từ submit response nếu BE không trả)

## Implementation Steps

1. Mapper block: TEXT / ASSET / EXERCISE theo seed BE; `options: null` = fill; TFNG dùng `optionKey`.
2. Submit exercise: UI đọc `blockPassed` + `results`; hiện `correctAnswer`/`explanation` chỉ khi có trên result.
3. Pending reviews: khi 403 `REVIEW_REQUIRED`, hydrate banner từ `reviews`; sau review DONE/SKIPPED clear + reload lesson/topic.
4. Topic detail: `testStatus` từ response lessons; assign → lấy `packageVersionId` → attempt.
5. Result page: hiển thị score/percent/items; `solutions` chỉ khi BE trả; sau đó `getTopics()` để cập nhật PASSED / topic kế.
6. Bỏ/ẩn phụ thuộc mock-only: `totalLessons`, `estimatedMinutes`, `packageCode` trên assignment (có thể resolve code từ content cache nếu UI cần nhãn).
7. Chạy lint, typecheck, test mock; checklist tay Reading trên Gateway nếu BE up.

## Success Criteria

- [ ] UI không còn giả định field chỉ có ở mock khi `VITE_USE_MOCK_LEARNING=false`.
- [ ] Đề cuối không gửi `sections` / `attemptType` / `answerSnapshot` learner.
- [ ] Regression mock + typecheck/lint/build pass.

## Risk Assessment

- Consumer chưa xử lý event → topic không PASSED sau đề: UI phải nói "đang cập nhật" + nút reload topics, không soft-pass local.
