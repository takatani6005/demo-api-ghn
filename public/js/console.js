// console.js — Hiển thị log HTTP request/response trong UI.
// Mục đích: giúp người học thấy từng API call đang diễn ra, tương tự DevTools → Network.

const AppConsole = (() => {

  const _getEl = () => document.getElementById('consoleBody');
  const _now   = () => new Date().toLocaleTimeString('vi-VN', { hour12: false });

  function _append(html) {
    const el = _getEl();
    if (!el) return;
    el.innerHTML += html;
    el.scrollTop  = el.scrollHeight;
  }

  // ── Public API ────────────────────────────────────────────────────

  // Gọi 1 lần khi trang load — hiển thị banner môi trường
  function init() {
    const el = _getEl();
    if (el) el.innerHTML = '';
    _append(`
      <div class="log-line"><span class="log-comment">// ════════════════════════════════════════</span></div>
      <div class="log-line"><span class="log-comment">//  ShopVN × GHN – Shipping API Console</span></div>
      <div class="log-line"><span class="log-comment">// ════════════════════════════════════════</span></div>
      <div class="log-line">&nbsp;</div>
      <div class="log-line">
        <span class="log-key">MODE</span>: <span class="log-val">live</span>
        <span class="log-comment"> — Request thật đến api.ghn.dev qua server.js</span>
      </div>
      <div class="log-line">
        <span class="log-key">Token</span>: <span class="log-val">ẩn trong .env</span>
        <span class="log-comment"> — frontend không bao giờ thấy token thật</span>
      </div>
      <div class="log-line">&nbsp;</div>
      <div class="log-line"><span class="log-comment">// Thực hiện thao tác để xem request/response…</span></div>
    `);
  }

  function clear() {
    const el = _getEl();
    if (el) el.innerHTML = '<div class="log-line"><span class="log-comment">// Console cleared ✓</span></div>';
  }

  // In dòng comment phân nhóm (màu xám)
  function comment(msg) {
    _append(`<div class="log-line"><span class="log-comment">// ${msg}</span></div>`);
  }

  function separator() {
    _append(`
      <div class="log-line">&nbsp;</div>
      <div class="log-line"><span class="log-comment">// ─────────────────────────────────────────</span></div>
    `);
  }

  // Log request trước khi gửi — token đã được che sẵn ở nơi gọi
  function request(method, url, headers = {}, body = null) {
    let html = `
      <div class="log-line">&nbsp;</div>
      <div class="log-line">
        <span class="log-method">${method}</span>
        <span class="log-url">${url}</span>
      </div>
    `;

    for (const [key, val] of Object.entries(headers)) {
      html += `<div class="log-line">  <span class="log-key">${key}</span>: <span class="log-val">"${val}"</span></div>`;
    }

    if (body) {
      const preview = JSON.stringify(body).substring(0, 200);
      html += `<div class="log-line">  <span class="log-key">body</span>: <span class="log-val">${preview}…</span></div>`;
    }

    _append(html);
  }

  // Log response sau khi nhận — bỏ qua field nội bộ (bắt đầu bằng _)
  function response(status, data = {}) {
    const isOk  = status < 300;
    const cls   = isOk ? 'log-status-ok'  : 'log-status-err';
    const label = isOk ? `${status} OK`   : `${status} Error`;

    let html = `
      <div class="log-line">
        <span class="${cls}">${label}</span>
        <span class="log-comment"> — ${_now()}</span>
      </div>
    `;

    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      const display = typeof val === 'object'
        ? JSON.stringify(val).substring(0, 100) + '…'
        : `"${String(val).substring(0, 100)}"`;
      html += `<div class="log-line">  <span class="log-key">${key}</span>: <span class="log-val">${display}</span></div>`;
    }

    _append(html);
  }

  function error(msg) {
    _append(`<div class="log-line"><span class="log-status-err">✗ ERROR</span> <span class="log-comment"> — ${msg}</span></div>`);
  }

  return { init, clear, comment, separator, request, response, error };

})();