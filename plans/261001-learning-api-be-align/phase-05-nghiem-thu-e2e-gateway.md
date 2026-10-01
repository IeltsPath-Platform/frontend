---
phase: 5
title: "Nghiệm thu E2E với Gateway"
status: pending
priority: P1
dependencies: [3]
effort: "1 ngày"
---

# Phase 5: Nghiệm thu E2E với Gateway

## Overview

Nghiệm thu FE gắn với bước E2E của BE [`phase-08`](../../../../backend/plans/260930-2057-mvp-reading-writing-listening-roadmap/phase-08-nghiem-thu-e2e-mvp.md): học viên thật qua Gateway, không mock. Phase 4 skills bổ sung vào checklist khi đã làm.

## Requirements

- Stack: Gateway `:8080`, learning-service, content, assessment, access, user; FE trỏ `VITE_API_BASE_URL` đúng.
- Không log token / nội dung essay học viên vào report.

## Implementation Steps

1. Đăng ký/đăng nhập học viên mới trên FE (auth thật).
2. **Reading:** đi hết DEMO_READING (cố ý sai 1 câu lần đầu → bài ôn) → đề cuối → topics reload thấy PASSED + topic kế.
3. Quét UI/network: không `answerSpec`, `explanation`, transcript, `chartFacts` trước khi đạt.
4. Nếu phase 4 đã có: Writing (−3 point), Listening audio, hint Reading.
5. `npm run lint`, `typecheck`, `build`; ghi report `plans/261001-learning-api-be-align/reports/`.
6. Đối chiếu kết quả với report E2E BE (cùng kịch bản Lan / học viên mới).

## Success Criteria

- [ ] Reading E2E trên UI pass với API thật.
- [ ] Flag mock tắt mặc định cho môi trường tích hợp.
- [ ] Report không chứa secret.

## Risk Assessment

- Lệch seed ID giữa FE hardcode và BE migration → chỉ dùng ID từ `GET /topics` / lessons, không hardcode UUID seed trong pages.
