// 数据统计中心 - 后端服务
// 功能: 静态文件服务 + WebSocket 通信 + API 代理 + 设备管理
const PORT = process.env.PORT || 3456;
const ADMIN_PASSWORD = process.env.ADMIN_PW;

const express = require('express');
const https = require('https');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// ===== WebSocket 服务 =====
const wss = new WebSocketServer({ server });

// 客户端状态追踪: clientId → { ws, info, bets, settlement, lottery, lastSeen, online }
const clients = new Map();
let clientIdCounter = 0;

// 服务端缓存的最近一期开奖数据
let latestLotteryCache = null;

// 定时向 API 拉取开奖数据
async function fetchLotteryFromApi() {
  try {
    const resp = await fetch('https://macaumarksix.com/api/live2', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const data = Array.isArray(json) ? json[0] : json;
    if (!data || !data.openCode) return null;
    const raw = data.openCode.split(',').map(s => s.trim());
    const validNumbers = raw.filter(s => s !== '');
    if (validNumbers.length === 0) return null;
    const seven = []; for (let i = 0; i < 7; i++) seven.push(raw[i] || '');
    const teMa = seven[6] || '';
    const t2s = {'雞':'鸡','龍':'龙','馬':'马','豬':'猪','鴨':'鸭','鵝':'鹅','龜':'龟'};
    const rawZodiacs = data.zodiac ? data.zodiac.split(',').map(s => { const t = s.trim(); return t2s[t] || t; }) : [];
    const seen = {}; const flatZodiacs = [];
    rawZodiacs.forEach(z => { if (z && !seen[z]) { seen[z] = true; flatZodiacs.push(z); } });
    return {
      expect: data.expect,
      numbers: seven,
      validCount: validNumbers.length,
      teMa: teMa,
      flatZodiacs: flatZodiacs,
      openTime: data.openTime,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false })
    };
  } catch (e) {
    return null;
  }
}

function broadcastLottery(data) {
  const payload = JSON.stringify({ type: 'lottery_update', data: data });
  wss.clients.forEach(function(c) {
    if (c.readyState === 1 && !c._isAdmin) {
      c.send(payload);
    }
  });
}

// ===== 自适应开奖轮询 =====
// 21:32-21:35 开奖窗口内高频轮询（300ms），其他时间低频（8秒）
const POLL_FAST = 300;   // 开奖窗口内的轮询间隔(ms)
const POLL_SLOW = 8000;  // 正常时段的轮询间隔(ms)
let pollTimer = null;
let polling = false;     // 防止并发请求堆积

function isInDrawWindow() {
  const now = new Date();
  const totalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  // 开奖窗口: 21:31:30 ~ 21:35:30 (留30秒余量)
  const start = 21 * 3600 + 31 * 60 + 30;
  const end   = 21 * 3600 + 35 * 60 + 30;
  return totalSec >= start && totalSec <= end;
}

async function pollLottery() {
  if (polling) return;  // 上一轮还未完成，跳过
  polling = true;
  try {
    const data = await fetchLotteryFromApi();
    if (data) {
      const prevHash = latestLotteryCache ? latestLotteryCache.numbers.filter(function(n){ return n !== ''; }).join('') : '';
      const newHash = data.numbers.filter(function(n){ return n !== ''; }).join('');
      if (newHash !== prevHash) {
        latestLotteryCache = data;
        console.log('[开奖更新] 期号: ' + (data.expect || '?') + ' 号码: ' + data.numbers.filter(function(n){ return n !== ''; }).join(' '));
        broadcastLottery(data);
      }
    }
  } catch(e) {}
  polling = false;

  // 动态调整下一次轮询间隔
  const interval = isInDrawWindow() ? POLL_FAST : POLL_SLOW;
  pollTimer = setTimeout(pollLottery, interval);
}

// 启动轮询（初始延迟1秒）
pollTimer = setTimeout(pollLottery, 1000);

