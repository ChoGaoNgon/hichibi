# Technical Flow Documentation - Hi chibi Coffee House

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
    *   Dữ liệu được ghi trực tiếp vào Google Sheet để lưu trữ lâu dài.
7.  **Báo cáo & Thống kê Tối ưu Chi phí (Zero-Read Analytics)**:
    *   Từ dữ liệu đã đồng bộ sang Sheet, hệ thống xử lý phân tích dữ liệu khổng lồ thông qua kiến trúc **Google Apps Script (GAS) + iframe**. 
    *   **Quy trình kết xuất:** Admin chọn khoảng thời gian "Từ ngày" - "Đến ngày" trên bản điều khiển. Frontend tạo ra một đường dẫn ghép nối theo tham số (query parameters) gửi thẳng vào Google Web App và nhúng qua thẻ HTML `<iframe />`.
    *   Web App (Google) tự động chạy script, tính toán *Tổng doanh thu, Số đơn chờ, Số đơn hoàn tất* và vẽ **Biểu đồ tăng trưởng** đính kèm **Bảng chi tiết doanh thu**. Báo cáo tĩnh này được xuất trả về Frontend.
    *   **Lợi ích:** Quá trình lọc biểu đồ dữ liệu của cả nghìn đơn hàng này tốn ĐÚNG 0 LƯỢT ĐỌC (Reads) bên Cloud Firestore. Database hoàn toàn không chịu gánh nặng thống kê.
8.  **Hoàn tất**: Xóa giỏ hàng (`cartStore.clearCart()`) và hiển thị màn hình thành công.

---

## 3. Luồng Quản lý & Cập nhật Dữ liệu (Management Flow)

Hệ thống sử dụng cơ chế **Hybrid Data Fetching** (kết hợp lấy dữ liệu chủ động, Cache và Real-time giới hạn siêu nhỏ) giúp tối ưu hóa chi phí (giảm Firestore Reads đáng kể) nhưng vẫn giữ được trải nghiệm UX thời gian thực xuất sắc.

### Quy trình Thực thi:
1.  **Theo dõi ngầm thông minh (Micro Real-time Tracking)**:
    *   Tại ứng dụng gốc (`App.vue`), hệ thống đặt DUY NHẤT một listener (`onSnapshot`) có giới hạn cực chặt chẽ: `limit(2)`. Nghĩa là ứng dụng CHỈ theo dõi 2 đơn hàng xếp mới nhất của user đang đăng nhập.
    *   **Tối ưu Reads:** Nếu trạng thái là `completed` hoặc `cancelled`, listener tự động ngừng theo dõi nội bộ thẻ đó nhằm đưa về trạng thái ngủ đông.
    *   **Cập nhật Giao diện:** Khi có thay đổi từ Server (vd: Admin xác nhận đơn), `App.vue` bắn ra một tín hiệu sóng `CustomEvent('order-status-updated')` chứa ID đơn. View `Orders.vue` bắt được sóng này và tự "biến đổi" màu sắc trạng thái thẻ đơn hàng liền lập tức kèm theo Toast nhắc nhở mà KHÔNG phải bóc dữ liệu truy vấn lại danh sách lịch sử.
2.  **Chủ động tải dữ liệu (Fetch Data cho danh sách lớn)**:
    *   Trong `Admin.vue` hoặc toàn màn lịch sử tổng hợp, hệ thống dùng `getDocs()` để lấy dữ liệu tĩnh.
    *   Việc làm mới dữ liệu (lấy đơn hàng mới, thông báo lịch sử cũ) được thực hiện một cách chủ động thông qua nút bấm "Làm mới dữ liệu" (biểu tượng vòng xoay). Điều này giúp ngăn chặn các truy vấn thừa thãi khi màn hình chỉ đang mở ở trạng thái nhàn rỗi.
