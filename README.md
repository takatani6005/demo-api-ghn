# ⚡ ShopVN × GHN API — Hướng dẫn Setup & Demo

Demo tích hợp **Giao Hàng Nhanh (GHN) API** cho website bán hàng.  
Gồm 3 tính năng chính: **Tính phí** · **Tạo đơn** · **Theo dõi vận đơn**

---

## 🗂 Cấu trúc project

```
shopvn/
├── server.js            ← Backend proxy (Node.js + Express)
├── package.json
├── .env.example         ← Mẫu cấu hình môi trường
├── .env                 ← ⚠️ Tự tạo, KHÔNG commit lên Git
└── public/
    ├── index.html
    └── js/
        ├── config.js    ← Cấu hình chung (endpoints, danh sách tỉnh...)
        ├── console.js   ← Logger hiển thị request/response trên UI
        ├── api.js       ← Gọi GHN API qua proxy
        ├── ui.js        ← Render kết quả ra DOM
        └── app.js       ← Controller chính
```

---

## ⚙️ Cài đặt

### Bước 1 — Cài Node.js

Tải tại [nodejs.org](https://nodejs.org) (chọn bản LTS).  
Kiểm tra sau khi cài:

```bash
node -v   # v18 trở lên
npm -v
```

### Bước 2 — Cài dependencies

```bash
cd shopvn
npm install
```

### Bước 3 — Tạo file `.env`

```bash
cp .env.example .env
```

Mở file `.env` và điền thông tin thật:

```env
GHN_TOKEN=your_ghn_token_here
GHN_SHOP_ID=your_ghn_shop_id_here
GHN_ENV=sandbox
PORT=3000
```

> **Lấy token ở đâu?**  
> Vào [dev-online-gateway.ghn.vn](https://dev-online-gateway.ghn.vn) → Đăng nhập → Chọn shop → Copy Token & Shop ID

### Bước 4 — Chạy server

```bash
node server.js
```

Hoặc dùng nodemon để tự reload khi sửa code:

```bash
npm run dev
```

### Bước 5 — Mở trình duyệt

```
http://localhost:3000
```

---

## ✅ Kiểm tra kết nối

Truy cập endpoint health check:

```
http://localhost:3000/api/health
```

Kết quả mong đợi:

```json
{
  "status": "ok",
  "ghn_env": "sandbox",
  "token_ok": true,
  "shop_id_ok": true
}
```

Nếu `token_ok: false` → kiểm tra lại file `.env` và restart server.

---

## 🎮 Kịch bản Demo

### 1. Tính phí vận chuyển
1. Chọn **Tỉnh/TP gửi** → Quận/Huyện gửi tự động load từ GHN API
2. Chọn **Tỉnh/TP nhận** → Quận/Huyện → Phường/Xã tự động load
3. Nhập trọng lượng: `1200` (gram)
4. Nhập giá trị hàng: `350000` (dùng để tính phí bảo hiểm)
5. Chọn dịch vụ: **Giao hàng nhanh**
6. Nhấn **"Tính phí vận chuyển"**
7. 👉 Quan sát **Console** bên dưới: thấy request POST và response JSON từ GHN

### 2. Tạo đơn hàng
1. Chuyển sang tab **"Tạo đơn"**
2. Điền thông tin người nhận (đã có sẵn dữ liệu mẫu)
3. Nhấn **"Tạo đơn hàng & lấy mã vận đơn"**
4. 👉 Kết quả trả về **mã vận đơn** (order_code) thật từ GHN sandbox

### 3. Theo dõi vận đơn
1. Nhấn nút **"Theo dõi đơn này ngay"** (tự động điền mã vừa tạo)
2. Hoặc chuyển tab **"Theo dõi"**, nhập mã vận đơn thủ công
3. 👉 Hiển thị timeline trạng thái đơn hàng

---

## 🔐 Vì sao cần Backend Proxy?

```
❌ SAI — Gọi thẳng từ frontend:
   Browser → api.ghn.dev (Token lộ trong DevTools!)

✅ ĐÚNG — Gọi qua proxy:
   Browser → /api/ghn/... → server.js → api.ghn.dev
                              ↑
                    Token được giữ trong .env,
                    frontend không bao giờ thấy
```

---

## 🌐 Các GHN API đã dùng

| Tính năng | Method | Endpoint |
|-----------|--------|----------|
| Tính phí | POST | `/v2/shipping-order/fee` |
| Tạo đơn | POST | `/v2/shipping-order/create` |
| Theo dõi | POST | `/v2/shipping-order/detail` |
| Lấy quận/huyện | GET | `/master-data/district` |
| Lấy phường/xã | GET | `/master-data/ward` |

Docs đầy đủ: [api.ghn.dev](https://api.ghn.dev/home/docs/detail)

---

## ❓ Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `401 Authorization header is required` | Token sai hoặc chưa có | Kiểm tra `.env`, restart server |
| `503 GHN_TOKEN chưa được cấu hình` | Chưa tạo file `.env` | Chạy `cp .env.example .env` |
| `502 Không kết nối được GHN` | Mạng hoặc GHN sandbox down | Kiểm tra mạng, thử lại |
| District/Ward không load | Token không có quyền | Dùng đúng token sandbox |