wss.on('connection', function(ws, req) {
  const clientId = 'C' + (++clientIdCounter);
  const ip = req.socket.remoteAddress || 'unknown';
  ws._clientId = clientId;
  ws._clientInfo = {
    id: clientId,
    ip: ip,
    userAgent: '',
    connectedAt: new Date().toISOString(),
    online: true,
    bets: null,
    settlement: null,
    lottery: null,
    lastSeen: new Date().toISOString()
  };
  clients.set(clientId, ws);

  console.log('[连接] ' + clientId + ' 来自 ' + ip + ' (当前在线: ' + clients.size + ')');
  broadcastAdminUpdate();

  ws.on('message', function(raw) {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, msg);
    } catch(e) {
      // ignore malformed messages
    }
  });

  ws.on('close', function() {
    ws._clientInfo.online = false;
    if (ws._isAdmin) ws._isAdmin = false;
    clients.delete(clientId);
    console.log('[断开] ' + clientId + ' (当前在线: ' + clients.size + ')');
    broadcastAdminUpdate();
  });

  ws.on('error', function() {
    ws._clientInfo.online = false;
    clients.delete(clientId);
    clearInterval(ws._heartbeatTimer);
    broadcastAdminUpdate();
  });

  // 心跳检测
  ws._heartbeatTimer = setInterval(function() {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(ws._heartbeatTimer);
    }
  }, 30000);
});

function handleMessage(ws, msg) {
  const info = ws._clientInfo;
  info.lastSeen = new Date().toISOString();

  switch(msg.type) {
    case 'register':
      info.userAgent = msg.userAgent || '';
      ws.send(JSON.stringify({ type: 'registered', clientId: info.id }));
      // 发送当前缓存的开奖数据
      if (latestLotteryCache) {
        ws.send(JSON.stringify({ type: 'lottery_update', data: latestLotteryCache }));
      }
      broadcastAdminUpdate();
      break;

    case 'admin_auth':
      if (msg.password === ADMIN_PASSWORD) {
        ws._isAdmin = true;
        ws._clientInfo.isAdmin = true;
        ws.send(JSON.stringify({ type: 'admin_authed', clients: getClientList() }));
        console.log('[管理] ' + info.id + ' 管理员已认证');
      } else {
        ws.send(JSON.stringify({ type: 'admin_auth_failed', error: '密码错误' }));
      }
      break;

    case 'bet_update':
      info.bets = msg.data;
      broadcastAdminUpdate();
      break;

    case 'lottery_update':
      info.lottery = msg.data;
      broadcastAdminUpdate();
      break;

    case 'settlement_update':
      info.settlement = msg.data;
      broadcastAdminUpdate();
      break;

    case 'admin_command':
      // 管理员向指定客户端发送命令
      if (ws._isAdmin && msg.clientId) {
        var target = clients.get(msg.clientId);
        if (target && target.readyState === 1) {
          target.send(JSON.stringify({ type: 'admin_command', command: msg.command, params: msg.params || {} }));
        }
      }
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', time: new Date().toISOString() }));
      break;
  }
}

// 向所有管理员广播客户端列表更新（300ms 防抖，避免高频消息堆积）
var _adminUpdateTimer = null;
function broadcastAdminUpdate() {
  if (_adminUpdateTimer) return;
  _adminUpdateTimer = setTimeout(function() {
    _adminUpdateTimer = null;
    const list = getClientList();
    const payload = JSON.stringify({ type: 'clients_update', clients: list });
    wss.clients.forEach(function(c) {
      if (c.readyState === 1 && c._isAdmin) {
        c.send(payload);
      }
    });
  }, 300);
}

function getClientList() {
  const list = [];
  clients.forEach(function(ws, id) {
    list.push(Object.assign({}, ws._clientInfo));
  });
  return list;
}

// ===== Express 路由 =====

// 静态文件

// CORS
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Security headers
app.use(function(req, res, next) {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

app.use(express.json());

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'fsaf.html'));
});

app.get('/admin', function(req, res) {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/parser.js', function(req, res) {
  res.sendFile(path.join(__dirname, 'parser.js'));
});