2.  **Cập nhật Trạng thái đơn hàng**:
    *   Admin/Staff nhấn nút thao tác đổi trạng thái (ví dụ: từ `pending` -> `processing`).
    *   Hàm gửi lệnh `updateDoc` lên Firestore. Nút "Làm mới" ngay tại mỗi đơn hàng cho phép admin tự fetch cấu trúc dữ liệu đơn hàng cụ thể. Lịch sử đơn hàng phía Client thì cho cài đặt nút Refresh để theo dõi hành trình đơn hàng hiện tại.
    *   **Security Check**: Firebase Security Rules kiểm tra nghiêm ngặt người dùng có quyền `staff` hoặc `admin` thật sự không trước khi cho phép ghi/sửa.
3.  **In hóa đơn và Tem nhãn**:
    *   **In hóa đơn**: Hàm `printOrder()` lấy dữ liệu đơn hàng hiện tại, tạo một template HTML in ấn thu nhỏ (Receipt) phù hợp cho máy in nhiệt và gọi lệnh `window.print()`.
    *   **In tem nhãn (Label Printing)**: Hàm `printOrderLabels()` tạo các trang in khổ 50x30mm cho từng sản phẩm trong đơn hàng. Mỗi tem chứa tên món, size, topping và ghi chú riêng biệt, giúp pha chế dán trực tiếp lên cốc/hộp. Sử dụng CSS `page-break-after: always` để tách riêng từng tem.

---

## 4. Luồng Quản trị Nâng cao (Advanced Admin Operations)

### Quản lý Lịch làm việc (Google Calendar Integration):
1.  **Xác thực**: Sử dụng `signInWithPopup` với `GoogleAuthProvider` và scope `calendar.events` để xin quyền truy cập. Access Token được lưu vào `localStorage` để duy trì phiên đăng nhập.
2.  **Đọc sự kiện**: Gọi API `GET /calendars/primary/events` để lấy danh sách sự kiện trong tháng hiện tại.
3.  **Tạo sự kiện**: Gọi API `POST /calendars/primary/events`. Hỗ trợ tạo sự kiện đơn lẻ hoặc sự kiện lặp lại (sử dụng thuộc tính `recurrence` với định dạng RRULE), đồng thời hỗ trợ thêm khách mời (`attendees`) và tự động gửi email thông báo (`sendUpdates=all`).
4.  **Xóa sự kiện**: Gọi API `DELETE /calendars/primary/events/{eventId}`. Hỗ trợ xóa một sự kiện cụ thể hoặc toàn bộ chuỗi sự kiện lặp lại (thông qua `recurringEventId`).

### Khởi tạo dữ liệu (Seed Data):
1.  Admin kích hoạt hàm `seedData()`.
2.  Sử dụng `writeBatch` của Firestore để thực hiện ghi hàng loạt (Atomic Batch Write) các danh mục và sản phẩm mẫu.
3.  Đảm bảo tính nhất quán của dữ liệu khi khởi tạo hệ thống mới.

### Quản lý Cache:
Hệ thống sử dụng cơ chế đồng bộ dấu thời gian (Timestamp) giữa Server và Client để tối ưu hóa hiệu suất load trang và giảm thiểu lượt đọc dữ liệu (reads) từ Firestore.
1.  **Lưu trữ bền vững (Local Storage):** Dữ liệu Danh mục và Thực đơn được lưu trữ ngay trong `localStorage` của thiết bị khách hàng. Nhờ vậy, ngay cả khi người dùng đóng tab, tắt trình duyệt và mở lại, dữ liệu vẫn được giữ nguyên mà không bị xóa đi. Điều này giúp hệ thống phản hồi cực kỳ nhanh (dưới 0.1s) trong những lần truy cập tiếp theo.
2.  **Quản trị Cache phía Admin:**
    *   Firebase duy trì một document nhỏ `settings/cache_info` lưu thông tin: thời điểm làm mới cache gần nhất (`lastUpdated`) và cấu hình người dùng thiết lập: `autoUpdate` (Tự động hoặc Thủ công).
    *   **Tự động:** Mỗi khi Admin Thêm/Sửa/Xóa sản phẩm hay danh mục, hệ thống sẽ ngầm cập nhật `lastUpdated` trên server sang thời gian hiện tại.
    *   **Thủ công:** `lastUpdated` chỉ được thay đổi khi Admin chủ động nhấn nút làm mới. Tùy chọn Tự động/Thủ công này được tải từ Firestore mỗi khi Admin truy cập, đảm bảo không bị mất cấu hình khi đăng xuất hoặc reload trình duyệt.
