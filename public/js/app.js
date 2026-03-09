/**
 * app.js — Controller chính
 *
 * Điều phối: UI input → Api.GHN (thật) → UI render kết quả
 * Không có mock, không có đa NVC — chỉ GHN qua server.js proxy.
 */

const App = (() => {

  // ── Khởi tạo ─────────────────────────────────────────────────────

  function init() {
    UI.renderProducts(CONFIG.SAMPLE_PRODUCTS);
    AppConsole.init();

    // Tải district theo province mặc định
    _loadDistricts('fromDistrictId', document.getElementById('fromProvince').value);
    _loadDistricts('toDistrictId',   document.getElementById('toProvince').value);

    // Khi đổi tỉnh → reload district
    document.getElementById('fromProvince').addEventListener('change', e => {
      _loadDistricts('fromDistrictId', e.target.value);
    });
    document.getElementById('toProvince').addEventListener('change', e => {
      _loadDistricts('toDistrictId', e.target.value);
      // Reset ward khi đổi tỉnh nhận
      _setSelectOptions('toWardCode', [{ WardCode: '', WardName: '— chọn phường/xã —' }]);
    });

    // Khi đổi district nhận → reload ward
    document.getElementById('toDistrictId').addEventListener('change', e => {
      _loadWards(e.target.value);
    });
  }

  // ── Load district từ GHN API ──────────────────────────────────────

  async function _loadDistricts(selectId, provinceId) {
    if (!provinceId) return;
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = '<option>Đang tải...</option>';
    el.disabled  = true;

    try {
      const res  = await Api.getDistricts(provinceId);
      const list = res.data ?? [];
      _setSelectOptions(selectId, list.map(d => ({
        value: d.DistrictID,
        label: d.DistrictName,
      })));
      el.disabled = false;

      // Nếu là district nhận → load ward luôn
      if (selectId === 'toDistrictId' && list.length > 0) {
        _loadWards(list[0].DistrictID);
      }
    } catch (err) {
      el.innerHTML = `<option value="">Lỗi tải district</option>`;
      el.disabled  = false;
      AppConsole.error('getDistricts: ' + err.message);
    }
  }

  async function _loadWards(districtId) {
    if (!districtId) return;
    const el = document.getElementById('toWardCode');
    if (!el) return;
    el.innerHTML = '<option>Đang tải...</option>';
    el.disabled  = true;

    try {
      const res  = await Api.getWards(districtId);
      const list = res.data ?? [];
      _setSelectOptions('toWardCode', list.map(w => ({
        value: w.WardCode,
        label: w.WardName,
      })));
      el.disabled = false;
    } catch (err) {
      el.innerHTML = `<option value="">Lỗi tải ward</option>`;
      el.disabled  = false;
      AppConsole.error('getWards: ' + err.message);
    }
  }

  function _setSelectOptions(selectId, items) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = items.map(i =>
      `<option value="${i.value ?? i.WardCode ?? ''}">${i.label ?? i.WardName ?? ''}</option>`
    ).join('');
  }

  // ── Tính phí vận chuyển ──────────────────────────────────────────

  async function calculateFee() {
    const fromDistrictId = document.getElementById('fromDistrictId').value;
    const toDistrictId   = document.getElementById('toDistrictId').value;
    const toWardCode     = document.getElementById('toWardCode').value;
    const weight         = parseInt(document.getElementById('weight').value)       || 0;
    const insuredValue   = parseInt(document.getElementById('insuredValue').value) || 0;
    const serviceTypeId  = document.getElementById('serviceType').value;

    if (!fromDistrictId || !toDistrictId || !toWardCode) {
      alert('Vui lòng chọn đầy đủ: Quận/Huyện gửi, Quận/Huyện nhận, Phường/Xã nhận');
      return;
    }
    if (!weight || weight <= 0) {
      alert('Vui lòng nhập trọng lượng hợp lệ (gram)');
      return;
    }

    UI.loading('feeResult', 'Đang tính phí GHN...');
    AppConsole.separator();
    AppConsole.comment('Tính phí vận chuyển — GHN');

    try {
      const result = await Api.calculateFee({
        fromDistrictId,
        toDistrictId,
        toWardCode,
        weight,
        insuredValue,
        serviceTypeId,
      });
      UI.renderFeeResult(result, { weight, insuredValue, serviceTypeId });
    } catch (err) {
      AppConsole.error(err.message);
      UI.renderError('feeResult', err.message);
    }
  }

  // ── Tạo đơn hàng ─────────────────────────────────────────────────

  async function createOrder() {
    const toName       = document.getElementById('receiverName').value.trim();
    const toPhone      = document.getElementById('receiverPhone').value.trim();
    const toAddress    = document.getElementById('receiverAddress').value.trim();
    const toDistrictId = document.getElementById('toDistrictId').value;
    const toWardCode   = document.getElementById('toWardCode').value;
    const codAmount    = parseInt(document.getElementById('codAmount').value) || 0;
    const note         = document.getElementById('orderNote').value.trim();

    if (!toName || !toPhone || !toAddress) {
      alert('Vui lòng điền đầy đủ: Người nhận, Số điện thoại, Địa chỉ');
      return;
    }
    if (!toDistrictId || !toWardCode) {
      alert('Vui lòng chọn Quận/Huyện và Phường/Xã nhận hàng');
      return;
    }

    const totalWeight = CONFIG.SAMPLE_PRODUCTS.reduce((s, p) => s + p.weight * p.qty, 0);

    UI.loading('createResult', 'Đang tạo đơn hàng...');
    AppConsole.separator();
    AppConsole.comment('Tạo đơn hàng — GHN');

    try {
      const result = await Api.createOrder({
        toName, toPhone, toAddress,
        toDistrictId,
        toWardCode,
        weight:    totalWeight,
        codAmount,
        note,
        items: CONFIG.SAMPLE_PRODUCTS,
      });
      UI.renderCreateResult(result);
    } catch (err) {
      AppConsole.error(err.message);
      UI.renderError('createResult', err.message);
    }
  }

  // ── Theo dõi vận đơn ─────────────────────────────────────────────

  async function trackOrder() {
    const code = document.getElementById('trackingCode').value.trim();
    if (!code) { alert('Nhập mã vận đơn'); return; }

    UI.loading('trackResult', 'Đang tra cứu...');
    AppConsole.separator();
    AppConsole.comment(`Tra cứu: ${code}`);

    try {
      const result = await Api.trackOrder(code);
      UI.renderTrackResult(code, result);
    } catch (err) {
      AppConsole.error(err.message);
      UI.renderError('trackResult', err.message);
    }
  }

  // ── Tiện ích ─────────────────────────────────────────────────────

  function setSampleCode(code) {
    document.getElementById('trackingCode').value = code;
  }

  function quickTrack(code) {
    setSampleCode(code);
    UI.switchTab('track');
    trackOrder();
  }

  return { init, calculateFee, createOrder, trackOrder, setSampleCode, quickTrack };

})();

document.addEventListener('DOMContentLoaded', App.init);