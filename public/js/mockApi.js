/**
 * ui.js — Render kết quả ra DOM
 *
 * Tách biệt hoàn toàn phần hiển thị khỏi logic gọi API.
 * Mọi hàm nhận dữ liệu thuần (plain data) và render HTML.
 */

const UI = (() => {

  // ── Helpers ───────────────────────────────────────────────────────

  function vnd(n) {
    return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function loading(id, msg = 'Đang xử lý...') {
    setHTML(id, `<div class="loading"><div class="spinner"></div>${msg}</div>`);
  }

  function empty(id, icon, msg) {
    setHTML(id, `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <p>${msg}</p>
      </div>
    `);
  }

  // ── Hiển thị lỗi ─────────────────────────────────────────────────

  function renderError(id, msg) {
    setHTML(id, `
      <div class="error-box">
        <div class="error-icon">❌</div>
        <div>
          <strong>Lỗi khi gọi API</strong>
          <p style="margin:4px 0 0;font-size:.82rem;opacity:.8">${msg}</p>
          <p style="margin:6px 0 0;font-size:.78rem;opacity:.6">
            Kiểm tra: token trong <code>.env</code>, server.js đang chạy, và mạng kết nối được.
          </p>
        </div>
      </div>
    `);
  }

  // ── Sản phẩm trong giỏ ───────────────────────────────────────────

  function renderProducts(products) {
    const html = products.map(p => `
      <div class="product-row">
        <span class="product-emoji">${p.emoji}</span>
        <span class="product-name">${p.name}</span>
        <span class="product-sku">${p.sku}</span>
        <span class="product-qty">×${p.qty}</span>
        <span class="product-price">${vnd(p.price)}</span>
      </div>
    `).join('');
    setHTML('productList', html);
  }

  // ── Provider selection ────────────────────────────────────────────

  function updateProviderUI(providerId) {
    const p = CONFIG.PROVIDERS[providerId];
    document.querySelectorAll('.provider-card').forEach(c => c.classList.remove('active'));
    document.querySelector(`.provider-card.${providerId}`)?.classList.add('active');

    const endpointEl = document.getElementById('endpointLabel');
    const chipEl     = document.getElementById('providerChip');
    if (endpointEl) endpointEl.textContent = `POST ${p.feeEndpoint}`;
    if (chipEl)     chipEl.textContent     = providerId.toUpperCase();
  }

  // ── Fee result ────────────────────────────────────────────────────

  function renderFeeResult(providerId, fromId, toId, weight, insuredValue, serviceTypeId, feeData) {
    const p   = CONFIG.PROVIDERS[providerId];
    const svc = CONFIG.SERVICES[serviceTypeId] ?? CONFIG.SERVICES['2'];
    const d   = feeData.data ?? {};

    const compareHTML = _buildCompareGrid(fromId, toId, weight, insuredValue, serviceTypeId);

    setHTML('feeResult', `
      <div class="fee-result">
        <div class="fee-provider-label">
          <span style="width:8px;height:8px;background:${p.color};border-radius:50%;display:inline-block;box-shadow:0 0 8px ${p.color}"></span>
          ${p.name} — ${svc.label}
          <span class="status-badge status-ok" style="margin-left:auto">✓ Tính phí thành công</span>
        </div>

        <div class="fee-row">
          <span class="fee-label">Tuyến giao hàng</span>
          <span class="fee-value">${CONFIG.PROVINCES[fromId] ?? fromId} → ${CONFIG.PROVINCES[toId] ?? toId}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Trọng lượng</span>
          <span class="fee-value">${Number(weight).toLocaleString()} g</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Phí dịch vụ</span>
          <span class="fee-value">${vnd(d.service_fee)}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Phí bảo hiểm</span>
          <span class="fee-value">${vnd(d.insurance_fee)}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Thời gian dự kiến</span>
          <span class="fee-value">⏱ ${d.estimated_deliver_time || '—'}</span>
        </div>
        <div class="fee-total">
          <span class="label">💰 Tổng phí vận chuyển</span>
          <span class="amount">${vnd(d.total)}</span>
        </div>
      </div>

      <div style="margin-top:10px">
        <div style="font-size:.72rem;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">
          So sánh 3 nhà vận chuyển (tham khảo)
        </div>
        <div class="compare-grid">${compareHTML}</div>
      </div>
    `);
  }

  function _buildCompareGrid(fromId, toId, weight, insuredValue, serviceTypeId) {
    return Object.entries(CONFIG.PROVIDERS).map(([id, p]) => {
      const isSame = fromId === toId;
      let base = isSame ? 18000 : 32000;
      if (weight > 1000) base += Math.floor((weight - 1000) / 500) * 5000;
      const svcMul = CONFIG.SERVICES[serviceTypeId]?.multiplier ?? 1;
      const fee    = Math.round(base * p.feeMultiplier * svcMul / 1000) * 1000;
      const ins    = Math.round(insuredValue * 0.01 / 1000) * 1000;
      return `
        <div class="compare-item">
          <div class="c-name" style="color:${p.color}">${p.name}</div>
          <div class="c-price">${vnd(fee + ins)}</div>
        </div>`;
    }).join('');
  }

  // ── Create order result ───────────────────────────────────────────

  function renderCreateResult(providerId, orderRes) {
    const p = CONFIG.PROVIDERS[providerId];
    const d = orderRes.data ?? {};

    setHTML('createResult', `
      <div class="fee-result">
        <div class="fee-provider-label">
          <span style="width:8px;height:8px;background:${p.color};border-radius:50%;display:inline-block;box-shadow:0 0 8px ${p.color}"></span>
          Đơn hàng đã tạo thành công!
          <span class="status-badge status-ok" style="margin-left:auto">✓ 200 OK</span>
        </div>

        <div class="fee-row">
          <span class="fee-label">Mã vận đơn</span>
          <span class="fee-value" style="font-family:'Space Mono',monospace;color:#a78bfa;font-size:.83rem">${d.order_code || '—'}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Nhà vận chuyển</span>
          <span class="fee-value">${p.name}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Trạng thái</span>
          <span class="fee-value">🟡 Chờ lấy hàng</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Phí vận chuyển</span>
          <span class="fee-value">${vnd(d.total_fee)}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Giao dự kiến</span>
          <span class="fee-value">📅 ${d.expected_delivery_time || '—'}</span>
        </div>

        <div style="margin-top:14px;text-align:center">
          <button class="btn-sm" onclick="App.quickTrack('${d.order_code}')">
            📍 Theo dõi đơn này ngay
          </button>
        </div>
      </div>
    `);
  }

  // ── Track result ──────────────────────────────────────────────────

  function renderTrackResult(orderCode, providerId, trackRes) {
    const p    = CONFIG.PROVIDERS[providerId];
    const d    = trackRes.data ?? {};
    const logs = d.log ?? [];

    const STATUS_ICONS = {
      created:      { icon: '📋', title: 'Đơn hàng đã tạo' },
      picking:      { icon: '🚗', title: 'Đang lấy hàng' },
      picked:       { icon: '📦', title: 'Đã lấy hàng' },
      in_transit:   { icon: '🏢', title: 'Đang trung chuyển' },
      delivering:   { icon: '✈️', title: 'Đang vận chuyển' },
      out_delivery: { icon: '🏠', title: 'Đang giao đến bạn' },
      delivered:    { icon: '✅', title: 'Giao thành công' },
      returned:     { icon: '↩️', title: 'Đã hoàn hàng' },
    };

    const stepsHTML = logs.length
      ? logs.map((s, i) => {
          const isLast    = i === logs.length - 1;
          const iconClass = isLast ? 'step-current' : 'step-done';
          const meta      = STATUS_ICONS[s.status] ?? {};
          const icon      = s._icon  ?? meta.icon  ?? '📦';
          const title     = s._title ?? meta.title ?? s.status;
          return `
            <div class="tracking-step">
              <div class="step-icon ${iconClass}">${icon}</div>
              <div class="step-info">
                <h4>${title}</h4>
                <p>${s.description} • ${s.updated_date}</p>
              </div>
            </div>`;
        }).join('')
      : `<div class="empty-state"><div class="empty-icon">📭</div><p>Chưa có thông tin vận chuyển</p></div>`;

    setHTML('trackResult', `
      <div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:2px">MÃ VẬN ĐƠN</div>
          <div style="font-family:'Space Mono',monospace;font-size:.86rem;color:#a78bfa">${orderCode}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:2px">NHÀ VẬN CHUYỂN</div>
          <div style="font-size:.84rem;font-weight:700;color:${p.color}">${p.name}</div>
        </div>
      </div>
      <div class="tracking-container">${stepsHTML}</div>
    `);
  }

  // ── Tabs ──────────────────────────────────────────────────────────

  function switchTab(tabId) {
    ['create', 'track'].forEach(id => {
      const el = document.getElementById(`tab-${id}`);
      if (el) el.style.display = id === tabId ? 'block' : 'none';
    });
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
  }

  return {
    loading, empty, vnd,
    renderError,
    renderProducts,
    updateProviderUI,
    renderFeeResult,
    renderCreateResult,
    renderTrackResult,
    switchTab,
  };

})();