3.  **Hoạt động đồng bộ ở Client:**
    *   Khi khách hàng truy cập màn hình Menu, ứng dụng kéo `lastUpdated` mới nhất từ Server (chỉ tốn 1 lượt đọc siêu nhẹ).
    *   **So sánh dấu thời gian:** Client đặt dấu thời gian `lastUpdated` của Server so sánh với phiên bản đang có sẵn trong `localStorage`.
    *   **Không thay đổi:** Nếu bằng nhau, hệ thống lấy dữ liệu thẳng từ `localStorage` đưa ra hiển thị mà không cần tải lại toàn bộ thực đơn.
    *   **Có thay đổi mới:** Nếu Server `lastUpdated` lớn hơn bản ở Client, hệ thống gọi API Firebase để tải dữ liệu danh mục, đồ uống mới nhất. Sau đó hiển thị ngay lập tức và đồng thời ghi đè dữ liệu mới cùng `lastUpdated` mới vào `localStorage` của người dùng.

## 5. Luồng Ghi chú Sản phẩm (Item Note Flow)

Hệ thống hỗ trợ khách hàng ghi chú riêng cho từng đơn vị sản phẩm trong giỏ hàng.
1.  **Lấy Ghi chú nhanh**: Tương tự như luồng Menu, danh sách `quick_notes` được tải từ Firestore và cache vào `localStorage` để tối ưu chi phí Read.
2.  **Thêm ghi chú khi chọn món**: Khi người dùng nhấn vào một sản phẩm trong `Menu.vue`, họ có thể chọn từ các ghi chú nhanh hoặc nhập ghi chú tùy chỉnh.
3.  **Chỉnh sửa trong giỏ hàng**: Tại `Cart.vue`, người dùng có thể xem lại ghi chú của từng món và nhấn vào biểu tượng "Chỉnh sửa" để thay đổi nội dung.
4.  **Lưu trữ đơn hàng**: Ghi chú này được lưu trực tiếp vào từng object trong mảng `items` của collection `orders`, giúp bộ phận pha chế có thể xem chi tiết từng yêu cầu nhỏ nhất.

## 6. Hệ thống Phân quyền (Security & Authorization)

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

## 6. Cấu trúc Cơ sở dữ liệu (Database Structure)

Hệ thống sử dụng **Firestore (NoSQL)** làm cơ sở dữ liệu chính. Dưới đây là kiến trúc các Collections và mô tả chi tiết từng Document.

### 1. Collection `users`
Lưu trữ thông tin hồ sơ và định danh người dùng.
- `uid` (string): ID duy nhất của người dùng cung cấp bởi Firebase Auth.
- `email` (string): Email của tài khoản.
- `displayName` (string): Tên hiển thị công khai.
- `role` (string): Quyền hạn truy cập, bao gồm `admin`, `staff`, `tablet`, hoặc `customer`.
- `createdAt` (timestamp): Thời gian người dùng tạo tài khoản.

### 2. Collection `categories`
Lưu trữ các nhóm danh mục phân loại thực đơn.
- `name` (string): Tên danh mục (vd: Cà phê, Trà sữa...).
- `slug` (string): URL thân thiện (vd: `ca-phe`).
- `order` (number): Số thứ tự ưu tiên hiển thị trên màn hình.
- `image` (string - tùy chọn): Link liên kết hình ảnh danh mục.

