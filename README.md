# IeltsPath Platform Frontend

Frontend React + Vite của nền tảng luyện thi IELTS **IeltsPath Platform**.

## Công nghệ

- Node.js 24 (khuyến nghị theo `.nvmrc`), npm 11, React 19, TypeScript strict, Vite 8
- Tailwind CSS 4, React Router 7

## Chạy trên máy cá nhân

```bash
cd frontend
cp .env.example .env.local   # file env duy nhất cần chỉnh
npm ci                 # hoặc: npm install --engine-strict=false nếu Node chưa đúng engines
npm run dev
```

Mở URL Vite in ra (mặc định `http://localhost:5173`).

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Gateway BE |
| `VITE_GOOGLE_CLIENT_ID` | *(unset)* | Google Identity Services Web client ID; unset hides Google sign-in |
| `VITE_USE_MOCK_LEARNING` | `false` khi có base URL | `true` = mock learning; `false` = HTTP `/api/learning/**` |
| `VITE_USE_MOCK_ROCKET` | `false` | `false` = Game Tên lửa (`/games/rocket`) gọi HTTP `/api/games/rocket/**`, cần đăng nhập; `true` = chạy mock trong trình duyệt (10 từ mẫu, chỉ chơi đơn, không cần đăng nhập) |
| `VITE_SUPABASE_MEDIA_HOST` | *(xem `.env.example`)* | Host Supabase được phép cho ảnh và video của cộng đồng |
| `VITE_SUPABASE_AVATARS_URL` | *(xem `.env.example`)* | URL công khai của bucket `avatars` |

Chỉ dùng một file env: `.env.local` (đã có trong `.gitignore`, không commit). `.env.example` là mẫu liệt kê đủ mọi biến; biến nào không đặt thì app dùng giá trị mặc định ghi trong mẫu.

### Dashboard

Thanh bên hiển thị Tổng quát, Dữ liệu chi tiết, Thành tích của tôi và Hồ sơ của tôi. Liên kết cũ `?tab=history` hoặc `?tab=ranking` mở Tổng quát. Hồ sơ của tôi không hiển thị khối Mục tiêu học tập.

Trang **Thành tích của tôi** (`/overview?tab=achievements`) có thẻ cấp độ và XP với huy chương, tim và chuỗi ngày học, nhiệm vụ hôm nay, bộ sưu tập huy hiệu và bảng xếp hạng tuần. Giải thích XP và phần thưởng chuỗi được mở theo nhu cầu; nút Tiếp tục học dẫn về `/learn`. Bố cục thích ứng điện thoại, hỗ trợ bàn phím và giảm chuyển động. Dữ liệu và các thao tác hồi tim, mua đóng băng, xem lịch sử giải đấu giữ nguyên API Learning; trang tiến độ học độc lập giữ giao diện mặc định.

Dashboard `/overview` dùng API thật của Learning, Assessment, Library và Access. Tổng thời gian, số ngày học và bài hoàn thành tính trên dữ liệu đã ghi nhận toàn kỳ. Biểu đồ thời gian học thể hiện 7 ngày gần nhất; ngày chưa ghi nhận là khoảng trống và chỉ so sánh với 7 ngày trước khi cả hai kỳ đủ dữ liệu. Tỷ lệ chính xác là số câu đúng / số câu có kết quả đúng-sai của Reading/Listening trong các lần luyện đề chính thức đã nộp, lấy phiên bản chấm hoàn tất mới nhất mỗi lần; không lấy trung bình phần trăm từng bài. Streak giữ nguồn và cách tính hiện có. Khối chuỗi học hiển thị streak hiện tại, kỷ lục và cho phép chuyển tuần trong phạm vi dữ liệu hoạt động đã tải; ngọn lửa theo ngày biểu thị hoạt động được ghi nhận.

My Learning Orbit có bốn hành tinh tương tác: band điểm, từ vựng cần ôn, ôn tập và thành tích. Band ưu tiên kết quả đủ bốn kỹ năng cùng một bài, nếu chưa có thì ghi rõ nguồn ước tính, đầu vào hoặc tự khai; lịch sử chỉ so sánh kết quả tương thích. Từ vựng lấy sổ tay cá nhân, chia Đã vững / Đang học / Chưa học; nút ôn chỉ lấy thẻ đã học đến hạn qua `review=due`. Ôn tập dùng summary giỏ ôn hiện có, tách số bài bắt buộc và điểm kiến thức đến hạn, với nút mở `/learn/review-basket`. Thành tích dùng tổng điểm đã tích lũy, thời gian học và số bài hoàn thành; Sao TIS hiển thị chưa có dữ liệu. Mỗi hành tinh hiển thị chỉ số tóm tắt hoặc `—` khi chưa có dữ liệu.

