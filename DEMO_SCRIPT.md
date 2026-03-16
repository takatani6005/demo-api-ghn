# 🎤 Kịch bản thuyết trình Demo GHN API

> Dùng nội bộ — không cần trình chiếu, chỉ cần mở browser và nói theo luồng này.

---

## Mở đầu (~1 phút)

> *"Mình sẽ demo cách một website bán hàng tích hợp API của Giao Hàng Nhanh —
> cụ thể là 3 việc mà bất kỳ shop online nào cũng cần:
> tính phí ship, tạo đơn, và theo dõi vận đơn."*

Chỉ vào màn hình:
> *"Đây là giao diện của một shop demo — ShopVN.
> Toàn bộ đều gọi API thật của GHN sandbox,
> không phải mock hay fake data."*

---

## Phần 1 — Giải thích luồng kỹ thuật (~2 phút)

> *"Trước khi demo, mình giải thích nhanh tại sao cần có backend proxy."*

Vẽ nhanh lên bảng hoặc chỉ vào console:

```
Browser  →  /api/ghn/...  →  server.js  →  GHN API
                                ↑
                       Token giữ trong .env
```

> *"Nếu gọi thẳng từ frontend, token sẽ lộ trong DevTools — ai cũng thấy.
> Nên mình dùng Node.js làm proxy trung gian:
> frontend chỉ biết '/api/ghn/...', còn token thật nằm trong file .env
> trên server, không bao giờ xuất hiện ở browser."*

---

## Phần 2 — Demo tính phí (~3 phút)

**Làm:**
1. Chọn TP.HCM → chờ district load
2. Chọn Hà Nội nhận → chọn quận → chọn phường

> *"Các dropdown này không phải hard-code —
> mình đang gọi API `/master-data/district` và `/master-data/ward`
> để lấy danh sách thật từ GHN theo thời gian thực."*

3. Nhập trọng lượng `1200`, giá trị hàng `350000`
4. Nhấn **Tính phí**

> *"Nhìn xuống console — thấy request POST vừa được gửi đi,
> và response trả về có `total`, `service_fee`, `insurance_fee`.
> GHN tính phí dựa trên tuyến đường, trọng lượng, và loại dịch vụ."*

---

## Phần 3 — Demo tạo đơn (~3 phút)

**Làm:**
1. Chuyển tab **Tạo đơn**
2. Chỉ vào giỏ hàng mẫu

> *"Giỏ hàng có sẵn 2 sản phẩm — trong thực tế đây sẽ là đơn hàng thật
> từ database của shop."*

3. Nhấn **Tạo đơn hàng**

> *"Kết quả trả về `order_code` — đây là mã vận đơn thật trên hệ thống GHN sandbox.
> Shop dùng mã này để in nhãn và giao cho shipper."*

---

## Phần 4 — Demo theo dõi (~2 phút)

**Làm:**
1. Nhấn **"Theo dõi đơn này ngay"**

> *"Bấm một cái là chuyển sang tab theo dõi và tự động tra cứu luôn.
> API trả về `log` — là lịch sử cập nhật trạng thái từng bước của đơn hàng."*

2. Chỉ vào timeline trạng thái

> *"Trong thực tế shop sẽ dùng webhook để nhận thông báo tự động
> thay vì phải tra thủ công như này."*

---

## Kết (~1 phút)

> *"Tóm lại, để tích hợp GHN vào một website bán hàng cần 3 thứ:*
>
> *1. Token + Shop ID — đăng ký tài khoản GHN là có*
> *2. Backend proxy — để bảo mật token, không để lộ ra frontend*
> *3. Gọi đúng 3 endpoint chính — fee, create, detail*
>
> *Code của project này open source, mọi người có thể clone về
> chạy thử với token sandbox miễn phí."*

---

## Tips khi demo

- Mở sẵn **DevTools → Network tab** để show request thật đang đi
- Mở sẵn terminal đang chạy `node server.js` để show log màu sắc
- Nếu bị lỗi 401 → bình tĩnh giải thích "đây là lỗi token — ví dụ thực tế
  khi chưa cấu hình đúng .env"
- Nếu bị lỗi mạng → chuyển sang giải thích code thay vì demo live
