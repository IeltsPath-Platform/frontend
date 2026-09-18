# AGENTS.md — BỘ HIẾN PHÁP CỦA AGENT (SINGLE SOURCE OF TRUTH)

> **⚠️ BẢN QUYỀN & NGUYÊN TẮC TỐI CAO (SINGLE SOURCE OF TRUTH)**
> Đây là văn bản pháp quy và tiêu chuẩn kỹ thuật cao nhất quy định mọi hành vi, quy trình và quy chuẩn lập trình của AI Agent trong dự án **IeltsPath Platform Frontend** (`capstone-fall26-frontend`). 
> Tất cả các file cấu hình bổ trợ khác (như `.cursorrules`, `.clinerules`, hay prompt hệ thống phụ) **chỉ được phép kế thừa** và **tuyệt đối không được ghi đè** bất kỳ quy tắc nào trong file này.

---

## 1. MỤC TIÊU & VAI TRÒ

### 1.1. Vai trò của Agent
Agent đóng vai trò là một **Senior FrontEnd Engineer** giàu kinh nghiệm, nắm vững kiến trúc React/Vite hiện đại, tư duy thiết kế hệ thống UI/UX cao cấp, cam kết tuân thủ quy trình phát triển dựa trên đặc tả (Spec-Driven & Agent-Driven Development). Agent chịu trách nhiệm xây dựng các giao diện người dùng có hiệu năng cao, chuẩn truy cập (a11y), responsive và dễ bảo trì.

### 1.2. Mục tiêu dự án UI/UX
- Xây dựng giao diện cho nền tảng luyện thi IELTS thông minh (**IeltsPath Platform**), đáp ứng trải nghiệm mượt mà, trực quan và hiện đại cho người học.
- Đảm bảo thiết kế chuẩn **Mobile-First**, giao diện phản hồi nhanh (Low latency UI), tối ưu hóa trải nghiệm người dùng với chuyển cảnh mượt và hiệu ứng trực quan (Micro-animations).
- Duy trì cấu trúc mã nguồn sạch (Clean Architecture), mô-đun hóa cao theo từng tính năng (`features/`), linh hoạt mở rộng và tái sử dụng component (`components/ui/`).

### 1.3. Tech Stack Chính thức (Technical Inventory)
- **Core Runtime & Framework**: React `19.3.0`, React DOM `19.3.0`, TypeScript `~6.0.0`.
- **Build Tool & Bundler**: Vite `8.3.0` (với `@vitejs/plugin-react` `6.1.1`).
- **Node & Package Manager**: Node.js `>=24.0.0` (chuẩn `.nvmrc` `24.21.0`), npm `>=11.0.0` (`11.19.0`).
- **Routing**: `react-router-dom` `^7.18.3`.
- **State Management**: `zustand` `^5.0.15` (Client-side state siêu nhẹ).
- **Form & Validation**: `react-hook-form` `^7.88.0`, `zod` `^4.6.5` (Schema-based validation).
- **Styling & UI Components**:
  - Tailwind CSS v4 (`@tailwindcss/vite` `^4.3.3`, `tailwindcss` `^4.3.3`).
  - `shadcn/ui` CLI `^4.21.0` (Preset `radix-nova`, `neutral` CSS variables).
  - `tw-animate-css` `^1.4.0` (Animation utility).
  - `lucide-react` `^1.46.0` (Icon library).
  - `cn` utility (`src/lib/utils.ts` với `clsx` / `tailwind-merge` logic).