Các panel hỗ trợ bàn phím, Escape trả tiêu điểm về hành tinh; bố cục thích ứng điện thoại và tôn trọng giảm chuyển động. Trạng thái tải, rỗng và lỗi được hiển thị riêng. Study Plan, lớp học, gợi ý AI và SPACE Autonomy chưa thuộc phạm vi này. Nút Tiếp tục học giữ hành vi hiện có.

Banner tổng quan tải đủ các trang tiến độ khóa học, mặc định chọn khóa học gần nhất. Khi có nhiều khóa, tên khóa là bộ chọn với số bài và phần trăm hoàn thành; đổi lựa chọn cập nhật ngày bắt đầu, tiến độ, số bài còn lại và đích của nút Tiếp tục học. Một khóa không hiện bộ chọn. Lựa chọn đang dùng được giữ qua lần tải lại số liệu nếu khóa còn tồn tại và được đặt lại khi đổi tài khoản; IELTS Journey luôn là dữ liệu chung của học viên. Backend thống kê hiện hỗ trợ tối đa 100 khóa đã bắt đầu, mỗi trang tối đa 20 khóa; lỗi hoặc danh sách thay đổi giữa các trang sẽ hiện yêu cầu thử lại thay vì hiển thị danh sách thiếu.

Màn **Dữ liệu chi tiết** (`/overview?tab=detailed-stats`) gồm banner, tiến độ bốn kỹ năng, lịch sử band và bản đồ từ vựng. Khối danh sách khóa học đã được bỏ khỏi màn này. Bộ chọn **Khóa học** trong khối tiến độ bốn kỹ năng mặc định hiển thị tất cả khóa đã bắt đầu; chọn một khóa cập nhật biểu đồ, tỷ lệ và số bài hoàn thành theo khóa đó. Lựa chọn được lưu bằng tham số `courseId` trên URL và có thể chuyển về tất cả khóa. Lịch sử band lọc riêng theo tuần/tháng, loại bài thi và kỹ năng; bài đầu vào là đường tham chiếu cho Listening, Reading và Writing, không phải một chuỗi kết quả riêng. Tooltip chỉ hiện khi trỏ hoặc đưa tiêu điểm vào điểm dữ liệu. Bản đồ từ vựng dùng thanh ngang theo cấp CEFR, đếm từng nghĩa trong kho IELTS Space; hiển thị band hiện tại, mục tiêu và số nghĩa đang học/cần ôn khi có dữ liệu. Màn này không hiển thị Study Plan, phản hồi mentor hoặc nhận xét AI, không thêm API hay thay đổi cách tính backend.

Các biểu đồ dashboard có animation khi đổi filter: thời gian học vẽ lại line và tăng chiều cao cột khi đổi số ngày/khóa học; tiến độ bốn kỹ năng mở radar và thanh tiến độ khi đổi khóa học; lịch sử band vẽ lại đường khi đổi thời gian, loại bài, kỹ năng hoặc trang kết quả. Vòng tiến độ khóa học, lịch tuần và cột từ vựng cũng có hiệu ứng khi đổi dữ liệu tương ứng. Khung rỗng chuyển cảnh nhẹ, không tạo số liệu giả.

Đổi filter giữ nguyên vị trí cuộn và biểu đồ hiện tại trong lúc lấy dữ liệu mới, kèm trạng thái cập nhật; dữ liệu giữ tạm không được dùng lại khi đổi tài khoản. Các hiệu ứng được tắt khi thiết bị chọn giảm chuyển động.

Triển khai Learning, Assessment và Library có các trường/API bổ sung trước frontend. Không cần migration hay dependency mới cho thay đổi này. Xem [hợp đồng thống kê tổng quan](../backend/docs/contracts/overview-statistics-v1.md) và [sổ tay từ vựng](../backend/docs/contracts/vocabulary-notebook-v1.md).

