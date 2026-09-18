# Kiến trúc hệ thống — IeltsPath Platform Frontend

- **Phiên bản:** 1.0
- **Trạng thái:** Mô tả hiện trạng đã xác minh
- **Cập nhật:** 2026-09-19
- **Phạm vi:** Chỉ repository frontend; chưa có bằng chứng về topology của toàn bộ IeltsPath Platform.

## 1. Tổng quan

Repository chứa một ứng dụng React kết xuất ở trình duyệt, build bằng Vite. Màn hình hiện tại là trang khởi tạo tĩnh. [README](../../README.md) mô tả mục tiêu sản phẩm IELTS; source chưa triển khai tính năng luyện thi.

```text
index.html
    │ tải entry của ứng dụng
    ▼
src/main.tsx ──> React root ──> src/app/App.tsx ──> màn hình khởi tạo
    │                                  │
    └── src/styles/globals.css         └── src/app/app.css
```

Vite phục vụ source khi phát triển và tạo `dist/` qua `npm run build`; repository chưa xác định nơi triển khai artifact này. Sơ đồ trên thể hiện composition của frontend, không hàm ý có gateway hoặc backend.

## 2. Component và trách nhiệm

| Thành phần | Loại | Trách nhiệm hiện tại | Có thể triển khai độc lập? |
| --- | --- | --- | --- |
| Frontend React/Vite | Ứng dụng frontend duy nhất | Tải UI, mount React vào `#root`, hiển thị trang khởi tạo | Có artifact `dist/`; chưa có cấu hình triển khai |
| [`src/app/`](../../src/app/) | Module trong frontend | Chứa `App.tsx` và CSS của màn hình hiện tại | Không |
| [`src/styles/`](../../src/styles/) | Module giao diện | CSS toàn cục, Tailwind và token màu | Không |
| [`src/lib/`](../../src/lib/) | Tiện ích dùng chung | `utils.ts` tái xuất `cn` | Không |

[`src/components/`](../../src/components/), [`src/features/`](../../src/features/) và [`src/types/`](../../src/types/) hiện chỉ có `.gitkeep`. Đây là ranh giới tổ chức được định hướng trong [AGENTS.md](../../AGENTS.md), chưa phải các component, feature hoặc bounded context đang chạy. Không có service backend, shared service, gateway, service discovery hay hạ tầng được cấu hình trong repository.

## 3. Luồng thực thi và giao tiếp

1. Trình duyệt tải [`index.html`](../../index.html), trỏ tới [`src/main.tsx`](../../src/main.tsx) khi chạy qua Vite.
2. `main.tsx` tạo React root, bọc `App` bằng `StrictMode` và nạp CSS toàn cục.
3. [`App.tsx`](../../src/app/App.tsx) hiển thị nội dung tĩnh; CSS cục bộ nằm trong `app.css`.

**Đồng bộ:** Chỉ có việc tải tài nguyên frontend và kết xuất React. Source không có request HTTP tới backend, API client, route hoặc hợp đồng dữ liệu ngoài.

**Bất đồng bộ/event:** Chưa có messaging, event flow, job, cache hoặc đồng bộ dữ liệu từ server.

**External systems:** Chưa có tích hợp hệ thống ngoài được xác minh. Các package `react-router-dom`, Zustand, `react-hook-form`, Zod và `lucide-react` đã cài nhưng chưa tham gia luồng thực thi.

## 4. Bounded context và quyền sở hữu dữ liệu

Chưa xác minh được bounded context nào trong repository: `src/features/` rỗng và không có feature nghiệp vụ. Ứng dụng chưa sở hữu hoặc lưu dữ liệu nghiệp vụ; nội dung đang hiển thị là chuỗi tĩnh trong `App.tsx`. Không có database, migration, persistence adapter hoặc dữ liệu dùng chung giữa service. Quyền sở hữu dữ liệu của backend IeltsPath Platform **cần làm rõ** trước khi mô tả.

## 5. Ranh giới bảo mật

Mã frontend chạy trong trình duyệt; hiện chưa có xác thực, phân quyền, backend request hoặc biến môi trường ứng dụng. Không có proxy trong [`vite.config.ts`](../../vite.config.ts). Các invariant bảo mật cấp cao nằm trong [Constitution](./constitution.md); repository chưa có `.sdd/global/security.md` để tham chiếu policy chi tiết.

## 6. Kiểu kiến trúc và quyết định đã xác nhận

| Quyết định | Hiện trạng | Bằng chứng |
| --- | --- | --- |
| Ứng dụng React kết xuất ở client, build bằng Vite | Đang dùng | [`main.tsx`](../../src/main.tsx), [`vite.config.ts`](../../vite.config.ts), [plan khởi tạo](../../plans/260915-react-web-scaffold/plan.md) |
| Tailwind CSS v4 theo cách CSS-first; shadcn đã khởi tạo, chưa có component | Đang dùng CSS; UI library mới ở mức cấu hình | [`globals.css`](../../src/styles/globals.css), [`components.json`](../../components.json), [plan Tailwind](../../plans/260915-tailwind-shadcn-setup/plan.md) |
| Tổ chức source theo tính năng | Định hướng; chưa có feature được triển khai | [AGENTS.md](../../AGENTS.md), [`src/features/`](../../src/features/) |

Không có bằng chứng để tuyên bố repository đang áp dụng DDD, Clean Architecture hoặc Microservices. Không suy rộng định hướng thư mục frontend thành topology backend.

## 7. Khoảng trống và điểm chưa nhất quán

- [AGENTS.md](../../AGENTS.md) yêu cầu `ErrorBoundary` cho màn hình chính, nhưng [`App.tsx`](../../src/app/App.tsx) chưa được bọc. Đây là hiện trạng source; task tài liệu này không sửa code.
- [`plans/260915-runtime-dependencies/plan.md`](../../plans/260915-runtime-dependencies/plan.md) vẫn ghi `proposed` dù các dependency đã có trong [`package.json`](../../package.json). Việc có package không chứng minh routing/store/form đã được triển khai.
- Chưa có `.sdd/global/security.md` dù bộ artifact SDD có dự kiến tách security policy. Chưa có cơ sở để mô tả policy chi tiết.

## 8. Cần làm rõ

- Feature IELTS đầu tiên, ranh giới tính năng và dữ liệu của nó.
- Hợp đồng backend/API, xác thực và data ownership khi tích hợp.
- Môi trường triển khai, chiến lược kiểm thử và người phê duyệt sửa đổi Constitution.
