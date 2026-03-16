// config.js — Hằng số dùng chung toàn frontend.
// Token KHÔNG đặt ở đây — nằm trong .env trên server, được server.js inject vào header.

const CONFIG = {

  // Proxy nội bộ (server.js) — frontend không gọi thẳng GHN
  GHN: {
    name:           'Giao Hàng Nhanh',
    color:          '#ff6b35',
    baseUrl:        '/api/ghn',
    feeEndpoint:    '/v2/shipping-order/fee',
    createEndpoint: '/v2/shipping-order/create',
    trackEndpoint:  '/v2/shipping-order/detail',
  },

  // province_id theo quy định của GHN
  PROVINCES: {
    '201': 'Hà Nội',
    '202': 'Hồ Chí Minh',
    '203': 'Đà Nẵng',
    '205': 'Hải Phòng',
    '208': 'Bình Dương',
    '210': 'Cần Thơ',
  },

  // service_type_id theo quy định của GHN
  SERVICES: {
    '1': { label: 'Giao hàng nhanh',     days: '2–3 ngày', serviceTypeId: 1 },
    '2': { label: 'Giao hàng chuẩn',     days: '2–4 ngày', serviceTypeId: 2 },
    '3': { label: 'Giao hàng tiết kiệm', days: '4–6 ngày', serviceTypeId: 3 },
  },

  // Sản phẩm mẫu cho demo — weight: gram, price: VNĐ
  SAMPLE_PRODUCTS: [
    { emoji: '📱', name: 'iPhone 15 Case', sku: 'SKU001', qty: 1, price: 250000, weight: 800 },
    { emoji: '🎧', name: 'Tai nghe TWS',   sku: 'SKU002', qty: 1, price: 100000, weight: 400 },
  ],

};