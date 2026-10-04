# E2E: login → /learn → Reading → đề cuối → result

**Date:** 2026-10-05  
**Account:** `learner@ielts.demo`  
**Verdict:** **PASS** (luồng chính hoàn tất)

## Kết quả từng bước

| Bước | Kết quả |
|------|---------|
| Login | PASS → `/learn` |
| `/learn` thấy DEMO_READING | PASS |
| Topic Reading (4/4 Đã xong) | PASS — CTA **Làm bài kiểm tra** hiện |
| Vào đề cuối | PASS — 4 câu render (không còn 0/0) |
| Chọn đáp án + Nộp bài | PASS → `/result` |
| Result | PASS — 25% (1/4), “Chưa đạt lần này”, CTA “Về topic để làm lại”, “Từng câu” ✕/✓ |

> Precondition: learner đã `practice=PASSED`, `testStatus=AVAILABLE`. Không phải lần đầu “học hết 4 bài” từ zero trong run này.

## Khó dùng / lỗi UI ghi nhận

1. **Nút primary đôi khi không nhận click từ automation (`@ref`)** — Đăng nhập / Làm bài kiểm tra / Nộp bài: click a11y-ref không luôn fire React `onClick`; chuột thật thường OK, nhưng hit-target/layering đáng kiểm tra lại nếu user báo “bấm không ăn”.
2. **Chọn đáp án Radix radio** — click vào vòng radio nhỏ dễ miss; click `label.lp-option` ổn định hơn. Nên đảm bảo cả vùng option (chữ) đều bấm được (hiện label đã wrap — OK nếu không bị CSS chặn).
3. **Result khi chưa đạt** — điểm + “Từng câu” (đúng/sai) hiện rõ; **đáp án đúng bị ẩn** (“Đáp án được ẩn khi chưa đạt”). Đúng theo rule, nhưng học viên dễ thấy “khó ôn” vì không xem được đáp án ngay trên result.
4. **Google login disabled** (“chưa hỗ trợ”) — không crash; đúng flag stub. Không chặn luồng password.
5. **A11y snapshot result nghèo** — tree chỉ thấy heading “Chưa đạt” + “Từng câu”, thiếu %/1/4 trong interactive snapshot (nội dung vẫn thấy trên UI). Có thể ảnh hưởng screen reader / tool audit.
6. **(Ngoài run này, gate sản phẩm)** — “học xong 4 bài” ≠ mở đề: còn **practice REQUIRED** + review ladder (THEORY/quickCheck). Nếu learner mới chỉ complete lesson rồi tìm đề → CTA khóa / lỗi PRACTICE_REQUIRED — đây là điểm khó dùng lớn nhất của luồng Reading→đề cuối.

## Không lỗi

- Login hybrid + redirect `/learn`
- Topic list / lesson “Đã xong”
- Đề cuối load đủ câu
- Submit → result + CTA làm lại

## Follow-up fix (2026-10-05)

Đã xử lý mục **1** (CTA hit-target) và **6** (thông báo PRACTICE_REQUIRED / review trước khi mở đề). Chi tiết: `fix-ux-cta-gates.md`.
