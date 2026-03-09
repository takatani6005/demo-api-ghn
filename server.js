/**
 * server.js — Backend Proxy cho GHN API
 *
 * Chạy:  node server.js
 * Dev:   npm run dev
 *
 * Flow:  Frontend /api/ghn/...
 *        → server.js gắn Token + ShopId từ .env
 *        → dev-online-gateway.ghn.vn (sandbox)
 *           hoặc online-gateway.ghn.vn (production)
 */

require('dotenv').config();

const express = require('express');
const fetch   = require('node-fetch');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// GHN có 2 môi trường — đổi GHN_ENV=prod trong .env để dùng production
const GHN_BASE = process.env.GHN_ENV === 'prod'
  ? 'https://online-gateway.ghn.vn/shiip/public-api'
  : 'https://dev-online-gateway.ghn.vn/shiip/public-api';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Terminal colors ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan:  '\x1b[36m', blue:  '\x1b[34m',  gray: '\x1b[90m',
};
const ts = () => `${C.gray}[${new Date().toLocaleTimeString('vi-VN')}]${C.reset}`;

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:     'ok',
    ghn_env:    process.env.GHN_ENV === 'prod' ? 'production' : 'sandbox',
    ghn_base:   GHN_BASE,
    token_ok:   !!process.env.GHN_TOKEN   && !process.env.GHN_TOKEN.startsWith('your_'),
    shop_id_ok: !!process.env.GHN_SHOP_ID && !process.env.GHN_SHOP_ID.startsWith('your_'),
  });
});

// ── Proxy: /api/ghn/* → GHN API ──────────────────────────────────
app.all('/api/ghn/*', async (req, res) => {

  // 1. Kiểm tra token
  if (!process.env.GHN_TOKEN || process.env.GHN_TOKEN.startsWith('your_')) {
    console.log(`${ts()} ${C.yellow}⚠ GHN_TOKEN chưa cấu hình trong .env${C.reset}`);
    return res.status(503).json({
      error: 'GHN_TOKEN chưa được cấu hình. Thêm vào file .env rồi restart server.',
    });
  }
  if (!process.env.GHN_SHOP_ID || process.env.GHN_SHOP_ID.startsWith('your_')) {
    console.log(`${ts()} ${C.yellow}⚠ GHN_SHOP_ID chưa cấu hình trong .env${C.reset}`);
    return res.status(503).json({
      error: 'GHN_SHOP_ID chưa được cấu hình. Thêm vào file .env rồi restart server.',
    });
  }

  // 2. Build URL
  const upstreamPath = req.path.replace('/api/ghn', '');
  const upstreamUrl  = Object.keys(req.query).length
    ? `${GHN_BASE}${upstreamPath}?${new URLSearchParams(req.query)}`
    : `${GHN_BASE}${upstreamPath}`;

  // 3. Log request
  console.log('');
  console.log(`${ts()} ${C.bold}${C.cyan}▶ REQUEST${C.reset}`);
  console.log(`  ${C.blue}${req.method}${C.reset} ${upstreamUrl}`);
  if (req.body && Object.keys(req.body).length) {
    console.log(`  ${C.gray}Body:${C.reset}`);
    _logObj(req.body, '    ');
  }

  // 4. Gọi GHN
  let upstream;
  const t0 = Date.now();

  try {
    upstream = await fetch(upstreamUrl, {
      method:  req.method,
      headers: {
        'Token':        process.env.GHN_TOKEN,
        'ShopId':       process.env.GHN_SHOP_ID,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD'
              ? JSON.stringify(req.body)
              : undefined,
    });
  } catch (netErr) {
    console.log(`${ts()} ${C.red}✗ NETWORK ERROR — ${netErr.message}${C.reset}`);
    return res.status(502).json({ error: `Không kết nối được GHN: ${netErr.message}` });
  }

  // 5. Parse response
  const rawText = await upstream.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (_) {
    console.log(`${ts()} ${C.red}✗ PARSE ERROR — GHN không trả JSON${C.reset}`);
    console.log(`  ${C.gray}Raw: ${rawText.substring(0, 150)}${C.reset}`);
    return res.status(502).json({ error: 'GHN trả response không phải JSON', raw: rawText.substring(0, 200) });
  }

  const elapsed = Date.now() - t0;
  const sc = upstream.status < 300 ? C.green : upstream.status < 500 ? C.yellow : C.red;

  // 6. Log response
  console.log(`${ts()} ${C.bold}${sc}◀ RESPONSE ${upstream.status}${C.reset} ${C.gray}(${elapsed}ms)${C.reset}`);
  _logObj(data, '  ');

  if (data?.message && upstream.status !== 200) {
    console.log(`  ${C.yellow}⚠ GHN message: ${data.message}${C.reset}`);
  }

  res.setHeader('X-Response-Time', `${elapsed}ms`);
  res.status(upstream.status).json(data);
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const tokenOk  = !!process.env.GHN_TOKEN   && !process.env.GHN_TOKEN.startsWith('your_');
  const shopIdOk = !!process.env.GHN_SHOP_ID && !process.env.GHN_SHOP_ID.startsWith('your_');
  const env      = process.env.GHN_ENV === 'prod' ? 'PRODUCTION' : 'SANDBOX';

  console.log('');
  console.log(`  ${C.bold}${C.cyan}⚡ ShopVN × GHN Proxy${C.reset}`);
  console.log(`  ${C.gray}→ http://localhost:${PORT}${C.reset}`);
  console.log(`  ${C.gray}→ GHN ENV: ${env} (${GHN_BASE})${C.reset}`);
  console.log('');
  console.log(`  ${tokenOk  ? C.green+'✅' : C.yellow+'⚠️ '}${C.reset} GHN_TOKEN   ${tokenOk  ? C.green+'Đã cấu hình' : C.yellow+'Chưa có — thêm vào .env'}${C.reset}`);
  console.log(`  ${shopIdOk ? C.green+'✅' : C.yellow+'⚠️ '}${C.reset} GHN_SHOP_ID ${shopIdOk ? C.green+'Đã cấu hình' : C.yellow+'Chưa có — thêm vào .env'}${C.reset}`);
  console.log('');

  if (!tokenOk || !shopIdOk) {
    console.log(`  ${C.yellow}Tạo file .env từ .env.example và điền token thật.${C.reset}`);
    console.log('');
  }
});

// ── Helpers ───────────────────────────────────────────────────────
function _logObj(obj, indent = '', depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return;
  for (const [k, v] of Object.entries(obj)) {
    if (['Token', 'token', 'TOKEN'].includes(k)) {
      console.log(`${indent}${C.gray}${k.padEnd(22)}${C.reset} ••••••••••••`);
      continue;
    }
    if (v && typeof v === 'object') {
      console.log(`${indent}${C.gray}${k}:${C.reset}`);
      _logObj(v, indent + '  ', depth + 1);
    } else {
      const s = String(v);
      console.log(`${indent}${C.gray}${k.padEnd(22)}${C.reset} ${s.length > 120 ? s.slice(0, 120) + '…' : s}`);
    }
  }
}