---
phase: 4
title: "Writing, Listening, gợi ý theo roadmap BE"
status: pending
priority: P2
dependencies: [3]
effort: "2–4 ngày (theo từng PR BE)"
---

# Phase 4: Writing, Listening, gợi ý theo roadmap BE

## Overview

Mở rộng FE theo **đúng thứ tự merge BE** trong [`260930-2057`](../../../../backend/plans/260930-2057-mvp-reading-writing-listening-roadmap/plan.md): Writing Task 2 → Task 1 → Listening → gợi ý Reading. Không làm Speaking. Đọc plan con BE + `python-to-java-mapping.md` (route vẫn `/api/learning`).

## Requirements

- Functional: đủ màn/flow gọi API Java learning-service khi plan con BE đã có contract/PR.
- Non-functional: trừ point Writing / daily limit hiện message từ `429 DAILY_LIMIT_REACHED`; không lộ `chartFacts`/transcript trước khi đạt.

## Architecture

```text
BE merge 0737 ──► FE Writing T2 UI + submit essay
BE merge 0812 ──► FE Writing T1 (chart image + essay)
BE merge 0851 ──► FE Listening (audio player, cấm transcript sớm)
BE merge 1006 ──► FE hint sau lần sai đầu (không hints_used)
```

Mỗi bước là PR FE riêng được; phase này là checklist điều phối, không bắt buộc một PR lớn.

## Related Code Files

- Extend: `learning-path` blocks / pages hoặc feature `writing` / `listening` cạnh `/learn`
- Reuse: auth, point balance UI nếu đã có từ access/user

## Implementation Steps

1. **Writing T2 (0737):** form essay, `requestId` idempotent, hiện 4 band criteria; hết point vẫn cho học hết topic (khối essay không chặn path — đúng BE).
2. **Writing T1 (0812):** render đề + ảnh; không bao giờ fetch/hiện `chartFacts` cho learner.
3. **Listening (0851):** `<audio>` từ URL công khai seed; ẩn transcript tới khi đạt; đề cuối có audio.
4. **Gợi ý Reading (1006):** sau sai lần đầu hiện `hint` từ response/GET lesson; khối đạt thì bỏ hint; không gửi/lưu `hints_used`.
5. Cập nhật seed/mock chỉ khi cần demo offline; ưu tiên HTTP + seed BE.
6. Mỗi sub-step: cập nhật test hoặc checklist tay; ghi chú PR BE đã phụ thuộc vào report ngắn trong `reports/`.

## Success Criteria

- [ ] Không gọi `/api/ai-learning/**`.
- [ ] Writing: double submit cùng `requestId` không trừ point hai lần (xác nhận với BE).
- [ ] Listening: network/DOM không chứa transcript trước pass.
- [ ] Hint: khớp luật 1006 (bỏ `hints_used`).

## Risk Assessment

- BE delayed một kỹ năng → ship FE Reading-only; phase 4 items còn lại để pending theo tag kỹ năng.
- LLM band dao động: UI không soft-fail; chỉ hiển thị payload BE.
