# AGENTS.md — Quy tắc làm việc dành cho AI Agent

- Phiên bản tài liệu: 1.0
- Cập nhật: 2026-09-18
- Dự án: IeltsPath Platform Frontend (`capstone-fall26-frontend`)

## 1. Mục tiêu và phạm vi

Repository này là một ứng dụng frontend React/Vite cho IeltsPath Platform. Mã nguồn hiện chỉ có màn hình khởi tạo; chưa có tính năng IELTS, API client, router, store hoặc form được triển khai. Agent MUST phân biệt định hướng dự án với hành vi đã có trong code.

## 2. Nguồn tham chiếu và thứ tự ưu tiên

- Trước khi sửa, MUST đọc [`README.md`](./README.md), phần mã và cấu hình liên quan, rồi đọc [Constitution](./.sdd/global/constitution.md), [Global Constraints](./.sdd/constraints/global.md) và kế hoạch trong [`plans/`](./plans/) nếu task chạm đến các quyết định ở đó. Dùng `package.json`, lockfile và code hiện tại để xác minh fact; kế hoạch cũ cung cấp bối cảnh, không thay thế trạng thái hiện tại.
- Với task có spec/plan được phê duyệt, MUST giữ scope và hành vi đã duyệt. Plan có trạng thái `proposed` không đồng nghĩa với approval. Nếu yêu cầu hiện tại, spec/plan và code mâu thuẫn, MUST nêu xung đột và hỏi trước khi đổi hợp đồng hoặc quyết định của sản phẩm.
- Repository có Constitution, Global Constraints và [System Architecture](./.sdd/global/system-architecture.md) trong `.sdd/`; chưa có `CLAUDE.md`, ADR/RFC hay `.sdd/global/security.md`. MUST áp dụng thứ tự ưu tiên ghi trong Constitution; không tự đặt ra ngoại lệ.

## 3. Tech stack và ràng buộc kỹ thuật

- Giữ runtime trong khoảng `Node.js >=24 <25` và `npm >=11 <12`; phiên bản làm việc ghi ở [`.nvmrc`](./.nvmrc) là Node 24.21.0, package manager trong [`package.json`](./package.json) là npm 11.19.0. Dùng npm và `package-lock.json` để cài đặt tái lập.
- Stack hiện có: React 19.3.0, React DOM 19.3.0, TypeScript `~6.0.0` ở chế độ `strict`, Vite 8.3.0, Tailwind CSS 4 qua `@tailwindcss/vite`, shadcn CLI với preset `radix-nova`, ESLint 9. Đối chiếu phiên bản dependency cụ thể với manifest/lockfile trước khi thay đổi.
- `react-router-dom`, Zustand, `react-hook-form`, Zod và `lucide-react` đã là dependency nhưng chưa được nối vào ứng dụng. MUST NOT mô tả chúng như router, store, form hoặc icon đã hoạt động. Chưa có bộ kiểm thử tự động, CI/CD, Docker hoặc cấu hình deployment trong repository.

## 4. Kiến trúc, tổ chức mã và UI

- Giữ `src/app/` cho điểm ghép ứng dụng, `src/features/` cho mã thuộc tính năng, `src/components/` cho UI tái sử dụng, `src/lib/` cho tiện ích chung, `src/styles/` cho CSS toàn cục và `src/types/` cho kiểu dùng chung. `components/`, `features/` và `types/` hiện là thư mục giữ chỗ; MUST NOT tạo cấu trúc tính năng hoặc abstraction trước khi có nhu cầu cụ thể.
- Dùng alias đã cấu hình trong [`vite.config.ts`](./vite.config.ts) và [`tsconfig.app.json`](./tsconfig.app.json): `@/`, `~components/`, `~features/`, `~types/`. Component/page đặt tên `PascalCase`, hook bắt đầu bằng `use`, utility dùng `camelCase`, constant dùng `UPPER_SNAKE_CASE` theo quy ước hiện có. Giữ `strict`; tránh `any` và `ts-ignore` trừ khi bất khả kháng và giải thích lý do.
- Khi triển khai UI mới, MUST thiết kế từ mobile, dùng HTML ngữ nghĩa, điều hướng bàn phím và focus rõ ràng, giữ tương phản WCAG AA. Màn hình chính và module phức tạp MUST có `ErrorBoundary`; thao tác bất đồng bộ MUST có trạng thái chờ, lỗi và trạng thái rỗng phù hợp. Dùng token/CSS hiện có; không rải mã màu cố định.
- Khi cần UI primitive có trong shadcn/ui, MUST dùng component shadcn/ui trong `src/components/ui/`; MUST NOT đưa thêm thư viện UI component khác hoặc tự viết lại primitive tương đương nếu chưa có quyết định được duyệt. Component nghiệp vụ MAY ghép và mở rộng các primitive này; chỉ thêm component shadcn khi tính năng thực sự cần.
- Icon giao diện MUST dùng `lucide-react`; logo và hình minh họa thương hiệu không phải icon giao diện. MUST NOT thêm thư viện icon thứ hai nếu chưa có quyết định được duyệt.
- Tách logic nghiệp vụ khỏi view khi có logic cần tách; ưu tiên pattern lân cận. Không ép router hoặc store vào một tính năng chỉ vì package đã được cài.

## 5. Quy trình làm việc và spec/skill

