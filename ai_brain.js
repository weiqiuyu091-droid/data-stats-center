// =====================================================================
// ai_brain.js — AI 大脑模块（独立模块，不改 parser.js/fsaf.html/server.js）
// =====================================================================
// 架构：LLM 语义理解 → canonical 投注语法 → parser.js 确定性计算
// LLM 只做语义理解（不碰计算），parser 只做数学计算。
//
// 用法：
//   const aiBrain = require('./ai_brain.js');
//   const result = await aiBrain.analyze(rawBetText);
//   // result = { betSummary, messageSummary, grandTotal, aiItems, aiRaw }
// =====================================================================

const parser = require('./parser.js');

// ---------- AI 提示词 ----------
// 基于 0804 数据 53 组消息校准打磨，覆盖所有已知格式陷阱
const SYSTEM_PROMPT = `你是"澳门六合彩投注消息理解助手"。玩家用很随意的方式报投注（含发送者名、日期行、中文数字、各数/各号/个/字/尾/连、斤米块元都是金额单位）。

你的任务：把投注消息转成结构化 JSON 数组。只输出 JSON 数组，不要任何解释文字或其他内容。

---

## 输出字段
每条投注一个 JSON 对象：
- market: "澳"或"港"。消息中出现"香港/香/港"前缀为"港"，否则默认"澳"。独立行"香港"切换后续行为港盘。
- type: 中文类型名。如：特码、各数、各号、平特、平特肖、特肖、三连、二连、四连、五连、复试三连、复试四连、尾数、三中三、二中二、波色、单双、波色单双（红波双/绿波单等组合）
- target: 下注对象数组，如 ["01","13"] 或 ["狗","兔"] 或 ["9尾","7尾"]
- amount: 金额数字（正整数）。中文数字需转换（"二十斤"→20，"三百"→300，"两千"→2000，"十米"→10）
- unit: 原单位：元/斤/米/块。无单位时默认"元"
- canonical: 标准投注语法一行。这是最重要的字段——必须能被后续程序解析。

---

## canonical 语法铁律（最重要！）

**【后缀规则】**"各数/各号/各/个数" 是后缀词，必须放在对象后面、金额前面：
  结构 = [市场前缀] + 对象 + 各数/各号/各 + 金额 + [单位]
  ✓ 正确："狗各数5"、"羊鸡龙猴各号20斤"、"澳07.19.43.28各10斤"、"港绿波各数15"
  ✗ 错误："各数狗5"（各数在对象前）、"各号各羊鸡龙猴20斤"（双重各）

**【连肖规则】**生肖连在一起 + 连肖类型 + 金额：
  ✓ "狗兔二连100"、"猪鼠鸡三连30"、"四连猪鼠鸡兔20"、"复试三连猴虎狗蛇各30"
  ✗ "二连狗兔100"（二连在生肖前是错的）、"狗兔二连组20"（不要"组"字）

**【波色单双组合】**"红波双/红波单/绿波双/绿波单/蓝波双/蓝波单" 是波色+单双的组合类型，是一种独立投注，绝对不能拆开：
  ✓ "红波双各号10" → 一条，type="波色单双"，target=["红波双"]
  ✗ 不能拆成 "红波各号10" + "双各号10" 两条
  蓝波=蓝+波同理，绿波=绿+波同理，都是单一波色

**【复式拆分】**"复三复四各30" 要拆成两条：
  → "复试三连猴虎狗蛇各30" 和 "复试四连猴虎狗蛇各30"

**【中文数字】**canonical 中必须转为阿拉伯数字：
  ✓ "狗各数100" ✗ "狗各数一百"

**【金额继承】**如果某行只有号码/生肖没有金额，继承上一行的金额：
  例："01.13.38各10\n12.08.37" → 第二行继承各10 → "01.13.38各10；12.08.37各10"
  例："19\n10" → 合并为 "19各10"

**【澳特前缀】**保留原样："澳特01.05.13各30"

---

## 处理要点
1. 逐条提取，一条不漏。消息用换行/分号/逗号分隔的多条投注都要拆开。
2. 日期行（"2026年XX月XX日 XX:XX"）和纯发送者名（如"利来"）忽略。
3. "复三复四"等缩写 = 复试三连+复试四连，拆成两条。
4. "组"字在连肖中要去掉："三连猪鼠鸡组30"→ canonical="猪鼠鸡三连30"
5. 无金额行要继承前一行的金额（最近的带金额行）。
6. 号码间用 . 分隔（不是 , ），如 "01.13.38"
7. 金额必须是正整数，绝不允许 0。
8. "/" 在 "对象/各号金额" 中是分隔符，把对象和金额后缀分开，如 "鸡 牛 羊/各号10" = 鸡牛羊各号10。";"（分号）才是不同投注之间的分隔符。

---

## 输出格式
直接输出 JSON 数组，不要 markdown 代码块、不要解释、不要前后缀。
正确格式示例：
[{"market":"澳","type":"特码","target":["01","13","38"],"amount":10,"unit":"斤","canonical":"澳特01.13.38各10斤"},{"market":"澳","type":"二连","target":["狗","兔"],"amount":100,"unit":"元","canonical":"狗兔二连100"}]`;

// 把 SYSTEM_PROMPT 截成合适长度（太长模型可能截断）
const SYSTEM = SYSTEM_PROMPT;

