# Quyết định giao diện quản trị: cuộn vô hạn

- **Ngày chốt:** 2026-11-24
- **Phạm vi:** Danh sách lớn trong giao diện quản trị.
- **Nguồn quy ước:** [admin-ui.md](../constraints/admin-ui.md), mục 3.

Danh sách lớn lấy trang từ máy chủ và tải tiếp khi người dùng cuộn gần cuối bằng `useInfiniteList` và `InfiniteSentinel`. Bộ lọc và tìm kiếm phải gửi tới API; đổi bộ lọc bắt đầu lại từ trang đầu. STT nối tiếp giữa các trang, bộ đếm tổng số và tiêu đề bảng dính ở đầu vùng cuộn. Sau thao tác ghi, gọi `refresh()` để tải lại từ đầu. Lỗi khi tải thêm giữ các dòng hiện tại và hiển thị nút thử lại tại cuối danh sách.

Danh sách ngắn cố định và dữ liệu dạng cây giữ cách tải hiện có. Không thêm phân trang vô hạn cho các nhóm này chỉ vì chúng xuất hiện trên trang quản trị.
