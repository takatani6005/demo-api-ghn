/**
 * config.js — Cấu hình frontend
 *
 * Token KHÔNG đặt ở đây.
 * Token nằm trong .env → được server.js tự gắn vào header khi proxy.
 * Frontend chỉ biết path /api/ghn/... — không bao giờ thấy token thật.
 */

const CONFIG = {

  // false = gọi API thật qua server.js (KHÔNG mock)
  MOCK_MODE: false,

  // ── GHN ────────────────────────────────────────────────────────────
  GHN: {
    name:           'Giao Hàng Nhanh',
    color:          '#ff6b35',
    baseUrl:        '/api/ghn',                      // → server.js → api.ghn.dev
    feeEndpoint:    '/v2/shipping-order/fee',
    createEndpoint: '/v2/shipping-order/create',
    trackEndpoint:  '/v2/shipping-order/detail',
  },

  // ── Tỉnh / Thành phố (provinceId GHN) ────────────────────────────
  PROVINCES: {
    '201': 'Hà Nội',
    '202': 'Hồ Chí Minh',
    '203': 'Đà Nẵng',
    '205': 'Hải Phòng',
    '208': 'Bình Dương',
    '210': 'Cần Thơ',
  },

  // ── Dịch vụ GHN (service_type_id) ────────────────────────────────
  // 2 = Hàng nhẹ (EXPRESS)  |  5 = Hàng nặng (ECONOMY)  |  3 = Hỏa tốc
  SERVICES: {
    '2': { label: 'Giao hàng nhanh',     days: '2–3 ngày',   serviceTypeId: 2 },
    '5': { label: 'Giao hàng tiết kiệm', days: '4–6 ngày',   serviceTypeId: 5 },
    '3': { label: 'Hỏa tốc',             days: 'Trong ngày', serviceTypeId: 3 },
  },

  // ── Sản phẩm mẫu ─────────────────────────────────────────────────
  SAMPLE_PRODUCTS: [
    { emoji: '📱', name: 'iPhone 15 Case', sku: 'SKU001', qty: 1, price: 250000, weight: 800 },
    { emoji: '🎧', name: 'Tai nghe TWS',   sku: 'SKU002', qty: 1, price: 100000, weight: 400 },
  ],
};