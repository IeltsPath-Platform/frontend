# CLAUDE.md — IeltsPath frontend

- Quy tắc bắt buộc (stack, UI, bảo mật, điều cấm, quy trình, graphify) nằm trong `AGENTS.md`, được nạp ngay dưới đây.

@AGENTS.md

## graphify

- BẮT BUỘC: khi `graphify-out/graph.json` tồn tại, mọi câu hỏi về codebase phải chạy `graphify query "<câu hỏi>"`,
  `graphify explain "<Symbol>"` hoặc `graphify path "<A>" "<B>"` TRƯỚC khi grep/đọc file; chỉ mở file nguồn của node graph trả về.
- Sau khi sửa code: `graphify update .`.
