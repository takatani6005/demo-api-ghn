# Kịch bản thuyết trình — Tích hợp GHN Shipping API

**Thời lượng:** ~15 phút  
**Audience:** Kỹ thuật / Semi-technical  
**Demo live tại:** `http://localhost:3000`

---

## Mở đầu (1 phút)

> "Bài toán đặt ra là: khi khách hàng checkout, làm sao hiển thị đúng phí vận chuyển theo địa chỉ thực tế, chọn dịch vụ phù hợp, và tạo vận đơn ngay trên trang — thay vì để shop tự nhập tay trên hệ thống GHN?"

> "Hôm nay mình sẽ demo luồng tích hợp hoàn chỉnh với GHN API, chạy trên dữ liệu thật — không mock."

---

## Phần 1 — Kiến trúc bảo mật (2 phút)

**Nói:**
> "Vấn đề đầu tiên khi tích hợp bất kỳ API nào vào frontend: token không được để lộ ra client."

**Mở file `.env` (hoặc slide):**
```
GHN_TOKEN=xxxxxxxxxxxxx
GHN_SHOP_ID=xxxxxxx
GHN_ENV=sandbox
```

**Nói:**
> "Token nằm hoàn toàn trên server. Frontend chỉ gọi `/api/ghn/*` — một proxy nội bộ viết bằng Express. Server nhận request, gắn token vào header, rồi forward sang GHN."

**Mở terminal, chỉ log server:**
> "Mỗi request đều được log rõ ở đây — method, URL, body, response time. Token không bao giờ xuất hiện ở phía client."

**Mở DevTools → Network tab:**
> "Nhìn vào request từ browser: header chỉ có `Content-Type`. Token hoàn toàn không có mặt."

**Điểm nhấn:**
- Frontend → `/api/ghn/...` (proxy)
- Server inject `Token` + `ShopId` từ `.env`
- Browser không bao giờ thấy token thật

---

## Phần 2 — Trang checkout: load địa chỉ động (3 phút)

**Mở trình duyệt, vào trang checkout.**

**Nói:**
> "Ngay khi trang load, hệ thống đã tự động gọi GHN để lấy danh sách quận/huyện và phường/xã — không hardcode gì cả."

**Chỉ vào Developer Console (bottom of page), mở ra:**
> "Đây là log thật của các request. Ta thấy ngay 4 call khi trang vừa load:"

```
GET /master-data/district?province_id=202   ← quận/huyện kho gửi (HCM)
GET /master-data/district?province_id=201   ← quận/huyện địa chỉ nhận (HN)
GET /master-data/ward?district_id=xxxx      ← phường/xã kho gửi
GET /master-data/ward?district_id=xxxx      ← phường/xã địa chỉ nhận
```

**Đổi tỉnh nhận từ Hà Nội → Đà Nẵng:**
> "Khi đổi tỉnh, hệ thống tự reload quận/huyện tương ứng. Cascade đến phường/xã. Sau khi cả hai phía sẵn sàng, tự động trigger tính phí — không cần nhấn nút nào."

**Điểm nhấn:**
- Dữ liệu địa chỉ lấy live từ GHN, không hardcode
- Cascade: tỉnh → quận → phường → tự tính phí
- Debounce 400ms tránh gọi API liên tục

---

## Phần 3 — Tính phí: luồng 2 bước (4 phút)

**Nói:**
> "Đây là phần kỹ thuật thú vị nhất. GHN yêu cầu tính phí theo 2 bước bắt buộc — nhiều người bỏ qua bước 1 nên bị lỗi."

**Chỉ vào console log, giải thích:**

**Bước 1 — `POST /available-services`:**
> "Trước tiên phải hỏi GHN: với tuyến đường này, shop này có những dịch vụ nào khả dụng? GHN trả về danh sách kèm `service_id` — ID cụ thể của dịch vụ đó với shop này."

**Bước 2 — `POST /fee` (mỗi dịch vụ một lần):**
> "Sau đó mới tính phí, bắt buộc dùng `service_id` vừa lấy — không phải `service_type_id` chung. Mình tính tuần tự từng dịch vụ để tránh race condition trên proxy."

