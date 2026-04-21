# Hi chibi Coffee House - Bingsu & Drinks

## 1. Giới thiệu hệ thống
Hệ thống quản lý và đặt hàng cho quán cà phê **Hi chibi Coffee House** được xây dựng bằng Vue 3, Pinia, Tailwind CSS và Firebase. Hệ thống hỗ trợ đa nền tảng (Mobile, Tablet, Desktop) và đa vai trò người dùng, tích hợp thông báo thời gian thực qua Telegram.

## 2. Phân quyền người dùng (RBAC)
Hệ thống chia làm 4 vai trò chính:

- **Admin (Quản trị viên)**:
  - Toàn quyền quản lý hệ thống.
  - Quản lý sản phẩm (thêm, sửa, xóa, ghi chú). Tích hợp tìm kiếm thông minh và lọc theo danh mục.
  - Quản lý danh mục sản phẩm (Hỗ trợ tìm kiếm nhanh).
  - Quản lý mã giảm giá (Vouchers) với các điều kiện áp dụng.
  - Quản lý Ghi chú nhanh (Quick Notes): Thiết lập các ghi chú mẫu giúp khách hàng chọn nhanh khi đặt món. Hỗ trợ thêm/sửa/xóa linh hoạt.
  - Quản lý người dùng và phân quyền (Admin, Staff, Tablet, Customer).
  - Xem Báo cáo/Thống kê nâng cao (Zero-read Analytics) tích hợp Google Apps Script qua Iframe: Hiển thị bộ lọc ngày, KPI (Doanh thu, đơn hoàn thành, đơn chờ), biểu đồ tăng trưởng và bảng chi tiết doanh thu thẳng trên web mà không tốn chi phí Firestore Reads.
  - Cấu hình thông tin cửa hàng (Tên, địa chỉ, SĐT, mạng xã hội) và **Mã QR Thanh toán** (Hỗ trợ QR tĩnh hoặc QR động sinh tự động theo số tiền & mã đơn dựa trên template URL).
  - Cấu hình **Telegram Bot** để nhận thông báo đơn hàng mới.
  - Cấu hình **Google Sheets Sync** để tự động đồng bộ đơn hàng sang bảng tính.
  - Quản lý **Google Calendar** để tạo, xóa và theo dõi lịch làm việc, sự kiện lặp lại, mời khách tham dự.
  - Quản lý **Cache hệ thống** giúp tối ưu hóa chi phí đọc Database bên Firestore một cách chủ động hoặc tự động (Toggle Auto/Manual).
  - Khởi tạo dữ liệu mẫu (Seed Data).
  - **Sao chép & Phân bổ Topping thông minh**: 
    - *Sao chép*: Gợi ý topping dựa trên các sản phẩm đã có.
    - *Phân bổ (Truyền ngẫu)*: Cho phép rải topping từ 1 sản phẩm sang hàng loạt sản phẩm khác theo 2 chế độ (Ghi đè - xóa sạch topping cũ hoặc Ghi thêm - giữ nguyên và nối các topping mới khác tên). Tối ưu qua thao tác đồng loạt (Batch Write).

- **Staff (Nhân viên)**:
  - Quản lý đơn hàng: Xử lý thao tác với tốc độ tức thời. Danh sách đơn lấy theo cơ chế Fetched Data chủ động qua các nút Làm mới (Refresh) nhằm tiết kiệm giới hạn đọc (Reads).
  - Thay đổi phương thức vận chuyển cho đơn hàng.
  - In hóa đơn (Receipt) cho khách hàng chuyên nghiệp.
  - In tem nhãn (Labels): Hỗ trợ in tem dán cốc khổ 50x30mm cho từng món trong đơn, bao gồm đầy đủ thông tin món, size, topping và ghi chú riêng.
  - Nhận thông báo tức thời qua Telegram khi có đơn hàng mới.
  - Xem Dashboard tổng quan về đơn hàng.

