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
- Icon chỉ dùng `lucide-react`. Nút chỉ-icon luôn có `aria-label`.

## 2. Bố cục và lớp phủ

- Tạo hoặc sửa bản ghi = **drawer bên phải** (`AdminDrawer`, cỡ `md`/`lg`/`xl`). Xem chi tiết một dòng = **hộp thoại giữa màn** (`AdminModal`). Hộp xác nhận = `useAdminConfirm`.
- Hộp mở từ trong drawer hoặc hộp khác MUST có `stacked`.
- Không lồng trình soạn trong trình soạn: danh sách con (bài học trong chủ đề) là **bảng gọn**, sửa mở drawer; khối dài thì **thu gọn** (mũi tên, "Mở tất cả / Thu gọn tất cả", trạng thái đi theo phần tử khi đổi thứ tự).
- Trang dùng `AdminPage plain`; bảng đứng riêng, không bọc thẻ trắng thừa; vùng tiêu đề của danh sách nằm trong khung trắng như `.adm-block`.
- Dữ liệu tải một lần ở cấp cha rồi chia qua context (`courseDraftCatalog`), không để mỗi dòng tự gọi API.

## 3. Bảng

- Dùng `.adm-table` trong `.adm-table-wrap`. **Mọi bảng có cột STT đầu tiên** (`th.adm-stt` / `td.adm-stt`); bảng phân trang đánh số nối tiếp (`page * size + index + 1`).
- Hành động theo dòng nằm ở cột **"Hành động"** với nút "…" (`AdminRowMenu`): không viền, hiệu ứng rê và bấm, menu cố định trên mọi lớp. Nút chỉ-icon trong ô (xem 👁, gỡ ✕) giữ kiểu nhạt, rê mới có nền.
- Bảng rỗng vẫn hiện đầu bảng và một dòng "Chưa … nào." (`.adm-kp-table__empty`).
- Không in đoạn văn dài vào ô bảng. Hiện mã ngắn, loại, nhãn; nội dung đầy đủ xem bằng nút 👁 mở hộp chi tiết. Một dòng đề bài cắt bằng "…" thì được (bảng câu hỏi của khối bài tập: Đề bài, Loại; điểm kiến thức xem trong hộp chi tiết, vì cả khối thường trùng một điểm nên thêm cột chỉ lặp chữ). Ô nút thao tác phải là ô bảng thật, không đặt `display: flex` lên `td`, nếu không đường kẻ dòng bị lệch khi dòng cao lên; không dùng 8 ký tự đầu của id làm "mã" vì các bản ghi seed trùng nhau.

## 4. Nút và thanh nút

- Mọi nút chữ trong drawer: **nền navy, chữ trắng** (đã có luật `.adm-drawer .adm-btn`). Nút nguy hiểm giữ đỏ.
- Thanh nút cuối form (`.adm-form-footer`): **canh giữa**, nút đầu "Đóng" **đỏ** kèm ✕, nút chính "Lưu" navy kèm biểu tượng đĩa. Biểu tượng vẽ bằng CSS; nút không phải đóng/lưu (ví dụ "Sửa") thêm `adm-btn--noicon`.
- Dùng từ **"Lưu"** và **"Đóng"**, không dùng "Xong" (trừ nghĩa hoàn thành công việc). Không ghi "(tùy chọn)" ở nhãn; trường bắt buộc có dấu `*` đỏ (`<span className="adm-required" aria-hidden="true" />`, vẽ bằng CSS để không lẫn vào tên truy cập).
- Nút chính đứng một mình giữa form khi là hành động duy nhất (ví dụ sinh bản nháp).

## 5. Form và chọn dữ liệu

