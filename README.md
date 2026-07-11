# Weight Note

Ứng dụng ghi chú quá trình tăng/giảm cân chạy hoàn toàn trên trình duyệt và lưu dữ liệu bằng `localStorage` của chính máy đang mở app.

## Mục tiêu

Weight Note ưu tiên thao tác nhanh trên điện thoại:

- Ghi món ăn bằng 1 hàng ngang: **tên món → calo → lưu**.
- Không cần database món ăn có sẵn. Gợi ý chỉ lấy từ những món còn tồn tại trong lịch sử đã nhập.
- Theo dõi calo ăn vào, calo tập luyện, nước uống theo cốc 250 ml.
- Trang Dinh dưỡng dùng để xem, sửa và xóa các món đã ghi.
- Trang Ghi chú là một trình soạn thảo tự do kiểu mini Word, tự lưu.
- Trang Cá nhân tính BMR/TDEE, mục tiêu calo, biểu đồ cân nặng ước tính theo ngày và mốc cân thật định kỳ.

## Chạy app

Vì JavaScript dùng ES Modules, nên mở bằng localhost thay vì double-click file HTML.

Ví dụ với Python:

```bash
cd weight-note-app
python -m http.server 8000
```

Sau đó mở:

```text
http://localhost:8000
```

## 4 trang chính

- `index.html`: nhập nhanh đồ ăn, tập luyện, nước.
- `nutrition.html`: bảng món ăn theo ngày, sửa/xóa, tổng calo.
- `notes.html`: ghi chú tự do, tự lưu.
- `profile.html`: hồ sơ, mục tiêu, biểu đồ, cập nhật cân thật và reset hành trình.

## Quy tắc lưu dữ liệu

Dữ liệu nằm trong `localStorage` theo origin của localhost. Nếu đổi cổng hoặc đổi domain, trình duyệt có thể coi đó là một vùng lưu trữ khác.

Các key chính:

```text
weightNote.profile.v1
weightNote.journey.v1
weightNote.dailyRecords.v1
weightNote.weeklyWeights.v1
weightNote.note.v1
```

### Mốc 00:00

App không cần chạy một timer để "reset" đúng 00:00. Mỗi bản ghi được gắn với ngày local dạng `YYYY-MM-DD`. Sau 00:00, hành động mới tự thuộc ngày mới. Dữ liệu ngày cũ vẫn được giữ làm lịch sử.

## Logic gợi ý món ăn

Không có kho món ăn độc lập.

Danh sách gợi ý được dựng trực tiếp từ toàn bộ món còn tồn tại trong `dailyRecords`:

1. Người dùng từng lưu một món → món đó có thể được gợi ý.
2. Gõ tên gần giống → app lọc các món cũ.
3. Chọn món → tên và mức calo gần nhất được điền lại.
4. Người dùng vẫn có thể sửa calo trước khi lưu.
5. Nếu mọi bản ghi của một món đều bị xóa khỏi lịch sử → món đó tự biến mất khỏi gợi ý.

## Logic biểu đồ và 2 nguồn dữ liệu

### Nguồn 1: ước tính hàng ngày

Mỗi ngày có dữ liệu ăn hoặc tập luyện:

```text
thâm hụt ước tính = calo duy trì + calo tập luyện - calo đã ăn
```

Sau đó app ước tính thay đổi cân nặng từ chênh lệch năng lượng.

### Nguồn 2: cân nặng thực tế

Mốc cân thực tế có quyền ưu tiên cao hơn ước tính.

Ví dụ:

```text
Bắt đầu: 80 kg
Ngày 10 app ước tính: 75 kg
Ngày 10 cân thật: 77 kg
```

Kết quả:

- Mốc ban đầu **80 kg vẫn giữ nguyên**.
- Điểm ngày 10 chuyển từ **75 kg → 77 kg**.
- Từ sau ngày 10, biểu đồ tính tiếp từ **77 kg**.
- Các điểm trước ngày 10 không bị sửa ngược lại.

Đây là nguyên tắc "ước tính hàng ngày + điểm neo cân thật".

## Calo thay đổi theo cân nặng

App không dùng một mức calo cố định cho toàn bộ hành trình.

Mỗi khi cân nặng ước tính hoặc cân thật thay đổi, app tính lại mức năng lượng duy trì từ cân nặng hiện tại. Vì vậy một người ở 90 kg và cùng người đó khi xuống 80 kg có thể có mức duy trì và mục tiêu nạp khác nhau.

Công thức BMR dùng biến thể Mifflin–St Jeor:

```text
Nam: 10 × kg + 6.25 × cm − 5 × tuổi + 5
Nữ: 10 × kg + 6.25 × cm − 5 × tuổi − 161
```

TDEE trong app:

```text
TDEE = BMR × hệ số hoạt động nền
```

Calo tập luyện chủ động nhập ở Trang chủ được cộng riêng, nên hệ số hoạt động trong hồ sơ chỉ đại diện cho việc học/công việc và vận động nền.

Để vẽ ước tính đơn giản, bản này dùng quy đổi xấp xỉ `7.700 kcal ≈ 1 kg` cho chênh lệch năng lượng. Đây chỉ là mô hình ghi chép đơn giản; thay đổi cân nặng thực tế còn chịu ảnh hưởng bởi nước, glycogen, thành phần cơ thể và thích nghi chuyển hóa. Mốc cân thật hàng tuần được dùng để hiệu chỉnh lại đường ước tính.

## Reset hành trình

Nút **Xóa hành trình** ở Trang Cá nhân xóa:

- hồ sơ tính toán;
- cân nặng ban đầu/mục tiêu của hành trình;
- ngày bắt đầu/kết thúc;
- các mốc cân thật;
- biểu đồ hành trình.

Nó **không xóa**:

- nhật ký món ăn, vì dữ liệu này còn dùng cho gợi ý món cũ;
- ghi chú tự do.

Sau khi reset, form thiết lập hồ sơ xuất hiện lại.

## Giao diện

CSS được viết lại từ đầu theo phong cách **personal journal / health notebook**:

- nền giấy;
- nét viền như sổ tay;
- card có bóng cứng nhẹ;
- màu sage, mustard, coral và blue muted;
- icon SVG nội bộ, không phụ thuộc thư viện icon bên ngoài;
- điều hướng dưới cùng tối ưu cho điện thoại.

## Lưu ý

- Đây là app ghi chép cá nhân, không phải thiết bị y tế và không thay thế tư vấn của bác sĩ/chuyên gia dinh dưỡng.
- Dữ liệu chỉ nằm trên trình duyệt hiện tại. Xóa dữ liệu trình duyệt hoặc localStorage có thể làm mất dữ liệu.
- Nếu cần sao lưu lâu dài, nên bổ sung chức năng export/import JSON ở phiên bản sau.
