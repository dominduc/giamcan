# Luồng hoạt động của Weight Note

Tài liệu này mô tả app theo cách đơn giản nhất.

Mục tiêu là chỉ cần đọc file này là hiểu:

- người dùng bấm gì;
- dữ liệu đi đâu;
- app phản ứng ra sao;
- trường hợp nào làm thay đổi cân;
- trường hợp nào làm thay đổi mục tiêu calo.

---

# 1. Hình dung app bằng một câu

```text
Ghi món ăn mỗi ngày
→ tính chênh lệch năng lượng
→ cộng dồn
→ đủ 1 kg thì đổi mốc cân
→ cân thật có thể ghi đè mốc ước tính
→ biểu đồ cập nhật
```

---

# 2. App có 4 khu vực

```text
Trang chủ
Dinh dưỡng
Ghi chú
Cá nhân
```

## Trang chủ

Nơi nhập dữ liệu nhanh.

```text
Tên món + calo
Tập thể dục
Nước
```

## Dinh dưỡng

Nơi kiểm tra lại dữ liệu.

```text
Xem
Sửa
Xóa
```

## Ghi chú

Một trang viết tự do, không tham gia tính cân.

## Cá nhân

Nơi tạo hành trình và xem kết quả.

```text
Hồ sơ
Mục tiêu
Biểu đồ
Cân thật
Reset
```

---

# 3. Trạng thái 1 — Chưa tạo hành trình

Khi chưa nhập hồ sơ ở Trang Cá nhân:

```text
Chưa có cân ban đầu
Chưa có cân mục tiêu
Chưa có ngày bắt đầu
Chưa có ngày kết thúc
```

App vẫn cho phép:

- ghi món;
- sửa/xóa món;
- tạo lịch sử gợi ý;
- ghi tập luyện;
- ghi nước;
- ghi chú.

Nhưng phần tính hành trình không hoạt động.

Bảng tính hành trình hiển thị:

```text
Mục tiêu: 0
Đã nạp: 0
Thể dục: 0
Còn lại: 0
```

---

# 4. Trạng thái 2 — Tạo hành trình lần đầu

Ví dụ người dùng nhập:

```text
Nam
25 tuổi
170 cm
Hoạt động nền: ngồi nhiều
Cân ban đầu: 90 kg
Cân mục tiêu: 70 kg
Bắt đầu: 01/08/2026
Kết thúc: 01/08/2027
```

Khi bấm:

```text
Lưu tất cả
```

app làm:

1. lưu hồ sơ;
2. lưu hành trình;
3. khóa form thiết lập;
4. không cho sửa trực tiếp nữa;
5. tính calo duy trì ở mốc 90 kg;
6. tính mục tiêu nạp từ 90 kg tới 70 kg trong thời gian còn lại;
7. tạo biểu đồ từ mốc 90 kg ban đầu.

Cân ban đầu:

```text
90 kg
```

là mốc bất biến.

Check-in sau này không được sửa ngược mốc ban đầu.

---

# 5. Một ngày bình thường

Ví dụ ngày hôm nay người dùng nhập:

```text
Sáng: 400 kcal
Trưa: 700 kcal
Tối: 500 kcal
Tập thể dục: 300 kcal
```

Tổng:

```text
Đã ăn = 1.600 kcal
```

Giả sử calo duy trì ở mốc hiện tại là:

```text
2.300 kcal
```

App tính:

```text
2.300
+ 300 tập luyện
- 1.600 đã ăn
= 1.000 kcal thâm hụt
```

Sau đó:

```text
accumulatedEnergy += 1.000
```

Nếu tổng tích lũy chưa đủ 7.700 kcal:

```text
cân mốc vẫn giữ nguyên
mục tiêu calo vẫn giữ nguyên
```

---

# 6. Vì sao cân không giảm số lẻ mỗi ngày?

App không làm kiểu:

