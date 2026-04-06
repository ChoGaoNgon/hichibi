# Hướng dẫn Backup và Restore Firebase

Thư mục này chứa các script giúp bạn sao lưu (backup) và phục hồi (restore) toàn bộ dữ liệu từ một dự án Firebase này sang một dự án Firebase khác.

## Yêu cầu chuẩn bị
Bạn cần cài đặt **Node.js** trên máy tính của mình trước khi chạy các file `.bat`.

## Bước 1: Lấy file `serviceAccountKey.json`
Để các script có quyền truy cập vào database của bạn, bạn cần cung cấp file khóa bí mật:
1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án bạn muốn thao tác (Dự án gốc để backup, hoặc dự án mới để restore).
3. Bấm vào biểu tượng **Bánh răng (Settings)** ở góc trái -> Chọn **Project settings**.
4. Chuyển sang tab **Service accounts**.
5. Bấm nút **Generate new private key** (Tạo khóa riêng tư mới).
6. Một file `.json` sẽ được tải về. Hãy đổi tên file đó thành `serviceAccountKey.json` và copy vào cùng thư mục với các file `.bat` này.

*(Lưu ý: Tuyệt đối KHÔNG chia sẻ file `serviceAccountKey.json` này cho bất kỳ ai hoặc đưa lên Github).*

## Bước 2: Chạy Backup (Sao lưu)
### Trên Windows:
1. Đảm bảo file `serviceAccountKey.json` của **dự án GỐC** đang nằm trong thư mục này.
2. Click đúp vào file `backup.bat`.
3. Nhập **Project ID** của dự án gốc.
4. Đợi script chạy xong. Bạn sẽ nhận được 2 file:
   - `backup_users.json`: Chứa thông tin tài khoản đăng nhập.
   - `backup_firestore.json`: Chứa toàn bộ dữ liệu đơn hàng, sản phẩm, cài đặt...

### Trên macOS/Linux (Công cụ Thủ công - Đề xuất):
Nếu các công cụ tự động gặp lỗi, hãy sử dụng bộ script thủ công (Single File) này. Chúng được thiết kế để chạy trực tiếp và dễ chỉnh sửa:

1. **Sao lưu (Backup):**
   - Mở Terminal tại thư mục này.
   - Cấp quyền: `chmod +x manual-backup.sh`
   - Chạy: `./manual-backup.sh`
   - Kết quả: Tạo ra file `auth_users.json` và `firestore_backup.json`.

2. **Phục hồi (Restore):**
   - Đảm bảo file `serviceAccountKey.json` là của dự án mới.
   - Cấp quyền: `chmod +x manual-restore.sh`
   - Chạy: `./manual-restore.sh`

Các script này sử dụng Node.js inline và thư viện `firebase-admin` (đã được cài đặt sẵn trong dự án) để đọc/ghi từng bảng dữ liệu quan trọng (products, categories, vouchers, users, orders) một cách chính xác nhất, bao gồm cả việc xử lý các kiểu dữ liệu như Timestamp.
