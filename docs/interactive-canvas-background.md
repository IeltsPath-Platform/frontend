# Nền hạt tương tác cho Authentication

`InteractiveCanvasBackground` dùng Canvas 2D, không cần thêm dependency. Component đã được nhúng trong `AuthPage`, dùng chung cho `/login` và `/register`.

## Cách nhúng và tăng số hạt

Trong [AuthPage.tsx](../src/features/auth/pages/AuthPage.tsx), cấu hình hiện tại là:

```tsx
import { InteractiveCanvasBackground } from '@/components/InteractiveCanvasBackground'

<main className="auth-main">
  <InteractiveCanvasBackground particleCount={160} interactionRadius={150} />
  {/* Backdrop, mascot và form hiện tại */}
</main>
```

Để thử mật độ cao hơn, đổi `particleCount={160}` thành `particleCount={400}` hoặc `particleCount={500}`. Không phải chỉnh thuật toán. Bỏ props sẽ dùng mặc định 160 hạt và bán kính 150 CSS px. `particleCount={0}` tắt hạt; `interactionRadius={0}` tắt lực đẩy nhưng giữ chuyển động quỹ đạo/parallax.

Nếu tái sử dụng trong một container khác, container cần CSS sau:

```css
.auth-main {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-block-size: 100dvh;
}
```

Trang Auth hiện đã có các thuộc tính này; chiều cao tối thiểu của nó trừ phần navbar. Canvas tự đặt `position: absolute`, `inset: 0`, `z-index: -1`, `width/height: 100%` và `pointer-events: none`. `isolation: isolate` giữ lớp âm bên trong container để canvas không bị nền trang che mất. Form và mascot là các phần tử cùng container, nằm phía trên canvas.

## Chuyển động và tương tác

- 160 điểm neo chuẩn hóa phủ đều container; mỗi hạt chuyển động theo quỹ đạo ellipse nhỏ, chậm. Khoảng 60% là nét ngắn đầu tròn, phần còn lại là chấm nhỏ.
- Trong bán kính tương tác, lực đẩy giảm theo `(1 - distance / radius)²`. Lực hồi vị và giảm chấn đưa hạt trở về quỹ đạo sau khi chuột rời đi. Trường hợp con trỏ trùng hạt vẫn có hướng đẩy hữu hạn.
- Parallax dịch ngược vị trí con trỏ, tối đa 12 CSS px mỗi trục; mỗi hạt có độ sâu riêng và hệ thống làm mượt theo thời gian.
- Listener nằm trên container vì canvas không nhận pointer events. Tọa độ chuột được đổi sang hệ tọa độ canvas, cập nhật khi resize hoặc scroll. Touch không kích hoạt lực đẩy, nên không ảnh hưởng thao tác cuộn.

Palette nằm trong [globals.css](../src/styles/globals.css): `--particle-blue`, `--particle-pink`, `--particle-orange`, `--particle-yellow`. Component đọc màu lúc mount; nếu thay token trong thời gian chạy, remount component để nạp palette mới. CSS màu được tập trung trong token, không rải trong thuật toán.

## Hiệu năng và khả năng tiếp cận

- Một vòng `requestAnimationFrame`, không cập nhật React state mỗi frame; chi phí tăng tuyến tính theo số hạt, không có nối cặp hạt hoặc shadow/blur trên từng hạt.
- Bước thời gian tính bằng giây, chia nhỏ tối đa 1/120 giây; một frame bị trễ chỉ tích phân tối đa 50ms để tránh lực bật quá mạnh.
- Bitmap theo device pixel ratio, giới hạn ở 2; kích thước và bán kính tương tác luôn dùng CSS px. `window.resize` và `ResizeObserver` cập nhật canvas mà không kéo giãn nét hạt.
- Tab ẩn tạm dừng vòng render. Unmount hủy animation frame, tháo toàn bộ listener, ngắt observer và giải phóng bitmap. Tương thích vòng mount/cleanup của React StrictMode.
- `prefers-reduced-motion: reduce` hiển thị nền tĩnh, tắt repel/parallax và ngừng vòng animation; thay đổi thiết lập trong lúc trang đang mở cũng có hiệu lực.
- Canvas có `aria-hidden="true"`, không tham gia tab order và không chặn nhập liệu/click.

Mục tiêu là chuyển động mượt ở khoảng 60FPS trên màn hình 60Hz; `requestAnimationFrame` theo nhịp màn hình, không tự bảo đảm FPS trên mọi thiết bị. Trước khi tăng lên 400–500 hạt, đo trên thiết bị đích bằng DevTools Performance, thử cả lúc di chuột và nhập form; ở 60Hz, tổng ngân sách mỗi frame khoảng 16.7ms.

## Kiểm tra

```bash
node --experimental-strip-types --test tests/particle-system.test.ts
node --test --test-name-pattern="Auth|Sign-in|Sign-up" tests/pages-render.test.mjs
npm run lint
npm run typecheck
npm run build
```

Kiểm thử vật lý nằm ở [particle-system.test.ts](../tests/particle-system.test.ts), bao gồm phủ hạt, resize, trùng tọa độ, repel/hồi vị, bán kính, parallax và độ ổn định ở các nhịp 30/60/120/144Hz. Các kiểm thử này không phải phép đo FPS render thực tế.

Kiểm tra trình duyệt: mở hai route Auth, rê chuột qua nền và form, thử nhập email/ẩn-hiện mật khẩu, resize/scroll, chuyển sang trang khác rồi quay lại; bật giảm chuyển động để xác nhận nền đứng yên.
