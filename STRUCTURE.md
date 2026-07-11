# Cấu trúc dự án

```text
weight-note-app/
├── index.html
├── nutrition.html
├── notes.html
├── profile.html
├── README.md
├── STRUCTURE.md
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

## Trách nhiệm từng phần

### HTML

Mỗi trang có một HTML riêng. Điều hướng là link thật giữa các trang, không phải SPA.

### `css/core`

- `01-tokens.css`: biến màu, radius, font, kích thước chung.
- `02-reset.css`: reset và nền toàn app.
- `03-layout.css`: khung trang, tiêu đề, spacing dùng chung.

### `css/components`

Các thành phần tái sử dụng giữa nhiều trang:

- bottom navigation;
- card;
- input/button;
- table.

### `css/pages`

Mỗi trang chỉ nhận CSS riêng cần thiết cho chính nó.

### `js/core/01-storage.js`

Một cửa duy nhất để đọc/ghi/remove `localStorage`.

### `js/core/02-date.js`

Xử lý ngày local, chuyển ngày và khoảng cách số ngày.

### `js/core/03-records.js`

Nguồn dữ liệu cho:

- bữa sáng/trưa/chiều/tối;
- món ăn;
- calo thể dục;
- số cốc nước;
- đề xuất món từ lịch sử còn tồn tại.

### `js/core/04-calculations.js`

Hàm tính toán độc lập:

- BMR;
- calo duy trì;
- mục tiêu calo theo cân hiện tại, cân mục tiêu và thời gian còn lại.

### `js/core/05-journey.js`

Logic hành trình:

- hồ sơ;
- mục tiêu;
- mô phỏng cân nặng theo ngày;
- mốc cân thực tế;
- reset hành trình.

Quy tắc quan trọng:

```text
startWeight = mốc ban đầu bất biến trong hành trình
weeklyWeight = chỉ ghi đè điểm tại ngày được cân
future estimate = tính tiếp từ weeklyWeight mới nhất
past estimate = không bị viết lại
```

### `js/pages/*`

Mỗi file chỉ điều khiển một trang HTML tương ứng.
