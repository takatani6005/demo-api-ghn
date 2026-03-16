// api.js — Gọi GHN API qua backend proxy (server.js).
//
// Luồng tính phí bắt buộc 2 bước:
//   1. getAvailableServices(fromDistrict, toDistrict) → lấy service_id thật
//   2. calculateFee({ ..., serviceId })               → tính phí bằng service_id đó
//
// Lý do cần 2 bước:
//   service_type_id (1/2/3) là loại dịch vụ chung toàn hệ thống.
//   service_id là ID cụ thể của dịch vụ với từng shop — bắt buộc khi tính phí.

const Api = (() => {

  // ── HTTP helpers ──────────────────────────────────────────────────

  async function _post(path, body) {
    const url = CONFIG.GHN.baseUrl + path;
    AppConsole.request('POST', url, { Token: '••••••••••••', ShopId: '••••••' }, body);

    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    AppConsole.response(res.status, data.data ?? data);

    if (!res.ok || (data.code !== undefined && data.code !== 200 && data.code !== 0)) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function _get(path) {
    const url = CONFIG.GHN.baseUrl + path;
    AppConsole.request('GET', url, { Token: '••••••••••••' });

    const res  = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    AppConsole.response(res.status, data.data ?? data);

    if (!res.ok || (data.code !== undefined && data.code !== 200 && data.code !== 0)) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  // ── API calls ─────────────────────────────────────────────────────

  // Bước 1 bắt buộc trước khi tính phí.
  // Lưu ý: body dùng from_district / to_district (không có _id suffix, khác với /fee).
  // shop_id không gửi từ frontend — server.js tự inject từ GHN_SHOP_ID trong .env.
  async function getAvailableServices(fromDistrictId, toDistrictId) {
    return _post('/v2/shipping-order/available-services', {
      from_district: parseInt(fromDistrictId),
      to_district:   parseInt(toDistrictId),
    });
  }

  // Kết quả: data.total, data.service_fee, data.insurance_fee, data.estimated_deliver_time
  async function calculateFee({ fromDistrictId, fromWardCode, toDistrictId, toWardCode, weight, insuredValue, serviceId }) {
    return _post(CONFIG.GHN.feeEndpoint, {
      service_id:       parseInt(serviceId),
      from_district_id: parseInt(fromDistrictId),
      from_ward_code:   String(fromWardCode),
      to_district_id:   parseInt(toDistrictId),
      to_ward_code:     String(toWardCode),
      weight:           Math.max(1, Math.round(Number(weight))),
      height:           15,
      length:           25,
      width:            20,
      insurance_value:  Math.round(Number(insuredValue) || 0),
      coupon:           null,
    });
  }

  /**
   * Tạo đơn hàng. Trả về order_code, total_fee, expected_delivery_time.
   * Ưu tiên service_id (đọc từ radio đang chọn), fallback về service_type_id=2.
   */
  async function createOrder({ toName, toPhone, toAddress, toDistrictId, toWardCode,
                               fromDistrictId, fromWardCode,
                               serviceId, weight, codAmount, note, items }) {
    const body = {
      payment_type_id: 2,
      required_note:   'KHONGCHOXEMHANG',
      note:            note || '',
      to_name:         toName,
      to_phone:        toPhone,
      to_address:      toAddress,
      to_district_id:  parseInt(toDistrictId),
      to_ward_code:    String(toWardCode),
      weight:          Math.max(1, Math.round(Number(weight))),
      height:          15,
      length:          25,
      width:           20,
      cod_amount:      Math.round(Number(codAmount) || 0),
      items: (items || []).map(p => ({
        name:     p.name,
        code:     p.sku,
        quantity: p.qty,
        price:    Math.round(Number(p.price) || 0),
      })),
    };

    // Dùng service_id cụ thể nếu có (khớp dịch vụ user đã chọn ở form tính phí)
    if (serviceId) {
      body.service_id = parseInt(serviceId);
    } else {
      body.service_type_id = 2;
    }

    // Địa chỉ kho gửi — tường minh thay vì để GHN lấy từ shop profile
    if (fromDistrictId) body.from_district_id = parseInt(fromDistrictId);
    if (fromWardCode)   body.from_ward_code   = String(fromWardCode);

    return _post(CONFIG.GHN.createEndpoint, body);
  }

  // Lưu ý: GHN dùng POST cho endpoint này (không phải GET).
  // Kết quả: data.status, data.log[] = [{ status, updated_date, description }]
  async function trackOrder(orderCode) {
    return _post(CONFIG.GHN.trackEndpoint, { order_code: orderCode });
  }

  async function getDistricts(provinceId) {
    return _get(`/master-data/district?province_id=${provinceId}`);
  }

  async function getWards(districtId) {
    return _get(`/master-data/ward?district_id=${districtId}`);
  }

  return { getAvailableServices, calculateFee, createOrder, trackOrder, getDistricts, getWards };

})();