- **Tablet (Máy tính bảng tại quầy)**:
  - Giao diện thực đơn tối ưu cho tablet để nhân viên order nhanh tại quầy.
  - Thông tin liên hệ khách hàng là **không bắt buộc**.
  - Tự động điều hướng sang màn hình quản lý đơn hàng sau khi đặt để in hóa đơn ngay lập tức.
  - Có quyền quản lý đơn hàng tương tự nhân viên để thực hiện in bill.

- **Customer (Khách hàng)**:
  - Xem thực đơn sinh động, tìm kiếm và lọc sản phẩm theo danh mục.
  - Tùy chỉnh sản phẩm (Size, Toppings).
  - Thêm vào giỏ hàng, áp dụng mã giảm giá.
  - Đặt hàng với 3 phương thức: Giao hàng tận nơi, Đến lấy mang đi, Dùng tại quán.
  - Tích hợp **Micro Real-time Tracking**: Theo dõi trực tiếp tiến trình 2 đơn hàng mới nhất qua màn hình và thông báo (Toast) hoàn toàn tự động, ngay tức thì (Real-time).
  - Xem lịch sử đơn hàng cá nhân chi tiết.

## 3. Hướng dẫn cài đặt (Setup) từ đầu

### Bước 1: Khởi tạo dự án Firebase
1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Tạo một dự án mới (ví dụ: `the-coffee-house-clone`).
3. Trong phần **Project Settings**, thêm một ứng dụng Web để lấy thông tin cấu hình.

### Bước 2: Kích hoạt các dịch vụ Firebase
1. **Authentication**:
   - Vào mục Authentication -> Sign-in method.
   - Bật phương thức đăng nhập **Google**.
2. **Cloud Firestore**:
   - Vào mục Firestore Database -> Create database.
   - Chọn chế độ **Production mode**.
   - Chọn khu vực (Region) gần bạn nhất (ví dụ: `asia-southeast1`).
   - Database ID: Sử dụng `(default)` hoặc một ID tùy chỉnh (nếu dùng ID tùy chỉnh, cần khai báo trong config).

### Bước 3: Cấu hình ứng dụng
1. Tạo file `firebase-applet-config.json` ở thư mục gốc của dự án với nội dung lấy từ Firebase Console:
```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

### Bước 4: Triển khai Security Rules
1. Copy nội dung từ file `firestore.rules` trong source code dự án.
2. Dán vào tab **Rules** trong Cloud Firestore trên Firebase Console và nhấn **Publish**.

### Bước 5: Cài đặt và Chạy ứng dụng
1. Mở terminal tại thư mục dự án.
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng ở chế độ phát triển:
   ```bash
   npm run dev
   ```
4. Ứng dụng sẽ chạy tại địa chỉ mặc định (thường là `http://localhost:3000`).

### Bước 6: Khởi tạo dữ liệu mẫu (Seed Data)
1. Đăng nhập vào ứng dụng bằng tài khoản Google của bạn.
2. **Phân quyền Admin đầu tiên**:
   - Do mặc định người dùng mới là `customer`, bạn cần vào Firebase Console -> Firestore.
   - Tìm collection `users`, chọn document tương ứng với email của bạn.
   - Thay đổi giá trị trường `role` từ `"customer"` thành `"admin"`.
3. Quay lại ứng dụng và tải lại trang (F5).
4. Bạn sẽ thấy menu **Quản trị** xuất hiện trên thanh điều hướng.
5. Truy cập vào **Quản trị** -> Cuộn xuống cuối thanh menu bên trái -> Nhấn nút **Khởi tạo dữ liệu** (Seed Data).
6. Hệ thống sẽ tự động tạo các danh mục (Cà phê, Trà, Đá xay...) và các sản phẩm mẫu để bạn bắt đầu sử dụng.

---
**Công nghệ sử dụng:**
- Frontend: Vue 3 (Composition API), Vite, Pinia, Vue Router.
- Styling: Tailwind CSS, Lucide Icons, Motion (Vue Transitions).
- Backend: Firebase Auth, Cloud Firestore.
- Tích hợp: Google Calendar API, Google Sheets API, Telegram Bot API.
- Notifications: Vue Sonner.