### Điều hướng trong bài học

Mục **Từ vựng** mở bằng `?view=vocabulary` trong trang bài học và hiển thị số mục từ duy nhất. Khi mở mục này, frontend lấy các thẻ từ qua Library theo đúng thứ tự của bài, gồm từ, phiên âm, loại từ, nghĩa và ví dụ khi có. Bài chưa gắn từ vựng hiển thị trạng thái rỗng; mục từ không còn khả dụng được thông báo. Đây là nội dung bổ trợ, không tạo thêm điều kiện hoàn thành bài học.

Slide, Lesson Summary, Tài liệu và Luyện tập là các mục trong cùng trang bài học; breadcrumb luôn kết thúc ở tên bài. Khi mở bài ôn từ Luyện tập, breadcrumb giữ khóa học, chủ đề, bài học và thêm trang bài ôn. Tên bài học và nút quay lại đưa về đúng mục Luyện tập; bộ câu hỏi đang làm có nút riêng để về danh sách luyện tập.

Trong danh sách bài học, nút Làm bài ôn chỉ nằm ở bài học sở hữu bài ôn theo `pendingReviews.lessonId`. Các bài bị chặn bởi bài ôn vẫn giữ trạng thái khóa và lý do chờ; tên bài học có bài ôn vẫn mở lại được.

Cờ `blocking` từ backend phân biệt bài ôn bắt buộc với bài ôn tự chọn. Bài ôn tự chọn giữ dấu hoàn thành của lesson, hiện nhãn Ôn tự chọn và nút Tiếp tục ôn; chỉ bài ôn bắt buộc mới hiện cảnh báo Cần làm bài ôn. Nếu một lesson có cả hai loại, danh sách ưu tiên bài bắt buộc.

Đường nối giữa các bài tô xanh theo trạng thái đã hoàn thành; đoạn chưa học giữ xám, hiệu ứng tôn trọng chế độ giảm chuyển động.

Đường nối giữa các topic tô cam theo tỷ lệ bài học đã hoàn thành trong topic đang học, tô xanh toàn đoạn khi topic đã qua và giữ xám với topic bị khóa. Tỷ lệ hiển thị giữ nguyên khi mở/thu gọn chặng; chỉ trạng thái topic đã qua mới dùng màu xanh, kể cả khi đã học hết bài nhưng còn kiểm tra chặng.

Sau khi nộp bộ câu hỏi ôn, trang giữ nguyên đề và câu trả lời để xem đúng/sai, đáp án và giải thích mà API trả về. Người học tự bấm đọc lại lý thuyết, làm bộ tiếp theo hoặc học tiếp sau khi xem kết quả; trang không tự chuyển bước khi nộp xong.

### Writing trong khóa học

Workspace Writing của mục Luyện tập lấy chart và hướng dẫn chi tiết theo từng đề từ backend (`sections[].essays[].guide/images`).
Cột trái chuyển giữa Đề bài và Hướng dẫn; chart có thể phóng to. Task 1 viết theo Introduction, Overview, Body 1, Body 2;
Task 2 dùng Introduction, Body 1, Body 2, Conclusion. Khi nộp, các đoạn được ghép thành một bài và giữ nguyên luồng chấm,
trừ điểm và hoàn thành bộ luyện tập. Không có bộ đếm thời gian; phần tra từ giữ nguyên. Trang nền được khóa cuộn trong
khi mở workspace; nội dung dài cuộn bên trong từng cột. Đề chưa có guide hoặc ảnh vẫn mở được.
Bật Bài mẫu hiển thị nội dung mẫu dạng chỉ đọc ngay trong các ô viết, giữ nguyên kích thước và vị trí các ô.
Tắt Bài mẫu khôi phục bản nháp; bài mẫu không được gửi chấm.
Mở lại đề đã chấm sẽ tải bài viết đã nộp cùng band tổng, điểm từng tiêu chí, nhận xét và chỗ cần sửa của AI. Kết quả hiển thị trạng thái từng kiến thức con dưới tiêu chí cùng đoạn trích; mục “Cần luyện” có excerpt và nút Luyện tập mở bộ luyện phù hợp khi có.
Bài đã nộp hiển thị dạng chỉ đọc, kể cả sau khi hoàn thành bộ; nút Bài mẫu được ẩn khi bài đã được chấm.
Nếu tải kết quả lỗi, màn hình có nút Thử lại để đọc lại dữ liệu đã lưu.

