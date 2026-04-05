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
1. Đảm bảo file `serviceAccountKey.json` của **dự án GỐC** đang nằm trong thư mục này.
2. Click đúp vào file `backup.bat`.
3. Nhập **Project ID** của dự án gốc (Bạn có thể tìm thấy Project ID trong phần Project settings trên Firebase Console).
4. Đợi script chạy xong. Bạn sẽ nhận được 2 file:
   - `backup_users.json`: Chứa thông tin tài khoản đăng nhập.
   - `backup_firestore.json`: Chứa toàn bộ dữ liệu đơn hàng, sản phẩm, cài đặt...

## Bước 3: Chạy Restore (Phục hồi sang dự án mới)
1. Xóa file `serviceAccountKey.json` cũ đi.
2. Lặp lại **Bước 1** để lấy file `serviceAccountKey.json` của **dự án MỚI** và để vào thư mục này.
3. Đảm bảo 2 file backup (`backup_users.json` và `backup_firestore.json`) vẫn đang ở trong thư mục.
4. Click đúp vào file `restore.bat`.
5. Nhập **Project ID** của dự án mới.
6. Đợi script chạy xong. Toàn bộ dữ liệu đã được chuyển sang dự án mới!
