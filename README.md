# Weight Note

Weight Note là ứng dụng ghi chép quá trình tăng/giảm cân chạy trực tiếp trên trình duyệt và lưu dữ liệu bằng `localStorage` của chính trình duyệt đang mở app.

Ứng dụng ưu tiên:

- thao tác nhanh trên điện thoại;
- không cần tài khoản;
- không cần database từ xa;
- không có kho món ăn dựng sẵn;
- dữ liệu món ăn cũ của chính người dùng trở thành nguồn gợi ý;
- cân nặng được ước tính theo các mốc 1 kg và được hiệu chỉnh bằng cân thật.

---

## Chạy app

JavaScript dùng ES Modules, vì vậy nên mở bằng localhost thay vì double-click trực tiếp file HTML.

Ví dụ:

```bash
cd weight-note-app
python -m http.server 8000
```

Sau đó mở:

```text
http://localhost:8000
```

---

## 4 trang chính

### `index.html` — Trang chủ

Dùng để ghi nhanh:

- món ăn theo 4 bữa;
- calo của từng món;
- calo tập thể dục;
- số cốc nước;
- xác nhận ngày đã ghi xong (không nạp thêm calo).

Mỗi món ăn nhập theo một hàng ngắn:

```text
Tên món → Calo → Lưu
```

Sau khi lưu:

1. món được ghi vào đúng ngày và đúng bữa;
2. ô nhập được xóa để nhập món tiếp theo;
3. Trang Dinh dưỡng đọc lại cùng dữ liệu đó;
4. ngày đó tự động chuyển về trạng thái **chưa xác nhận** (xem mục bên dưới);
5. nếu ngày đang nằm trong hành trình và đã được xác nhận thì số calo ngày đó mới tham gia tính toán hành trình.

### `nutrition.html` — Dinh dưỡng

Dùng để:

- xem toàn bộ món đã ghi theo ngày;
- sửa tên món;
- sửa calo;
- xóa món;
- xem tổng calo của ngày;
- xem danh sách món còn tồn tại trong lịch sử để làm nguồn gợi ý.

Nhãn từng bữa được tô màu khớp với màu viền 4 bữa ở Trang chủ (sáng: vàng mustard, trưa: xanh sage, chiều/phụ: xanh dương, tối: đỏ coral) để dễ nhận diện khi danh sách nhiều bữa xen kẽ.

Sửa hoặc xóa món ở đây sẽ làm thay đổi dữ liệu ngày tương ứng, tự động đưa ngày đó về trạng thái **chưa xác nhận**, và lần mô phỏng hành trình tiếp theo sẽ dùng dữ liệu mới.

### `notes.html` — Ghi chú

Là một trang ghi chú tự do:

- tiêu đề;
- vùng viết `contenteditable`;
- hoàn tác / làm lại;
- đậm / nghiêng / gạch chân;
- H1 / H2;
- danh sách chấm / danh sách số;
- tự lưu vào `localStorage`.

### `profile.html` — Cá nhân

Dùng để:

- nhập hồ sơ một lần;
- nhập cân nặng ban đầu;
- nhập cân nặng mục tiêu;
- nhập ngày bắt đầu và ngày kết thúc;
- chọn mức hoạt động nền;
- xem BMR/TDEE và mục tiêu calo;
- xem biểu đồ;
- cập nhật cân thật;
- xóa toàn bộ dữ liệu để bắt đầu lại.

Sau khi lưu hồ sơ, form thiết lập bị khóa. Muốn nhập lại từ đầu phải dùng nút **Xóa toàn bộ dữ liệu**.

---

## Xác nhận ngày (chốt dữ liệu trước khi tính hành trình)

App **không tự đoán** một ngày đã ghi xong hay chưa. Việc chỉ dựa vào "có ăn hoặc có tập" để tính chênh lệch năng lượng dễ gây hiểu lầm: mới ghi bữa sáng buổi sáng đã bị tính như thể cả ngày chỉ ăn từng đó, dẫn đến thâm hụt ảo.

Vì vậy Trang chủ có nút:

```text
Xác nhận không nạp thêm calo
```

nằm ở cuối trang, dưới mục Tập thể dục và Lượng nước.

Nguyên tắc:

