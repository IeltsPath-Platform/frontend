# Quy ước UI khu quản trị (Biên soạn / Admin)

- Phạm vi: mọi màn dưới `src/features/admin/**` (đường dẫn `/content-author/**` và `/admin/**`).
- Nguồn: gu thiết kế của chủ dự án, chốt qua đợt làm lại giao diện admin (khóa học, chủ đề, bản nháp AI, câu hỏi, gói). Agent MUST theo các quy ước này khi thêm hoặc sửa màn admin; muốn làm khác thì hỏi trước.
- Ngôn ngữ giao diện: tiếng Việt. Trả lời người dùng bằng tiếng Việt, nêu khuyến nghị trước rồi mới làm khi việc lớn.

## 1. Design system

Token nằm ở [`src/features/admin/admin.css`](../../src/features/admin/admin.css), áp qua lớp `.adm-theme` (portal phải tự bọc `adm-theme`). Không dùng token của trang học viên.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--adm-bg` | `#eef1f7` | nền trang |
| `--adm-surface` / `--adm-surface-2` | `#fff` / `#f3f5fa` | thẻ, bảng / đầu bảng, hover |
| `--adm-border` | `#d8dfeb` | mọi viền |
| `--adm-text` / `--adm-muted` | `#1b2640` / `#5b6985` | chữ chính / chữ phụ |
| `--adm-accent-strong` / `--adm-accent` | `#0d2b8d` / `#0f3bb8` | nút chính (navy), hover, focus |
| `--adm-accent-soft` | xanh 9% | nền chọn, nhấn nhẹ |
| `--adm-danger` / `--adm-warn` / `--adm-ok` | `#c42d2d` / `#a85f00` / `#12865a` | đóng, xóa / cảnh báo / thành công |
| `--adm-radius` | `8px` | bo góc |

- Font Inter; chữ trong ô nhập ≥ 16px. Tiêu đề lớp phủ (`.adm-layer__title`) 1.35rem đậm 800, nhãn ô nhập trong drawer 1rem đậm 700, chữ phụ `.adm-muted`.
- Chuyển động ngắn (0.12–0.24s), luôn có nhánh `prefers-reduced-motion`. Không hiệu ứng trang trí.
- Drawer và hộp thoại đang mở **MUST NOT giữ trạng thái cuối của animation** (`animation-fill-mode: forwards` hoặc `both` trên `transform`/`scale`/`translate`): Chrome coi nó là khung chứa của phần tử `position: fixed` bên trong, nên `AdminRowMenu` (vẽ ngay trong hộp) hiện lệch xa nút "…". Animation mở chỉ khai báo `from` thì dùng `backwards`; chỉ animation đóng (`is-closing`) mới cần `both`.
- Icon chỉ dùng `lucide-react`. Nút chỉ-icon luôn có `aria-label`.

## 2. Bố cục và lớp phủ

- Tạo hoặc sửa bản ghi = **drawer bên phải** (`AdminDrawer`, cỡ `md`/`lg`/`xl`). Xem chi tiết một dòng = **hộp thoại giữa màn** (`AdminModal`). Hộp xác nhận = `useAdminConfirm`.
- "Xem chi tiết" MUST là `AdminModal` ở mọi trang, kể cả trang cây/đồ thị: không dùng panel dính bên cạnh (`aside`) hay chi tiết nằm cạnh bảng. Chi tiết mở từ hộp khác (sơ đồ) thì `stacked`. Dòng bảng mở chi tiết/sửa/xóa bằng **cột "Hành động" + `AdminRowMenu`**, không dùng mã/tên màu xanh làm link để mở.
- Hộp mở từ trong drawer hoặc hộp khác MUST có `stacked`.
- Không lồng trình soạn trong trình soạn: danh sách con (bài học trong chủ đề) là **bảng gọn**, sửa mở drawer; khối dài thì **thu gọn** (mũi tên, "Mở tất cả / Thu gọn tất cả", trạng thái đi theo phần tử khi đổi thứ tự).
- Mỗi nhóm nội dung độc lập (bộ lọc, từng kỹ năng, từng danh sách) là **một `.adm-block` riêng** xếp trong `AdminPage plain`, có tiêu đề + bảng bên trong; không nhét nhiều nhóm vào chung một khung hay thẻ lồng thẻ (cây tri thức: bộ lọc một khối, mỗi kỹ năng một khối).
- Trang dùng `AdminPage plain`; bảng đứng riêng, không bọc thẻ trắng thừa; vùng tiêu đề của danh sách nằm trong khung trắng như `.adm-block`.
- Dữ liệu tải một lần ở cấp cha rồi chia qua context (`courseDraftCatalog`), không để mỗi dòng tự gọi API.

