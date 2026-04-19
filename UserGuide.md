# Hướng dẫn Sử dụng (User Guide) - Hi chibi Coffee House

Chào mừng bạn đến với **Hi chibi Coffee House**, một hệ thống quản lý và đặt thức uống số hóa hiện đại được tối ưu hóa cho tất cả các thiết bị. Tài liệu này cung cấp hướng dẫn toàn diện nhất về cách sử dụng phần mềm dành cho tất cả các vai trò.

Hệ thống được chia là 3 phân hệ chính tương đương với các vai trò: **Khách hàng**, **Nhân viên phục vụ tại quầy (Tablet)**, và **Quản trị viên (Admin)**.

---

## 1. Dành cho Khách hàng (Customer)

Màn hình khách hàng (`/`) là giao diện mặc định mà mọi người dùng đều truy cập ngay khi mở link web. Tại đây, tốc độ hiển thị được ưu tiên hàng đầu, các dữ liệu đồ uống hiển thị dưới 0.1 giây nhờ công nghệ lưu trữ Cache Local Storage.

### A. Đăng nhập và Duyệt thực đơn (Menu)
- Trải nghiệm duyệt Menu là mở. Bạn có thể kéo xem thoải mái mà không cần đăng nhập.
- Dùng bộ lọc danh mục (Cà phê, Trà, Nước ép...) trên góc màn hình để lọc nội dung nhanh chóng.
- Hệ thống hỗ trợ bộ đệm Cache sâu (Offline Cache). Khi tải lại trình duyệt, bạn không phải mất thời gian load lại các hình ảnh và mô tả món đồ uống, giúp tiết kiệm băng thông.
- Việc đăng nhập (Google) là bắt buộc nếu bạn muốn thêm món vào giỏ hàng hoặc xem Lịch sử đơn hàng. Bấm vào nút hình chân dung / Chữ "ĐĂNG NHẬP" ở góc bên trên cùng phải màn hình.

### B. Thêm vào Giỏ hàng
- Click vào hình sản phẩm muốn uống. Một Modal (hộp thoại) sẽ hiện ra.
- Trong hộp thoại này, hãy lựa chọn thêm **kích cỡ (Size)** và **topping**. Hệ thống tự động tính lại tổng tiền.
- Bấm **Thêm vào giỏ**. Thao tác này có thể làm n lần cho các món khác nhau.

### C. Quản lý Giỏ hàng và Thanh toán (Checkout)
- Nhấn vào biểu tượng túi xách trên đỉnh màn hình để duyệt tất cả các món đang có trong giỏ hàng.
- Nâng giảm số lượng, điều chỉnh tổng kết, hoặc nhập **Mã giảm giá (Voucher)** nếu cửa hàng bạn đang có.
- Chạm vào nút **Tiến hành đặt hàng**. 
- Tại màn hình thanh toán, chỉ định cách khách muốn lấy hàng: `Giao hàng tận nơi`, `Đến lấy` hay `Tại quán`. Hệ thống bắt buộc bạn điền địa chỉ hoặc liên hệ nếu đang ở xa, ngoại trừ trường hợp chọn "Tại quán".
- Lựa chọn hình thức thanh toán đa dạng (Tiền mặt, MoMo, ZaloPay, VietQR...). Nhấn Đặt hàng. 

### D. Lịch sử đơn và Theo dõi đơn (Live Tracking)
- Trượt mở Menu cạnh trái hoặc vào "Lịch sử mua hàng" để xem các đơn hàng của mình.
- **Theo dõi Thông minh siêu tốc (Auto-Live):** Đừng lo phải bấm tải lại liên tục! Ngay khi bạn đặt hàng, hệ thống ngầm theo dõi liên tục 2 đơn mới nhất của bạn một cách tối ưu nhất. Khi nhân viên quán chuyển trạng thái sang "Đang pha chế" hay "Đang giao", điện thoại của bạn sẽ tự động nhảy thông báo (Toast) và Màn hình lịch sử lập tức đổi màu Trạng thái thẻ đơn hàng ngay trước mắt bạn. Trải nghiệm không gian đoạn!
- Tính năng này sẽ tự ngủ đông khi đơn đã cũ và rơi vào "Hoàn tất" hoặc "Bị hủy". Nếu đang xem các đơn ở mốc tháng trước, bạn có thể tự bấm nút "Làm mới (Refresh vòng xoay)" trên từng đơn để ép hệ thống tải trạng thái mới nhất cho riêng đơn đó bất cứ khi nào bạn muốn.