- một ngày chỉ tham gia tính chênh lệch năng lượng / mốc 1 kg trong hành trình **sau khi** đã bấm nút này;
- ngày chưa xác nhận vẫn hiển thị đầy đủ số liệu tạm (đã nạp, thể dục, còn lại) ở Trang chủ và Trang Dinh dưỡng, nhưng **không** được đưa vào mô phỏng hành trình;
- thêm, sửa hoặc xóa món ăn, hoặc đổi lại calo tập thể dục, sẽ **tự động hủy xác nhận** của ngày đó — buộc xác nhận lại sau khi số liệu đã đổi. Ghi nước không ảnh hưởng vì nước không liên quan tới phép tính calo;
- có thể bấm **Hủy xác nhận** nếu lỡ tay, mà không cần sửa lại dữ liệu;
- không thể xác nhận cho ngày trong tương lai.

Trạng thái xác nhận được lưu cùng bản ghi của từng ngày trong `dailyRecords`, không phải key riêng.

---

## Dữ liệu lưu ở đâu?

Toàn bộ dữ liệu nằm trong `localStorage` theo origin của trang web.

Các key hiện tại:

```text
weightNote.profile.v1
weightNote.journey.v1
weightNote.dailyRecords.v1
weightNote.weeklyWeights.v1
weightNote.note.v1
```

Lưu ý:

- `localhost:8000` và `localhost:5500` là hai vùng lưu khác nhau;
- `localhost` và GitHub Pages cũng là hai vùng lưu khác nhau;
- đổi trình duyệt hoặc đổi máy sẽ không tự mang dữ liệu sang;
- xóa dữ liệu trình duyệt có thể làm mất dữ liệu.

---

## Quy tắc ngày và mốc 00:00

Mỗi bản ghi được gắn với ngày local dạng:

```text
YYYY-MM-DD
```

App không cần chạy một lệnh “reset dữ liệu” đúng 00:00.

Khi đang đứng ở ngày hôm nay và đồng hồ qua 00:00:

- app nhận ra ngày local đã đổi;
- thao tác mới chuyển sang ngày mới;
- dữ liệu ngày cũ vẫn giữ nguyên.

Nếu người dùng chủ động mở một ngày cũ để sửa dữ liệu thì app vẫn làm việc với ngày đang được chọn.

---

## Quy tắc trước khi có hành trình

Trước khi tạo hồ sơ và hành trình:

- vẫn có thể ghi món ăn;
- vẫn có thể tạo lịch sử món để gợi ý;
- vẫn có thể ghi tập luyện, nước và ghi chú;
- bảng mục tiêu calo không tham gia tính hành trình.

Tại các ngày nằm ngoài khoảng hành trình:

```text
Mục tiêu = 0
Đã nạp trong bảng hành trình = 0
Thể dục trong bảng hành trình = 0
Còn lại = 0
```

Dữ liệu món ăn vẫn có thể tồn tại trong lịch sử để phục vụ gợi ý.

---

## Logic gợi ý món ăn

Không có database món ăn cố định.

Nguồn gợi ý được dựng trực tiếp từ những món còn tồn tại trong `dailyRecords`.

Luồng:

1. người dùng từng lưu một món;
2. món đó còn ít nhất một bản ghi trong lịch sử;
3. lần sau gõ tên gần giống, app tìm trong lịch sử;
4. chọn món gợi ý thì app điền lại tên và mức calo đã nhớ;
5. người dùng vẫn có thể sửa calo trước khi lưu;
6. khi mọi bản ghi của món đó bị xóa khỏi lịch sử, món đó biến mất khỏi gợi ý.

---

## Công thức năng lượng

### BMR

App dùng biến thể Mifflin–St Jeor:

```text
Nam: 10 × kg + 6.25 × cm − 5 × tuổi + 5
Nữ: 10 × kg + 6.25 × cm − 5 × tuổi − 161
```

### Calo duy trì

```text
TDEE = BMR × hệ số hoạt động nền
```

Mức hoạt động trong hồ sơ chỉ đại diện cho việc học, công việc và vận động nền.

Calo tập thể dục chủ động được nhập riêng ở Trang chủ để tránh tính hai lần.

### Chênh lệch năng lượng trong ngày

Chỉ những ngày đã **xác nhận** (xem mục "Xác nhận ngày" ở trên) mới được tính:

```text
chênh lệch năng lượng
= calo duy trì
+ calo tập thể dục
- calo đã ăn
```

