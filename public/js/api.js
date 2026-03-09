/**
 * api.js — Gọi GHN API thật qua backend proxy (server.js)
 *
 * Luồng: Frontend → fetch('/api/ghn/...') → server.js gắn Token+ShopId → api.ghn.dev
 *
 * Docs GHN: https://api.ghn.dev/home/docs/detail
 * Sandbox:  https://dev-online-gateway.ghn.vn/shiip/public-api
 * Prod:     https://online-gateway.ghn.vn/shiip/public-api
 */

const Api = (() => {

  // ── HTTP helpers ──────────────────────────────────────────────────

  async function _post(path, body) {
    AppConsole.request('POST', CONFIG.GHN.baseUrl + path, { Token: '••••••••••••', ShopId: '••••••' }, body);

    const res = await fetch(CONFIG.GHN.baseUrl + path, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await res.json();
    AppConsole.response(res.status, data.data ?? data);

    if (!res.ok || (data.code && data.code !== 200)) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function _get(path) {
    AppConsole.request('GET', CONFIG.GHN.baseUrl + path, { Token: '••••••••••••' });

    const res  = await fetch(CONFIG.GHN.baseUrl + path, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    AppConsole.response(res.status, data.data ?? data);

    if (!res.ok || (data.code && data.code !== 200)) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  // ══════════════════════════════════════════════════════════════════
  // 1. TÍNH PHÍ VẬN CHUYỂN
  //    POST /v2/shipping-order/fee
  //
  //    Body bắt buộc:
  //      service_type_id    — 2 (nhanh) | 5 (tiết kiệm) | 3 (hỏa tốc)
  //      from_district_id   — districtId kho gửi (lấy từ API /district)
  //      to_district_id     — districtId người nhận
  //      to_ward_code       — wardCode người nhận
  //      weight             — gram
  //      insurance_value    — giá trị hàng (để tính phí bảo hiểm)
  //
  //    Response:
  //      data.total          — tổng phí
  //      data.service_fee    — phí dịch vụ
  //      data.insurance_fee  — phí bảo hiểm
  //      data.estimated_deliver_time — ISO-8601
  // ══════════════════════════════════════════════════════════════════

  async function calculateFee({ fromDistrictId, toDistrictId, toWardCode, weight, insuredValue, serviceTypeId }) {
    const body = {
      service_type_id:  Number(serviceTypeId),
      from_district_id: Number(fromDistrictId),
      to_district_id:   Number(toDistrictId),
      to_ward_code:     String(toWardCode),
      weight:           Number(weight),
      height:           15,
      length:           25,
      width:            20,
      insurance_value:  Number(insuredValue),
      coupon:           null,
    };
    return _post(CONFIG.GHN.feeEndpoint, body);
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. TẠO ĐƠN HÀNG
  //    POST /v2/shipping-order/create
  //
  //    Body quan trọng:
  //      payment_type_id  — 1=shop trả phí | 2=người nhận trả phí
  //      required_note    — CHOTHUHANG | CHOXEMHANGKHONGTHU | KHONGCHOXEMHANG
  //      to_name, to_phone, to_address
  //      to_district_id, to_ward_code
  //      weight, cod_amount, items[]
  //
  //    Response:
  //      data.order_code   — mã vận đơn
  //      data.total_fee    — phí thực tế
  //      data.expected_delivery_time
  // ══════════════════════════════════════════════════════════════════

  async function createOrder({ toName, toPhone, toAddress, toDistrictId, toWardCode,
                               weight, codAmount, note, items }) {
    const body = {
      payment_type_id:  2,            // 2 = người nhận trả phí ship
      required_note:    'KHONGCHOXEMHANG',
      note:             note || '',
      to_name:          toName,
      to_phone:         toPhone,
      to_address:       toAddress,
      to_district_id:   Number(toDistrictId),
      to_ward_code:     String(toWardCode),
      weight:           Number(weight),
      height:           15,
      length:           25,
      width:            20,
      service_type_id:  2,
      cod_amount:       Number(codAmount),
      items:            (items || []).map(p => ({
        name:     p.name,
        code:     p.sku,
        quantity: p.qty,
        price:    p.price,
      })),
    };
    return _post(CONFIG.GHN.createEndpoint, body);
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. THEO DÕI VẬN ĐƠN
  //    POST /v2/shipping-order/detail   ← GHN dùng POST, không phải GET
  //    Body: { order_code: "GHN..." }
  //
  //    Response:
  //      data.status       — trạng thái hiện tại
  //      data.log[]        — lịch sử cập nhật
  //        .status, .updated_date, .description
  // ══════════════════════════════════════════════════════════════════

  async function trackOrder(orderCode) {
    return _post(CONFIG.GHN.trackEndpoint, { order_code: orderCode });
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. LẤY DANH SÁCH QUẬN/HUYỆN (helper)
  //    GET /master-data/district?province_id=...
  //    Dùng để populate dropdown district thay cho hard-code
  // ══════════════════════════════════════════════════════════════════

  async function getDistricts(provinceId) {
    return _get(`/master-data/district?province_id=${provinceId}`);
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. LẤY DANH SÁCH PHƯỜNG/XÃ (helper)
  //    GET /master-data/ward?district_id=...
  // ══════════════════════════════════════════════════════════════════

  async function getWards(districtId) {
    return _get(`/master-data/ward?district_id=${districtId}`);
  }

  return { calculateFee, createOrder, trackOrder, getDistricts, getWards };

})();