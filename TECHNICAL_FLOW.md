# Technical Flow Documentation - The Hichibi Coffee House

Tài liệu này mô tả chi tiết các luồng xử lý kỹ thuật chính trong hệ thống, cách thức giao tiếp giữa Frontend (Vue 3) và Backend (Firebase).

## 1. Luồng Đăng nhập (Authentication Flow)

Hệ thống sử dụng **Firebase Authentication** với phương thức **Google Login (Popup)**.

### Quy trình:
1.  **Kích hoạt Login**: Người dùng nhấn nút "Đăng nhập", hàm `login()` trong `src/stores/auth.ts` được gọi.
2.  **Firebase Auth**: Gọi `signInWithPopup(auth, googleProvider)`. Một cửa sổ popup của Google hiện ra để người dùng chọn tài khoản.
3.  **Xử lý Token**: Sau khi đăng nhập thành công, Firebase trả về một đối tượng `User`.
4.  **Đồng bộ Firestore**:
    *   Hàm `onAuthStateChanged` (được khởi tạo trong `init()`) bắt được sự kiện thay đổi trạng thái.
    *   Hệ thống kiểm tra xem `uid` của người dùng đã tồn tại trong collection `users` trên Firestore chưa.
    *   **Nếu chưa**: Tạo một document mới với `role: 'customer'`.
    *   **Nếu rồi**: Lấy thông tin `role` và `profile` từ Firestore để lưu vào Pinia Store.
5.  **Điều hướng**: Dựa vào `role`, hệ thống tự động điều hướng:
    *   `admin` -> `/admin`
    *   `tablet` -> `/tablet`
    *   `customer` -> `/`

---

## 2. Luồng Đặt hàng (Order Placement Flow)

Luồng này xử lý từ khi người dùng có sản phẩm trong giỏ hàng đến khi đơn hàng được lưu vĩnh viễn.

### Quy trình:
1.  **Kiểm tra Voucher (Tùy chọn)**:
    *   Hàm `applyVoucher()` trong `Checkout.vue` thực hiện query Firestore collection `vouchers`.
    *   Kiểm tra các điều kiện: `isActive`, `startDate`, `endDate`, `maxUsage`, `minOrderAmount`.
    *   Nếu hợp lệ, lưu thông tin voucher vào state để tính toán `discountAmount`.
2.  **Xác nhận Đặt hàng**: Hàm `handleSubmit()` được gọi.
3.  **Validate dữ liệu**:
    *   Kiểm tra thông tin liên hệ (Tên, SĐT, Địa chỉ).
    *   *Lưu ý*: Với vai trò `tablet`, các thông tin này là tùy chọn.
4.  **Ghi dữ liệu (Atomic-like operations)**:
    *   Tạo đối tượng `Order` với đầy đủ thông tin: `items`, `totalAmount`, `deliveryMethod`, `status: 'pending'`.
    *   Gọi `addDoc(collection(db, 'orders'), orderData)`.
    *   **Cập nhật Voucher**: Nếu có dùng voucher, gọi `updateDoc` với `increment(1)` cho trường `usedCount` của voucher đó.
5.  **Thông báo (Telegram Notification)**:
    *   Sau khi lưu đơn hàng thành công, hàm `sendTelegramNotification(order)` được gọi.
    *   Hệ thống lấy `telegramBotToken` và `telegramChatId` từ collection `settings/store_info`.
    *   Gửi request `POST` tới Telegram Bot API để thông báo cho nhân viên.
6.  **Đồng bộ dữ liệu (Google Sheets Sync)**:
    *   Hệ thống gọi `syncOrderToGoogleSheets(order)`.
    *   Gửi request `POST` tới Google Apps Script Web App URL (được cấu hình trong settings).
    *   Dữ liệu được ghi trực tiếp vào Google Sheet để lưu trữ lâu dài và làm báo cáo mà không tốn quota Read của Firestore.
7.  **Hoàn tất**: Xóa giỏ hàng (`cartStore.clearCart()`) và hiển thị màn hình thành công.

---

## 3. Luồng Quản lý & Real-time (Management Flow)

Hệ thống sử dụng tính năng **Real-time Listeners** của Firestore để cập nhật dữ liệu mà không cần tải lại trang.

### Quy trình:
1.  **Lắng nghe dữ liệu**:
    *   Trong `Admin.vue` hoặc `Home.vue`, sử dụng hàm `onSnapshot()`.
    *   Khi có bất kỳ thay đổi nào trong collection `orders` hoặc `products` trên server, Firebase sẽ đẩy dữ liệu mới về client ngay lập tức.
2.  **Cập nhật Trạng thái đơn hàng**:
    *   Admin/Staff nhấn nút đổi trạng thái (ví dụ: từ `pending` -> `processing`).
    *   Hàm `executeStatusUpdate()` gọi `updateDoc` lên Firestore.
    *   **Security Check**: Firebase Security Rules kiểm tra xem người dùng có quyền `staff` hoặc `admin` không trước khi cho phép ghi.
3.  **In hóa đơn**:
    *   Hàm `printOrder()` lấy dữ liệu đơn hàng hiện tại, tạo một template HTML tạm thời và gọi `window.print()`.

---

## 4. Luồng Quản trị Nâng cao (Advanced Admin Operations)

### Khởi tạo dữ liệu (Seed Data):
1.  Admin kích hoạt hàm `seedData()`.
2.  Sử dụng `writeBatch` của Firestore để thực hiện ghi hàng loạt (Atomic Batch Write) các danh mục và sản phẩm mẫu.
3.  Đảm bảo tính nhất quán của dữ liệu khi khởi tạo hệ thống mới.

### Quản lý Cache:
1.  Hệ thống sử dụng `localStorage` để cache một số dữ liệu tĩnh (Danh mục, Sản phẩm) nhằm tăng tốc độ tải trang.
2.  Admin có thể xóa cache này thông qua giao diện quản trị để buộc client tải lại dữ liệu mới nhất từ Firestore.

## 5. Hệ thống Phân quyền (Security & Authorization)

Bảo mật được thực hiện ở 3 lớp:

1.  **UI Layer (Vue)**: Sử dụng `v-if` dựa trên `authStore.isAdmin`, `authStore.isStaff` để ẩn/hiện các nút bấm và menu.
2.  **Routing Layer (Vue Router)**: Sử dụng `beforeEach` guard để chặn người dùng truy cập trái phép vào các route `/admin` hoặc `/tablet`.
3.  **Database Layer (Firestore Rules)**: Đây là lớp quan trọng nhất.
    *   Mọi yêu cầu `read/write` đều phải đi qua `firestore.rules`.
    *   Quy tắc kiểm tra `request.auth.uid` và tra cứu `role` của user trong database để quyết định cho phép hay từ chối thao tác.

---

## 5. Quản lý Trạng thái (State Management)

Sử dụng **Pinia** với 2 store chính:
-   **AuthStore**: Lưu trữ thông tin người dùng, quyền hạn và trạng thái đăng nhập.
-   **CartStore**: Lưu trữ danh sách sản phẩm trong giỏ hàng, phương thức vận chuyển và tính toán tổng tiền. Dữ liệu này được đồng bộ với `localStorage` để không bị mất khi F5 trang.
