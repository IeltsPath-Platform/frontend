---
phase: 2
title: "HTTP client /api/learning"
status: pending
priority: P1
dependencies: [1]
effort: "1 ngày"
---

# Phase 2: HTTP client `/api/learning`

## Overview

Thêm bản `LearningApi` gọi Gateway (`VITE_API_BASE_URL` + prefix `/api/learning`), cookies/credentials theo auth FE hiện có. Giữ mock qua flag (ví dụ `VITE_USE_MOCK_LEARNING=true` hoặc thiếu base URL).

## Requirements

- Functional: đủ method Reading MVP: topics, lessons, lesson detail, submit exercise, complete (khi hợp lệ), reviews, test-assignments; assessment qua `/api/assessments`.
- Non-functional: `withCredentials: true`; không đưa token vào `localStorage` nếu FE đã dùng cookie HttpOnly; forward không gắn secret vào repo.

## Related Code Files

- Create: `src/features/learning-path/api/httpLearningApi.ts`
- Modify: `src/features/learning-path/api/index.ts` (chọn mock vs HTTP)
- Modify: env docs / `.env.example` nếu repo đã có pattern `VITE_*`
- Reuse: HTTP client auth hiện có của FE (axios instance)

## Implementation Steps

1. Implement từng method map 1:1 route contract (không tự invent field).
2. Submit answers: `{ questionVersionId, answer }`; review: `{ reviewSetId, requestId, answers }`.
3. Assessment: `POST /api/assessments/attempts` body contract mới; structure/save/submit/result theo bảng assessment trong contract.
4. Map lỗi HTTP → `ApiError` (`detail`/`code`/`reviews`).
5. Factory chọn implementation: mock (plan cũ) vs HTTP.
6. Smoke: với backend local, `GET /api/learning/topics` trả 200 hoặc 401 rõ ràng (không CORS silent fail).

## Success Criteria

- [ ] Một `LearningApi` interface; runtime chọn mock hoặc HTTP.
- [ ] Không còn hardcode `/api/ai-learning`.
- [ ] Lỗi `REVIEW_REQUIRED` mang `reviews[]` lên banner hiện có.

## Risk Assessment

- BE phase 2–4 chưa merge → HTTP 404: giữ mock default cho dev FE.
- CORS / cookie domain: ghi rõ URL Gateway (`:8080`) trong README feature.