// API 代理 - 解决 CORS 问题
app.get('/api/live', async function(req, res) {
  try {
    const resp = await fetch('https://macaumarksix.com/api/live2', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) return res.status(502).json({ error: 'API unavailable' });
    const json = await resp.json();
    const data = Array.isArray(json) ? json[0] : json;
    res.json(data);
  } catch(e) {
    res.status(502).json({ error: 'API unreachable' });
  }
});

// 香港六合彩开奖代理
const HK_API_URL = 'https://0oe0t6wiqqjs.lhc888.im/prod-api/system/hk/latest';
const HK_RELAY_URL = 'https://data-stats-center.onrender.com/api/hk-latest?direct=1';

function fetchHKApi(url, res, allowRetry) {
  var finished = false;
  function done(err) {
    if (finished) return;
    finished = true;
    if (allowRetry) {
      console.log('[HK] 直连失败(' + err + ')，通过 onrender 中继...');
      fetchHKApi(HK_RELAY_URL, res, false);
    } else {
      console.log('[HK] 请求失败: ' + err);
      res.status(502).json({ error: 'API unreachable' });
    }
  }
  var req = https.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 10000
  }, function(resp) {
    var body = '';
    resp.on('data', function(c) { body += c; });
    resp.on('end', function() {
      try {
        res.json(JSON.parse(body));
      } catch(e) {
        res.status(502).json({ error: 'Invalid JSON' });
      }
    });
  });
  req.on('timeout', function() {
    req.destroy();
    done('timeout');
  });
  req.on('error', function(e) {
    done(e.message);
  });
}

app.get('/api/hk-latest', function(req, res) {
  if (req.query.direct === '1') {
    // onrender 被中继调用，直接访问 API，不重试
    fetchHKApi(HK_API_URL, res, false);
  } else {
    // 本地：先直连，失败则通过 onrender 中继
    fetchHKApi(HK_API_URL, res, true);
  }
});

// 香港六合彩 - HKJC API 代理（GraphQL 直连 + onrender 中继回退）
const HKJC_RELAY_URL = 'https://data-stats-center.onrender.com/api/hk-jc?direct=1';
var _markSixClient = null;
function getMarkSixClient() {
  if (_markSixClient) return Promise.resolve(_markSixClient);
  return import('hkjc-marksix-client').then(function(m) {
    _markSixClient = m.markSixClient;
    return _markSixClient;
  });
}

app.get('/api/hk-jc', function(req, res) {
  if (req.query.direct === '1') {
    // onrender 被中继调用，直接调 GraphQL API
    fetchHKJCGraphQL(res);
  } else {
    // 本地：先直连 GraphQL，失败则通过 onrender 中继
    fetchHKJCGraphQLWithRetry(res);
  }
});

function fetchHKJCGraphQLWithRetry(res) {
  var sent = false;
  var timeout = setTimeout(function() {
    if (!sent) {
      console.log('[HKJC] 直连超时，通过 onrender 中继...');
      sent = true;
      relayHKJC(res);
    }
  }, 8000);

  getMarkSixClient().then(function(client) {
    if (sent) return;
    return Promise.all([
      client.getDrawRaw(),
      client.getUpcomingDraw().catch(function() { return null; })
    ]);
  }).then(function(results) {
    if (sent || !results) return;
    clearTimeout(timeout);
    sent = true;
    sendHKJCResponse(res, results[0], results[1]);
  }).catch(function(e) {
    if (sent) return;
    clearTimeout(timeout);
    console.log('[HKJC] 直连失败(' + e.message + ')，通过 onrender 中继...');
    sent = true;
    relayHKJC(res);
  });
}

function fetchHKJCGraphQL(res) {
  getMarkSixClient().then(function(client) {
    return Promise.all([
      client.getDrawRaw(),
      client.getUpcomingDraw().catch(function() { return null; })
    ]);
  }).then(function(results) {
    sendHKJCResponse(res, results[0], results[1]);
  }).catch(function(e) {
    console.error('[HKJC] GraphQL error:', e.message);
    res.status(502).json({ error: 'HKJC API error: ' + e.message });
  });
}