### 3. Collection `products`
Lưu trữ thông tin các món đồ uống và thức ăn.
- `name` (string): Tên sản phẩm.
- `description` (string): Hiển thị chi tiết mô tả đồ uống.
- `price` (number): Mức giá bán cơ bản (Price gốc).
- `image` (string): URL hình ảnh món.
- `category` (string): Slug của danh mục để hệ thống nhóm món (vd: `ca-phe`).
- `isAvailable` (boolean): Trạng thái mở bán (True) hay Hết hàng/Tạm khóa (False).
- `isTrending` (boolean - tùy chọn): Gắn nhãn sản phẩm Bán chạy/Đang Hot.

### 4. Collection `orders`
Lưu trữ thông tin và lịch sử vòng đời của từng đơn đặt hàng.
- `userId` (string): Ref ID của người đặt hàng. (Với mPOS/tablet có thể rỗng).
- `customerName`, `customerPhone` (string): Tên và SĐT liên hệ.
- `items` (array): Mảng chứa các đối tượng sản phẩm (Gồm `productId`, `name`, `quantity`, `price`, `size`, `toppings`, và `note` ghi chú món).
- `totalAmount`, `subtotal` (number): Thành tiền và Tổng cộng cuối cùng (Đã trừ chiết khấu).
- `status` (string): Trạng thái đơn (Gồm: `pending` chờ xử lý, `processing` pha chế, `delivering` đang giao, `completed` hoàn tất, `cancelled` bị hủy).
- `deliveryMethod` (string): Phương thức (`delivery` giao đi, `pickup` đến lấy, `dine-in` tại quán).
- `address`, `note` (string): Vị trí và Ghi chú thêm.
- `voucherCode`, `discountAmount` (tùy chọn): Thuộc tính đi kèm khi Add Voucher.
- `paymentMethod` (string): `cash`, `momo`, `zalopay`, `vietqr`.
- `createdAt`, `updatedAt` (timestamp): Đánh dấu thời gian đặt đơn và lúc được Staff tác động mới nhất.

### 5. Collection `vouchers`
Kho lưu trữ khuyến mãi / mã giảm giá.
- `code` (string): Định danh mã nhập (Ví dụ: `SALE50K`).
- `discountType` (string): Phân loại giảm (`percentage` giảm theo % hoặc `fixed` giảm thẳng tiền mặt).
- `discountValue` (number): Giá trị tương ứng với Loại (vd: 10% hoặc 50000đ).
- `minOrderAmount` (number): Giá trị đơn hàng tối thiểu để mã có hiệu lực.
- `maxUsage`, `usedCount` (number): Số lượng nhả ra giới hạn và Số mã Khách đã sử dụng thành công.
- `startDate`, `endDate` (timestamp): Thời hạn hiệu lực áp dụng của mã.
- `isActive` (boolean): Quản trị viên kích hoạt / vô hiệu hóa mã ngay lập tức.

### 6. Collection `quick_notes`
Kho lưu trữ các ghi chú mẫu được thiết lập sẵn bởi Admin.
- `text` (string): Nội dung ghi chú (vd: "Ít đường", "Không đá"...).
- `createdAt`, `updatedAt` (timestamp): Thời gian tạo và cập nhật.

### 7. Collection `settings`
Nơi cấu hình Metadata của toàn bộ cửa hàng và tinh chỉnh Server.
* **Document `store_info`**:
  - `name`, `address`, `phone`, `email`: Thiết lập thông tin liên hệ tĩnh.
  - `workingHours`, `facebook`, `instagram`, `mapEmbedUrl`: Thiết lập nhúng thông tin lên màn hình Client.
  - `telegramBotToken`, `telegramChatId`: Thiết lập BOT push thông báo khi có đơn mới.
  - `googleSheetsUrl`: Web Hook đồng bộ thẳng lên Google Sheet.
* **Document `cache_info`**:
  - `lastUpdated` (timestamp): Thời gian cuối cùng Menu thay đổi.
  - `autoUpdate` (boolean): Chọn làm mới Client âm thầm hoặc Cần có sự đồng ý của Admin.
