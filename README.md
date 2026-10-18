# IeltsPath Platform Frontend

Frontend React + Vite của nền tảng luyện thi IELTS **IeltsPath Platform**.

## Công nghệ

- Node.js 24 (khuyến nghị theo `.nvmrc`), npm 11, React 19, TypeScript strict, Vite 8
- Tailwind CSS 4, React Router 7

## Chạy trên máy cá nhân

```bash
cd frontend
cp .env.example .env   # chỉnh nếu cần
npm ci                 # hoặc: npm install --engine-strict=false nếu Node chưa đúng engines
npm run dev
```

Mở URL Vite in ra (mặc định `http://localhost:5173`).

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Gateway BE |
| `VITE_USE_MOCK_LEARNING` | `false` khi có base URL | `true` = mock learning; `false` = HTTP `/api/learning/**` |

Không commit file `.env` (đã có trong `.gitignore`). Dùng `.env.example` làm mẫu.

### Dashboard

Dashboard `/overview` hiện dùng dữ liệu mẫu riêng, không chịu ảnh hưởng của `VITE_USE_MOCK_LEARNING`. Giao diện tách lời chào, khóa học, hành trình, thống kê, lịch hoạt động, bốn kỹ năng, kế hoạch và gợi ý AI thành các phần độc lập; SPACE hiển thị dạng danh sách. Lịch hiển thị từng tháng, không cuộn lồng bên trong. Lịch “chăm chỉ” hiển thị trạng thái T2–CN của dữ liệu mẫu trong tuần hiện tại theo ngày trên thiết bị; các ngày khác hiển thị chưa có dữ liệu. Có thể đổi tháng và chọn ngày/tuần để xem trạng thái; chưa có số bài nộp theo ngày từ backend. Hiệu ứng xuất hiện, vẫy tay, thanh kỹ năng, đánh dấu bài học và lửa đều tôn trọng cài đặt giảm chuyển động. Menu dashboard bám theo khi cuộn và chuyển thành hàng ngang trên màn hình nhỏ.

### Backend cần chạy

- Gateway `:8080` (CORS + credentials)
- user_db + learning_db + content/assessment theo stack BE
- Nhánh BE có learning API đầy đủ (không chỉ skeleton)

Auth: hybrid — cookie HttpOnly (`credentials: 'include'`) + `Authorization: Bearer` (access token **memory-only**). Refresh `POST /auth/refresh` khi 401 (một lần, single-flight). Me: `GET /api/users/me`.

## Lệnh thường dùng

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | Dev server Vite |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Xem bản build |

## Cấu trúc

```text
src/
  app/           Router, ErrorBoundary
  lib/           env, httpClient, utils
  features/      auth, learning-path, …
  components/    Navbar, UI
  types/         Shared DTOs (UI)
```

## Đọc tiếp

- [`AGENTS.md`](./AGENTS.md)
- [`plans/261002-2048-fe-auth-learning/`](./plans/261002-2048-fe-auth-learning/)
- BE: `backend/docs/fe-main-flow-guide.md`, `backend/docs/contracts/lesson-learning-v1.md`


### Trò chơi Wordly

Vào **Trò Chơi** trên navbar hoặc `/games` sau khi đăng nhập. Module nằm ở
`src/features/games/`, chia `pages`, `components`, `hooks`, `api`, `types` và `lib`.

- Catalog lấy từ backend; Tên lửa chưa khả dụng. Chọn Wordly mở popup chọn chế độ.
- Tạo phòng: 3–6 mạng, hữu hạn tối thiểu5 từ hoặc vô hạn; chơi đơn có tùy chọn timer.
- Sảnh phòng hiển thị thành viên thật, sẵn sàng và popup sửa cấu hình cho chủ phòng khi WAITING.
- Chơi đơn dùng bảng N cột/N+1 hàng, hint1 lần/từ, điểm/chuỗi/mạng do backend quyết định.
- Gửi lại lượt đoán đang chờ giữ nguyên requestId/payload; tải lại khôi phục trạng thái từ server.
- Multiplayer dùng WebSocket ticket một lần (không đưa JWT lên URL), tự xin ticket mới khi nối lại; REST định kỳ 2.5s phục hồi trạng thái với abort/khóa chống ghi đè response cũ.
- Kết thúc đọc kết quả chính thức; chơi lại trở về phòng khi phòng còn tồn tại.
- Tổng kết bỏ số mạng còn lại và cột mạng; ranking chuyển thành thẻ khi vùng hiển thị hẹp. Khi đang chơi multiplayer, ranking nằm cạnh phải khu chơi trên desktop và xuống dưới trên màn nhỏ. Bảng chữ và bàn phím co theo chiều rộng màn hình.
- Multiplayer tối đa 4 người: ready/start, host kick khi WAITING, bảng riêng, ranking trực tiếp, hết mạng/hoàn thành chuyển sang theo dõi, tổng kết giữ người đã rời trận.
- Host rời giữa trận không đóng trận; cuối trận hiển thị ranking rồi popup đóng phòng. Cache trong sessionStorage chỉ lưu UUID host theo match để khôi phục thông báo trong tab, không chứa token.
- Mở kết quả bằng tab mới chưa từng vào phòng có thể chỉ hiện thông báo phòng không khả dụng: API kết quả hiện chưa trả host/closure metadata.

Không thêm thư viện. Cấu hình `VITE_API_BASE_URL` trỏ Gateway đang chạy; local hiện dùng18080. Mở FE bằng `http://localhost:5173/games` khi Gateway dùng
`http://localhost:18080` để cookie refresh có cùng hostname.
Kiểm tra: `npm run lint`, `npm run typecheck`, `npm run build`,
`node --test tests/games-render.test.mjs`.

Wordly hiển thị từ không tồn tại bằng popup giữa bảng tự ẩn sau3giây. Nhập chữ/phím có hiệu ứng nảy; gửi đáp án lật lần lượt từng ô rồi mới chuyển từ hoặc mở kết quả. Hiệu ứng tuân prefers-reduced-motion; không thay đổi cách backend tính điểm hoặc deadline.
