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

Trong danh sách bài học, nút Làm bài ôn chỉ nằm ở bài học sở hữu bài ôn theo `pendingReviews.lessonId`. Các bài bị chặn bởi bài ôn vẫn giữ trạng thái khóa và lý do chờ; tên bài học có bài ôn vẫn mở lại được.

Đường nối giữa các bài tô xanh theo trạng thái đã hoàn thành; đoạn chưa học giữ xám, hiệu ứng tôn trọng chế độ giảm chuyển động.

Đường nối giữa các topic tô cam theo tỷ lệ bài học đã hoàn thành trong topic đang học, tô xanh toàn đoạn khi topic đã qua và giữ xám với topic bị khóa. Tỷ lệ hiển thị giữ nguyên khi mở/thu gọn chặng; chỉ trạng thái topic đã qua mới dùng màu xanh, kể cả khi đã học hết bài nhưng còn kiểm tra chặng.

Sau khi nộp bộ câu hỏi ôn, trang giữ nguyên đề và câu trả lời để xem đúng/sai, đáp án và giải thích mà API trả về. Người học tự bấm đọc lại lý thuyết, làm bộ tiếp theo hoặc học tiếp sau khi xem kết quả; trang không tự chuyển bước khi nộp xong.

### Cây kiến thức

Trang cây kiến thức của khóa học hiển thị theo cấu trúc khóa học → nhánh kỹ năng → điểm kiến thức, có đường nối và màu trạng thái nắm vững. Có thể lọc kỹ năng và thu gọn từng nhánh; màn hình nhỏ dùng cây dọc. Quan hệ kiến thức nền vẫn hiển thị ở dòng “Xây trên” của từng điểm. Nút Luyện giữ nguyên điều kiện về tim và bộ luyện còn khả dụng.

### Community

Community `/community` yêu cầu đăng nhập, hỗ trợ feed cursor 10 bài/lượt, tìm kiếm toàn văn tiêu đề/nội dung, lọc chủ đề, tạo bài, reaction, lưu bài, bình luận và phản hồi, theo dõi hồ sơ, cùng bảng bài đã lưu. Ảnh/video hiện nhận URL HTTPS được Community backend cho phép; chưa có luồng upload. Chuông thông báo dùng REST để đồng bộ unread và STOMP qua `/ws/notifications`; khi mất kết nối, danh sách REST vẫn là dữ liệu chuẩn.

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
- Chơi đơn: bấm **Bắt đầu chơi** ở màn cấu hình sẽ tự tạo phiên, sẵn sàng và bắt đầu bằng API hiện có, rồi vào thẳng bảng chữ. Không hiển thị mã phòng hoặc sảnh chờ. Nếu bắt đầu lỗi, bấm lại sẽ tái sử dụng phòng vừa tạo; phản hồi start bị mất sẽ được khôi phục từ trận đang chạy.
- Sảnh nhiều người hiển thị thành viên thật, sẵn sàng và popup sửa cấu hình cho chủ phòng khi WAITING. Link phòng đơn cũ tự chuyển vào game và chỉ hiển thị trạng thái bắt đầu/thử lại.
- Chơi đơn dùng bảng N cột/N+1 hàng, hint1 lần/từ, điểm/chuỗi/mạng do backend quyết định.
- Gửi lại lượt đoán đang chờ giữ nguyên requestId/payload; tải lại khôi phục trạng thái từ server.
- Multiplayer dùng WebSocket ticket một lần (không đưa JWT lên URL), tự xin ticket mới khi nối lại; REST định kỳ 2.5s phục hồi trạng thái với abort/khóa chống ghi đè response cũ.
- Kết thúc đọc kết quả chính thức; chơi đơn bấm **Chơi lại** về cấu hình chơi đơn. Nhiều người trở về phòng chờ khi phòng còn tồn tại.
- Mỗi người chỉ ở một phòng. Tạo phòng (đơn hoặc nhiều người) hay vào phòng bằng mã khi còn phòng/trận dở sẽ hiện popup **Tham gia lại phòng** hoặc **Tạo phòng mới**/**Vào phòng mới**; chọn phòng mới sẽ rời phòng cũ trước (trận đang chơi tính là rời trận).
- Trận nhiều người: người mất kết nối hiển thị đếm ngược 30 giây trong bảng xếp hạng; hết giờ bị tính rời trận, vào lại chỉ xem được bảng xếp hạng.
- Tổng kết bỏ số mạng còn lại và cột mạng; ranking chuyển thành thẻ khi vùng hiển thị hẹp. Khi đang chơi multiplayer, ranking nằm cạnh phải khu chơi trên desktop và xuống dưới trên màn nhỏ. Bảng chữ và bàn phím co theo chiều rộng màn hình.
- Multiplayer tối đa 4 người: ready/start, host kick khi WAITING, bảng riêng, ranking trực tiếp, hết mạng/hoàn thành chuyển sang theo dõi, tổng kết giữ người đã rời trận.
- Host rời giữa trận không đóng trận; cuối trận hiển thị ranking rồi popup đóng phòng. Cache trong sessionStorage chỉ lưu UUID host theo match để khôi phục thông báo trong tab, không chứa token.
- Mở kết quả bằng tab mới chưa từng vào phòng có thể chỉ hiện thông báo phòng không khả dụng: API kết quả hiện chưa trả host/closure metadata.

Không thêm thư viện. Cấu hình `VITE_API_BASE_URL` trỏ Gateway đang chạy; local hiện dùng18080. Mở FE bằng `http://localhost:5173/games` khi Gateway dùng
`http://localhost:18080` để cookie refresh có cùng hostname.
Kiểm tra: `npm run lint`, `npm run typecheck`, `npm run build`,
`node --test tests/games-render.test.mjs`.

Wordly hiển thị từ không tồn tại bằng popup giữa bảng tự ẩn sau3giây. Nhập chữ/phím có hiệu ứng nảy; gửi đáp án lật lần lượt từng ô rồi mới chuyển từ hoặc mở kết quả. Hiệu ứng tuân prefers-reduced-motion; không thay đổi cách backend tính điểm hoặc deadline.

### P-43 practice

`/practice-tests?skill=reading` uses the content catalog and assessment attempt APIs through the Gateway. Reading requires authenticated backend services and does not use `VITE_USE_MOCK_LEARNING`; saved responses, submissions, results, and Reading history are loaded from backend APIs. Listening and Writing keep their existing mock practice screens because the backend does not currently publish standalone P-43 practice content for those skills. Writing's Points balance and activation key dialog use the access-service APIs; essay grading remains unavailable for this standalone screen.
