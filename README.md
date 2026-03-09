# ⚡ ShopVN — Tích hợp API Giao Hàng

Demo website bán hàng tích hợp **Giao Hàng Nhanh**, **Giao Hàng Tiết Kiệm**, **Viettel Post**.

## Cấu trúc thư mục

```
shopvn/
├── .env                ← Token thật (KHÔNG commit Git)
├── .env.example        ← Template — commit file này
├── .gitignore
├── package.json
├── server.js           ← Backend proxy (Node.js + Express)
│
└── public/             ← Frontend (browser)
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── config.js   ← Cấu hình, MOCK_MODE
        ├── mockApi.js  ← Giả lập response (học tập)
        ├── api.js      ← Gọi /api/... trên server
        ├── console.js  ← Logger UI
        ├── ui.js       ← Render DOM
        └── app.js      ← Controller
```

## Cài đặt & chạy

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ template
cp .env.example .env

# 3. Điền token thật vào .env
#    GHN   → https://dev.ghn.vn
#    GHTK  → https://khachhang.giaohangtietkiem.vn
#    VTP   → https://partner.viettelpost.vn

# 4. Khởi động
npm start
# → http://localhost:3000

# Dev mode (tự reload khi sửa file)
npm run dev
```

## Chuyển từ Mock sang API thật

Trong `public/js/config.js`, đổi:
```js
MOCK_MODE: false   // ← từ true sang false
```

## Tại sao Token phải ở backend?

```
❌ SAI:  Browser → Token trong config.js → GHN API   (F12 thấy token!)
✅ ĐÚNG: Browser → /api/ghn/fee → server.js (đọc .env) → GHN API
```

Token nằm trong `.env` trên server — browser không bao giờ nhìn thấy.# demo-api-ghn