- Ít chữ giải thích. Bỏ đoạn mô tả dài dưới tiêu đề, bỏ bộ đếm ký tự; chỉ giữ gợi ý khi thiếu nó người dùng sai.
- **MUST NOT thêm dòng chú thích/hướng dẫn** (`<small>`, đoạn chữ mờ dưới ô nhập, dưới tiêu đề hay dưới nút) để giải thích cách hệ thống chạy hay lời khuyên cách dùng, ví dụ "Mỗi bài một slide. Dùng link …/embed và bật quyền xem…" hoặc "Mục … được thêm tự động khi duyệt…". Điều đó nói ở câu trả lời cho người dùng, không đưa vào giao diện. Chỉ được in chữ tại chỗ cho: lỗi gắn với đúng một ô nhập, trạng thái rỗng, và ràng buộc mà thiếu nó người dùng chắc chắn nhập sai. Muốn thêm chú thích ngoài các trường hợp này thì hỏi trước.
- Xem trước nội dung Markdown = nút **"Xem trước"** (👁) cạnh nhãn, mở `AdminModal` (có `stacked`); không dùng tab hay khung xem trước nằm cùng trang. Dùng `components/MarkdownField.tsx`.
- Nhãn đứng trên, đậm, to hơn nội dung. Dòng "Kỹ năng" và các checkbox cùng hàng.
- Danh sách ngắn (band 0.0–9.0) dùng **nút chọn một chạm** (nhóm theo cấp), không dùng dropdown gốc.
- Chọn nhiều mục từ kho = một khối: **tiêu đề + chip đếm `n/giới hạn`** + nút "Chọn…/Sửa lựa chọn" + **bảng đã chọn có ✕** + **hộp chọn lớn** (ô tìm, lọc cấp, nhóm theo cấp có checkbox chọn tất cả và nút thu gọn, đếm đã chọn). Mục đã chọn nằm ngoài gợi ý vẫn hiện, tick sẵn.
- Đổi điều kiện làm danh sách đề xuất đổi (band, kỹ năng) thì xóa lựa chọn cũ.
- Điểm kiến thức tiên quyết của nhau (`KnowledgeRelations`): dưới tên ở bảng đã chọn và trong thẻ ở hộp chọn hiện dòng "Tiên quyết của …" / "Cần học trước …" với mã dạng chip (tối đa 3, còn lại "+n"); thẻ là tiên quyết của một điểm đang chọn có vạch xanh mảnh bên trái (`is-prerequisite`). Không dùng màu riêng cho quan hệ này.
- Hiện **tên**, không hiện id. Mục đã chọn phải xem được chi tiết (👁): câu hỏi (kèm đoạn văn, lựa chọn, đáp án, giải thích), gói luyện tập (phần, câu mở được).

## 6. Trạng thái tải và lỗi

- Đang sinh/xử lý: hiện tiến trình **thật** (bước theo trạng thái máy chủ, đồng hồ chạy), không thanh phần trăm giả; trang tự cập nhật, cảnh báo khi chờ lâu.
- **Lỗi của form và của thao tác (kiểm tra dữ liệu, lưu/xóa/duyệt thất bại) là toast lỗi, không in banner đỏ trong form.** Dùng `useAdminError()` (`lib/useAdminError.ts`): giống `useState<string | null>`, mỗi thông báo đặt vào cũng bắn toast; `useAdminErrorToast()` khi chỉ cần bắn. Danh sách nhiều lỗi nối bằng `\n`, toast giữ xuống dòng. Chỉ giữ chỗ in tại chỗ cho: lỗi tải trang kèm "Thử lại" (`AdminError`), trạng thái bền như bản nháp `FAILED`, lời nhắc ràng buộc luôn hiện, lỗi gắn với đúng một ô nhập (`aria-describedby`), và lỗi kèm một nút hành động cần ở lại. Test của màn dùng toast phải `render` từ `@/test/render` (đã bọc `ToastProvider`).
- Lỗi mạng và lỗi đăng nhập phải phân biệt được (401 không kèm CORS hiện như "không kết nối"): khi báo lỗi tải, chỉ cách xử lý (đăng nhập lại, Thử lại).

## 7. Kiểm thử và kiểm tra

- Tên truy cập tiếng Việt, truy vấn test theo role + name. Mở drawer/hộp rồi mới thao tác phần bên trong; hàng "…" mở menu trước khi chọn.
- Trước khi báo xong: `npx tsc --noEmit -p tsconfig.app.json`, `npx eslint src/features/admin`, `npx vitest run src/features/admin`.
- Một số test (work-queue, users, gửi form AI) đôi lúc lỗi do máy bận; chạy lại riêng file đó trước khi kết luận là hỏng.

## 8. Thành phần dùng lại

`components/AdminLayer.tsx` (Drawer, Modal, ConfirmDialog), `components/MarkdownField.tsx` (ô Markdown + nút Xem trước), `components/AdminRowMenu.tsx`, `components/AdminState.tsx` (Loading, Error, Empty), `pages/AdminPage.tsx`, `lib/useAdminResource.ts`, `lib/useAdminConfirm.tsx`; bộ chọn kiến thức/câu hỏi/gói/band và tiến trình sinh trong `course-drafts/components/`.