## 3. Bảng

- Quyết định dùng cuộn vô hạn cho danh sách lớn được lưu tại [`global/admin-ui-infinite-scroll.md`](../global/admin-ui-infinite-scroll.md).
- Danh sách lớn lấy từng trang ở máy chủ và tự tải tiếp gần cuối bằng `useInfiniteList` cùng `InfiniteSentinel`. `InfiniteCount` dính ở đầu danh sách, đầu bảng dính trong vùng cuộn, và STT tiếp tục qua các lần tải.
- Khi tải thêm lỗi, giữ các dòng đã có và hiện nút “Thử lại” ngay ở cuối danh sách; thông báo dùng `role="status"`, không dùng toast. Danh sách ngắn cố định và cây dữ liệu giữ cách tải hiện có.
- Dùng `.adm-table` trong `.adm-table-wrap`. **Mọi bảng có cột STT đầu tiên** (`th.adm-stt` / `td.adm-stt`); danh sách cuộn vô hạn tiếp tục số thứ tự qua các trang dữ liệu.
- Hành động theo dòng nằm ở cột **"Hành động"** với nút "…" (`AdminRowMenu`): không viền, hiệu ứng rê và bấm, menu cố định trên mọi lớp. Nút chỉ-icon trong ô (xem 👁, gỡ ✕) giữ kiểu nhạt, rê mới có nền.
- Bảng rỗng vẫn hiện đầu bảng và một dòng "Chưa … nào." (`.adm-kp-table__empty`).
- Không in đoạn văn dài vào ô bảng. Hiện mã ngắn, loại, nhãn; nội dung đầy đủ xem bằng nút 👁 mở hộp chi tiết. Một dòng đề bài cắt bằng "…" thì được (bảng câu hỏi của khối bài tập: Đề bài, Loại; điểm kiến thức xem trong hộp chi tiết, vì cả khối thường trùng một điểm nên thêm cột chỉ lặp chữ). Ô nút thao tác phải là ô bảng thật, không đặt `display: flex` lên `td`, nếu không đường kẻ dòng bị lệch khi dòng cao lên; không dùng 8 ký tự đầu của id làm "mã" vì các bản ghi seed trùng nhau.

## 4. Nút và thanh nút

- Mọi nút chữ trong **drawer (sidebar phải) và hộp thoại/popup (`AdminModal`)**: **nền navy, chữ trắng**, kể cả nút nhỏ như "Thêm …", "Sửa lựa chọn" (luật `:is(.adm-drawer, .adm-modal) .adm-btn` trong `admin.css`; không tự viết màu riêng cho từng nút). Nút nguy hiểm và nút "Đóng" cuối form giữ đỏ; nút chỉ-icon giữ kiểu nhạt.
- Thanh nút cuối form (`.adm-form-footer`): **canh giữa**, nút đầu "Đóng" **đỏ** kèm ✕, nút chính "Lưu" navy kèm biểu tượng đĩa. Biểu tượng vẽ bằng CSS; nút không phải đóng/lưu (ví dụ "Sửa") thêm `adm-btn--noicon`.
- Dùng từ **"Lưu"** và **"Đóng"**, không dùng "Xong" (trừ nghĩa hoàn thành công việc). Không ghi "(tùy chọn)" ở nhãn; trường bắt buộc có dấu `*` đỏ do `AdminField` vẽ bằng CSS (`adm-required`, `aria-hidden`) để không lẫn vào tên truy cập; ô bắt buộc là ô mà schema zod từ chối chuỗi rỗng, nên dấu `*` không bao giờ lệch với kiểm tra.
- Nút chính đứng một mình giữa form khi là hành động duy nhất (ví dụ sinh bản nháp).

## 5. Form và chọn dữ liệu