- MUST chỉ sửa các file cần cho task. Không refactor, đổi format hàng loạt, đổi public contract hay cập nhật tài liệu khác ngoài scope để tiện tay. Nếu gặp lỗi ngoài scope, báo riêng.
- Trước khi thay đổi behavior, MUST kiểm tra yêu cầu và plan/spec liên quan. Chỉ theo plan đã được phê duyệt; không coi `tasks` hay báo cáo cũ là quyền tự mở rộng scope. Nếu cần làm khác spec, MUST dừng phần phụ thuộc và làm rõ.
- Repository hiện chưa có `.sdd/specs/` hoặc `.sdd/skills/`; các ràng buộc kỹ thuật hiện có nằm trong [Global Constraints](./.sdd/constraints/global.md). Nếu môi trường Agent cung cấp skill phù hợp, MUST đọc `SKILL.md` của đúng skill trước khi áp dụng workflow/checklist; không tải skill không liên quan. Nếu registry hoặc constraints khác được thêm sau này, MUST kiểm tra chúng trước khi lập plan hoặc sửa code liên quan.
- Nếu yêu cầu tính năng, API contract hoặc state chưa đủ rõ, MUST hỏi trước khi tự quyết định schema, endpoint, dữ liệu giả hay hành vi sản phẩm.

## 6. Hành động bị cấm và an toàn

- MUST NOT hardcode hoặc commit secret, credential, token, khóa riêng hay dữ liệu cá nhân. `.env`/`.env.*`, `node_modules/` và `dist/` đang bị [`.gitignore`](./.gitignore) loại trừ. Biến `VITE_` đi vào bundle trình duyệt, nên MUST NOT dùng chúng để chứa secret.
- MUST NOT tự thêm dependency hoặc thay đổi `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `components.json`, `.nvmrc`, `.npmrc` nếu thay đổi đó chưa nằm trong yêu cầu được chấp thuận hoặc Spec/Plan được duyệt. Nếu được chấp thuận, cập nhật manifest và lockfile nhất quán; không dùng version `latest` trôi nổi.
- MUST NOT bypass CORS/security headers hoặc xóa/ghi đè asset gốc. Repository không có database hay migration; không tự đặt ra workflow cho chúng.

## 7. Kiểm tra và Definition of Done

- Chạy kiểm tra hẹp nhất có liên quan trước; mở rộng khi thay đổi phần dùng chung hoặc hợp đồng công khai. Với thay đổi code, chạy `npm run lint`, `npm run typecheck` và `npm run build` khi môi trường đáp ứng phiên bản Node/npm của dự án. Hiện không có lệnh `npm test`; không tuyên bố đã chạy test tự động.
- Chỉ báo hoàn thành khi scope và spec liên quan được đáp ứng, không có thay đổi ngoài phạm vi hoặc secret, trạng thái loading/error/empty và a11y được kiểm tra nếu có UI tương ứng, và các lệnh cần thiết đã được chạy. Nếu không chạy được lệnh nào, MUST nêu lệnh và lý do; không gọi kết quả đó là pass.
- Với thay đổi tài liệu thuần túy, MUST kiểm tra link, command, đường dẫn và claim theo repository; không cần chạy build chỉ để xác thực Markdown.

## 8. Git và lệnh đã xác minh

- Commit, nếu task yêu cầu, MUST theo Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`...). Không commit hoặc push nếu task không yêu cầu; không đưa secret vào Git. Chưa có quy ước branch được ghi trong repository.

| Lệnh tại root | Mục đích |
| --- | --- |
| `npm ci` | Cài đặt đúng theo lockfile. |
| `npm run dev` | Chạy Vite local. |
| `npm run lint` | Chạy ESLint. |
| `npm run typecheck` | Kiểm tra TypeScript (`tsc -b`). |
| `npm run build` | Kiểm tra kiểu và build production. |
| `npm run preview` | Xem bản build production đã tạo. |

## 9. Tệp quan trọng

| Đường dẫn | Vai trò |
| --- | --- |
| [`README.md`](./README.md) | Bắt đầu làm việc với repository. |
| [`package.json`](./package.json), [`package-lock.json`](./package-lock.json) | Script, dependency và phiên bản đã giải quyết. |
| [`src/main.tsx`](./src/main.tsx), [`src/app/App.tsx`](./src/app/App.tsx) | Điểm khởi chạy và màn hình hiện tại. |
| [`src/styles/globals.css`](./src/styles/globals.css), [`components.json`](./components.json) | CSS, Tailwind và cấu hình shadcn. |
| [Constitution](./.sdd/global/constitution.md), [Global Constraints](./.sdd/constraints/global.md), [System Architecture](./.sdd/global/system-architecture.md) | Luật cấp cao, ràng buộc kỹ thuật và hiện trạng kiến trúc. |
| [`plans/`](./plans/) | Kế hoạch theo task và báo cáo liên quan. |

## 10. Điểm chưa nhất quán

- [`plans/260915-runtime-dependencies/plan.md`](./plans/260915-runtime-dependencies/plan.md) vẫn ghi `proposed` dù các dependency nêu trong plan đã có trong `package.json`. Khi làm việc với dependency, đối chiếu manifest/lockfile và làm rõ trạng thái phê duyệt nếu cần.
- Màn hình khởi tạo trong `src/app/App.tsx` chưa có `ErrorBoundary` dù quy tắc UI ở trên yêu cầu với màn hình chính. Đây là điểm còn tồn tại; không sửa code ngoài scope chỉ để giải quyết điểm này.

## 11. Cần làm rõ

- Chưa có Feature Spec, hợp đồng API/backend hoặc quy trình phê duyệt spec/plan được thiết lập trong repository. Hỏi người phụ trách khi task phụ thuộc vào các quyết định đó.
- Chưa có chiến lược kiểm thử cho tính năng, quy trình deployment hoặc quy ước branch được ghi nhận; xác nhận khi một task cần đến chúng.
