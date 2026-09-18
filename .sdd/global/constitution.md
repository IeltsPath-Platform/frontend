# Hiến pháp dự án — IeltsPath Platform Frontend

- **Phiên bản:** 1.0
- **Trạng thái:** LOCKED
- **Cập nhật:** 2026-09-19
- **Phạm vi:** Repository frontend này và các thay đổi phát triển trong đó. Chưa có bằng chứng để áp quy tắc cho backend hoặc toàn bộ IeltsPath Platform.

File này giữ các nguyên tắc dài hạn. Công nghệ, phiên bản và lệnh cụ thể nằm trong [Global Constraints](../constraints/global.md); cấu trúc đang triển khai nằm trong [System Architecture](./system-architecture.md). Feature Spec, Plan và implementation phải tuân các quy tắc dưới đây; xung đột phải được giải quyết trước khi sửa phần phụ thuộc.

## Layer 1 — Hard Rules

### H-01: Không làm lộ bí mật

**Mức:** Hard Rule. **Quy tắc:** MUST NOT đưa secret, credential, token, khóa riêng hoặc dữ liệu cá nhân vào mã nguồn frontend, tài liệu công khai hay bundle trình duyệt. **Lý do:** Mã client có thể được người dùng tải và đọc. **Phạm vi:** Toàn repository. **Enforcement:** Review thủ công; hiện không có CI quét secret. **Ngoại lệ:** Không có.

### H-02: Không vô hiệu hóa ranh giới bảo mật

**Mức:** Hard Rule. **Quy tắc:** MUST NOT sửa proxy, CORS hoặc security headers nhằm bỏ qua kiểm soát bảo mật của API. **Lý do:** Hành vi này phá vỡ ranh giới tin cậy đã ghi trong [AGENTS.md](../../AGENTS.md). **Phạm vi:** Mọi tích hợp từ frontend. **Enforcement:** Review thủ công; hiện chưa có proxy/API integration trong repository. **Ngoại lệ:** Không có.

## Layer 2 — Architectural Constraints

### A-01: Tính năng sở hữu logic của mình

**Mức:** Architectural Constraint. **Quy tắc:** Khi triển khai tính năng, MUST giữ logic riêng của tính năng trong ranh giới tính năng; phần ghép ứng dụng và UI dùng chung MUST NOT trở thành nơi chứa quy tắc nghiệp vụ của một tính năng. **Lý do:** Giữ ranh giới module dự kiến trong [AGENTS.md](../../AGENTS.md) khi ứng dụng phát triển. **Phạm vi:** Frontend. **Enforcement:** Review cấu trúc source; thư mục tính năng hiện còn rỗng. **Ngoại lệ:** Chỉ qua Constitution-approved Exception/ADR/RFC được phê duyệt rõ.

### A-02: Hợp đồng tích hợp phải có nguồn xác nhận

**Mức:** Architectural Constraint. **Quy tắc:** MUST NOT tự đặt endpoint, schema, cơ chế xác thực hoặc ownership dữ liệu cho hệ thống ngoài repository; tích hợp phải dựa trên hợp đồng được xác nhận trước khi triển khai. **Lý do:** Repository chưa có backend contract và không đủ bằng chứng để suy ra topology hệ thống. **Phạm vi:** Mọi tích hợp ngoài frontend. **Enforcement:** Review Spec và code; hiện chưa có tích hợp. **Ngoại lệ:** Chỉ qua Constitution-approved Exception/ADR/RFC được phê duyệt rõ.

## Layer 3 — Engineering Standards

### E-01: Giao diện sử dụng được

**Mức:** Engineering Standard. **Quy tắc:** UI mới MUST hỗ trợ mobile, HTML ngữ nghĩa, thao tác bàn phím, focus rõ ràng và tương phản WCAG AA. **Lý do:** Đây là tiêu chuẩn UI đã ghi trong [AGENTS.md](../../AGENTS.md). **Phạm vi:** Giao diện người dùng. **Enforcement:** Review và kiểm tra UI thủ công; chưa có bộ kiểm thử a11y tự động. **Ngoại lệ:** Cần nêu lý do và được người phụ trách chấp thuận; vai trò phê duyệt cụ thể cần làm rõ.

### E-02: Kết luận dựa trên kiểm chứng

**Mức:** Engineering Standard. **Quy tắc:** MUST chạy kiểm tra phù hợp với phần thay đổi, sửa lỗi phát sinh trong scope và báo rõ lệnh không chạy được; MUST NOT tuyên bố test/build pass nếu chưa chạy. **Lý do:** Kết quả công việc phải tái kiểm chứng được. **Phạm vi:** Mọi thay đổi. **Enforcement:** Một phần qua script local trong `package.json`; chưa có CI. **Ngoại lệ:** Bỏ qua kiểm tra phải nêu lý do và được người phụ trách chấp thuận.

### E-03: Giữ scope và quyết định đã duyệt

**Mức:** Engineering Standard. **Quy tắc:** MUST chỉ thay đổi phần cần cho yêu cầu; MUST tuân Feature Spec/Plan đã duyệt và không âm thầm đổi hợp đồng công khai hoặc quyết định đã xác nhận. **Lý do:** Tránh drift giữa yêu cầu, tài liệu và code. **Phạm vi:** Mọi thay đổi. **Enforcement:** Review thủ công; chưa có workflow phê duyệt tự động. **Ngoại lệ:** Thay đổi scope cần lý do ghi nhận và phê duyệt của người phụ trách.

## Thứ tự hiệu lực và sửa đổi

Constitution đứng trên ADR/RFC, Global/Module Spec, Feature Spec và lựa chọn implementation. Amendment hoặc Constitution-approved Exception chỉ thay thế **quy tắc được chỉ rõ**; ADR/RFC thông thường không được ghi đè Constitution. Layer 1 không có ngoại lệ. Layer 2 chỉ được ngoại lệ qua quyết định được phê duyệt rõ là Constitution Exception; Layer 3 cần lý do và review được ghi nhận.

Không sửa file LOCKED chỉ để một tính năng dễ triển khai. Đề xuất sửa đổi phải ghi: vấn đề, quy tắc hiện tại, lý do, phân tích ảnh hưởng, review/phê duyệt, tăng phiên bản và cập nhật artifact liên quan. **Cần làm rõ:** team chưa chỉ định người/cơ chế phê duyệt amendment. Chưa có `.sdd/global/security.md`; không suy diễn security policy chi tiết từ file chưa tồn tại.

## Lịch sử phiên bản

| Phiên bản | Ngày | Nội dung |
| --- | --- | --- |
| 1.0 | 2026-09-19 | Baseline từ code, cấu hình, README, AGENTS và các plan đã hoàn tất. |