```text
90
89.93
89.81
89.67
```

Mà làm kiểu:

```text
90 kg
90 kg
90 kg
90 kg
89 kg
89 kg
89 kg
```

Lý do:

```text
Calo mục tiêu chỉ thay đổi khi có một mốc cân mới.
```

Mốc cân mới xuất hiện khi:

```text
A. tích lũy đủ khoảng 1 kg
hoặc
B. người dùng nhập cân thật
```

---

# 7. Khi đủ 1 kg

Ví dụ:

```text
Ngày 1: +2.000 kcal thâm hụt
Ngày 2: +2.000 kcal
Ngày 3: +2.000 kcal
Ngày 4: +1.900 kcal
```

Tổng:

```text
7.900 kcal
```

App xử lý:

```text
90 kg → 89 kg
```

Số dư:

```text
7.900 - 7.700 = 200 kcal
```

`200 kcal` được giữ lại cho mốc tiếp theo.

Sau mốc 89 kg, app tính lại:

```text
calo duy trì mới
mục tiêu nạp mới
thời gian còn lại
```

Mục tiêu mới được giữ nguyên cho tới mốc tiếp theo.

---

# 8. Cân thật mỗi tuần

Ví dụ:

```text
Cân ban đầu: 90 kg
App đang ước tính: 89 kg
Bạn cân thật: 87 kg
```

App xử lý:

```text
Mốc tại ngày cân = 87 kg
```

Sau đó:

```text
accumulatedEnergy = 0
```

và tính lại:

```text
calo duy trì theo 87 kg
mục tiêu nạp từ 87 kg tới cân mục tiêu
số ngày còn lại
```

Mốc:

```text
90 kg ban đầu
```

vẫn giữ nguyên.

Biểu đồ có thể hiểu như:

```text
90 kg ───── 89 kg ───── ● 87 kg
                         cân thật
```

Từ sau điểm `87 kg`, app tính tiếp từ `87 kg`.

---

# 9. Cân thật cao hơn ước tính

Ví dụ:

```text
App ước tính: 87 kg
Cân thật: 89 kg
```

App không tranh luận với cân thật.

Nó làm:

```text
mốc hiện tại = 89 kg
```

Sau đó:

```text
xóa phần năng lượng tích lũy dở dang
tính lại calo duy trì
tính lại mục tiêu nạp
tính tiếp từ 89 kg
```

---

# 10. Sửa một món ăn trong quá khứ

Ví dụ ngày 10/08 đã ghi:

```text
Cơm gà = 500 kcal
```

Sau đó vào Dinh dưỡng sửa thành:

```text
Cơm gà = 700 kcal
```

App làm:

1. cập nhật `dailyRecords` của ngày 10/08;
2. tổng calo ngày 10/08 thay đổi;
3. lần mô phỏng hành trình tiếp theo đọc lại dữ liệu mới;
4. chênh lệch năng lượng của ngày đó thay đổi;
5. mốc 1 kg phía sau có thể thay đổi theo.

Nếu phía sau đã có một cân thật:

```text
cân thật vẫn là điểm neo ưu tiên
```

Nghĩa là sai số trước điểm cân thật được hiệu chỉnh lại tại mốc đó.

---

# 11. Xóa một món

Khi xóa món ở Dinh dưỡng:

```text
món biến mất khỏi ngày đó
tổng calo ngày đó giảm
hành trình được mô phỏng lại
```

Nếu đó là bản ghi cuối cùng của tên món:

```text
món cũng biến mất khỏi nguồn gợi ý
```

---

# 12. Gợi ý món ăn

Ví dụ trước đây đã có:

```text
Cơm gà
Cơm rang
Cơm thịt
```

Khi gõ:

```text
cơm
```

app tìm các món còn tồn tại trong lịch sử.

Chọn một gợi ý:

```text
tên món được điền
calo đã nhớ được điền
```

