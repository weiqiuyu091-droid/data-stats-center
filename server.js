// 数据统计中心 - 后端服务
// 功能: 静态文件服务 + WebSocket 通信 + API 代理 + 设备管理
const PORT = process.env.PORT || 3456;
const ADMIN_PASSWORD = process.env.ADMIN_PW || '686868';

const express = require('express');
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
    const rawZodiacs = data.zodiac ? data.zodiac.split(',').map(s => s.trim()) : [];
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

// 向所有管理员广播客户端列表更新
function broadcastAdminUpdate() {
  const list = getClientList();
  const payload = JSON.stringify({ type: 'clients_update', clients: list });
  wss.clients.forEach(function(c) {
    if (c.readyState === 1 && c._isAdmin) {
      c.send(payload);
    }
  });
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
app.use(express.json());

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'fsaf.html'));
});

app.get('/admin', function(req, res) {
  res.sendFile(path.join(__dirname, 'admin.html'));
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

// 管理认证
app.post('/api/admin/auth', function(req, res) {
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

// 结算数据保存目录
const DATA_DIR = 'E:\\shuju';

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
    fs.writeFileSync(filepath, text, 'utf-8');
    console.log('[存储] 结算数据已保存: ' + filepath);

    res.json({ ok: true, file: filename, dir: saveDir });
  } catch(e) {
    console.error('[存储] 保存失败: ' + e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== 启动 =====
server.listen(PORT, function() {
  console.log('');
  console.log('====== 数据统计中心 ======');
  console.log('  服务地址: http://localhost:' + PORT);
  console.log('  管理后台: http://localhost:' + PORT + '/admin');
  console.log('  管理密码: ' + ADMIN_PASSWORD);
  console.log('=====================================');
  console.log('');
});
