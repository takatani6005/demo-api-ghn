// ui.js — Render kết quả ra DOM.
// Nhận plain data từ app.js và chuyển thành HTML. Không chứa logic gọi API.

const UI = (() => {

  // ── Helpers ───────────────────────────────────────────────────────

  // Format số thành tiền VNĐ. Ví dụ: 53900 → "53.900đ"
  const vnd = n => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function loading(id, msg = 'Đang xử lý...') {
    setHTML(id, `<div class="loading"><div class="spinner"></div>${msg}</div>`);
  }

  // Parse ISO 8601 sang định dạng ngày giờ VN. Trả về chuỗi gốc nếu parse lỗi.
  function _formatDate(isoString) {
    try {
      return isoString ? new Date(isoString).toLocaleString('vi-VN') : '';
    } catch (_) {
      return isoString;
    }
  }

  function _feeRow(label, value) {
    return `
      <div class="fee-row">
        <span class="fee-label">${label}</span>
        <span class="fee-value">${value}</span>
      </div>`;
  }


  // ── Map trạng thái GHN → icon + nhãn tiếng Việt ──────────────────
  // Thêm status mới tại đây nếu GHN bổ sung trong tương lai.

  const GHN_STATUS = {
    ready_to_pick:            { icon: '📋', title: 'Chờ lấy hàng' },
    picking:                  { icon: '🚗', title: 'Đang lấy hàng' },
    picked:                   { icon: '📦', title: 'Đã lấy hàng' },
    cancel:                   { icon: '❌', title: 'Đã huỷ' },
    money_collect_picking:    { icon: '💵', title: 'Đang thu tiền' },
    storing:                  { icon: '🏢', title: 'Nhập kho' },
    transporting:             { icon: '🚛', title: 'Đang vận chuyển' },
    sorting:                  { icon: '🔄', title: 'Đang phân loại' },
    delivering:               { icon: '🏃', title: 'Đang giao hàng' },
    money_collect_delivering: { icon: '💵', title: 'Đang thu tiền COD' },
    delivered:                { icon: '✅', title: 'Giao thành công' },
    delivery_fail:            { icon: '⚠️', title: 'Giao thất bại' },
    waiting_to_return:        { icon: '↩️', title: 'Chờ hoàn hàng' },
    return:                   { icon: '↩️', title: 'Đang hoàn hàng' },
    return_transporting:      { icon: '↩️', title: 'Vận chuyển hoàn' },
    returned:                 { icon: '✔️', title: 'Đã hoàn hàng' },
    exception:                { icon: '🚨', title: 'Ngoại lệ' },
    damage:                   { icon: '💔', title: 'Hàng hỏng' },
    lost:                     { icon: '🔍', title: 'Thất lạc' },
  };


  // ── Render lỗi ────────────────────────────────────────────────────

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


  // ── Render giỏ hàng ───────────────────────────────────────────────

  function renderProducts(products) {
    setHTML('productList', products.map(p => `
      <div class="product-row">
        <span>${p.emoji}</span>
        <span class="product-name">${p.name}</span>
        <span class="product-sku">${p.sku}</span>
        <span style="color:var(--muted);font-size:.8rem">×${p.qty}</span>
        <span style="margin-left:auto;font-weight:600">${vnd(p.price * p.qty)}</span>
      </div>
    `).join(''));

    // Cập nhật tạm tính ngay sau khi render sản phẩm
    const subtotal = products.reduce((s, p) => s + p.price * p.qty, 0);
    const elSub = document.getElementById('subtotalAmount');
    const elTotal = document.getElementById('totalAmount');
    if (elSub) elSub.textContent = vnd(subtotal);
    if (elTotal) elTotal.textContent = vnd(subtotal);  // tổng ban đầu = tạm tính (chưa có phí)
  }


  // ── Render danh sách dịch vụ ──────────────────────────────────────
  // Thay thế radio buttons hardcode bằng dịch vụ thật từ /available-services.

  // Thời gian giao ước tính theo service_type_id chuẩn GHN
  const SERVICE_DAYS = {
    1: 'Trong ngày',
    2: '2 – 4 ngày',
    3: '4 – 6 ngày',
  };

  function renderServiceOptions(services) {
    if (!services || services.length === 0) {
      setHTML('serviceOptions', '<p class="placeholder-text">Không có dịch vụ khả dụng cho tuyến này</p>');
      return;
    }

    // Lọc bỏ dịch vụ nội bộ GHN (service_type_id=0 hoặc short_name rỗng)
    const visible = services.filter(s => s.service_type_id !== 0 && s.short_name);

    // Mặc định chọn service_type_id=2 (chuẩn), fallback phần tử đầu
    const defaultId = (visible.find(s => s.service_type_id === 2) ?? visible[0])?.service_id;

    const html = visible.map(s => `
      <label class="service-option">
        <input type="radio" name="service" value="${s.service_id}" ${s.service_id === defaultId ? 'checked' : ''}>
        <div class="service-card">
          <div>
            <div class="service-name">${s.short_name}</div>
            <div class="service-days">${SERVICE_DAYS[s.service_type_id] || 'Liên hệ GHN'}</div>
          </div>
          <div class="service-price" id="price-svc-${s.service_id}">—</div>
        </div>
      </label>
    `).join('');

    setHTML('serviceOptions', html);
  }

  // Cập nhật giá lên card sau khi /fee trả về.
  // Gọi từ app.js sau mỗi Promise trong allSettled.
  function updateServicePrice(serviceId, total, isError = false, hint = null) {
    const el    = document.getElementById(`price-svc-${serviceId}`);
    const radio = document.querySelector(`input[name="service"][value="${serviceId}"]`);
    if (!el) return;
    if (isError || total === null) {
      el.textContent = hint ?? 'N/A';
      el.style.color  = 'var(--muted, #999)';
      el.style.fontSize = hint ? '.72rem' : '';
      el.title        = hint ?? 'Dịch vụ này không áp dụng cho đơn hàng hiện tại';
      // Disable radio — không cho chọn dịch vụ không tính được phí
      if (radio) { radio.disabled = true; }
      const card = el.closest('.service-card');
      if (card) card.style.opacity = '0.45';
    } else {
      el.textContent = vnd(total);
      el.style.color  = '';
      el.style.fontSize = '';
      el.title = '';
      if (radio) { radio.disabled = false; }
      const card = el.closest('.service-card');
      if (card) card.style.opacity = '';
    }
  }


  // ── Render kết quả tính phí ───────────────────────────────────────
  // GHN response.data: total, service_fee, insurance_fee,
  //                    pick_station_fee (tuỳ), estimated_deliver_time (ISO 8601)

  function renderFeeResult(res, { weight, insuredValue, matched }) {
    const d   = res.data ?? {};
    const svc = CONFIG.SERVICES[String(matched.service_type_id)] ?? { label: matched.short_name || 'Dịch vụ GHN', days: '—' };
    const eta = _formatDate(d.estimated_deliver_time) || svc.days;

    setHTML('feeResult', `
      <div class="fee-result">

        <div class="fee-provider-label">
          <span class="provider-dot" style="background:var(--text)"></span>
          Giao Hàng Nhanh — ${svc.label}
          <span class="status-badge status-ok" style="margin-left:auto">✓ Tính phí thành công</span>
        </div>

        ${_feeRow('Trọng lượng', `${Number(weight).toLocaleString()} g`)}
        ${_feeRow('Giá trị hàng (bảo hiểm)', vnd(insuredValue))}
        ${_feeRow('Phí dịch vụ', vnd(d.service_fee))}
        ${_feeRow('Phí bảo hiểm', vnd(d.insurance_fee))}
        ${d.pick_station_fee ? _feeRow('Phí lấy hàng tại điểm', vnd(d.pick_station_fee)) : ''}
        ${_feeRow('Giao dự kiến', eta)}

        <div class="fee-total">
          <span class="label">Tổng phí vận chuyển</span>
          <span class="amount">${vnd(d.total)}</span>
        </div>

      </div>
    `);

    // Cập nhật order review block ở Bước 03
    const shippingFee = d.total ?? 0;
    const subtotalEl  = document.getElementById('subtotalAmount');
    const subtotal    = subtotalEl ? _parseVnd(subtotalEl.textContent) : 0;
    const elFee   = document.getElementById('shippingFeeAmount');
    const elTotal = document.getElementById('totalAmount');
    if (elFee)   { elFee.textContent = vnd(shippingFee); elFee.classList.remove('muted-text'); }
    if (elTotal) elTotal.textContent = vnd(subtotal + shippingFee);
  }

  // Parse chuỗi VNĐ đã format ngược lại thành số (dùng nội bộ để cộng tổng)
  function _parseVnd(str) {
    return parseInt((str || '').replace(/[^\d]/g, '')) || 0;
  }


  // ── Render kết quả tạo đơn ───────────────────────────────────────
  // GHN response.data: order_code, sort_code, total_fee, expected_delivery_time

  function renderCreateResult(res) {
    const d   = res.data ?? {};
    const eta = _formatDate(d.expected_delivery_time) || '—';

    // Tạo overlay modal rồi mount vào body
    const existing = document.getElementById('orderSuccessModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'orderSuccessModal';
    modal.className = 'order-modal-overlay';
    modal.innerHTML = `
      <div class="order-modal">
        <div class="order-modal-icon">✓</div>
        <h2 class="order-modal-title">Đặt hàng thành công</h2>

        <div class="order-modal-code">${d.order_code || '—'}</div>
        <p class="order-modal-label">Mã vận đơn GHN</p>

        <div class="order-modal-rows">
          <div class="order-modal-row">
            <span>Phí vận chuyển</span>
            <span>${vnd(d.total_fee)}</span>
          </div>
          <div class="order-modal-row">
            <span>Giao dự kiến</span>
            <span>${eta}</span>
          </div>
          <div class="order-modal-row">
            <span>Trạng thái</span>
            <span class="status-badge status-ok">Chờ lấy hàng</span>
          </div>
        </div>

        <button class="btn-primary order-modal-close" id="closeOrderModal">
          Đã hiểu ✓
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Đóng modal khi nhấn nút hoặc click vào overlay
    document.getElementById('closeOrderModal')
      .addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }


  // ── Chuyển tab ────────────────────────────────────────────────────

  // tabId: 'order' | 'track'
  function switchTab(tabId) {
    ['order', 'track'].forEach(id => {
      const el = document.getElementById(`tab-${id}`);
      if (el) el.style.display = id === tabId ? 'block' : 'none';
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
  }


  return {
    loading,
    renderError,
    updateServicePrice,
    renderProducts,
    renderServiceOptions,
    renderFeeResult,
    renderCreateResult,
    switchTab,
  };

})();