function relayHKJC(res) {
  https.get(HKJC_RELAY_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000
  }, function(resp) {
    var body = '';
    resp.on('data', function(c) { body += c; });
    resp.on('end', function() {
      try {
        res.json(JSON.parse(body));
      } catch(e) {
        res.status(502).json({ error: 'Relay parse error' });
      }
    });
  }).on('timeout', function() { this.destroy(); res.status(502).json({ error: 'Relay timeout' }); })
    .on('error', function(e) { res.status(502).json({ error: 'Relay error: ' + e.message }); });
}

function sendHKJCResponse(res, data, upcoming) {
  var draws = (data && data.lotteryDraws) || [];
  var latest = null;
  for (var i = 0; i < draws.length; i++) {
    var d = draws[i];
    if (d.drawResult && d.drawResult.drawnNo && d.drawResult.drawnNo.length > 0) {
      latest = d;
      break;
    }
  }
  if (!latest) latest = draws[0];
  if (!latest) return res.status(502).json({ error: 'No draw data' });
  var nums = (latest.drawResult && latest.drawResult.drawnNo) || [];
  var xDrawn = (latest.drawResult && latest.drawResult.xDrawnNo);
  var teMa = Array.isArray(xDrawn) ? String(xDrawn[0] || '').padStart(2, '0') : (xDrawn ? String(xDrawn).padStart(2, '0') : '');
  var strNums = nums.map(function(n) { return String(n).padStart(2, '0'); });
  res.json({
    expect: latest.id || '',
    one: strNums[0] || '',
    two: strNums[1] || '',
    three: strNums[2] || '',
    four: strNums[3] || '',
    five: strNums[4] || '',
    six: strNums[5] || '',
    seven: teMa,
    opencode: strNums.concat(teMa ? [teMa] : []).join(','),
    opentime: latest.drawDate || '',
    source: 'hkjc-graphql',
    nextExpect: upcoming ? upcoming.id : '',
    nextOpenTime: upcoming ? upcoming.drawDate : '',
    nextCloseTime: upcoming ? upcoming.closeDate : ''
  });
}

// 速率限制（管理认证）
var rateLimitMap = new Map();
var RATE_LIMIT_MAX = 10, RATE_LIMIT_WINDOW = 60000;
setInterval(function() {
  var now = Date.now();
  rateLimitMap.forEach(function(v, k) { if (now - v.reset > RATE_LIMIT_WINDOW) rateLimitMap.delete(k); });
}, 60000);

// 管理认证
app.post('/api/admin/auth', function(req, res) {
  var ip = req.ip || req.socket.remoteAddress || 'unknown';
  var now = Date.now(), entry = rateLimitMap.get(ip);
  if (!entry || now - entry.reset > RATE_LIMIT_WINDOW) { rateLimitMap.set(ip, {count:1, reset:now}); }
  else { entry.count++; if (entry.count > RATE_LIMIT_MAX) return res.status(429).json({error:'Too many attempts'}); }
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ ok: true, token: 'admin_' + Date.now() });
  } else {
    res.status(403).json({ ok: false, error: '密码错误' });
  }
});

// 管理：获取客户端列表
app.get('/api/admin/clients', function(req, res) {
  const pw = req.query.pw || '';
  if (pw !== ADMIN_PASSWORD) return res.status(403).json({ error: '未授权' });
  res.json({ clients: getClientList() });
});

// 管理：向客户端发送命令
app.post('/api/admin/command', function(req, res) {
  const { password, clientId, command, params } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: '未授权' });

  let sent = false;
  clients.forEach(function(ws, id) {
    if (id === clientId && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'admin_command', command: command, params: params }));
      sent = true;
    }
  });

  if (sent) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ ok: false, error: '客户端不在线' });
  }
});