---

## 2. Dành cho Màn hình Tablet tại quầy (Tablet View)

Được thiết kế cho nhân viên hoặc thu ngân trong quán, màn hình Tablet có địa chỉ `(Domain)/tablet`. Hệ thống tự động phát hiện thiết bị và tài khoản (chỉ kích hoạt nếu người dùng được cấp quyền "Tablet").

### A. Triển khai đặt nhanh cho khách trực tiếp
- Giao diện Tablet tối giản hóa ở mức tối đa: Chỉ gồm các ô Cà Phê, Trà lớn bên cạnh trực tiếp là Giỏ hàng cột bên phải. 
- Ngay khi khách nói đồ uống, thu ngân nhấn vào đồ uống, chọn size trên popup và món bay ngay vào giỏ hàng bên phải trong tích tắc. 
- Hệ thống thiết kế các thao tác liên lạc (Địa chỉ, số điện thoại) trở thành *tùy chọn (Optional)*, bỏ qua hoàn toàn yêu cầu để bấm đặt luôn nhằm tăng gấp 3 tốc độ đẩy lệnh về khu pha chế. 

### B. Thanh toán và In đơn tự động
- Khi điền xong giỏ hàng, nhân viên có thể sử dụng màn trượt giỏ hàng nhanh bằng việc thu tiền mặt tại quầy và bấm Đặt.
- Sau khi bấm Đặt, màn hình Tablet tự động nhảy sang một popup nhỏ chứa chi tiết đơn với một nút **"In Đơn"**. Máy POS sẽ phóng ra biên lai gửi cho Khu pha chế và gửi trực tiếp cho khách.  

---

## 3. Dành cho Quản trị viên và Nhân viên cao cấp (Admin Dashboard)

Khu vực bảo mật cao cấp (Domain `/admin`), yêu cầu phải có Role Admin/Staff thiết lập. Tất cả quản lý xoay quanh các tab nội bộ bên trong trang quản trị.

### Tính năng Tổng quan Dashboard (Thống kê Zero-Read)
Hệ thống tích hợp một Dashboard báo cáo nâng cao (sử dụng 100% công nghệ HTML từ Google Apps Script dội thẳng qua `iframe` trên web). Điểm thần thông minh của tính năng này là bạn có thể xem doanh thu của cả nghìn đơn mà hệ thống không tốn một chút chi phí bộ đọc (Reads) Database nào cả do dữ liệu được phân tích chéo từ Google Sheet.
- **Bộ lọc thời gian linh hoạt:** Lựa chọn trực tiếp "Từ ngày" và "Đến ngày" trên giao diện.
- **Chỉ số trọng tâm (KPI):** Cung cấp tức thời "Tổng doanh thu", "Số đơn hoàn thành" và "Số đơn đang chờ" của khoảng thời gian vừa chọn.
- **Biểu đồ Cực đại:** Hệ thống tự vẽ Biểu đồ đường/cột thể hiện mức độ tăng trưởng doanh thu của quán theo chu kỳ.
- **Bảng dữ liệu (Data Table):** Tóm tắt doanh thu chi tiết theo từng ngày trong phạm vi thời điểm đã thiết lập để đối chiếu dễ dàng.

