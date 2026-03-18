# Kịch bản thuyết trình — Tích hợp GHN Shipping API

Ví dụ cụ thể (siêu dễ hiểu)
Khi user bấm “Tính phí ship”
Frontend gửi:
{
  "from_district_id": 1450,
  "to_district_id": 1452
}
↓
Server thêm:
headers: {
  Token: "abc123",
  ShopId: "9999"
}
↓
GHN trả:
{
  "total": 25000
}
↓
Frontend hiển thị:
👉 “Phí ship: 25k”


5. Script demo (bạn chỉ cần nói cái này)
🎯 Khi demo tính phí:
“Đầu tiên frontend gọi API để lấy danh sách dịch vụ khả dụng”
“Sau đó lấy service_id tương ứng”
“Tiếp theo gọi API tính phí với service_id đó”
🎯 Khi demo tạo đơn:
“Sau khi có thông tin người nhận và dịch vụ, frontend gửi request tạo đơn”
“Backend proxy request sang GHN và trả về mã đơn hàng”


🎤 🧩 1. Mở đầu (10–15s)
“Hôm nay em demo tính năng tích hợp API giao hàng GHN vào website bán hàng.”
“Mục tiêu là: tính phí ship và tạo đơn hàng trực tiếp từ hệ thống.”
🎤 🧠 2. Giải thích kiến trúc (30s)
“Hệ thống gồm 3 phần chính: frontend, backend và GHN API.”
“Frontend không gọi trực tiếp GHN, mà thông qua backend proxy để bảo vệ token và shop_id.”
“Backend sẽ nhận request, gắn thông tin bảo mật, sau đó gọi GHN và trả kết quả về frontend.”
🎤 🔥 3. Demo flow tính phí (QUAN TRỌNG NHẤT)
👉 Bạn vừa nói vừa bấm demo
🧩 Bước 1: User nhập địa chỉ
“User nhập địa chỉ người nhận và thông tin đơn hàng.”
📡 Bước 2: Lấy service_id
“Frontend gọi API để lấy danh sách dịch vụ vận chuyển khả dụng giữa 2 khu vực.”
“Kết quả trả về service_id tương ứng với từng dịch vụ.”
🔁 Bước 3: Tính phí ship
“Sau đó frontend dùng service_id để gọi API tính phí.”
“GHN sẽ trả về phí ship, thời gian giao dự kiến và các chi phí liên quan.”
🖥️ Bước 4: Hiển thị kết quả
“Kết quả được hiển thị trực tiếp cho người dùng.”
🎤 📦 4. Demo tạo đơn hàng
🧩 Bước 1: User xác nhận
“Sau khi có phí ship, user tiến hành tạo đơn hàng.”
📡 Bước 2: Gửi request
“Frontend gửi thông tin đơn hàng như người nhận, địa chỉ, sản phẩm và dịch vụ vận chuyển.”
🚚 Bước 3: Backend xử lý
“Backend nhận request, gắn token và shop_id, sau đó gọi API tạo đơn của GHN.”
📦 Bước 4: Nhận kết quả
“GHN trả về mã đơn hàng và thông tin giao hàng.”
🖥️ Bước 5: Hiển thị
“Frontend hiển thị mã đơn để theo dõi.”
🎤 🔐 5. Điểm kỹ thuật (ăn điểm)
👉 nói chậm, rõ
“Token và ShopId được lưu trong file .env và chỉ sử dụng ở backend, không expose ra frontend.”
“Backend sử dụng proxy pattern để xử lý tất cả request /api/ghn/*.”
“Ngoài ra backend còn inject thêm shop_id vào một số request để đảm bảo đúng format của GHN.”
🎤 💡 6. Kết thúc
“Giải pháp này giúp đảm bảo bảo mật, dễ mở rộng và dễ tích hợp với các hệ thống khác.”
“Trong tương lai có thể mở rộng thêm tracking đơn hàng hoặc xử lý retry khi API lỗi.”
⚡ 7. Phiên bản SIÊU NGẮN (nếu run out of time)
👉 chỉ cần nhớ đoạn này:
“Frontend gọi backend proxy thay vì gọi trực tiếp GHN.”
“Backend gắn token và shop_id rồi gọi GHN API.”
“Flow chính gồm 2 bước: lấy service_id và tính phí ship, sau đó có thể tạo đơn hàng.”
🧠 Mẹo để nói trơn tru
👉 Khi bí:
nói “frontend gọi API”
nói “backend xử lý và gọi GHN”
nói “trả kết quả về”
👉 3 câu này lặp lại là đủ cứu bạn 😄