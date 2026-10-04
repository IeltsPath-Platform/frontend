# Fix UX: CTA hit-target + gate messaging (PRACTICE/REVIEW)

**Date:** 2026-10-05  
**Scope:** FE only — no BE contract change  
**Verify:** typecheck ✓ · lint ✓

## Root cause
1. CTA hit-target: ambient auth layer có thể chắn click; nút ~44px / thiếu isolation.
2. Gate đề cuối: `practiceStatus` bị drop khi map topic lessons; `PRACTICE_REQUIRED` chưa parse; hint LOCKED chỉ nói “bài học + ôn”; `GET /reviews` chưa hydrate → learner không biết vì sao đề khóa.

## Fix
| Area | Change |
|------|--------|
| Auth CTA | `pointer-events: none` ambient; form `z-index:5` + isolation; submit min ~3.4rem |
| LP CTA | `.lp-btn` 48px+, `.lp-btn--cta` 52px; aside/test-bar isolation |
| Mapper | `practiceStatus` từ BE topic lessons |
| Errors | `PRACTICE_REQUIRED` + `lessonIds`; message rõ + reload |
| Reviews | `getPendingReviews` + topic load hydrate `GET /reviews?status=PENDING` |
| Final test card | Checklist unlock trước khi mở (lesson / practice / review + link) |
| Lesson row | Hint “Cần luyện thêm…” khi `practiceStatus=REQUIRED` |

## Ngoài scope (giữ nguyên)
- Ẩn đáp án khi chưa đạt (rule BE)
- Google OAuth stub
- UI practice-sets riêng (link tạm về lesson)