- Ít chữ giải thích. Bỏ đoạn mô tả dài dưới tiêu đề, bỏ bộ đếm ký tự; chỉ giữ gợi ý khi thiếu nó người dùng sai.
- **MUST NOT thêm dòng chú thích/hướng dẫn** (`<small>`, đoạn chữ mờ dưới ô nhập, dưới tiêu đề hay dưới nút) để giải thích cách hệ thống chạy hay lời khuyên cách dùng, ví dụ "Mỗi bài một slide. Dùng link …/embed và bật quyền xem…" hoặc "Mục … được thêm tự động khi duyệt…". Điều đó nói ở câu trả lời cho người dùng, không đưa vào giao diện. Chỉ được in chữ tại chỗ cho: lỗi gắn với đúng một ô nhập, trạng thái rỗng, và ràng buộc mà thiếu nó người dùng chắc chắn nhập sai. Muốn thêm chú thích ngoài các trường hợp này thì hỏi trước.
- Xem trước nội dung Markdown = nút **"Xem trước"** (👁) cạnh nhãn, mở `AdminModal` (có `stacked`); không dùng tab hay khung xem trước nằm cùng trang. Dùng `components/MarkdownField.tsx`.
- Nhãn đứng trên, đậm, to hơn nội dung. Dòng "Kỹ năng" và các checkbox cùng hàng.
- **Ô bật/tắt một thiết lập MUST là công tắc `AdminSwitch`, không phải checkbox.** Một ô chỉ có một lựa chọn có/không về một thứ (miễn phí, hiện mục chưa kích hoạt, chỉ hiện mục có cảnh báo, nhập điểm theo tiêu chí) là công tắc, nhãn nằm bên phải công tắc, áp dụng cả cho ô trong bộ lọc. Checkbox chỉ còn cho **chọn nhiều mục từ một danh sách** (vai trò, bộ chọn kiến thức/câu hỏi, tick dòng bảng, "chọn tất cả" của nhóm). Test truy vấn công tắc bằng `getByRole('switch', { name })` hoặc `getByLabelText`.
- Danh sách ngắn (band 0.0–9.0) dùng **nút chọn một chạm** (nhóm theo cấp), không dùng dropdown gốc.
- Chọn nhiều mục từ kho = một khối: **tiêu đề + chip đếm `n/giới hạn`** + nút "Chọn…/Sửa lựa chọn" + **bảng đã chọn có ✕** + **hộp chọn lớn** (ô tìm, lọc cấp, nhóm theo cấp có checkbox chọn tất cả và nút thu gọn, đếm đã chọn). Mục đã chọn nằm ngoài gợi ý vẫn hiện, tick sẵn.
- Đổi điều kiện làm danh sách đề xuất đổi (band, kỹ năng) thì xóa lựa chọn cũ.
- Điểm kiến thức tiên quyết của nhau (`KnowledgeRelations`): dưới tên ở bảng đã chọn và trong thẻ ở hộp chọn hiện dòng "Tiên quyết của …" / "Cần học trước …" với mã dạng chip (tối đa 3, còn lại "+n"); thẻ là tiên quyết của một điểm đang chọn có vạch xanh mảnh bên trái (`is-prerequisite`). Không dùng màu riêng cho quan hệ này.
- Hiện **tên**, không hiện id. Mục đã chọn phải xem được chi tiết (👁): câu hỏi (kèm đoạn văn, lựa chọn, đáp án, giải thích), gói luyện tập (phần, câu mở được).

## 6. Trạng thái tải và lỗi

