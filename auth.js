// ============================================================
// auth.js — 租期管控认证模块（客户账号/密码/到期时间）
//
// 安全模型：
//   服务端是唯一信任边界。静态页面与所有业务 API 都经过鉴权中间件，
//   前端只负责体验（跳转登录页/续费页），F12 改前端代码无法绕过，
//   因为每个请求（页面/API/WebSocket）都由服务端校验登录态与到期时间。
//
//   到期时间实时从存储读取：管理员修改到期时间立即生效，
//   用户无需换 token（token 只含用户名，到期时间每次请求现查）。
//
// 存储后端（AUTH_STORE 环境变量切换）：
//   json   — users.json 文件（原子写），零依赖，适合少量客户（<100）
//   sqlite — better-sqlite3，适合大量客户（需 npm i better-sqlite3）
//
// 环境变量：
//   AUTH_ENABLED     = 1 启用租期管控（默认关闭，不影响原有部署）
//   AUTH_STORE       = json | sqlite（默认 json）
//   AUTH_DATA_DIR    = 数据目录（默认 ./data；Railway 挂 volume 到 /data）
//   AUTH_TOKEN_SECRET= token 签名密钥（生产必须设置，否则重启后登录态失效）
//   ADMIN_PW         = 管理员密码（客户管理 API 用）
//
// 用法（server.js）：
//   const auth = require('./auth.js')();
//   app.post('/api/login', auth.loginHandler);
//   app.post('/api/logout', auth.logoutHandler);
//   app.get('/api/me', auth.meHandler);
//   app.use(auth.requirePageAuth);   // 静态页（未登录→/login，到期→/expired）
//   app.use(auth.requireApiAuth);    // 业务 API（未登录→401，到期→403）
//   auth.installWsAuth(wss);         // WebSocket 连接鉴权
//   auth.installAdminApi(app);       // 客户管理 API（受 ADMIN_PW 保护）
//   auth.startExpiryChecker();       // 定时扫描过期用户（默认每小时）
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = function createAuth(opts) {
  const cfg = Object.assign({
    store: process.env.AUTH_STORE || 'json',
    dataDir: process.env.AUTH_DATA_DIR || path.join(__dirname, 'data'),
    cookieSecret: process.env.AUTH_TOKEN_SECRET || ('dev-secret-' + Date.now()),
    cookieName: 'ds_auth_token',
    adminPassword: process.env.ADMIN_PW || null,
  }, opts || {});

  fs.mkdirSync(cfg.dataDir, { recursive: true });

  // ================= 用户存储抽象 =================
  // user = { username, passHash, expiresAt(ms, 0=永久), createdAt, pwVersion, note }
  // 两个实现暴露同一接口: list/get/upsert/remove

  function createJsonStore() {
    const file = path.join(cfg.dataDir, 'users.json');
    let users = {};
    if (fs.existsSync(file)) {
      try { users = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { users = {}; }
    }
    function persist() {
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
      fs.renameSync(tmp, file); // 原子替换，防止写一半崩溃损坏
    }
    return {
      list() { return Object.keys(users).map(k => users[k]); },
      get(name) { return users[name] || null; },
      upsert(u) { users[u.username] = u; persist(); },
      remove(name) { if (users[name]) { delete users[name]; persist(); } },
    };
  }

  function createSqliteStore() {
    let Database;
    try { Database = require('better-sqlite3'); }
    catch (e) {
      throw new Error('AUTH_STORE=sqlite 需要 better-sqlite3，请先执行: npm i better-sqlite3');
    }
    const db = new Database(path.join(cfg.dataDir, 'users.db'));
    db.pragma('journal_mode = WAL');
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      passHash TEXT NOT NULL,
      expiresAt INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      pwVersion INTEGER NOT NULL DEFAULT 1,
      note TEXT DEFAULT ''
    )`);
    const rowToUser = r => r ? { username: r.username, passHash: r.passHash, expiresAt: r.expiresAt,
      createdAt: r.createdAt, pwVersion: r.pwVersion, note: r.note } : null;
    return {
      list() { return db.prepare('SELECT * FROM users').all().map(rowToUser); },
      get(name) { return rowToUser(db.prepare('SELECT * FROM users WHERE username = ?').get(name)); },
      upsert(u) {
        db.prepare(`INSERT INTO users (username, passHash, expiresAt, createdAt, pwVersion, note)
          VALUES (@username, @passHash, @expiresAt, @createdAt, @pwVersion, @note)
          ON CONFLICT(username) DO UPDATE SET
            passHash = @passHash, expiresAt = @expiresAt, pwVersion = @pwVersion, note = @note`).run(u);
      },
      remove(name) { db.prepare('DELETE FROM users WHERE username = ?').run(name); },
    };
  }

  let store;
  try {
    store = cfg.store === 'sqlite' ? createSqliteStore() : createJsonStore();
    console.log('[租期] 用户存储: ' + cfg.store + ' @ ' + cfg.dataDir);
  } catch (e) {
    console.error('[租期] 存储初始化失败:', e.message);
    process.exit(1);
  }

  // ================= 密码哈希（scrypt） =================
  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return salt + ':' + hash;
  }
  function verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    const calc = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hash, 'hex'));
  }

  // ================= Token（HMAC 签名，无状态） =================
  // payload = base64url({u:用户名, i:签发ms, pv:密码版本})
  // 改密码后 pv+1，旧 token 自动失效；到期时间不入 token（实时查库）
  function signToken(user) {
    const payload = Buffer.from(JSON.stringify({ u: user.username, i: Date.now(), pv: user.pwVersion || 1 }))
      .toString('base64url');
    const sig = crypto.createHmac('sha256', cfg.cookieSecret).update(payload).digest('base64url');
    return payload + '.' + sig;
  }
  function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const payload = token.slice(0, dot), sig = token.slice(dot + 1);
    const expect = crypto.createHmac('sha256', cfg.cookieSecret).update(payload).digest('base64url');
    if (sig.length !== expect.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      const user = store.get(data.u);
      if (!user) return null;
      if ((user.pwVersion || 1) !== (data.pv || 1)) return null; // 改过密码
      return user;
    } catch (e) { return null; }
  }

  function isExpired(user) {
    return !!user && user.expiresAt !== 0 && user.expiresAt <= Date.now();
  }

  // ================= 登录限流（防爆破） =================
  const failMap = new Map(); // key=ip:username → {count, resetAt}
  function checkRate(ip, username) {
    const key = ip + ':' + username;
    const now = Date.now();
    const e = failMap.get(key);
    if (!e || now > e.resetAt) { failMap.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 }); return true; }
    e.count++;
    return e.count <= 5;
  }

  // ================= 中间件 =================
  function getTokenFromReq(req) {
    // 优先 Authorization: Bearer xxx（API/脚本用），其次 cookie（浏览器用）
    const ah = req.headers['authorization'] || '';
    if (ah.startsWith('Bearer ')) return ah.slice(7).trim();
    const raw = (req.headers.cookie || '').split(';').map(s => s.trim());
    for (const c of raw) if (c.startsWith(cfg.cookieName + '=')) return decodeURIComponent(c.slice(cfg.cookieName.length + 1));
    return null;
  }

  function setAuthCookie(res, token) {
    const secure = res.req.secure || (res.req.headers['x-forwarded-proto'] === 'https');
    res.cookie(cfg.cookieName, token, {
      httpOnly: true,          // JS 读不到 → F12 无法偷取/伪造
      sameSite: 'lax',
      secure: secure,
      maxAge: 30 * 24 * 3600 * 1000,
      path: '/',
    });
  }
  function clearAuthCookie(res) {
    res.clearCookie(cfg.cookieName, { httpOnly: true, sameSite: 'lax', path: '/' });
  }

  // 静态页鉴权：未登录 → 302 /login；到期 → 302 /expired
  function requirePageAuth(req, res, next) {
    const user = verifyToken(getTokenFromReq(req));
    if (!user) return res.redirect('/login');
    if (isExpired(user)) return res.redirect('/expired');
    req.user = user;
    next();
  }

  // API 鉴权：未登录 → 401；到期 → 403（前端收到后跳登录页/续费页）
  function requireApiAuth(req, res, next) {
    const user = verifyToken(getTokenFromReq(req));
    if (!user) return res.status(401).json({ error: 'unauthorized', message: '未登录或登录已失效' });
    if (isExpired(user)) {
      return res.status(403).json({ error: 'expired', expiresAt: user.expiresAt, message: '租期已到期' });
    }
    req.user = user;
    next();
  }

  // ================= 路由处理器 =================
  async function loginHandler(req, res) {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '请输入账号和密码' });
    const uname = String(username).trim();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRate(ip, uname)) return res.status(429).json({ error: '尝试次数过多，请10分钟后再试' });

    const user = store.get(uname);
    if (!user || !verifyPassword(password, user.passHash)) {
      return res.status(403).json({ error: '账号或密码错误' });
    }
    if (isExpired(user)) {
      return res.status(403).json({ error: 'expired', expiresAt: user.expiresAt, message: '账号已到期，请联系管理员续费' });
    }
    failMap.delete(ip + ':' + uname);
    setAuthCookie(res, signToken(user));
    res.json({ ok: true, username: user.username, expiresAt: user.expiresAt });
  }

  function logoutHandler(req, res) {
    clearAuthCookie(res);
    res.json({ ok: true });
  }

  function meHandler(req, res) {
    const user = verifyToken(getTokenFromReq(req));
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (isExpired(user)) return res.status(403).json({ error: 'expired', expiresAt: user.expiresAt });
    res.json({ username: user.username, expiresAt: user.expiresAt, createdAt: user.createdAt, note: user.note || '' });
  }

  // ================= WebSocket 鉴权 =================
  // wss.on('connection') 里先调用：wsAuth(req) 返回 user 或 null
  function wsAuth(req) {
    return verifyToken(getTokenFromReq({ headers: req.headers || {} }));
  }

  // ================= 客户管理 API（管理员用） =================
  // 约定：body.adminPassword = 管理员密码（受 ADMIN_PW 保护）；
  //       body.password = 客户的登录密码（新建/改密时用）
  function installAdminApi(app) {
    const requireAdmin = function(req, res, next) {
      const pw = req.body.adminPassword || req.query.pw || '';
      if (!cfg.adminPassword || pw !== cfg.adminPassword) {
        return res.status(403).json({ error: '未授权' });
      }
      next();
    };
    const toISO = function(v) {
      if (v === undefined || v === null) return null;
      if (typeof v === 'number') return v;
      const ms = Date.parse(v);
      return isNaN(ms) ? null : ms;
    };

    // 列表
    app.get('/api/admin/users', requireAdmin, function(req, res) {
      const now = Date.now();
      res.json({ users: store.list().map(u => ({
        username: u.username, expiresAt: u.expiresAt, createdAt: u.createdAt,
        note: u.note || '', expired: isExpired(u),
        daysLeft: u.expiresAt === 0 ? -1 : Math.ceil((u.expiresAt - now) / 86400000),
      })) });
    });

    // 备份：导出全部客户数据（含密码哈希，受 ADMIN_PW 保护）
    // 注意必须注册在 /api/admin/users/:name 之前，否则 'export' 会被当作用户名
    app.get('/api/admin/users/export', requireAdmin, function(req, res) {
      const users = store.list();
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="users-backup-' + stamp + '.json"');
      res.send(JSON.stringify(users, null, 2));
    });

    // 恢复：覆盖导入客户数据（安全提醒：会替换当前全部客户）
    app.post('/api/admin/users/import', requireAdmin, function(req, res) {
      const data = req.body || {};
      const users = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : null);
      if (!users) return res.status(400).json({ error: '格式无效：需要客户数组' });
      let ok = 0;
      users.forEach(function(u) {
        if (!u || !u.username || !u.passHash) return;
        store.upsert({
          username: u.username,
          passHash: u.passHash,
          expiresAt: typeof u.expiresAt === 'number' ? u.expiresAt : 0,
          createdAt: typeof u.createdAt === 'number' ? u.createdAt : Date.now(),
          pwVersion: typeof u.pwVersion === 'number' ? u.pwVersion : 1,
          note: u.note || ''
        });
        ok++;
      });
      console.log('[租期] 恢复客户数据:', ok, '个');
      res.json({ ok: true, imported: ok });
    });

    // 新建客户
    app.post('/api/admin/users', requireAdmin, function(req, res) {
      const { username, password, expiresAt, days, note } = req.body || {};
      const uname = String(username || '').trim();
      if (!uname || !password) return res.status(400).json({ error: '需要 username 和 password' });
      if (store.get(uname)) return res.status(409).json({ error: '账号已存在' });
      let exp = 0;
      if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
        exp = toISO(expiresAt);
        if (exp === null) return res.status(400).json({ error: 'expiresAt 格式无效（ISO日期或毫秒时间戳）' });
      } else if (typeof days === 'number' && days > 0) {
        exp = Date.now() + days * 86400000;
      }
      store.upsert({ username: uname, passHash: hashPassword(password), expiresAt: exp,
        createdAt: Date.now(), pwVersion: 1, note: note || '' });
      console.log('[租期] 新建客户:', uname, '到期:', exp === 0 ? '永久' : new Date(exp).toLocaleString('zh-CN'));
      res.json({ ok: true });
    });

    // 更新（续费改到期 / 改密码 / 备注）
    app.post('/api/admin/users/:name', requireAdmin, function(req, res) {
      const uname = String(req.params.name || '').trim();
      const u = store.get(uname);
      if (!u) return res.status(404).json({ error: '账号不存在' });
      const { expiresAt, days, password, note } = req.body || {};
      if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
        const exp = toISO(expiresAt);
        if (exp === null) return res.status(400).json({ error: 'expiresAt 格式无效' });
        u.expiresAt = exp;
        console.log('[租期] 续费:', uname, '→', exp === 0 ? '永久' : new Date(exp).toLocaleString('zh-CN'));
      } else if (typeof days === 'number') {
        u.expiresAt = days === 0 ? 0 : Date.now() + days * 86400000;
        console.log('[租期] 续费:', uname, '+', days, '天');
      }
      if (password) { u.passHash = hashPassword(password); u.pwVersion = (u.pwVersion || 1) + 1; }
      if (note !== undefined) u.note = note;
      store.upsert(u);
      res.json({ ok: true });
    });

    // 删除客户
    app.delete('/api/admin/users/:name', requireAdmin, function(req, res) {
      const uname = String(req.params.name || '').trim();
      if (!store.get(uname)) return res.status(404).json({ error: '账号不存在' });
      store.remove(uname);
      console.log('[租期] 删除客户:', uname);
      res.json({ ok: true });
    });
  }

  // ================= 定时批量检测过期用户 =================
  // 拦截是实时的（每次请求校验）；本任务负责：检测+留痕，支持外部通知
  function startExpiryChecker(intervalMs) {
    const iv = intervalMs || 3600 * 1000; // 默认每小时
    const logFile = path.join(cfg.dataDir, 'expiry.log');
    const log = function(line) {
      const ts = new Date().toLocaleString('zh-CN', { hour12: false });
      const full = '[' + ts + '] ' + line;
      console.log('[租期] ' + full);
      try { fs.appendFileSync(logFile, full + '\n'); } catch (e) {}
    };
    const run = function() {
      let expiredCount = 0;
      store.list().forEach(function(u) {
        if (isExpired(u)) {
          expiredCount++;
          log('过期用户: ' + u.username + '（到期 ' + new Date(u.expiresAt).toLocaleString('zh-CN') + '）');
        }
      });
      if (expiredCount === 0) log('扫描完成，无过期用户');
    };
    run(); // 启动先跑一次
    setInterval(run, iv);
    log('过期检测定时任务已启动，间隔 ' + (iv / 60000) + ' 分钟');
    return { run };
  }

  return {
    store,
    hashPassword,
    verifyPassword,
    signToken,
    verifyToken,
    isExpired,
    requirePageAuth,
    requireApiAuth,
    loginHandler,
    logoutHandler,
    meHandler,
    wsAuth,
    installAdminApi,
    startExpiryChecker,
  };
};