Người dùng vẫn có thể sửa calo trước khi bấm lưu.

---

# 13. Ngày không ghi gì

Nếu ngày đó:

```text
không có món ăn
không có tập luyện
```

app coi là:

```text
chưa có dữ liệu năng lượng
```

Nó không tự hiểu là:

```text
đã nhịn ăn hoàn toàn
```

Vì vậy ngày đó không tự tạo thâm hụt.

---

# 14. Chỉ nhập tập luyện

Nếu:

```text
không nhập đồ ăn
nhưng nhập 300 kcal tập luyện
```

app coi ngày đó đã có dữ liệu năng lượng.

Công thức hiện tại:

```text
calo duy trì
+ 300
- 0
```

Điều này tương đương với việc app hiểu rằng lượng ăn ghi nhận của ngày đó là 0.

Đây là một tình huống cần người dùng nhập dữ liệu cẩn thận.

---

# 15. Qua 00:00

Ví dụ:

```text
23:59 ngày 10
```

app đang đứng ở ngày hôm nay.

Sau:

```text
00:01 ngày 11
```

khi app phát hiện ngày local đổi:

```text
ngày đang xem chuyển sang ngày 11
```

Thao tác mới thuộc ngày 11.

Dữ liệu ngày 10 vẫn giữ nguyên.

Nếu người dùng chủ động mở lại ngày 10 để sửa:

```text
app vẫn cho sửa ngày 10
```

---

# 16. Xem một ngày trước khi hành trình bắt đầu

Ví dụ:

```text
Hành trình bắt đầu: 10/08
Ngày đang xem: 05/08
```

App không dùng ngày 05/08 để tính hành trình.

Bảng hành trình:

```text
0
0
0
0
```

Nhưng món ăn cũ vẫn có thể tồn tại trong lịch sử để làm gợi ý.

---

# 17. Xem một ngày sau khi hành trình kết thúc

Ngày nằm ngoài khoảng:

```text
startDate → endDate
```

không có target calo của hành trình.

Dữ liệu nhật ký vẫn có thể tồn tại, nhưng không được xem là ngày đang hoạt động của hành trình đó.

---

# 18. Hành trình tăng cân

Nếu:

```text
cân mục tiêu > cân ban đầu
```

app cũng có thể mô phỏng.

Khi thặng dư tích lũy đủ khoảng:

```text
7.700 kcal
```

mốc cân tăng:

```text
70 kg → 71 kg
```

và mục tiêu calo được tính lại từ mốc mới.

---

# 19. Zoom biểu đồ

```text
1×
2×
4×
```

chỉ thay đổi chiều rộng của SVG biểu đồ.

```text
Khung app: không đổi
Card: không đổi
Vùng biểu đồ: giữ nguyên
SVG bên trong: rộng ra
```

Người dùng kéo ngang để xem chi tiết.

---

# 20. Ghi chú

Khi gõ:

```text
Tiêu đề
Nội dung
```

app chờ ngắn một chút rồi lưu vào `localStorage`.

Các nút hiện tại:

```text
Undo
Redo
Bold
Italic
Underline
H1
H2
Bullet list
Numbered list
```

Ghi chú độc lập với hành trình.

---

# 21. Reset toàn bộ dữ liệu

Khi bấm:

```text
Xóa toàn bộ dữ liệu
```

app hỏi xác nhận.

Nếu đồng ý, app xóa:

```text
Hồ sơ
Hành trình
Nhật ký món ăn
Lịch sử gợi ý
Tập luyện
Nước
Cân thật
Ghi chú
```

Sau đó:

```text
dashboard biến mất
form thiết lập ban đầu hiện lại
```

---

# 22. Các tình huống thao tác mẫu

## Tình huống A — Chưa có hồ sơ nhưng vẫn ghi món

Người dùng:

```text
nhập Phở bò 500 kcal
```

App:

