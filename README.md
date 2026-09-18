# IeltsPath Platform Frontend

Frontend của nền tảng luyện thi IELTS **IeltsPath Platform**. Repository hiện mới có khung ứng dụng React chạy trên trình duyệt và một trang giới thiệu tĩnh; các tính năng luyện thi chưa được triển khai.

## Công nghệ hiện có

- **Ứng dụng và build:** Node.js 24, npm 11, React 19.3.0, React DOM 19.3.0, TypeScript 6 ở chế độ `strict`, Vite 8.3.0 và `@vitejs/plugin-react`.
- **Giao diện:** Tailwind CSS 4 qua `@tailwindcss/vite`, `tw-animate-css`, cấu hình shadcn/ui CLI (preset Radix Nova) và tiện ích `cn`. Chưa có component shadcn nào được thêm vào mã nguồn.
- **Kiểm tra và kiểu:** ESLint 9 với `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`; các gói kiểu `@types/node`, `@types/react`, `@types/react-dom`.
- **Đã cài nhưng chưa dùng trong ứng dụng:** `react-router-dom`, Zustand, `react-hook-form`, Zod và `lucide-react`.

Phiên bản và các script được khai báo trong [`package.json`](./package.json); phiên bản dependency đã giải quyết nằm trong [`package-lock.json`](./package-lock.json).

## Chạy trên máy cá nhân

Cần **Node.js 24.21.0** theo [`.nvmrc`](./.nvmrc) và **npm 11.19.0** theo `package.json`. Từ một thư mục làm việc bất kỳ:

```bash
git clone https://github.com/IeltsPath-Platform/frontend.git
cd frontend
npm ci
npm run dev
```

Mở địa chỉ Vite in ra trong terminal. Khung ứng dụng hiện tại không cần cấu hình `.env` hoặc chạy backend.

## Lệnh thường dùng

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | Chạy máy chủ phát triển Vite. |
| `npm run typecheck` | Kiểm tra kiểu TypeScript (`tsc -b`). |
| `npm run lint` | Kiểm tra mã bằng ESLint. |
| `npm run build` | Kiểm tra kiểu và tạo bản build production trong `dist/`. |
| `npm run preview` | Xem bản build sau khi chạy `npm run build`. |

Hiện chưa có script `test` hoặc bộ kiểm thử tự động trong repository.

## Cấu trúc và quy ước

```text
src/
  main.tsx       Điểm khởi chạy React
  app/           Component gốc và CSS của màn hình hiện tại
  styles/        CSS toàn cục, Tailwind và token giao diện
  lib/           Tiện ích dùng chung (`cn`)
  components/    Vị trí dành cho component tái sử dụng
  features/      Vị trí dành cho mô-đun tính năng
  types/         Vị trí dành cho kiểu dùng chung
```

Ba thư mục `components/`, `features/` và `types/` hiện chỉ có `.gitkeep`. Alias import đã cấu hình: `@/` → `src/`, `~components/` → `src/components/`, `~features/` → `src/features/`, `~types/` → `src/types/`. Quy ước chi tiết về tên file, cấu trúc tính năng và UI nằm trong [`AGENTS.md`](./AGENTS.md).

## Kết nối backend

Mã nguồn hiện chưa có lời gọi API, HTTP client, endpoint, proxy hay biến môi trường cho backend. Vì vậy có thể chạy trang hiện tại độc lập; cách kết nối backend sẽ cần được xác định khi triển khai tính năng đầu tiên.

## Đọc tiếp

- [`AGENTS.md`](./AGENTS.md): quy tắc phát triển và định hướng kiến trúc.
- [`plans/`](./plans/): kế hoạch theo từng công việc; kiểm tra trạng thái plan trước khi áp dụng.