- Đang sinh/xử lý: hiện tiến trình **thật** (bước theo trạng thái máy chủ, đồng hồ chạy), không thanh phần trăm giả; trang tự cập nhật, cảnh báo khi chờ lâu.
- **Lỗi kiểm tra dữ liệu của form (ô trống, sai định dạng, vượt giới hạn, trùng với dữ liệu đã tải sẵn) là chữ đỏ ngay dưới đúng ô, viền ô đỏ, KHÔNG toast.** Dùng `components/AdminField.tsx` + `lib/validation/useFormErrors.ts` (`src/lib/validation`) + một schema zod cho mỗi form (`fields.ts`: `requiredText`, `optionalText`, `bandText`, `positiveIntegerText`, `nonNegativeIntegerText`). Mỗi ô một thông báo, lấy lỗi đầu tiên (trống, rồi sai định dạng, rồi quá giới hạn). Lỗi hiện khi gửi form (hiện hết cùng lúc và focus ô sai đầu tiên), sau đó khi sửa hoặc rời ô; chưa gửi thì không hiện khi vừa focus. Nút Lưu không bị khóa vì dữ liệu sai; form đặt `noValidate`. **Toast chỉ để hiện thông báo backend trả về** (lưu thành công/thất bại, lỗi máy chủ, kể cả lỗi chỉ rõ một ô như mã hoặc thứ tự trùng): dùng `useAdminError()` (`lib/useAdminError.ts`), giống `useState<string | null>`, mỗi thông báo đặt vào cũng bắn toast; `useAdminErrorToast()` khi chỉ cần bắn. Danh sách nhiều lỗi nối bằng `\n`, toast giữ xuống dòng. Chỉ giữ chỗ in tại chỗ cho: lỗi tải trang kèm "Thử lại" (`AdminError`), trạng thái bền như bản nháp `FAILED`, lời nhắc ràng buộc luôn hiện, và lỗi kèm một nút hành động cần ở lại. Test của màn dùng toast phải `render` từ `@/test/render` (đã bọc `ToastProvider`); test lỗi từng ô kiểm bằng `toHaveAccessibleDescription` hoặc `getAllByRole('alert')`.
- Lỗi mạng và lỗi đăng nhập phải phân biệt được (401 không kèm CORS hiện như "không kết nối"): khi báo lỗi tải, chỉ cách xử lý (đăng nhập lại, Thử lại).

## 7. Kiểm thử và kiểm tra

- Tên truy cập tiếng Việt, truy vấn test theo role + name. Mở drawer/hộp rồi mới thao tác phần bên trong; hàng "…" mở menu trước khi chọn.
- Trước khi báo xong: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src/features/admin`, `npx vitest run src/features/admin`.
- Một số test (work-queue, users, gửi form AI) đôi lúc lỗi do máy bận; chạy lại riêng file đó trước khi kết luận là hỏng.

## 8. Thành phần dùng lại

`components/AdminLayer.tsx` (Drawer, Modal, ConfirmDialog), `components/AdminSwitch.tsx` (công tắc bật/tắt), `components/AdminField.tsx` (nhãn, dấu `*`, ô nhập, lỗi dưới ô) cùng `lib/validation/useFormErrors.ts`, `components/MarkdownField.tsx` (ô Markdown + nút Xem trước), `components/AdminRowMenu.tsx`, `components/AdminState.tsx` (Loading, Error, Empty), `pages/AdminPage.tsx`, `lib/useAdminResource.ts`, `lib/useAdminConfirm.tsx`; bộ chọn kiến thức/câu hỏi/gói/band và tiến trình sinh trong `course-drafts/components/`.

`components/KnowledgeOrgChart.tsx` (+ `lib/chartZoom.ts`): sơ đồ tổ chức dùng chung cho cây kiến thức — một ô gốc lớn, các ô bên dưới nối bằng đường vuông, đường nối chéo và thu phóng. Hộp chọn điểm kiến thức (`course-drafts`) và trang Cây tri thức (`knowledge-graph`, mỗi kỹ năng một sơ đồ) đều vẽ bằng nó; ô vẽ qua `renderBox`, không tự vẽ lại cây. Ô đầu của bảng cây điểm kiến thức (mũi tên thu gọn + thụt lề theo độ sâu) là `components/KnowledgeTreeCell.tsx`, dùng chung cho bộ chọn và trang Cây tri thức (mỗi kỹ năng một bảng; sơ đồ mở trong popup). Mỗi bảng kỹ năng có "Mở tất cả" / "Thu gọn tất cả". Tạo/sửa điểm kiến thức là drawer `KnowledgePointDrawer` (chip chọn một chạm `ChoiceChips`, danh sách tick `PrerequisitePicker`), mở từ nút "Tạo điểm kiến thức" và mục "Sửa" của menu dòng; chỉ vai trò CONTENT_AUTHOR thấy (API từ chối ADMIN). "Ngừng dùng" hỏi xác nhận, "Kích hoạt" không.