// 管理：部署文件更新 + 重启服务
app.post('/api/admin/deploy', function(req, res) {
  const { password, files, restart } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(403).json({ error: '未授权' });
  if (!files || !Array.isArray(files) || files.length === 0) return res.status(400).json({ error: '无文件' });

  const errors = [];
  files.forEach(function(f) {
    try {
      if (/\.\./.test(f.path)) { errors.push(f.path + ': invalid path'); return; }
      const buf = Buffer.from(f.content, 'base64');
      const filePath = path.join(__dirname, f.path);
      if (!filePath.startsWith(__dirname + path.sep)) { errors.push(f.path + ': path escape'); return; }
      fs.writeFileSync(filePath, buf);
      console.log('[部署] 已更新:', f.path, '(' + buf.length + ' bytes)');
    } catch(e) {
      errors.push(f.path + ': ' + e.message);
    }
  });

  if (errors.length > 0) return res.status(500).json({ ok: false, errors: errors });

  var msg = '已更新 ' + files.length + ' 个文件';
  if (restart) {
    res.json({ ok: true, msg: msg + '，正在重启...' });
    setTimeout(function() { process.exit(0); }, 500);
  } else {
    res.json({ ok: true, msg: msg });
  }
});

// 结算数据保存目录（可通过环境变量 DATA_DIR 自定义）
const DATA_DIR = process.env.DATA_DIR || 'E:\\shuju';

// 确保目录存在
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('[存储] 已创建数据目录: ' + DATA_DIR);
  }
} catch(e) {
  console.warn('[存储] 无法创建 E:\\shuju，回退到本地 shuju 目录');
}

