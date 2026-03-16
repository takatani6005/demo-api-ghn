# LUMI × GHN — Shipping API Demo

Demo tích hợp [GHN Shipping API](https://api.ghn.dev) vào trang checkout thương mại điện tử.

## Tính năng

- Load địa chỉ động (tỉnh → quận → phường) từ GHN master data
- Tính phí vận chuyển tự động theo địa chỉ thực tế
- Hiển thị và cho phép chọn từng dịch vụ GHN khả dụng
- Tạo vận đơn và nhận mã vận đơn ngay trên trang
- Token bảo mật hoàn toàn phía server — frontend không bao giờ thấy token

## Yêu cầu

- Node.js >= 18
- Tài khoản GHN Sandbox: [dev.ghn.vn](https://dev.ghn.vn)

## Cài đặt

```bash
npm install
```

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Điền thông tin vào `.env`:

```
GHN_TOKEN=your_token_here
GHN_SHOP_ID=your_shop_id_here
GHN_ENV=sandbox
PORT=3000
```

## Chạy

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`

## Cấu trúc

```
├── server.js              # Express proxy — inject token, forward đến GHN
├── public/
│   ├── index.html         # Trang checkout
│   ├── css/style.css
│   └── js/
│       ├── config.js      # Hằng số, endpoint, sản phẩm mẫu
│       ├── api.js         # Hàm gọi GHN API qua proxy
│       ├── app.js         # Controller: kết nối form ↔ API ↔ UI
│       ├── ui.js          # Render kết quả ra DOM
│       └── console.js     # Logger hiển thị request/response trên UI
├── DEMO_SCRIPT.md         # Kịch bản thuyết trình
└── .env.example
```

## Luồng tích hợp

```
Browser → /api/ghn/* → server.js → GHN API
                ↑
         inject Token + ShopId từ .env
```

Tính phí theo 2 bước bắt buộc của GHN:

1. `POST /available-services` — lấy `service_id` thật theo tuyến đường + shop
2. `POST /fee` — tính phí với `service_id` vừa lấy (không dùng `service_type_id`)

## Lưu ý

- `node-fetch` phải dùng v2 (`^2.7.0`) — v3 là ESM, không tương thích `require()`
- `GHN_ENV=sandbox` khi test, đổi sang `prod` khi go-live