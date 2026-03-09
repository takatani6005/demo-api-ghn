/**
 * ui.js — Render kết quả ra DOM
 * Chỉ nhận plain data, không biết gì về API logic.
 */

const UI = (() => {

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

  // ── Lỗi ──────────────────────────────────────────────────────────

  function renderError(id, msg) {
    setHTML(id, `
      <div class="error-box">
        <div class="error-icon">❌</div>
        <div>
          <strong>Lỗi khi gọi GHN API</strong>
          <p style="margin:4px 0 0;font-size:.82rem;opacity:.85">${msg}</p>
          <p style="margin:8px 0 0;font-size:.78rem;opacity:.6">
            Kiểm tra: <code>GHN_TOKEN</code> và <code>GHN_SHOP_ID</code> trong <code>.env</code>,
            <code>node server.js</code> đang chạy, và mạng kết nối được đến <code>api.ghn.dev</code>.
          </p>
        </div>
      </div>
    `);
  }

  // ── Sản phẩm ─────────────────────────────────────────────────────

  function renderProducts(products) {
    setHTML('productList', products.map(p => `
      <div class="product-row">
        <span>${p.emoji}</span>
        <span class="product-name">${p.name}</span>
        <span class="product-sku">${p.sku}</span>
        <span style="color:var(--muted);font-size:.8rem">×${p.qty}</span>
        <span style="margin-left:auto;font-weight:600">${vnd(p.price)}</span>
      </div>
    `).join(''));
  }

  // ── Kết quả tính phí ─────────────────────────────────────────────
  // GHN response: { code, message, data: { total, service_fee, insurance_fee,
  //                 estimated_deliver_time, ... } }

  function renderFeeResult(res, { weight, insuredValue, serviceTypeId }) {
    const d   = res.data ?? {};
    const svc = CONFIG.SERVICES[serviceTypeId] ?? CONFIG.SERVICES['2'];

    // Định dạng ngày giao dự kiến (GHN trả ISO-8601)
    let deliverTime = d.estimated_deliver_time ?? '';
    try {
      if (deliverTime) deliverTime = new Date(deliverTime).toLocaleString('vi-VN');
    } catch (_) { /* giữ nguyên string gốc */ }

    setHTML('feeResult', `
      <div class="fee-result">
        <div class="fee-provider-label">
          <span style="width:8px;height:8px;background:#ff6b35;border-radius:50%;display:inline-block;box-shadow:0 0 8px #ff6b35"></span>
          Giao Hàng Nhanh — ${svc.label}
          <span class="status-badge status-ok" style="margin-left:auto">✓ Tính phí thành công</span>
        </div>

        <div class="fee-row">
          <span class="fee-label">Trọng lượng</span>
          <span class="fee-value">${Number(weight).toLocaleString()} g</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Giá trị hàng (bảo hiểm)</span>
          <span class="fee-value">${vnd(insuredValue)}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Phí dịch vụ</span>
          <span class="fee-value">${vnd(d.service_fee)}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Phí bảo hiểm</span>
          <span class="fee-value">${vnd(d.insurance_fee)}</span>
        </div>
        ${d.pick_station_fee ? `
        <div class="fee-row">
          <span class="fee-label">Phí lấy hàng tại điểm</span>
          <span class="fee-value">${vnd(d.pick_station_fee)}</span>
        </div>` : ''}
        <div class="fee-row">
          <span class="fee-label">Giao dự kiến</span>
          <span class="fee-value">⏱ ${deliverTime || svc.days}</span>
        </div>
        <div class="fee-total">
          <span class="label">💰 Tổng phí vận chuyển</span>
          <span class="amount">${vnd(d.total)}</span>
        </div>
      </div>
    `);
  }

  // ── Kết quả tạo đơn ──────────────────────────────────────────────
  // GHN response: { code, message, data: { order_code, total_fee,
  //                 expected_delivery_time, sort_code, ... } }

  function renderCreateResult(res) {
    const d = res.data ?? {};
    let deliverTime = d.expected_delivery_time ?? '';
    try {
      if (deliverTime) deliverTime = new Date(deliverTime).toLocaleString('vi-VN');
    } catch (_) {}

    setHTML('createResult', `
      <div class="fee-result">
        <div class="fee-provider-label">
          <span style="width:8px;height:8px;background:#ff6b35;border-radius:50%;display:inline-block;box-shadow:0 0 8px #ff6b35"></span>
          Đơn hàng đã tạo thành công!
          <span class="status-badge status-ok" style="margin-left:auto">✓ 200 OK</span>
        </div>

        <div class="fee-row">
          <span class="fee-label">Mã vận đơn</span>
          <span class="fee-value" style="font-family:'Space Mono',monospace;color:#a78bfa">${d.order_code || '—'}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Sort code</span>
          <span class="fee-value" style="font-family:'Space Mono',monospace;font-size:.8rem">${d.sort_code || '—'}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Trạng thái</span>
          <span class="fee-value">🟡 Chờ lấy hàng</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Phí vận chuyển thực tế</span>
          <span class="fee-value">${vnd(d.total_fee)}</span>
        </div>
        <div class="fee-row">
          <span class="fee-label">Giao dự kiến</span>
          <span class="fee-value">📅 ${deliverTime || '—'}</span>
        </div>

        <div style="margin-top:14px;text-align:center">
          <button class="btn-sm" onclick="App.quickTrack('${d.order_code}')">
            📍 Theo dõi đơn này ngay
          </button>
        </div>
      </div>
    `);
  }

  // ── Kết quả theo dõi ─────────────────────────────────────────────
  // GHN response: { code, message, data: { order_code, status,
  //                 log: [{ status, updated_date, description }, ...] } }

  const GHN_STATUS = {
    ready_to_pick:    { icon: '📋', title: 'Chờ lấy hàng' },
    picking:          { icon: '🚗', title: 'Đang lấy hàng' },
    cancel:           { icon: '❌', title: 'Đã huỷ' },
    money_collect_picking: { icon: '💵', title: 'Đang thu tiền' },
    picked:           { icon: '📦', title: 'Đã lấy hàng' },
    storing:          { icon: '🏢', title: 'Nhập kho' },
    transporting:     { icon: '🚛', title: 'Đang vận chuyển' },
    sorting:          { icon: '🔄', title: 'Đang phân loại' },
    delivering:       { icon: '🏃', title: 'Đang giao hàng' },
    money_collect_delivering: { icon: '💵', title: 'Đang thu tiền COD' },
    delivered:        { icon: '✅', title: 'Giao thành công' },
    delivery_fail:    { icon: '⚠️', title: 'Giao thất bại' },
    waiting_to_return:{ icon: '↩️', title: 'Chờ hoàn hàng' },
    return:           { icon: '↩️', title: 'Đang hoàn hàng' },
    return_transporting: { icon: '↩️', title: 'Vận chuyển hoàn' },
    returned:         { icon: '✔️', title: 'Đã hoàn hàng' },
    exception:        { icon: '🚨', title: 'Ngoại lệ' },
    damage:           { icon: '💔', title: 'Hàng hỏng' },
    lost:             { icon: '🔍', title: 'Thất lạc' },
  };

  function renderTrackResult(orderCode, res) {
    const d    = res.data ?? {};
    const logs = d.log ?? [];

    const stepsHTML = logs.length
      ? logs.map((s, i) => {
          const isLast = i === logs.length - 1;
          const meta   = GHN_STATUS[s.status] ?? { icon: '📦', title: s.status };
          let updTime  = s.updated_date ?? '';
          try { if (updTime) updTime = new Date(updTime).toLocaleString('vi-VN'); } catch (_) {}
          return `
            <div class="tracking-step">
              <div class="step-icon ${isLast ? 'step-current' : 'step-done'}">${meta.icon}</div>
              <div class="step-info">
                <h4>${meta.title}</h4>
                <p>${s.description ?? ''} • ${updTime}</p>
              </div>
            </div>`;
        }).join('')
      : `<div class="empty-state"><div class="empty-icon">📭</div><p>Chưa có thông tin vận chuyển</p></div>`;

    const currentMeta = GHN_STATUS[d.status] ?? { icon: '📦', title: d.status ?? '—' };

    setHTML('trackResult', `
      <div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:2px">MÃ VẬN ĐƠN</div>
          <div style="font-family:'Space Mono',monospace;font-size:.86rem;color:#a78bfa">${orderCode}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:.7rem;color:var(--muted);margin-bottom:2px">TRẠNG THÁI</div>
          <div style="font-size:.9rem;font-weight:700;color:#ff6b35">${currentMeta.icon} ${currentMeta.title}</div>
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
    loading, vnd,
    renderError, renderProducts,
    renderFeeResult, renderCreateResult, renderTrackResult,
    switchTab,
  };

})();