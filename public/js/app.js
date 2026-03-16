// app.js — Controller chính của ứng dụng.
//
// Luồng tự động:
//   1. Trang load → load district/ward mặc định cho cả 2 chiều
//   2. Khi cả fromWard lẫn toWard sẵn sàng → tự gọi calculateFee()
//   3. Khi user đổi bất kỳ input nào → debounce 400ms → tính lại
//
// Phụ thuộc (phải load trước): config.js, console.js, api.js, ui.js

const App = (() => {

  // Theo dõi chiều nào đã load xong ward — tránh tính phí khi địa chỉ chưa đủ
  const _ready = { from: false, to: false };

  let _debounceTimer = null;
  let _radioAbort    = null;  // huỷ listener radio cũ trước mỗi lần tính phí mới
  let _calcAbort     = null;  // huỷ lần tính phí đang chạy khi có lần mới trigger

  function _scheduleCalc() {
    if (!_ready.from || !_ready.to) return;
    clearTimeout(_debounceTimer);
    // Huỷ lần tính phí đang chạy dở nếu có — tránh 2 lần chạy đồng thời
    if (_calcAbort) { _calcAbort.abort(); _calcAbort = null; }
    _debounceTimer = setTimeout(calculateFee, 400);
  }

  // ── Khởi tạo ─────────────────────────────────────────────────────

  function init() {
    UI.renderProducts(CONFIG.SAMPLE_PRODUCTS);
    AppConsole.init();

    _loadDistricts('fromDistrictId', document.getElementById('fromProvince').value);
    _loadDistricts('toDistrictId',   document.getElementById('toProvince').value);

    document.getElementById('fromProvince').addEventListener('change', e => {
      _ready.from = false;
      _setOptions('fromWardCode', [{ value: '', label: '— chọn quận/huyện trước —' }]);
      _loadDistricts('fromDistrictId', e.target.value);
    });

    document.getElementById('toProvince').addEventListener('change', e => {
      _ready.to = false;
      _setOptions('toWardCode', [{ value: '', label: '— chọn phường/xã —' }]);
      _loadDistricts('toDistrictId', e.target.value);
    });

    document.getElementById('fromDistrictId').addEventListener('change', e => {
      _ready.from = false;
      _loadWards('from', e.target.value);
    });

    document.getElementById('toDistrictId').addEventListener('change', e => {
      _ready.to = false;
      _loadWards('to', e.target.value);
    });

    document.getElementById('fromWardCode').addEventListener('change', _scheduleCalc);
    document.getElementById('toWardCode').addEventListener('change', _scheduleCalc);
    document.getElementById('weight').addEventListener('input', _scheduleCalc);
    document.getElementById('insuredValue').addEventListener('input', _scheduleCalc);
  }

  // ── Load địa chỉ ─────────────────────────────────────────────────

  async function _loadDistricts(selectId, provinceId) {
    if (!provinceId) return;
    _setLoading(selectId);

    try {
      const res  = await Api.getDistricts(provinceId);
      const list = (res.data ?? []).map(d => ({ value: d.DistrictID, label: d.DistrictName }));
      _setOptions(selectId, list);

      // Auto-load ward cho quận đầu tiên sau khi điền danh sách quận
      const direction = selectId === 'fromDistrictId' ? 'from' : 'to';
      if (list.length > 0) _loadWards(direction, list[0].value);
    } catch (err) {
      _setError(selectId, 'Lỗi tải quận/huyện');
      AppConsole.error('getDistricts: ' + err.message);
    }
  }

  async function _loadWards(direction, districtId) {
    if (!districtId) return;
    const selectId = direction === 'from' ? 'fromWardCode' : 'toWardCode';
    _setLoading(selectId);

    try {
      const res  = await Api.getWards(districtId);
      const list = (res.data ?? []).map(w => ({ value: w.WardCode, label: w.WardName }));
      _setOptions(selectId, list);

      _ready[direction] = true;
      _scheduleCalc();
      if (direction === 'from') _updateWarehouseSummary();
    } catch (err) {
      _ready[direction] = false;
      _setError(selectId, 'Lỗi tải phường/xã');
      AppConsole.error('getWards: ' + err.message);
    }
  }

  // ── Tính phí ─────────────────────────────────────────────────────

  // Flow:
  //   1. Validate input
  //   2. getAvailableServices → danh sách dịch vụ thật
  //   3. Promise.allSettled  → tính phí song song tất cả service_id
  //   4. Cập nhật giá lên từng card, render chi tiết dịch vụ được chọn
  //   5. Gắn listener radio → đổi dịch vụ không cần gọi API lại
  async function calculateFee() {
    const fromDistrictId = _val('fromDistrictId');
    const fromWardCode   = _val('fromWardCode');
    const toDistrictId   = _val('toDistrictId');
    const toWardCode     = _val('toWardCode');
    const weight         = _parseNumber(_val('weight'));
    const insuredValue   = _parseNumber(_val('insuredValue'));

    if (!fromDistrictId || !fromWardCode || !toDistrictId || !toWardCode) {
      return UI.renderError('feeResult', 'Vui lòng chọn đầy đủ: Quận/Huyện và Phường/Xã cho cả kho gửi lẫn địa chỉ nhận');
    }
    if (!weight || weight < 1) {
      return UI.renderError('feeResult', 'Trọng lượng phải từ 1 gram trở lên');
    }

    // Mỗi lần tính phí tạo một AbortController riêng —
    // nếu _scheduleCalc trigger lần mới thì lần cũ dừng lại sau await tiếp theo
    _calcAbort = new AbortController();
    const { signal: calcSignal } = _calcAbort;

    UI.loading('feeResult', 'Đang lấy dịch vụ khả dụng...');
    AppConsole.separator();
    AppConsole.comment('Bước 1/2 — Lấy danh sách dịch vụ GHN khả dụng');

    try {
      const svcRes   = await Api.getAvailableServices(fromDistrictId, toDistrictId);
      if (calcSignal.aborted) return;  // lần mới đã trigger, bỏ kết quả này
      const services = svcRes.data ?? [];

      if (services.length === 0) {
        return UI.renderError('feeResult', 'Không có dịch vụ GHN nào khả dụng cho tuyến đường này');
      }

      UI.renderServiceOptions(services);
      UI.loading('feeResult', `Đang tính phí ${services.length} dịch vụ...`);
      AppConsole.comment(`Bước 2/2 — Tính phí tuần tự cho ${services.length} dịch vụ`);

      const feeParams = { fromDistrictId, fromWardCode, toDistrictId, toWardCode, weight, insuredValue };
      const feeMap = {};
      for (let i = 0; i < services.length; i++) {
        if (calcSignal.aborted) return;  // user đổi input giữa chừng, dừng lại
        const svc = services[i];
        try {
          const res = await Api.calculateFee({ ...feeParams, serviceId: svc.service_id });
          if (calcSignal.aborted) return;
          feeMap[svc.service_id] = { svc, res };
          UI.updateServicePrice(svc.service_id, res.data?.total ?? null);
        } catch (err) {
          if (calcSignal.aborted) return;
          // GHN sandbox trả 'required' tag khi weight không đạt ngưỡng tối thiểu
          // của dịch vụ (thay vì 'min' tag đúng chuẩn) — detect để hiển thị đúng gợi ý
          const isWeightErr = /weight/i.test(err.message);
          UI.updateServicePrice(svc.service_id, null, true, isWeightErr ? 'Cần tăng trọng lượng' : null);
          AppConsole.comment(`ℹ︎ ${svc.short_name} (${svc.service_id}): ${isWeightErr ? 'weight không đạt ngưỡng tối thiểu dịch vụ' : err.message}`);
        }
      }

      if (Object.keys(feeMap).length === 0) {
        return UI.renderError('feeResult',
          'Không tính được phí cho tuyến đường này. ' +
          'GHN sandbox giới hạn một số tuyến liên tỉnh — ' +
          'thử chọn cùng tỉnh (VD: HCM → HCM) để kiểm tra.'
        );
      }

      // Ưu tiên service_type_id=2 (chuẩn), fallback phần tử đầu tiên thành công
      const initial = Object.values(feeMap).find(f => f.svc.service_type_id === 2)
        ?? Object.values(feeMap)[0];

      AppConsole.comment(`feeMap keys: ${Object.keys(feeMap).join(', ')}`);
      AppConsole.comment(`initial service: ${initial?.svc?.service_id} (${initial?.svc?.short_name})`);

      if (!initial) {
        return UI.renderError('feeResult', 'Không có dịch vụ nào trả về phí hợp lệ.');
      }

      const radioToCheck = document.querySelector(`input[name="service"][value="${initial.svc.service_id}"]`);
      if (radioToCheck) radioToCheck.checked = true;

      UI.renderFeeResult(initial.res, { weight, insuredValue, matched: initial.svc });

      // Huỷ listener radio cũ để tránh tích lũy qua nhiều lần tính phí
      if (_radioAbort) _radioAbort.abort();
      _radioAbort = new AbortController();
      const { signal } = _radioAbort;

      // Đổi radio → cập nhật chi tiết ngay, không gọi API lại
      document.querySelectorAll('input[name="service"]').forEach(radio => {
        radio.addEventListener('change', () => {
          const pick = feeMap[parseInt(radio.value)];
          if (pick) UI.renderFeeResult(pick.res, { weight, insuredValue, matched: pick.svc });
        }, { signal });
      });

    } catch (err) {
      AppConsole.error(err.message);
      UI.renderError('feeResult', err.message);
    }
  }

  // ── Tạo đơn ──────────────────────────────────────────────────────

  async function createOrder() {
    const toName       = _val('receiverName').trim();
    const toPhone      = _val('receiverPhone').trim();
    const toAddress    = _val('receiverAddress').trim();
    const toDistrictId = _val('toDistrictId');
    const toWardCode   = _val('toWardCode');
    const codAmount    = _parseNumber(_val('codAmount'));
    const note         = _val('orderNote').trim();

    if (!toName || !toPhone || !toAddress) {
      return UI.renderError('createResult', 'Vui lòng điền đầy đủ: Người nhận, Số điện thoại, Địa chỉ');
    }
    if (!toDistrictId || !toWardCode) {
      return UI.renderError('createResult', 'Vui lòng chọn Quận/Huyện và Phường/Xã nhận hàng');
    }

    // Đọc service_id từ radio đang được chọn ở form tính phí
    const checkedRadio = document.querySelector('input[name="service"]:checked');
    const serviceId    = checkedRadio ? parseInt(checkedRadio.value) : null;

    // Đọc weight từ form (khớp với số đã dùng khi tính phí)
    const weight = _parseNumber(_val('weight')) || CONFIG.SAMPLE_PRODUCTS.reduce((s, p) => s + p.weight * p.qty, 0);

    // Địa chỉ kho gửi — dùng chung với form tính phí
    const fromDistrictId = _val('fromDistrictId');
    const fromWardCode   = _val('fromWardCode');

    UI.loading('createResult', 'Đang tạo đơn hàng...');
    AppConsole.separator();
    AppConsole.comment('Tạo đơn hàng — GHN');
    if (serviceId) AppConsole.comment(`Dịch vụ đã chọn: service_id=${serviceId}`);

    try {
      const result = await Api.createOrder({
        toName, toPhone, toAddress,
        toDistrictId, toWardCode,
        fromDistrictId, fromWardCode,
        serviceId,
        weight, codAmount, note,
        items: CONFIG.SAMPLE_PRODUCTS,
      });
      UI.renderCreateResult(result);
    } catch (err) {
      AppConsole.error(err.message);
      UI.renderError('createResult', err.message);
    }
  }


  // ── Helpers nội bộ ────────────────────────────────────────────────

  const _val = id => document.getElementById(id)?.value ?? '';

  // Parse chuỗi số VN/quốc tế sang số nguyên.
  // Phân biệt dấu phân cách ngàn và thập phân theo số lượng và vị trí dấu.
  // Ví dụ: '350.000' → 350000 | '1.5' → 2 | '1,234,567' → 1234567
  function _parseNumber(str) {
    const s          = String(str).trim();
    const dotCount   = (s.match(/\./g) || []).length;
    const commaCount = (s.match(/,/g)  || []).length;

    let normalized;
    if (dotCount > 1 || commaCount > 1) {
      normalized = s.replace(/[.,]/g, '');
    } else if (dotCount === 1 && commaCount === 0) {
      normalized = /\.\d{3}$/.test(s) ? s.replace('.', '') : s;
    } else if (commaCount === 1 && dotCount === 0) {
      normalized = /,\d{3}$/.test(s) ? s.replace(',', '') : s.replace(',', '.');
    } else {
      normalized = s;
    }

    return Math.round(parseFloat(normalized)) || 0;
  }

  function _setOptions(selectId, items) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = items.map(i => `<option value="${i.value}">${i.label}</option>`).join('');
    el.disabled  = false;
  }

  function _setLoading(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = '<option>Đang tải...</option>';
    el.disabled  = true;
  }

  function _setError(selectId, msg) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="">${msg}</option>`;
    el.disabled  = false;
  }

  // Cập nhật text tóm tắt kho gửi hiển thị trong <details>
  function _updateWarehouseSummary() {
    const el = document.getElementById('warehouseSummary');
    if (!el) return;
    const district = document.getElementById('fromDistrictId');
    const ward     = document.getElementById('fromWardCode');
    const dLabel   = district?.options[district.selectedIndex]?.text ?? '';
    const wLabel   = ward?.options[ward.selectedIndex]?.text ?? '';
    el.textContent = dLabel && wLabel ? `— ${dLabel}, ${wLabel}` : '';
  }

  return { init, calculateFee, createOrder };

})();

document.addEventListener('DOMContentLoaded', App.init);