```text
lưu món vào ngày hiện tại
món xuất hiện ở Dinh dưỡng
món có thể trở thành gợi ý sau này
bảng hành trình vẫn là 0
```

---

## Tình huống B — Tạo hành trình 90 kg → 70 kg

Người dùng:

```text
nhập hồ sơ
bấm Lưu tất cả
```

App:

```text
khóa form
giữ 90 kg làm mốc ban đầu
tính maintenance
tính target calories
vẽ biểu đồ
```

---

## Tình huống C — Thâm hụt chưa đủ 1 kg

Tổng tích lũy:

```text
5.200 kcal
```

App:

```text
cân mốc vẫn 90 kg
target calories không đổi
biểu đồ vẫn nằm ở bậc 90 kg
```

---

## Tình huống D — Đủ 1 kg

Tổng tích lũy:

```text
7.900 kcal
```

App:

```text
90 → 89 kg
giữ lại 200 kcal dư
tính lại target calories
biểu đồ nhảy xuống bậc 89 kg
```

---

## Tình huống E — Cân thật thấp hơn ước tính

App:

```text
ước tính 89 kg
```

Người dùng:

```text
nhập 87 kg
```

App:

```text
dùng 87 kg
reset năng lượng tích lũy dở dang
tính lại target
tính tiếp từ 87 kg
90 kg ban đầu không đổi
```

---

## Tình huống F — Cân thật cao hơn ước tính

App:

```text
ước tính 87 kg
```

Người dùng:

```text
nhập 89 kg
```

App:

```text
dùng 89 kg
không giữ 87 kg làm mốc hiện tại
tính lại từ 89 kg
```

---

## Tình huống G — Xóa mốc cân thật

Người dùng bấm:

```text
Gỡ mốc
```

App:

```text
xóa check-in đó
mô phỏng lại hành trình
đường ước tính có thể thay đổi
```

---

## Tình huống H — Sửa món cũ

Người dùng sửa:

```text
500 kcal → 800 kcal
```

App:

```text
cập nhật ngày cũ
tính lại chênh lệch ngày cũ
mốc phía sau có thể đổi
```

---

## Tình huống I — Xóa hết một món khỏi lịch sử

Sau khi bản ghi cuối cùng bị xóa:

```text
món không còn xuất hiện trong bộ nhớ gợi ý
```

---

## Tình huống J — Reset

Người dùng xác nhận reset:

```text
mọi key của Weight Note bị xóa
form hồ sơ hiện lại
app bắt đầu như mới
```

---

# 23. Quy tắc quan trọng cần nhớ

```text
1. Cân ban đầu không được sửa bởi check-in.
2. Cân thật ưu tiên hơn ước tính.
3. Cân chỉ đổi theo mốc 1 kg, không đổi lẻ mỗi ngày.
4. Target calories chỉ nên đổi khi có mốc cân mới.
5. Ngày không có dữ liệu năng lượng không tự được coi là ngày nhịn ăn.
6. Reset hiện tại là reset toàn bộ app.
7. Gợi ý món chỉ đến từ món còn tồn tại trong lịch sử.
```

---

# 24. Các điểm cần kiểm tra kỹ trong code hiện tại

Tài liệu này mô tả luồng mong muốn của app.

Khi sửa code, cần đặc biệt kiểm tra:

- target calories của một ngày có bị thay đổi sau khi nhập thêm món trong chính ngày đó không;
- chi tiết biểu đồ có dùng đúng maintenance đã dùng để tính ngày đó không;
- ghi chú có kịp lưu nếu người dùng gõ xong rồi đổi trang ngay không;
- app có bị kẹt nếu chỉ còn `PROFILE` hoặc chỉ còn `JOURNEY` trong localStorage không;
- có muốn bắt buộc check-in cách nhau đúng 7 ngày hay chỉ coi “mỗi tuần” là khuyến nghị;
- có muốn chặn ghi dữ liệu cho ngày tương lai hay không.
