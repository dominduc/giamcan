# Cấu trúc dự án

```text
weight-note-app/
├── index.html
├── nutrition.html
├── notes.html
├── profile.html
├── README.md
├── STRUCTURE.md
├── APP-FLOW.md
│
├── assets/
│   └── icons.svg
│
├── css/
│   ├── index.css
│   │
│   ├── core/
│   │   ├── 01-tokens.css
│   │   ├── 02-reset.css
│   │   └── 03-layout.css
│   │
│   ├── components/
│   │   ├── 01-navigation.css
│   │   ├── 02-cards.css
│   │   ├── 03-forms.css
│   │   └── 04-table.css
│   │
│   └── pages/
│       ├── 01-home.css
│       ├── 02-nutrition.css
│       ├── 03-notes.css
│       ├── 04-profile.css
│       └── 05-responsive.css
│
└── js/
    ├── core/
    │   ├── 01-storage.js
    │   ├── 02-date.js
    │   ├── 03-records.js
    │   ├── 04-calculations.js
    │   └── 05-journey.js
    │
    └── pages/
        ├── home.js
        ├── nutrition.js
        ├── notes.js
        └── profile.js
```

---

# Nguyên tắc tổ chức

App dùng nhiều HTML riêng, không phải SPA.

```text
index.html
nutrition.html
notes.html
profile.html
```

Mỗi trang:

- tải cùng `css/index.css`;
- dùng bottom navigation để chuyển trang thật;
- chỉ nạp file JS của chính trang đó.

Dữ liệu dùng chung nhờ `localStorage`.

---

# HTML

## `index.html`

Trang nhập nhanh:

- đổi ngày;
- bảng calo ngang;
- 4 bữa;
- thêm món;
- tập thể dục;
- nước.

JS tương ứng:

```text
js/pages/home.js
```

## `nutrition.html`

Trang xem và quản lý món ăn:

- đổi ngày;
- tổng calo;
- bảng món;
- sửa;
- xóa;
- danh sách món còn tồn tại trong lịch sử.

JS tương ứng:

```text
js/pages/nutrition.js
```

## `notes.html`

Trang ghi chú:

- tiêu đề;
- toolbar 9 nút;
- vùng `contenteditable`;
- tự lưu.

JS tương ứng:

```text
js/pages/notes.js
```

## `profile.html`

Trang hành trình:

- form thiết lập một lần;
- dashboard;
- biểu đồ;
- zoom;
- cân thật;
- reset toàn bộ dữ liệu.

JS tương ứng:

```text
js/pages/profile.js
```

---

# CSS

## `css/index.css`

File import trung tâm.

Nó nạp:

```text
core
→ components
→ pages
```

## `css/core/01-tokens.css`

Chứa token giao diện:

- màu giấy;
- màu chữ;
- màu accent;
- radius;
- shadow;
- font;
- chiều rộng nội dung.

Đây là phần quan trọng nhất nếu muốn tách phong cách hiện tại thành một theme để dùng cho web khác.

## `css/core/02-reset.css`

Chứa:

- `box-sizing`;
- reset margin;
- font cơ bản;
- nền giấy;
- helper `.hidden`;
- helper `.sr-only`.

## `css/core/03-layout.css`

Chứa layout chung:

- `.app-shell`;
- `.page-header`;
- `.page-title`;
- `.page-kicker`;
- `.stack`;
- `.section-title`;
- `.section-note`;
- `.icon`.

## `css/components`

### `01-navigation.css`

Bottom navigation 4 trang.

### `02-cards.css`

Các card và thành phần thống kê dùng lại:

- `.paper-card`;
- `.badge`;
- `.stat-chip`;
- `.empty-state`.

### `03-forms.css`

Các thành phần nhập liệu:

- input;
- select;
- button;
- icon button;
- suggestion box;
- form grid.

### `04-table.css`

Bảng dữ liệu Trang Dinh dưỡng.

## `css/pages`

CSS riêng từng trang:

```text
01-home.css
02-nutrition.css
03-notes.css
04-profile.css
05-responsive.css
```

`01-home.css` gồm cả style cho card "Xác nhận không nạp thêm calo" (`.confirm-day-card`) ở cuối Trang chủ.

`02-nutrition.css` gồm cả màu riêng cho từng bữa (`.meal-tag--breakfast/lunch/snack/dinner`) và viền trái mỗi dòng bảng theo màu bữa, khớp với màu viền 4 card bữa ở Trang chủ.

---

# JavaScript core

## `js/core/01-storage.js`

Là cửa đọc/ghi `localStorage`.

Key hiện tại:

```text
PROFILE
JOURNEY
DAILY_RECORDS
WEEKLY_WEIGHTS
NOTE
```

Hàm quan trọng:

- `readJson()`;
- `writeJson()`;
- `removeKey()`;
- `clearAppData()`.

`clearAppData()` là hàm reset thật sự đang được UI dùng và xóa toàn bộ key hiện tại của app.

Trong `05-journey.js` hiện vẫn còn helper `resetJourneyOnly()`, nhưng UI hiện tại không dùng helper này.

## `js/core/02-date.js`

Chịu trách nhiệm:

- tạo ngày local `YYYY-MM-DD`;
- parse ngày;
- cộng/trừ ngày;
- tính số ngày;
- format ngày Việt Nam.

## `js/core/03-records.js`

Chịu trách nhiệm dữ liệu hằng ngày:

```text
dailyRecords[date]
├── meals
│   ├── breakfast
│   ├── lunch
│   ├── snack
│   └── dinner
├── exerciseCalories
├── waterCups
├── confirmed
└── updatedAt
```

