/**
 * server.js
 * Backend proxy cho GHN API — bảo vệ token khỏi frontend.
 *
 * Chạy:   node server.js
 * Dev:     npm run dev   (nodemon)
 *
 * Luồng:  Frontend /api/ghn/* → server.js gắn Token + ShopId từ .env → GHN API
 *
 * Biến môi trường (.env):
 *   GHN_TOKEN    — API token từ GHN dashboard
 *   GHN_SHOP_ID  — Shop ID từ GHN dashboard
 *   GHN_ENV      — "prod" | "sandbox" (mặc định: sandbox)
 *   PORT         — cổng server (mặc định: 3000)
 *
 * Thiết kế:
 *   - Frontend gọi /master-data/district để lấy district ID cho CẢ HAI chiều
 *     (kho gửi và địa chỉ nhận) — không hardcode gì trong .env
 *   - server.js inject shop_id vào body cho /available-services
 *     vì GHN endpoint đó bắt buộc shop_id trong body (ngoài header)
 *   - shop_id luôn lấy từ .env — frontend không được gửi shop_id
 *   - Token và ShopId luôn được gắn vào header — frontend không bao giờ thấy
 */

require('dotenv').config();

const express = require('express');
const fetch   = require('node-fetch');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const GHN_BASE = process.env.GHN_ENV === 'prod'
  ? 'https://online-gateway.ghn.vn/shiip/public-api'
  : 'https://dev-online-gateway.ghn.vn/shiip/public-api';

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Terminal colors ─────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  gray:   '\x1b[90m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
};

const timestamp = () => `${C.gray}[${new Date().toLocaleTimeString('vi-VN')}]${C.reset}`;

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:     'ok',
    ghn_env:    process.env.GHN_ENV === 'prod' ? 'production' : 'sandbox',
    ghn_base:   GHN_BASE,
    token_ok:   isConfigured('GHN_TOKEN'),
    shop_id_ok: isConfigured('GHN_SHOP_ID'),
  });
});

// ── Proxy: /api/ghn/* → GHN API ─────────────────────────────────────
app.all('/api/ghn/*', async (req, res) => {

  // 1. Kiểm tra cấu hình — chỉ cần TOKEN và SHOP_ID
  const configError = getConfigError();
  if (configError) {
    console.log(`${timestamp()} ${C.yellow}⚠ ${configError}${C.reset}`);
    return res.status(503).json({ error: configError });
  }

  // 2. Build upstream URL
  const upstreamPath = req.path.replace('/api/ghn', '');
  const query        = new URLSearchParams(req.query).toString();
  const upstreamUrl  = query ? `${GHN_BASE}${upstreamPath}?${query}` : `${GHN_BASE}${upstreamPath}`;

  // 3. Inject shop_id vào body cho /available-services
  //    ⚠️  Đặt shop_id SAU ...req.body để env luôn thắng nếu frontend vô tình gửi shop_id
  //    Các endpoint khác (/fee, /create, /detail) chỉ cần header ShopId — không inject thêm.
  let requestBody = req.body;
  if (hasBody(req.method) && upstreamPath.startsWith('/v2/shipping-order/available-services')) {
    requestBody = {
      ...req.body,
      shop_id: parseInt(process.env.GHN_SHOP_ID), // server luôn thắng
    };
    console.log(`${timestamp()} ${C.blue}⊕ Injected shop_id=${process.env.GHN_SHOP_ID} into body${C.reset}`);
  }

  // 4. Log request
  console.log('');
  console.log(`${timestamp()} ${C.bold}${C.cyan}▶ ${req.method}${C.reset} ${upstreamUrl}`);
  if (requestBody && Object.keys(requestBody).length) {
    _logObject(requestBody, '  ');
  }

  // 5. Gọi GHN API
  const t0 = Date.now();
  let upstream;

  try {
    upstream = await fetch(upstreamUrl, {
      method:  req.method,
      headers: {
        'Token':        process.env.GHN_TOKEN,
        'ShopId':       process.env.GHN_SHOP_ID,
        'Content-Type': 'application/json',
      },
      body: hasBody(req.method) ? JSON.stringify(requestBody) : undefined,
    });
  } catch (err) {
    console.log(`${timestamp()} ${C.red}✗ NETWORK ERROR — ${err.message}${C.reset}`);
    return res.status(502).json({ error: `Không kết nối được GHN: ${err.message}` });
  }

  // 6. Parse response
  const rawText = await upstream.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch (_) {
    console.log(`${timestamp()} ${C.red}✗ GHN trả về response không phải JSON${C.reset}`);
    console.log(`  ${C.gray}${rawText.substring(0, 150)}${C.reset}`);
    return res.status(502).json({ error: 'GHN trả response không phải JSON', raw: rawText.substring(0, 200) });
  }

  // 7. Log response
  const elapsed     = Date.now() - t0;
  const statusColor = upstream.status < 300 ? C.green : upstream.status < 500 ? C.yellow : C.red;
  console.log(`${timestamp()} ${C.bold}${statusColor}◀ ${upstream.status}${C.reset} ${C.gray}(${elapsed}ms)${C.reset}`);
  _logObject(data, '  ');

  res.setHeader('X-Response-Time', `${elapsed}ms`);
  res.status(upstream.status).json(data);
});

// ── Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  const tokenOk  = isConfigured('GHN_TOKEN');
  const shopOk   = isConfigured('GHN_SHOP_ID');
  const envLabel = process.env.GHN_ENV === 'prod' ? 'PRODUCTION' : 'SANDBOX';

  console.log('');
  console.log(`  ${C.bold}${C.cyan}⚡ ShopVN × GHN Proxy${C.reset}`);
  console.log(`  ${C.gray}→ http://localhost:${PORT}${C.reset}`);
  console.log(`  ${C.gray}→ GHN: ${envLabel} (${GHN_BASE})${C.reset}`);
  console.log('');
  console.log(`  ${tokenOk ? C.green + '✅' : C.yellow + '⚠️ '}${C.reset} GHN_TOKEN    ${tokenOk ? C.green + 'Đã cấu hình' : C.yellow + 'Chưa có — thêm vào .env'}${C.reset}`);
  console.log(`  ${shopOk  ? C.green + '✅' : C.yellow + '⚠️ '}${C.reset} GHN_SHOP_ID  ${shopOk  ? C.green + 'Đã cấu hình' : C.yellow + 'Chưa có — thêm vào .env'}${C.reset}`);

  if (!tokenOk || !shopOk) {
    console.log('');
    console.log(`  ${C.yellow}→ Tạo file .env từ .env.example và điền GHN_TOKEN + GHN_SHOP_ID.${C.reset}`);
  }
  console.log('');
});

// ── Helpers ────────────────────────────────────────────────────────

function isConfigured(key) {
  const val = process.env[key];
  return !!val && !val.startsWith('your_');
}

function getConfigError() {
  if (!isConfigured('GHN_TOKEN'))   return 'GHN_TOKEN chưa được cấu hình. Thêm vào file .env rồi restart server.';
  if (!isConfigured('GHN_SHOP_ID')) return 'GHN_SHOP_ID chưa được cấu hình. Thêm vào file .env rồi restart server.';
  return null;
}

function hasBody(method) {
  return !['GET', 'HEAD'].includes(method.toUpperCase());
}

function _logObject(obj, indent = '', depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return;

  for (const [key, val] of Object.entries(obj)) {
    if (['token', 'Token', 'TOKEN'].includes(key)) {
      console.log(`${indent}${C.gray}${key.padEnd(22)}${C.reset} ••••••••••••`);
      continue;
    }
    if (val && typeof val === 'object') {
      console.log(`${indent}${C.gray}${key}:${C.reset}`);
      _logObject(val, indent + '  ', depth + 1);
    } else {
      const display = String(val);
      console.log(`${indent}${C.gray}${key.padEnd(22)}${C.reset} ${display.length > 120 ? display.slice(0, 120) + '…' : display}`);
    }
  }
}