Ngày chưa xác nhận có `chênh lệch năng lượng = 0` và không tham gia mô phỏng, dù đã có dữ liệu ăn/tập ghi dở dang.

Giá trị dương được hiểu là thâm hụt.
Giá trị âm được hiểu là thặng dư.

App dùng quy đổi đơn giản:

```text
7.700 kcal ≈ 1 kg
```

Đây là mô hình ghi chép đơn giản, không phải phép đo y khoa.

---

## Quy tắc mốc 1 kg

Cân nặng dùng để tính mục tiêu calo không giảm/tăng lẻ mỗi ngày.

Ví dụ:

```text
Mốc hiện tại: 90 kg
Mục tiêu nạp hiện tại: 1.544 kcal
```

Nếu tổng thâm hụt mới chỉ là:

```text
2.000 kcal
5.000 kcal
7.000 kcal
```

thì mốc cân dùng để tính vẫn là:

```text
90 kg
```

và mục tiêu calo vẫn giữ nguyên.

Chỉ khi phần năng lượng tích lũy đạt đủ khoảng:

```text
7.700 kcal
```

thì app tạo mốc mới:

```text
90 kg → 89 kg
```

Sau đó mục tiêu calo mới được tính lại từ:

- mốc cân mới;
- cân mục tiêu;
- ngày hiện tại của mốc;
- số ngày còn lại tới ngày kết thúc.

Quy tắc tương tự áp dụng cho tăng cân khi thặng dư tích lũy đủ một mốc 1 kg.

---

## Cân thật có ưu tiên cao nhất

Ví dụ:

```text
Bắt đầu: 90 kg
App đang ước tính: 89 kg
Cân thật tại ngày kiểm tra: 87 kg
```

Kết quả:

- `90 kg` ban đầu vẫn giữ nguyên;
- tại ngày cân thật, mốc ước tính được thay bằng `87 kg`;
- phần năng lượng tích lũy dở dang trước đó được xóa;
- từ ngày đó trở đi app tính tiếp từ `87 kg`;
- mục tiêu calo được tính lại từ `87 kg` và thời gian còn lại.

Cân thật là điểm neo có ưu tiên cao hơn mốc ước tính từ calo.

---

## Biểu đồ

Biểu đồ có 3 lớp dữ liệu:

1. **Lịch trình mục tiêu**  
   Đường tham chiếu từ cân ban đầu tới cân mục tiêu trong toàn bộ thời gian.

2. **Ước tính từ calo**  
   Đường dạng bậc, chỉ đổi khi đạt mốc 1 kg hoặc khi có cân thật.

3. **Cân thật**  
   Các điểm người dùng nhập thủ công.

Zoom `1×`, `2×`, `4×` chỉ làm biểu đồ rộng ra bên trong vùng cuộn ngang. Khung app không được phình theo.

---

## Reset toàn bộ dữ liệu

Nút **Xóa toàn bộ dữ liệu** ở Trang Cá nhân xóa toàn bộ key hiện tại của Weight Note:

- hồ sơ;
- hành trình;
- nhật ký món ăn;
- lịch sử món dùng cho gợi ý;
- tập thể dục;
- nước;
- cân thật;
- ghi chú.

Sau khi xóa:

- dashboard biến mất;
- form thiết lập ban đầu hiện lại;
- app bắt đầu như mới.

---

## Giao diện

CSS được viết bằng Vanilla CSS, không dùng Bootstrap, Tailwind hay DaisyUI.

Phong cách hiện tại:

- personal journal;
- health notebook;
- nền giấy;
- viền sổ tay;
- màu sage / mustard / coral / blue muted;
- icon SVG nội bộ;
- bottom navigation tối ưu cho điện thoại.

---

## Tài liệu thêm

- `STRUCTURE.md`: cấu trúc thư mục và trách nhiệm từng file.
- `APP-FLOW.md`: luồng hoạt động đơn giản hóa và nhiều tình huống thao tác thực tế.

---

## Lưu ý

- Đây là app ghi chép cá nhân, không phải thiết bị y tế.
- Kết quả cân nặng chỉ là ước tính.
- Cân thật định kỳ là dữ liệu quan trọng để hiệu chỉnh lại mô hình.
- Nên bổ sung export/import JSON trong tương lai nếu cần sao lưu dữ liệu lâu dài.