Chart của bốn đề Task 1 mới cần được upload lên Supabase theo
[`backend/docs/assets/course-writing-charts/README.md`](../backend/docs/assets/course-writing-charts/README.md).
Triển khai Content (migration V64) và Learning trước frontend để có đủ dữ liệu.

### Cây kiến thức

Trang cây kiến thức của khóa học hiển thị theo cấu trúc khóa học → nhánh kỹ năng → điểm kiến thức, có đường nối và màu trạng thái nắm vững. Có thể lọc kỹ năng và thu gọn từng nhánh; màn hình nhỏ dùng cây dọc. Quan hệ kiến thức nền vẫn hiển thị ở dòng “Xây trên” của từng điểm. Nút Luyện giữ nguyên điều kiện về tim và bộ luyện còn khả dụng.

### Community

Community `/community` yêu cầu đăng nhập, hỗ trợ feed cursor 10 bài/lượt, tìm kiếm toàn văn tiêu đề/nội dung, lọc chủ đề, tạo bài, reaction, lưu bài, bình luận và phản hồi, theo dõi hồ sơ, cùng bảng bài đã lưu. Ảnh/video hiện nhận URL HTTPS được Community backend cho phép; chưa có luồng upload. Chuông thông báo dùng REST để đồng bộ unread và STOMP qua `/ws/notifications`; khi mất kết nối, danh sách REST vẫn là dữ liệu chuẩn.

### Soạn bài học

Popup chọn từ vựng trong trình soạn bài gọi `/api/content/admin/vocabulary/suggestions`, tự tìm sau 300 ms từ hai ký tự;
một ký tự vẫn tìm chính xác bằng nút Tìm/Enter. Mỗi lượt lấy 20 từ, nút Tải thêm giữ các nghĩa đã chọn và kết quả trước đó.
Cần triển khai Library cùng migration V36 trước frontend này; contract ở
[`backend/docs/contracts/vocabulary-author-suggestions-v1.md`](../backend/docs/contracts/vocabulary-author-suggestions-v1.md).

### Điều hướng và không gian làm việc

Navbar dùng mục **Khám phá** để gom Cộng đồng, Trò chơi, Nghe chép, Kho từ vựng và Flashcard của tôi. Di chuột vào mục này để hiện thanh điều hướng con với hiệu ứng như các mục khác; trên điện thoại, bấm để mở các mục con trong menu. Bàn phím vẫn hỗ trợ Enter và Escape. Navbar không còn mục Quản trị, Kết quả học viên hoặc Bài mẫu 8đ.

Sau đăng nhập, khi mở `/` hoặc quay lại trang dành cho khách với phiên đã khôi phục, tài khoản `ADMIN` vào `/admin` (tổng quan hệ thống), `CONTENT_AUTHOR` vào `/content-author`, `EXAMINER` vào `/examiner`; nếu có nhiều vai trò thì ưu tiên theo thứ tự này. Người học giữ đích đến trước đăng nhập hoặc `/overview`. Hai trang gốc `/content-author` và `/examiner` hiển thị ngay dashboard tương ứng; menu chỉ chứa trang của khu đang mở, kể cả khi tài khoản có nhiều vai trò.

Các trang nội dung dùng `/content-author/courses`, `/content-author/knowledge-graph` và `/content-author/questions`. Examiner dùng `/examiner/grading/writing`, `/examiner/grading/speaking`, `/examiner/profile` và `/examiner/knowledge-graph`. Các URL cũ `/admin/examiner/**`, `/admin/grading/**`, `/admin/knowledge-graph` và `/content-author/content` chuyển tiếp có kiểm tra quyền, giữ query và fragment; cây tri thức cũ chuyển sang khu đúng với vai trò.

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

Vào **Khám phá → Trò chơi** trên navbar hoặc `/games` sau khi đăng nhập. Module nằm ở
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

The catalog menu groups skill navigation, part/full-test selection, and question-format filters. Part badges sit inside the cover images, aligned with the card titles. The placement banner is currently a static shortcut to `/learn/placement`; its visibility does not depend on placement completion.