// ---------- AI 调用 ----------
async function callAI(text, { signal } = {}) {
  const base = process.env.ANTHROPIC_BASE_URL;
  if (!base) throw new Error('ANTHROPIC_BASE_URL 未设置，无法调用 AI');

  const resp = await fetch(base + '/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_AUTH_TOKEN || 'PROXY_MANAGED',
      'authorization': 'Bearer ' + (process.env.ANTHROPIC_AUTH_TOKEN || 'PROXY_MANAGED'),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: '请解析下面这批投注消息：\n' + text }]
    })
  });

  const json = await resp.json();
  if (!resp.ok) {
    const errInfo = JSON.stringify(json).slice(0, 500);
    throw new Error(`AI 接口 ${resp.status}: ${errInfo}`);
  }
  return json.content.map(b => b.text || '').join('');
}

// ---------- 从 AI 返回文本中提取 JSON ----------
function extractJson(aiText) {
  const m = aiText.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (e) { return null; }
}

// ---------- 按消息组分批 ----------
function splitGroups(text) {
  const lines = text.split(/\n/);
  const groups = [];
  let cur = [];
  for (const line of lines) {
    if (/^利来\s*$/.test(line.trim())) {
      if (cur.length) { groups.push(cur.join('\n')); cur = []; }
      cur.push(line);
    } else {
      cur.push(line);
    }
  }
  if (cur.length) groups.push(cur.join('\n'));
  return groups.filter(g => g.trim().length > 0);
}

// ---------- 主入口 ----------
/**
 * 使用 AI 大脑分析投注消息
 * @param {string} text - 原始投注消息文本
 * @param {object} options
 * @param {number} options.batchSize - 每批投注组数，默认 6
 * @param {function} options.onProgress - 进度回调 (batchIndex, itemCount)
 * @param {AbortSignal} options.signal - 取消信号
 * @returns {{ betSummary, messageSummary, grandTotal, aiItems, aiRaw, stats }}
 */
async function analyze(text, options = {}) {
  const { batchSize = 6, onProgress, signal } = options;
  const groups = splitGroups(text);
  const totalBatches = Math.ceil(groups.length / batchSize);
  const allItems = [];
  const failedBatches = [];
  const stats = { groups: groups.length, batches: totalBatches, aiItems: 0, parserItems: 0, failedBatches: [] };

  // 分批调用 AI
  for (let i = 0; i < groups.length; i += batchSize) {
    const batchText = groups.slice(i, i + batchSize).join('\n\n');
    let aiText;
    try {
      aiText = await callAI(batchText, { signal });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      failedBatches.push(i);
      stats.failedBatches.push(i);
      if (onProgress) onProgress(i, -1, e.message);
      continue;
    }

    const items = extractJson(aiText);
    if (!items) {
      failedBatches.push(i);
      stats.failedBatches.push(i);
      console.error('[AI] 批次', i, 'JSON 解析失败，原始返回(前500):', aiText.slice(0, 500));
      if (onProgress) onProgress(i, 0, 'JSON 解析失败');
      continue;
    }
    if (items.length === 0) {
      console.warn('[AI] 批次', i, '返回空数组，原始返回(前500):', aiText.slice(0, 500));
    }

    for (const item of items) {
      item._batchIndex = i;
    }
    allItems.push(...items);
    if (onProgress) onProgress(i, items.length, null);
  }

  stats.aiItems = allItems.length;

  // AI canonical → parser 全链路计算
  const canonLines = allItems.map(it => it.canonical).filter(Boolean);
  let ruleResult;
  try {
    ruleResult = parser.analyze(canonLines.join('\n'));
  } catch (e) {
    ruleResult = { betSummary: [], messageSummary: [], grandTotal: 0, _error: e.message };
  }

  stats.parserItems = ruleResult.betSummary ? ruleResult.betSummary.length : 0;
  stats.grandTotal = ruleResult.grandTotal || 0;

  return {
    betSummary: ruleResult.betSummary || [],
    messageSummary: ruleResult.messageSummary || [],
    grandTotal: ruleResult.grandTotal || 0,
    aiItems: allItems,
    aiRaw: null,  // 不存原始 AI 返回，省内存
    stats
  };
}

// ---------- 便捷方法：只做 AI 理解（不跑 parser） ----------
async function understand(text, options = {}) {
  const { batchSize = 6, onProgress, signal } = options;
  const groups = splitGroups(text);
  const allItems = [];
  const failedBatches = [];

  for (let i = 0; i < groups.length; i += batchSize) {
    const batchText = groups.slice(i, i + batchSize).join('\n\n');
    let aiText;
    try {
      aiText = await callAI(batchText, { signal });
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      failedBatches.push(i);
      if (onProgress) onProgress(i, -1, e.message);
      continue;
    }
    const items = extractJson(aiText);
    if (!items) {
      failedBatches.push(i);
      if (onProgress) onProgress(i, 0, 'JSON 解析失败');
      continue;
    }
    allItems.push(...items);
    if (onProgress) onProgress(i, items.length, null);
  }
  return { items: allItems, failedBatches };
}

// ---------- 对比 AI vs 规则 ----------
function compare(aiResult, ruleResult) {
  return {
    aiGrandTotal: aiResult.grandTotal,
    ruleGrandTotal: ruleResult.grandTotal,
    diff: Math.round((aiResult.grandTotal - ruleResult.grandTotal) * 100) / 100,
    aiBets: aiResult.betSummary.length,
    ruleBets: ruleResult.betSummary.length,
    aiItems: aiResult.aiItems.length
  };
}

module.exports = { analyze, understand, compare, splitGroups, SYSTEM_PROMPT };
