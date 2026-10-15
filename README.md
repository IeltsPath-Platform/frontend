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

### Điều hướng trong bài học

Slide, Lesson Summary, Tài liệu và Luyện tập là các mục trong cùng trang bài học; breadcrumb luôn kết thúc ở tên bài. Khi mở bài ôn từ Luyện tập, breadcrumb giữ khóa học, chủ đề, bài học và thêm trang bài ôn. Tên bài học và nút quay lại đưa về đúng mục Luyện tập; bộ câu hỏi đang làm có nút riêng để về danh sách luyện tập.

Đường nối giữa các bài tô xanh theo trạng thái đã hoàn thành; đoạn chưa học giữ xám, hiệu ứng tôn trọng chế độ giảm chuyển động.

Đường nối giữa các topic tô cam theo tỷ lệ bài học đã hoàn thành trong topic đang học, tô xanh toàn đoạn khi topic đã qua và giữ xám với topic bị khóa. Tỷ lệ hiển thị giữ nguyên khi mở/thu gọn chặng; chỉ trạng thái topic đã qua mới dùng màu xanh, kể cả khi đã học hết bài nhưng còn kiểm tra chặng.

Sau khi nộp bộ câu hỏi ôn, trang giữ nguyên đề và câu trả lời để xem đúng/sai, đáp án và giải thích mà API trả về. Người học tự bấm đọc lại lý thuyết, làm bộ tiếp theo hoặc học tiếp sau khi xem kết quả; trang không tự chuyển bước khi nộp xong.

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