### Quản lý Đơn hàng
- Tab "Đơn Hàng" chứa danh sách toàn bộ các hoạt động mua bán của chuỗi. Cung cấp bộ lọc thông minh (Lọc theo trạng thái, lọc theo PT Giao).
- Các thanh tìm kiếm ngay trên tiêu đề hỗ trợ tìm tên khách, số điện thoại hoặc gõ thẳng 6 ký tự đuôi Mã Đơn để xử lý nhanh.
- **Thay đổi trạng thái:** Quản lý thay đổi tính trạng xử lý từ Chờ Xử Lý -> Đang Pha chế -> Đang Giao -> Hoàn Tất. Tất cả được lưu lại và thông báo tới thiết bị cá nhân của khách. 
- Ghi đè phương thức: (Ví dụ từ Tại quán sang Ship tùy vào hiện trạng). 

### Quản lý Danh mục và Sản phẩm (Tích hợp Smart Search mới)
- Bạn có thể **Thêm / Sửa / Khóa bán (ngừng bán)** linh hoạt.
- **Tính năng Tìm kiếm**: 
   - Danh mục: Tìm thẳng vào Tên và lọc.
   - Sản phẩm: Bạn có vô vàn SP? Chỉ cần nhập tên vào thanh tìm kiếm lớn bên trên góc màn hình Quản lý Sản phẩm, hoặc dùng Ô Lọc chọn sẵn đúng 1 Danh mục cần tìm. Hệ thống tối ưu không load đè lên bộ nhớ RAM. Nhấn nút "Tìm Kiếm" màu đen để thực hiện lệnh. 
- Lưu ý: Nút "Thêm sản phẩm" và "Thêm danh mục" giờ đây được thu nhỏ thành một khối vuông có biểu tượng Dấu Cộng (+) rất xinh xắn cạnh thanh Tìm kiếm để không chiếm nhiều diện tích ngang. Rê chuột vào và hiện tooltip nếu quên. 

### Quản lý Ưu đãi (Vouchers)
- Quản trị viên tự thiết lập chiến lược Mã giảm giá (Giảm % hoặc Giảm thẳng tiền). 
- Trạng thái Active/Deactive quản lý ngay tại bảng để quyết định mở hay đóng cổng. Tiến độ sử dụng `usedCount` dễ dàng phân tích độ hot của Voucher. 

### Quản lý Cache Hệ thống (Cache Management)
Lần đầu tiên tính năng này xuất hiện trao quyền quyết định tốc độ cho Admin:
- Tab "Quản Lý Cache".
- **Chế độ Tự động:** Mọi thao tác thêm sửa sản phẩm lập tức cập nhật lại Database và bắn tín hiệu sang thiết bị của Khách hàng, yêu cầu Client ngầm tải lại đồ mới nhất theo thời gian thực (Giảm độ trễ gần như = 0).
- **Chế độ Thủ công:** Admin hoàn thành hết combo 15 thức uống mới bắt đầu bấm nút "Cập nhật Cache khách" 1 lần duy nhất để giải tỏa sức nặng gọi Firebase. Hoàn toàn chủ động.

### Thông báo Mạng Xã Hội (Telegram Notify)
- Tại màn hình Cấu hình Cửa hàng, bạn có thể thiết lập Telegram Bot do chính bạn tạo để đẩy bắn tin nhắn thẳng vào Group Telegram chung của quán sau mỗi 1 giây kể từ khi có khách Vãng lai đặt hàng hoặc khách dùng Tablet lên đơn mới. Tránh miss đơn hoàn toàn.

---

### MỘT VÀI LƯU Ý DÀNH CHO ADMIN
1. Nút Refesh dữ liệu trên thanh Quản trị hiện chỉ là **1 vòng quay nhỏ (icon Refresh)** để không gây nhiễu màn hình. Hãy thường xuyên bấm vào nó ở các tab chứa danh sách biến động liên tục (Như "Quản lý đơn hàng") để xem trạng thái mới.
2. Các ảnh đồ uống vui lòng chuẩn bị dưới dạng Hình chữ nhật hoặc Vuông chất lượng cao, có dung lượng <= 200KB và lấy link dán thẳng vào ứng dụng để tránh tốn không gian Storage của hệ thống. 
