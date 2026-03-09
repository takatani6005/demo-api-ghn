/**
 * console.js — Logger hiển thị request/response trong UI
 * Mô phỏng DevTools Network tab cho người học thấy rõ từng call.
 */

const AppConsole = (() => {

  function _el()  { return document.getElementById('consoleBody'); }
  function _now() { return new Date().toLocaleTimeString('vi-VN', { hour12: false }); }

  function _append(html) {
    const el = _el();
    if (!el) return;
    el.innerHTML += html;
    el.scrollTop  = el.scrollHeight;
  }

  function clear() {
    const el = _el();
    if (el) el.innerHTML = '<div class="log-line"><span class="log-comment">// Console cleared ✓</span></div>';
  }

  function comment(msg) {
    _append(`<div class="log-line"><span class="log-comment">// ${msg}</span></div>`);
  }

  function separator() {
    _append(`
      <div class="log-line">&nbsp;</div>
      <div class="log-line"><span class="log-comment">// ─────────────────────────────────────────</span></div>
    `);
  }

  function request(method, url, headers = {}, body = null) {
    let html = `
      <div class="log-line">&nbsp;</div>
      <div class="log-line"><span class="log-method">${method}</span> <span class="log-url">${url}</span></div>
    `;
    for (const [k, v] of Object.entries(headers)) {
      html += `<div class="log-line">  <span class="log-key">${k}</span>: <span class="log-val">"${v}"</span></div>`;
    }
    if (body) {
      const snippet = JSON.stringify(body).substring(0, 200);
      html += `<div class="log-line">  <span class="log-key">body</span>: <span class="log-val">${snippet}…</span></div>`;
    }
    _append(html);
  }

  function response(status, data = {}) {
    const cls   = status < 300 ? 'log-status-ok' : 'log-status-err';
    const label = status < 300 ? `${status} OK`  : `${status} Error`;
    let html = `<div class="log-line"><span class="${cls}">${label}</span> <span class="log-comment">— ${_now()}</span></div>`;

    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('_')) continue;
      const val = typeof v === 'object'
        ? JSON.stringify(v).substring(0, 100) + '…'
        : `"${String(v).substring(0, 100)}"`;
      html += `<div class="log-line">  <span class="log-key">${k}</span>: <span class="log-val">${val}</span></div>`;
    }
    _append(html);
  }

  function error(msg) {
    _append(`<div class="log-line"><span class="log-status-err">✗ ERROR</span> <span class="log-comment">— ${msg}</span></div>`);
  }

  function init() {
    clear();
    _append(`
      <div class="log-line"><span class="log-comment">// ════════════════════════════════════════</span></div>
      <div class="log-line"><span class="log-comment">//  ShopVN × GHN – Shipping API Console</span></div>
      <div class="log-line"><span class="log-comment">// ════════════════════════════════════════</span></div>
      <div class="log-line">&nbsp;</div>
      <div class="log-line">
        <span class="log-key">MOCK_MODE</span>: <span class="log-val">false</span>
        <span class="log-comment"> — Request thật đến api.ghn.dev qua server.js</span>
      </div>
      <div class="log-line">
        <span class="log-key">Token</span>: <span class="log-val">server.js đọc GHN_TOKEN từ .env</span>
        <span class="log-comment"> — frontend không thấy</span>
      </div>
      <div class="log-line">&nbsp;</div>
      <div class="log-line"><span class="log-comment">// Thực hiện thao tác để xem request/response…</span></div>
    `);
  }

  return { init, clear, comment, separator, request, response, error };

})();