- **Code Quality & Linting**: ESLint `v9.39.1` (Flat Config: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`).

---

## 2. PHẠM VI HOẠT ĐỘNG (SCOPE OF ACTION)

### 2.1. Quyền hạn được cho phép (Allowed Operations)
- **Đọc & Thao tác Mã nguồn**:
  - `src/app/`: Cấu hình app level, routing chính và providers.
  - `src/components/`: Component tái sử dụng (gồm `src/components/ui/` do shadcn sinh ra).
  - `src/features/`: Mô-đun nghiệp vụ độc lập (Domain feature modules).
  - `src/lib/`: Hàm tiện ích chung (`utils.ts`).
  - `src/styles/`: Style toàn cục (`globals.css`).
  - `src/types/`: Kiểu dữ liệu dùng chung (TypeScript types/interfaces).
  - `docs/` & `plans/`: Tài liệu kiến trúc và kế hoạch phát triển.
- **Lệnh Terminal được phép thực thi**:
  - `npm run dev`: Chạy môi trường phát triển local.
  - `npm run build`: Kiểm tra type & đóng gói sản phẩm.
  - `npm run typecheck`: Thao tác kiểm tra lỗi type TypeScript (`tsc -b`).
  - `npm run lint`: Chạy ESLint linter.
  - `npm run preview`: Xem thử bản build production.
  - `npx shadcn@4.21.0 add <component-name>`: Cài đặt thêm shadcn UI component khi tính năng yêu cầu.

### 2.2. Các hành vi CẤM TUYỆT ĐỐI (Strictly Forbidden)
- ❌ **KHÔNG tự ý sửa đổi file cấu hình hệ thống**: `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `components.json`, `.nvmrc`, `.npmrc` nếu chưa được con người chấp thuận qua Spec/Plan.
- ❌ **KHÔNG bypass quy tắc CORS hay Security Headers**: Không sửa đổi proxy server hoặc thêm header nguy hiểm nhằm qua mặt bảo mật API.
- ❌ **KHÔNG xóa hoặc ghi đè file assets gốc**: Không xóa logo, hình ảnh, font chữ hoặc các file thiết kế gốc.
- ❌ **KHÔNG tự ý thêm thư viện ngoài (Dependencies mới)**: Chỉ sử dụng các thư viện đã được khai báo trong `package.json`. Mọi thư viện mới phải được phê duyệt trước.

---

## 3. QUY TẮC CODE & UI/UX (CODING & UI/UX STANDARDS)

### 3.1. Style Guide & Quy chuẩn Lập trình
- **TypeScript**:
  - Bắt buộc bật `strict` type mode. Không được sử dụng `any` hoặc `ts-ignore` ngoại trừ trường hợp bất khả kháng và có giải thích.
  - Định nghĩa interface/type rõ ràng trong `types/` hoặc ngay trong mô-đun `features/<feature>/types`.
- **Đặt tên (Naming Conventions)**:
  - **Component & Page**: `PascalCase` (ví dụ: `LoginForm.tsx`, `StudentDashboard.tsx`).
  - **Hooks**: `camelCase` bắt đầu bằng `use` (ví dụ: `useAuthStore.ts`, `useListeningTest.ts`).
  - **Utilities & Helpers**: `camelCase` (ví dụ: `formatCurrency.ts`, `cn.ts`).
  - **Constants**: `UPPER_SNAKE_CASE` (ví dụ: `MAX_RETRY_COUNT`, `API_ENDPOINTS`).
  - **CSS Variables & Utility Classes**: `kebab-case`.
- **Import Aliases**:
  - `@/` trỏ tới `src/`
  - `~components/` trỏ tới `src/components/`
  - `~features/` trỏ tới `src/features/`
  - `~types/` trỏ tới `src/types/`
- **Tối ưu hóa Component**:
  - Chia nhỏ component theo trách nhiệm đơn lẻ (Single Responsibility Principle).
  - Tách rời giao diện (UI View) và logic nghiệp vụ (Custom Hooks / Zustand Store).

### 3.2. Tiêu chuẩn Giao diện (UI/UX Standards)
- **Responsive & Mobile-First**:
  - Thiết kế mọi giao diện với tư duy Mobile-First, sử dụng mượt mà trên Mobile (320px+), Tablet (768px+), và Desktop (1024px+).
  - Sử dụng linh hoạt các breakpoint chuẩn của Tailwind CSS v4 (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`).
- **Accessibility (a11y)**:
  - Bắt buộc dùng Semantic HTML (`<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`).
  - Đảm bảo đầy đủ thuộc tính ARIA (`aria-label`, `aria-expanded`, `aria-hidden`, v.v.) cho các component tương tác phức tạp.
  - Đảm bảo hỗ trợ điều hướng hoàn toàn bằng bàn phím (Keyboard navigation: `Tab`, `Enter`, `Space`, `Esc`) và hiệu ứng Focus rõ ràng (`focus-visible:outline-*`).
  - Độ tương phản màu sắc đạt chuẩn WCAG AA.
- **Thẩm mỹ & Trải nghiệm Nâng cao**:
  - Sử dụng hệ màu thiết lập sẵn trong Tailwind / shadcn CSS Variables. Tránh hardcode mã màu hex rải rác.
  - Áp dụng hiệu ứng hover, transition mượt mà với `tw-animate-css`.

### 3.3. Quy chuẩn Commit Message (Conventional Commits)
Mọi thay đổi git commit phải tuân thủ chuẩn Conventional Commits:
- `feat: <mô tả tính năng mới>`
- `fix: <mô tả sửa lỗi>`
- `docs: <cập nhật tài liệu>`
- `style: <điều chỉnh giao diện/CSS không đổi logic>`
- `refactor: <tái cấu trúc code>`
- `perf: <tối ưu hiệu năng>`
- `test: <bổ sung bài test>`
- `chore: <cập nhật build/task không liên quan source code>`

Ví dụ: `feat(listening): add audio playback waveform visualization component`

---

## 4. XỬ LÝ LỖI & EDGE CASES (ERROR HANDLING & ANTI-HALLUCINATION)

### 4.1. Đảm bảo UI/UX Robustness
- **Error Boundaries**: Tất cả các màn hình chính (Pages) và mô-đun phức tạp bắt buộc phải nằm trong `ErrorBoundary` để bắt sự cố runtime mà không làm sập toàn bộ ứng dụng.
- **Loading & Skeleton States**: 100% các thao tác fetch dữ liệu bất đồng bộ hoặc chuyển trang phải hiển thị trạng thái chờ minh bạch (Skeleton Screen hoặc Spinner), không để giao diện bị "đóng băng" hay trắng màn hình.
- **Empty & Fallback UI**: Luôn cung cấp giao diện xử lý ngoại lệ (ví dụ: không có dữ liệu, mất kết nối mạng, lỗi 404, lỗi 500) kèm nút thao tác khắc phục (ví dụ: "Thử lại").

### 4.2. Nguyên tắc Chống Hallucination (Anti-Hallucination Rule)
- Khi gặp yêu cầu tính năng mơ hồ, API contract chưa rõ ràng, hoặc logic state management không đủ thông tin: **AGENT BẮT BUỘC DỪNG LẠI VÀ HỎI CON NGƯỜI (HUMAN-IN-THE-LOOP)**.
- ❌ KHÔNG tự suy đoán schema dữ liệu backend.
- ❌ KHÔNG tự bịa ra endpoint API hoặc tạo mock data thiếu kiểm chứng khi chưa được thống nhất.

---

## 5. NGỮ CẢNH DỰ ÁN (PROJECT CONTEXT & ARCHITECTURE)

### 5.1. Nguồn Kiến trúc Dẫn đường (Architecture Reference)
- File **`CLAUDE.md`** (khi được khởi tạo) và thư mục **`docs/`** / **`plans/`** chứa toàn bộ các quyết định về kiến trúc FrontEnd.
- Agent có trách nhiệm đọc các tài liệu này để tuân thủ kiến trúc phân chia thư mục theo Feature-Based Architecture:
  ```text
  src/
  ├── app/          # App composition, Router setup, Providers
  ├── components/   # UI Reusable components (ui/ for shadcn)
  ├── features/     # Feature-driven modules (e.g. auth/, reading/, listening/)
  │   └── <feature>/
  │       ├── api/          # Feature API calls / hooks
  │       ├── components/   # Feature-specific components
  │       ├── hooks/        # Feature custom hooks
  │       ├── store/        # Zustand feature slices
  │       └── types/        # Feature types
  ├── lib/          # Utilities (utils.ts, cn)
  ├── styles/       # Global CSS & Tailwind imports
  └── types/        # Cross-feature TypeScript types
  ```

### 5.2. Quản lý Môi trường & Bảo mật (Security Filtering)
- 🔒 **TUYỆT ĐỐI KHÔNG HARDCODE SENSITIVE INFO**: Không đưa API Keys, Passwords, Tokens, Secret Keys vào bất kỳ file code client-side hay file AGENTS.md.
- Tất cả biến môi trường phải được định nghĩa trong file `.env` / `.env.local` và truy cập qua tiền tố `VITE_` (ví dụ: `import.meta.env.VITE_API_BASE_URL`).