// 结算数据保存接口
app.post('/api/save-result', function(req, res) {
  try {
    const payload = req.body;
    if (!payload || !payload.settlement) {
      return res.status(400).json({ ok: false, error: '缺少结算数据' });
    }

    const now = new Date();
    const ts = now.getFullYear()
      + '-' + String(now.getMonth()+1).padStart(2,'0')
      + '-' + String(now.getDate()).padStart(2,'0')
      + '_' + String(now.getHours()).padStart(2,'0')
      + '-' + String(now.getMinutes()).padStart(2,'0')
      + '-' + String(now.getSeconds()).padStart(2,'0');

    // 确定保存目录
    let saveDir = DATA_DIR;
    try {
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }
    } catch(e) {
      saveDir = path.join(__dirname, 'shuju');
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    }

    // 生成可读文本内容
    const s = payload.settlement;
    const clientInfo = payload.clientInfo || {};
    let text = '';
    text += '========================================\n';
    text += '  结算数据报告\n';
    text += '========================================\n';
    text += '时间: ' + now.toLocaleString('zh-CN', { hour12: false }) + '\n';
    text += '来源: ' + (clientInfo.ip || '未知') + '\n';
    text += '客户端: ' + (clientInfo.id || '未知') + '\n';
    text += '----------------------------------------\n';
    text += '总收: ' + (s.totalBet || 0) + '\n';
    text += '总派: ' + (s.totalPayout || 0) + '\n';
    text += '盈利: ' + (s.netProfit || 0) + '\n';
    text += '抽水率: ' + (s.waterRate || 0) + '%\n';
    text += '中奖金额: ' + (s.hitAmount || 0) + '\n';
    text += '条目数: ' + (s.itemCount || 0) + '\n';
    if (s.netAfterWater !== undefined) {
      text += '抽水后盈利: ' + s.netAfterWater + '\n';
    }
    // 开奖号码
    if (payload.winNumbers) {
      text += '----------------------------------------\n';
      text += '开奖号码: ' + JSON.stringify(payload.winNumbers) + '\n';
      if (payload.winNumbers.teMa) text += '特码: ' + payload.winNumbers.teMa + '\n';
    }
    // 详细行
    if (s.rows && s.rows.length > 0) {
      text += '----------------------------------------\n';
      text += '结算明细 (' + s.rows.length + ' 条):\n';
      text += '----------------------------------------\n';
      text += '序号 | 投注项 | 金额 | 赔率 | 赢额 | 净额 | 备注\n';
      s.rows.forEach(function(r, i) {
        text += (i+1) + ' | ' + (r.display||r.type||'?') + ' | ' + (r.bet||0) + ' | ' + (r.odds||'-') + ' | ' + (r.win||0) + ' | ' + (r.net||0) + ' | ' + (r.note||'') + '\n';
      });
    }
    // 消息投注汇总
    if (payload.messageSummary && payload.messageSummary.length > 0) {
      var msgGrand = 0;
      text += '----------------------------------------\n';
      text += '消息投注汇总 (' + payload.messageSummary.length + ' 条):\n';
      text += '----------------------------------------\n';
      text += '序号 | 消息内容 | 投注金额\n';
      payload.messageSummary.forEach(function(m) {
        msgGrand += m.totalBet || 0;
        text += (m.index||'?') + ' | ' + (m.text||'') + ' | ' + (m.totalBet||0) + '\n';
      });
      text += '----------------------------------------\n';
      text += '消息合计: ' + Math.round(msgGrand*100)/100 + '\n';
    }
    text += '========================================\n';

    const filename = 'settlement_' + ts + '.txt';
    const filepath = path.join(saveDir, filename);
    fs.writeFile(filepath, text, 'utf-8', function(err) {
      if (err) console.error('[存储] 写入失败: ' + err.message);
      else console.log('[存储] 结算数据已保存: ' + filepath);
    });
    // 新数据写入后使 XLSX 缓存失效
    xlsxCache = null;

    res.json({ ok: true, file: filename, dir: saveDir });
  } catch(e) {
    console.error('[存储] 保存失败: ' + e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== XLSX 导出接口 =====
const XLSX = require('xlsx');
var xlsxCache = null;  // { buf, mtime, fileCount } — 有新结算时自动失效

// 下载历史结算汇总 xlsx
app.get('/api/export/xlsx', function(req, res) {
  // 解析保存目录
  let saveDir = DATA_DIR;
  try { if (!fs.existsSync(saveDir)) saveDir = path.join(__dirname, 'shuju'); }
  catch(e) { saveDir = path.join(__dirname, 'shuju'); }

  if (!fs.existsSync(saveDir)) {
    return res.status(404).json({ error: '数据目录不存在' });
  }

  // 检查缓存是否有效（文件数量和最新修改时间未变）
  var files = fs.readdirSync(saveDir)
    .filter(function(f) { return f.startsWith('settlement_') && f.endsWith('.txt'); })
    .map(function(f) { return path.join(saveDir, f); })
    .sort();

  if (files.length === 0) {
    return res.status(404).json({ error: '没有结算数据' });
  }

  var latestMtime = 0;
  try { latestMtime = fs.statSync(files[files.length - 1]).mtimeMs; } catch(e) {}

  if (xlsxCache && xlsxCache.fileCount === files.length && xlsxCache.mtime === latestMtime) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="结算汇总_' + new Date().toISOString().slice(0,10) + '.xlsx"');
    return res.send(xlsxCache.buf);
  }

  // 异步读取所有文件并生成 XLSX
  var remaining = files.length;
  var allData = new Array(files.length);
  var hasError = false;

  files.forEach(function(fp, idx) {
    fs.readFile(fp, 'utf-8', function(err, content) {
      if (err) { remaining--; checkDone(); return; }
      try {
        var lines = content.split('\n');
        var data = {};
        for (var li = 0; li < lines.length; li++) {
          var line = lines[li];
          var m1 = line.match(/^时间:\s*(.+)/); if (m1) data.time = m1[1].trim();
          var m2 = line.match(/^来源:\s*(.+)/); if (m2) data.source = m2[1].trim();
          var m3 = line.match(/^客户端:\s*(.+)/); if (m3) data.clientId = m3[1].trim();
          var m4 = line.match(/^总收:\s*([\d.]+)/); if (m4) data.totalBet = parseFloat(m4[1]);
          var m5 = line.match(/^总派:\s*([\d.]+)/); if (m5) data.totalPayout = parseFloat(m5[1]);
          var m6 = line.match(/^盈利:\s*([-\d.]+)/); if (m6) data.netProfit = parseFloat(m6[1]);
          var m7 = line.match(/^抽水率:\s*([\d.]+)/); if (m7) data.waterRate = parseFloat(m7[1]);
          var m8 = line.match(/^中奖金额:\s*([\d.]+)/); if (m8) data.hitAmount = parseFloat(m8[1]);
          var m9 = line.match(/^条目数:\s*([\d.]+)/); if (m9) data.itemCount = parseInt(m9[1]);
          var m10 = line.match(/^抽水后盈利:\s*([-\d.]+)/); if (m10) data.netAfterWater = parseFloat(m10[1]);
          var m11 = line.match(/^特码:\s*(.+)/); if (m11) data.teMa = m11[1].trim();
          var m12 = line.match(/^开奖号码:\s*(.+)/);
          if (m12) {
            try {
              var win = JSON.parse(m12[1]);
              data.winNumbers = win.numbers ? win.numbers.join(',') : '';
              data.winZodiacs = win.flatZodiacs ? win.flatZodiacs.join(',') : '';
            } catch(e2) {}
          }
        }
        var bn = path.basename(fp, '.txt');
        var tsMatch = bn.match(/settlement_(.+)/);
        if (tsMatch) data.fileTimestamp = tsMatch[1].replace(/_/g, ' ');
        allData[idx] = data;
      } catch(e3) { allData[idx] = null; }
      remaining--;
      checkDone();
    });
  });

  function checkDone() {
    if (remaining > 0) return;
    if (hasError) return;
    // 过滤掉读取失败的
    var clean = allData.filter(function(d) { return d != null; });

    var headers = ['序号','结算时间','文件时间戳','客户端','总收注','总派彩','净收益','抽水率(%)','中奖金额','条目数','抽水后盈利','开奖号码','特码','开出生肖'];
    var rows = [headers];
    clean.forEach(function(d, i) {
      rows.push([
        i + 1, d.time || '', d.fileTimestamp || '', d.clientId || '',
        d.totalBet || 0, d.totalPayout || 0, d.netProfit || 0,
        d.waterRate || 0, d.hitAmount || 0, d.itemCount || 0,
        d.netAfterWater !== undefined ? d.netAfterWater : (d.netProfit || 0),
        d.winNumbers || '', d.teMa || '', d.winZodiacs || ''
      ]);
    });

    try {
      var wb = XLSX.utils.book_new();
      var ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = headers.map(function() { return { wch: 14 }; });
      XLSX.utils.book_append_sheet(wb, ws, '结算汇总');
      var buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // 写入缓存
      xlsxCache = { buf: buf, mtime: latestMtime, fileCount: files.length };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="结算汇总_' + new Date().toISOString().slice(0,10) + '.xlsx"');
      res.send(buf);
    } catch(e) {
      console.error('[导出] ' + e.message);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  }
});

// 下载单个结算为 xlsx
app.get('/api/export/xlsx/:filename', function(req, res) {
  try {
    let saveDir = DATA_DIR;
    try {
      if (!fs.existsSync(saveDir)) saveDir = path.join(__dirname, 'shuju');
    } catch(e) {
      saveDir = path.join(__dirname, 'shuju');
    }

    const filename = req.params.filename;
    if (!filename.endsWith('.txt')) {
      return res.status(400).json({ error: '仅支持 .txt 文件' });
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: '非法文件名' });
    }

    const filepath = path.join(saveDir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    const data = { rows: [] };

    for (const line of lines) {
      // 基本信息
      const pairs = [
        ['time', /^时间:\s*(.+)/],
        ['source', /^来源:\s*(.+)/],
        ['clientId', /^客户端:\s*(.+)/],
        ['totalBet', /^总收:\s*([\d.]+)/],
        ['totalPayout', /^总派:\s*([\d.]+)/],
        ['netProfit', /^盈利:\s*([-\d.]+)/],
        ['waterRate', /^抽水率:\s*([\d.]+)/],
        ['hitAmount', /^中奖金额:\s*([\d.]+)/],
        ['itemCount', /^条目数:\s*([\d.]+)/],
        ['netAfterWater', /^抽水后盈利:\s*([-\d.]+)/],
        ['teMa', /^特码:\s*(.+)/]
      ];
      for (const [key, re] of pairs) {
        const m = line.match(re);
        if (m) {
          if (['totalBet','totalPayout','netProfit','waterRate','hitAmount','netAfterWater'].includes(key)) {
            data[key] = parseFloat(m[1]);
          } else if (key === 'itemCount') {
            data[key] = parseInt(m[1]);
          } else {
            data[key] = m[1].trim();
          }
        }
      }

      const m12 = line.match(/^开奖号码:\s*(.+)/);
      if (m12) {
        try {
          const win = JSON.parse(m12[1]);
          data.winNumbers = win.numbers ? win.numbers.join(',') : '';
          data.winZodiacs = win.flatZodiacs ? win.flatZodiacs.join(',') : '';
        } catch(e2) {}
      }

      const m13 = line.match(/^(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.\-]+)\s*\|\s*([\d.]+)\s*\|\s*([-\d.]+)\s*\|\s*(.*)$/);
      if (m13) {
        data.rows.push({
          index: parseInt(m13[1]),
          item: m13[2].trim(),
          bet: parseFloat(m13[3]),
          odds: m13[4].trim(),
          win: parseFloat(m13[5]),
          net: parseFloat(m13[6]),
          note: m13[7].trim()
        });
      }
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: 概览
    const infoRows = [
      ['项目', '值'],
      ['时间', data.time || ''],
      ['客户端', data.clientId || ''],
      ['开奖号码', data.winNumbers || ''],
      ['特码', data.teMa || ''],
      ['开出生肖', data.winZodiacs || ''],
      ['总收注', data.totalBet || 0],
      ['总派彩', data.totalPayout || 0],
      ['净收益', data.netProfit || 0],
      ['抽水率', (data.waterRate || 0) + '%'],
      ['中奖金额', data.hitAmount || 0],
      ['条目数', data.itemCount || 0],
      ['抽水后盈利', data.netAfterWater !== undefined ? data.netAfterWater : (data.netProfit || 0)]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(infoRows);
    ws1['!cols'] = [{wch: 14}, {wch: 30}];
    XLSX.utils.book_append_sheet(wb, ws1, '结算概览');

    // Sheet 2: 明细
    if (data.rows.length > 0) {
      const detailHeaders = ['序号', '投注项', '投注额', '赔率', '中奖额', '净额', '备注'];
      const detailRows = [detailHeaders];
      data.rows.forEach(r => {
        detailRows.push([r.index, r.item, r.bet, r.odds, r.win, r.net, r.note]);
      });
      const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
      ws2['!cols'] = [detailHeaders.length].map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws2, '结算明细');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const downloadName = filename.replace('.txt', '.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + downloadName + '"');
    res.send(buf);
  } catch(e) {
    console.error('[导出] ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

// ===== 优雅关闭 =====
function gracefulShutdown(signal) {
  console.log('\n[关闭] 收到 ' + signal + ' 信号，正在清理...');
  if (pollTimer) clearTimeout(pollTimer);
  if (_adminUpdateTimer) clearTimeout(_adminUpdateTimer);
  wss.clients.forEach(function(c) {
    try { c.terminate(); } catch(e) {}
  });
  wss.close(function() {
    server.close(function() {
      console.log('[关闭] 服务已停止');
      process.exit(0);
    });
  });
  // 强制退出（10 秒超时）
  setTimeout(function() { process.exit(1); }, 10000);
}
process.on('SIGTERM', function() { gracefulShutdown('SIGTERM'); });
process.on('SIGINT', function() { gracefulShutdown('SIGINT'); });

// ===== 启动 =====
server.listen(PORT, function() {
  console.log('');
  console.log('====== 数据统计中心 ======');
  console.log('  服务地址: http://localhost:' + PORT);
  console.log('  管理后台: http://localhost:' + PORT + '/admin');
  console.log('=====================================');
  console.log('');
});
