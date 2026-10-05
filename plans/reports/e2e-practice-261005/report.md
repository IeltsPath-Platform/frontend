# E2E / gap close — Practice + Review ladder (2026-10-05)

## Verify
- typecheck ✓ · lint ✓ · build ✓
- agent-browser: `/learn/lessons/{id}/practice` render catalog + PASSED panel
- topic detail: **không** hiện “Làm bài kiểm tra” khi còn review — checklist “Hoàn thành N bài ôn…” + ReviewGate banner

## Gaps đã đóng
| Gap | Status |
|-----|--------|
| LearningApi practice-sets / attempts / submissions | Đóng |
| `POST /reviews/{id}/theory-check` + Review THEORY UI | Đóng |
| Lesson COMPLETED → CTA Luyện thêm | Đóng |
| TopicDetail PRACTICE_REQUIRED / REVIEW_REQUIRED copy + ẩn CTA đề | Đóng |
| Writing timeout ≥60s (`WRITING_REQUEST_TIMEOUT_MS`) | Đóng |
| Essay balance≥3 + refresh points (đã có, giữ) | OK |
| Listening audio + transcript chỉ khi BE trả | OK (`AudioBlock`) |
| Result pass → poll `listTopics` tới PASSED / next | Đóng |
| PREMIUM disable + nhãn (topic list + practice card) | Đóng |
| Mock stubs tương thích interface | Đóng |

## E2E note
Learner demo đã `practice=PASSED` (catalog item LOCKED/revealed theo BE). Fresh-user full lesson→practice→review→test chưa chạy end-to-end trong session (lesson complete cần đúng đáp án exercise). Smoke xác nhận UI practice + gate review trên topic.