Các việc chính:

- lấy dữ liệu ngày;
- thêm món;
- sửa món;
- xóa món;
- tính tổng calo;
- tạo gợi ý món;
- tạo danh sách món còn tồn tại trong lịch sử;
- đặt/hủy trạng thái xác nhận ngày (`setDayConfirmed()`).

`confirmed` đánh dấu ngày đó đã được người dùng bấm "Xác nhận không nạp thêm calo" ở Trang chủ. `addFood()`, `updateFood()`, `deleteFood()` đều tự đặt `confirmed = false` mỗi khi dữ liệu ngày đó thay đổi, để buộc xác nhận lại.

Không có database món ăn riêng.

## `js/core/04-calculations.js`

Chứa các hàm tính toán độc lập:

- `calculateBmr()`;
- `calculateMaintenanceCalories()`;
- `calculatePlannedTargetCalories()`.

Quy đổi mô phỏng:

```text
KCAL_PER_KG_APPROX = 7700
```

## `js/core/05-journey.js`

Là trung tâm logic hành trình.

Chịu trách nhiệm:

- đọc hồ sơ;
- đọc hành trình;
- lưu hồ sơ lần đầu;
- đọc/lưu cân thật;
- mô phỏng hành trình;
- tạo mốc 1 kg;
- tạo target event;
- lấy mục tiêu calo theo ngày.

Các biến logic quan trọng trong mô phỏng:

```text
currentWeight
accumulatedEnergy
activeTarget
targetEvents
milestones
checkinPoints
```

### Quy tắc bất biến

```text
journey.startWeight
```

là cân nặng ban đầu và không bị thay đổi bởi check-in sau này.

### Quy tắc mốc 1 kg

```text
accumulatedEnergy
```

tích lũy chênh lệch năng lượng.

Khi đạt:

```text
+7700 kcal
```

thì mốc cân giảm 1 kg.

Khi đạt:

```text
-7700 kcal
```

thì mốc cân tăng 1 kg.

### Quy tắc cân thật

Tại ngày có check-in:

1. cân thật được áp dụng;
2. cân thật trở thành mốc hiện tại;
3. `accumulatedEnergy` về 0;
4. mục tiêu calo được tính lại;
5. các ngày sau tính tiếp từ mốc thật mới;
6. `startWeight` không đổi.

### Quy tắc xác nhận ngày

Một ngày chỉ được đưa vào tính `dailyEnergyBalance` / `accumulatedEnergy` khi `day.confirmed === true`:

```text
hasLoggedEnergy = Boolean(day.confirmed)
```

Trước đây điều kiện này dựa vào `intake > 0 || exercise > 0`, dẫn đến việc ngày ghi dở dang (ví dụ mới nhập bữa sáng) bị hiểu nhầm là dữ liệu của cả ngày. Nay việc tính toán chỉ chạy sau khi người dùng chủ động xác nhận ở Trang chủ, tránh tạo mốc 1 kg giả từ số liệu chưa đầy đủ.

---

# JavaScript page

## `js/pages/home.js`

Nhiệm vụ:

- điều khiển ngày đang xem;
- thêm món;
- hiển thị gợi ý;
- lưu tập luyện;
- tăng/giảm nước;
- hiển thị bảng calo;
- xác nhận / hủy xác nhận ngày (chốt dữ liệu trước khi tính hành trình);
- tự chuyển sang ngày mới khi qua 00:00 nếu đang đứng ở “hôm nay”.

## `js/pages/nutrition.js`

Nhiệm vụ:

- đọc dữ liệu của ngày;
- dựng bảng món ăn;
- gắn màu theo bữa cho từng dòng (khớp màu 4 bữa ở Trang chủ);
- sửa món;
- xóa món;
- tính summary;
- hiển thị bộ nhớ món.

## `js/pages/notes.js`

Nhiệm vụ:

- tải ghi chú;
- chạy các lệnh định dạng;
- debounce tự lưu;
- lưu `title + html + updatedAt`.

## `js/pages/profile.js`

Nhiệm vụ:

- tạo hồ sơ lần đầu;
- khóa form sau khi đã có hành trình;
- render summary;
- lưu cân thật;
- render biểu đồ SVG;
- zoom biểu đồ;
- hiển thị chi tiết ngày (chênh lệch năng lượng chỉ hiện khi ngày đó đã xác nhận);
- reset toàn bộ dữ liệu.

---

# Luồng phụ thuộc dữ liệu

```text
Trang chủ
   ↓
dailyRecords
   ↓
Trang Dinh dưỡng
   ↓
05-journey.js đọc dailyRecords
   ↓
Mô phỏng hành trình
   ↓
Trang Cá nhân / biểu đồ
```

Cân thật đi theo luồng riêng:

```text
Trang Cá nhân
   ↓
weeklyWeights
   ↓
05-journey.js
   ↓
ghi đè mốc ước tính tại ngày cân
   ↓
tính tiếp các ngày sau từ cân thật
```

Ghi chú độc lập:

```text
notes.html
   ↓
weightNote.note.v1
```

---

# Reset

UI hiện tại dùng:

```text
clearAppData()
```

Nó xóa:

```text
PROFILE
JOURNEY
DAILY_RECORDS
WEEKLY_WEIGHTS
NOTE
```

Sau đó form thiết lập ban đầu xuất hiện lại.

---

# File tài liệu

- `README.md`: giới thiệu app và quy tắc chính.
- `STRUCTURE.md`: cấu trúc và trách nhiệm file.
- `APP-FLOW.md`: luồng hoạt động đơn giản hóa và các tình huống thao tác.