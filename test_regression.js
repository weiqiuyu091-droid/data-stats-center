// ============================================================
// 回归测试 — 每次改完 parser.js 跑一下，确保不破坏已有规则
// 用法: node test_regression.js
// ============================================================

const parser = require('./parser.js');
const fs = require('fs');

let passed = 0, failed = 0;
const failures = [];

function test(name, input, expectedTotal) {
  const result = parser.analyze(input);
  const actual = Math.round(result.grandTotal * 100) / 100;
  if (Math.abs(actual - expectedTotal) < 0.01) {
    passed++;
  } else {
    failed++;
    failures.push({ name, input, expected: expectedTotal, actual });
    console.log('  ✗', name, '→ 期望', expectedTotal, '实际', actual);
  }
}

console.log('=== 单元回归测试 ===\n');

// 尾数
test('多尾数粘连', '23579尾各数20', 500);
test('横线分隔尾数', '4-5-6-9尾个数十斤', 200);

// 中文数字
test('8百→800', '平蛇8百，二连蛇羊一百', 900);

// 货币单位
test('文→块', '40/30文，04/10文', 40);

// 分隔符
test('/数字分隔', '10/22.6.18.15.11.各5斤一个', 30);
test('逗号分注', '澳门36/30米，03-01-10-34-11-46-23-47-12-24-48-09-21-33-45各5米', 105);

// 复式
test('复三复四展开', '08.09.12.21各五澳；复三复四狗猴鼠蛇各组二十；08.09各五港', 130);

// 连肖
test('二连多对拆分', '猴兔 猴蛇 兔蛇二连 各50元 蛇兔猴三连30元 平特蛇200', 380);
test('二友归一化', '二友兔蛇五十斤', 50);
test('三友归一化', '蛇兔猴三友30元', 30);

// 波色单双
test('红波双组合', '鸡 牛 羊/各号10；红波双/各号10', 210);

// 双市场
test('香港澳门双市场', '猪羊各号10香港澳门', 160);

// 后缀市场
test('后缀澳', '08.09.12.21各五澳', 20);
test('后缀港', '08.09各五港', 10);

// 连肖
test('蛇猴龙羊四连肖', '蛇猴龙羊四连肖30', 30);

console.log('');
console.log('通过:', passed, '/', (passed + failed));
if (failures.length > 0) {
  console.log('失败项:');
  failures.forEach(f => console.log('  -', f.name, ':', f.input.slice(0,40)));
}

// ============================================================
console.log('\n=== 0808 全量回归 ===\n');

const data = fs.readFileSync('D:/686/_data_0808.txt', 'utf-8');
const truthRaw = fs.readFileSync('D:/686/_truth_0808.txt', 'utf-8');
const truth = truthRaw.split('\n').map(l => parseInt(l.trim())).filter(n => !isNaN(n));

const result = parser.analyze(data);
let match = 0;
const diffs = [];

result.messageSummary.forEach((m, i) => {
  const rt = Math.round(m.totalBet * 100) / 100;
  const tt = truth[i] || 0;
  if (Math.abs(rt - tt) < 0.01) match++;
  else diffs.push({ i: i + 1, rule: rt, truth: tt, text: m.text.slice(0, 60) });
});

console.log('匹配:', match, '/', result.messageSummary.length);
console.log('规则总额:', result.grandTotal, '| 手搓:', truth.reduce((a, b) => a + b, 0));

if (diffs.length > 0) {
  console.log('\n差异:');
  diffs.forEach(d => console.log('  #' + d.i, '规则:' + d.rule, '手搓:' + d.truth, '|', d.text));
}

// ============================================================
console.log('\n=== 0804 回归（无解析失败项） ===\n');

const data0804 = fs.readFileSync('D:/686/_data_0804.txt', 'utf-8');
const r0804 = parser.analyze(data0804);
const zeroMsgs = r0804.messageSummary.filter(m => m.totalBet === 0);

if (zeroMsgs.length === 0) {
  console.log('✓ 53条消息全部解析成功，0条失败');
} else {
  console.log('✗', zeroMsgs.length, '条消息解析为0:');
  zeroMsgs.forEach(m => console.log('  #' + m.index, m.text.slice(0, 60)));
}

console.log('\n═══════════════════════════════════');
console.log('  总结果:', (failed + diffs.length === 0 ? '全部通过 ✓' : '有差异 ✗'));
console.log('═══════════════════════════════════');
