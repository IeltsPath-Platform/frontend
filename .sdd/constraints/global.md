# Ràng buộc kỹ thuật toàn cục — IeltsPath Platform Frontend

- **Phiên bản:** 1.0
- **Trạng thái:** Áp dụng cho repository frontend hiện tại
- **Cập nhật:** 2026-09-19
- **Phạm vi:** Một ứng dụng frontend trong repository này; không suy rộng sang backend của IeltsPath Platform.

## Mục đích và nguồn

File này ghi các ràng buộc kỹ thuật có bằng chứng trong code, cấu hình và [AGENTS.md](../../AGENTS.md). Luật dài hạn nằm ở [Constitution](../global/constitution.md); sơ đồ và hiện trạng nằm ở [System Architecture](../global/system-architecture.md). Không dùng các plan lịch sử thay cho manifest và source hiện tại.

## Stack đã xác minh

| Khu vực | Công nghệ | Phiên bản đã xác minh | Nguồn | Trạng thái |
| --- | --- | --- | --- | --- |
| Runtime/toolchain | Node.js, npm | 24.21.0; 11.19.0 | [`.nvmrc`](../../.nvmrc), [`package.json`](../../package.json) | Yêu cầu chạy dự án |
| Ứng dụng | React, React DOM | 19.3.0 | [`package-lock.json`](../../package-lock.json) | Đang dùng |
| Ngôn ngữ/build | TypeScript, Vite | 6.0.3; 8.3.0 | [`package-lock.json`](../../package-lock.json), [`tsconfig.app.json`](../../tsconfig.app.json) | Đang dùng |
| Giao diện | Tailwind CSS, shadcn CLI | 4.3.3; 4.21.0 | [`package-lock.json`](../../package-lock.json), [`components.json`](../../components.json) | Tailwind đang dùng; shadcn mới cấu hình |
| Lint | ESLint | 9.39.5 | [`package-lock.json`](../../package-lock.json), [`eslint.config.js`](../../eslint.config.js) | Có script chạy local |

`react-router-dom`, Zustand, `react-hook-form`, Zod và `lucide-react` có trong `dependencies` nhưng chưa được dùng trong `src/`; không coi chúng là routing, state, form hay icon system đã triển khai. Chưa có test framework, HTTP client, API client hoặc cấu hình backend.

## Ràng buộc áp dụng

### GLOB-01: Runtime và cài đặt tái lập

**Scope:** Toàn repository. **Constraint:** MUST dùng Node.js `>=24 <25`, npm `>=11 <12` và `npm ci` với `package-lock.json` khi cần cài dependency tái lập. **Evidence:** `engines`, `packageManager` trong [`package.json`](../../package.json), [`.nvmrc`](../../.nvmrc), [`.npmrc`](../../.npmrc). **Exception:** Thay đổi toolchain phải có yêu cầu/phê duyệt rõ và cập nhật đồng bộ các file liên quan.

### GLOB-02: Dependency và lockfile

**Scope:** Package của frontend. **Constraint:** MUST NOT tự thêm/nâng dependency ngoài yêu cầu được chấp thuận hoặc Spec/Plan đã duyệt; khi thay đổi dependency, MUST giữ manifest và lockfile nhất quán, không dùng dải `latest` trôi nổi. **Evidence:** [AGENTS.md](../../AGENTS.md) và [plan khởi tạo đã hoàn tất](../../plans/260915-react-web-scaffold/plan.md). **Exception:** Thay đổi có phê duyệt với phạm vi và phiên bản cụ thể.

### GLOB-03: Tổ chức source và alias

**Scope:** `src/`. **Constraint:** Đặt phần ghép ứng dụng ở `app/`, mã theo tính năng ở `features/`, UI tái sử dụng ở `components/`, tiện ích ở `lib/`, CSS toàn cục ở `styles/`, kiểu dùng chung ở `types/`; dùng các alias `@/`, `~components/`, `~features/`, `~types/` đã cấu hình. MUST NOT coi thư mục giữ chỗ là module đã triển khai. **Evidence:** [`src/`](../../src/), [`vite.config.ts`](../../vite.config.ts), [`tsconfig.app.json`](../../tsconfig.app.json), [AGENTS.md](../../AGENTS.md). **Exception:** Tổ chức mới cần quyết định kiến trúc được duyệt.