**Chỉ vào các service card:**
> "Kết quả hiển thị lên từng card. Dịch vụ nào GHN báo không khả dụng — ví dụ Hàng nặng khi đơn chỉ 500g — card đó bị mờ và disabled, không cho chọn."

**Live demo: thay đổi trọng lượng:**
> "Thay trọng lượng từ 500g lên 25000g. Hệ thống tự tính lại — lần này Hàng nặng có giá, card sáng lên, có thể chọn được."

**Chỉ vào order review block ở Bước 03:**
> "Phí vận chuyển cập nhật live xuống phần tổng kết đơn hàng bên dưới — Tạm tính + Phí ship = Tổng cộng. Không có số nào hardcode."

**Điểm nhấn:**
- `service_type_id` ≠ `service_id` — lỗi phổ biến khi tích hợp GHN lần đầu
- Dịch vụ không hợp lệ → disabled card + tooltip rõ lý do
- Tổng tiền cập nhật real-time theo dịch vụ đang chọn

---

## Phần 4 — Tạo đơn hàng (3 phút)

**Điền form Bước 01 (đã có sẵn dữ liệu mẫu):**
> "Thông tin người nhận nhập một lần, dùng chung cho cả tính phí lẫn tạo đơn — không phải nhập hai chỗ."

**Chọn dịch vụ ở Bước 02** (ví dụ: Giao hàng chuẩn).

**Xuống Bước 03, nhấn "Đặt hàng":**
> "Khi đặt hàng, hệ thống gửi `service_id` của dịch vụ đang được chọn — không phải `service_type_id` mặc định. Địa chỉ kho gửi cũng được truyền tường minh thay vì để GHN tự lấy từ shop profile."

**Modal xuất hiện:**
> "GHN trả về mã vận đơn thật. Từ đây shop có thể in nhãn và bàn giao cho shipper."

**Chỉ vào console log:**
> "Request body đầy đủ được log ở đây — weight, service_id, địa chỉ gửi và nhận, danh sách sản phẩm."

**Điểm nhấn:**
- `service_id` đang chọn → truyền thẳng vào create order
- Địa chỉ nhập 1 lần, dùng cho cả 3 bước
- Modal confirmation thay thế inline result — UX rõ ràng hơn

---

## Phần 5 — Câu hỏi hay gặp (2 phút)

**"Nếu GHN thay đổi API thì sao?"**
> "Toàn bộ endpoint và cấu hình nằm trong `config.js` và `server.js`. Thay đổi ở một chỗ, không cần sửa rải rác."

**"Token bị lộ qua server log thì sao?"**
> "Server.js mask token trong log — hiển thị `••••••••••••` thay vì giá trị thật. Log an toàn để commit."

**"Sandbox khác production thế nào?"**
> "Đổi `GHN_ENV=prod` trong `.env`, restart server. Không cần sửa một dòng code nào."

**"Tại sao dùng proxy thay vì gọi thẳng GHN từ frontend?"**
> "Ba lý do: bảo mật token, có thể thêm rate limiting và cache ở proxy layer, và dễ mock khi test."

---

## Tóm tắt kỹ thuật (30 giây)

| Vấn đề | Giải pháp |
|---|---|
| Bảo mật token | Express proxy — token chỉ tồn tại trên server |
| Tính phí đúng | 2 bước: `available-services` → `fee` với `service_id` thật |
| Race condition | Tính tuần tự + `AbortController` cancel lần cũ |
| UX địa chỉ | Cascade tự động, debounce 400ms |
| UX đặt hàng | 3 bước tuyến tính, dữ liệu dùng chung, modal confirmation |

---

## Checklist trước khi demo

- [ ] `node server.js` đang chạy tại port 3000
- [ ] `.env` có `GHN_TOKEN` và `GHN_SHOP_ID` hợp lệ
- [ ] `GHN_ENV=sandbox` (không demo trên production)
- [ ] Mở sẵn tab: trang checkout + terminal log + DevTools Network
- [ ] Đóng các tab không liên quan để tránh phân tán
- [ ] Test thử 1 lần đặt hàng trước để xác nhận sandbox đang hoạt động