### GLOB-04: TypeScript và tên mã nguồn

**Scope:** Mã TypeScript. **Constraint:** MUST giữ `strict`; component/page dùng `PascalCase`, hook bắt đầu bằng `use`, utility dùng `camelCase`, constant dùng `UPPER_SNAKE_CASE`. Tránh `any`/`ts-ignore` trừ trường hợp bất khả kháng và có giải thích. **Evidence:** [`tsconfig.app.json`](../../tsconfig.app.json), [AGENTS.md](../../AGENTS.md). Quy ước hook/constant hiện có trong tài liệu, chưa có nhiều implementation để kiểm tra độc lập.

### GLOB-05: Styling và cấu hình trình duyệt

**Scope:** Frontend. **Constraint:** Giữ Tailwind CSS v4 theo cách CSS-first qua `@tailwindcss/vite`, token trong [`src/styles/globals.css`](../../src/styles/globals.css) và preset shadcn trong [`components.json`](../../components.json). Chỉ đưa cấu hình không nhạy cảm vào biến `VITE_`; repository chưa định nghĩa biến môi trường nào. **Evidence:** [`vite.config.ts`](../../vite.config.ts), CSS hiện tại, [plan Tailwind đã hoàn tất](../../plans/260915-tailwind-shadcn-setup/plan.md), [AGENTS.md](../../AGENTS.md). Luật bảo vệ secret nằm trong [Constitution](../global/constitution.md).

### GLOB-06: Trạng thái lỗi của giao diện

**Scope:** Màn hình chính, module phức tạp và thao tác bất đồng bộ của frontend. **Constraint:** MUST dùng `ErrorBoundary` cho màn hình chính/module phức tạp; thao tác bất đồng bộ MUST thể hiện trạng thái chờ, lỗi và rỗng phù hợp. **Evidence:** [AGENTS.md](../../AGENTS.md). Màn hình khởi tạo hiện chưa đáp ứng phần `ErrorBoundary`; xem [khoảng trống kiến trúc](../global/system-architecture.md).

### GLOB-07: Thư viện UI component và icon

**Scope:** UI mới của frontend. **Constraint:** Khi cần UI primitive đã có trong shadcn/ui, MUST dùng component shadcn/ui tại `src/components/ui/`; MUST NOT thêm thư viện UI component khác hoặc viết lại primitive tương đương nếu chưa có quyết định được duyệt. Component nghiệp vụ MAY ghép/mở rộng các primitive đó. Icon giao diện MUST dùng `lucide-react`; logo và minh họa thương hiệu nằm ngoài quy tắc icon. MUST NOT thêm thư viện icon thứ hai nếu chưa có quyết định được duyệt. **Evidence:** Quyết định chuẩn hóa UI của người dùng, preset `radix-nova` và `iconLibrary: "lucide"` trong [`components.json`](../../components.json), dependency trong [`package.json`](../../package.json). **Exception:** Nhu cầu không được shadcn/Lucide đáp ứng cần ghi rõ lý do và được phê duyệt trước khi dùng giải pháp khác. Hiện chưa có component shadcn được thêm vào source.

## Kiểm tra và command reference

| Lệnh ở root | Mục đích đã xác minh |
| --- | --- |
| `npm ci` | Cài đúng dependency từ lockfile. |
| `npm run dev` | Chạy Vite dev server. |
| `npm run lint` | Chạy ESLint. |
| `npm run typecheck` | Chạy `tsc -b --pretty false`. |
| `npm run build` | Chạy `tsc -b && vite build`. |
| `npm run preview` | Xem bản build bằng Vite preview. |

Các lệnh trên lấy từ [`package.json`](../../package.json). Chưa có script `test`, test suite, CI hoặc ngưỡng coverage; MUST NOT báo kiểm thử tự động đã pass. Chạy kiểm tra liên quan trước khi kết luận và ghi rõ lệnh không thể chạy.

## Chưa có quy ước kỹ thuật

Không có API contract, persistence/migration, backend service, logging/observability hoặc deployment config trong repository; vì vậy chưa đặt quy tắc kỹ thuật cho các phần đó. `plans/260915-runtime-dependencies/plan.md` còn trạng thái `proposed` dù dependency đã có trong manifest; cần làm rõ trạng thái plan, không dùng nó để suy đoán kiến trúc đã triển khai.
