// compare_0728.js — 解析器输出 vs 用户手搓数据逐条对比 (2026-07-28)
const parser = require('./parser.js');
const fs = require('fs');

// 从 test_0727.js 提取输入数据
const testSrc = fs.readFileSync('./test_0727.js', 'utf8');
const inputMatch = testSrc.match(/const input = `([\s\S]*?)`;/);
const input = inputMatch[1];

// 用户手搓数据: [序号, 各条总数]
const manual = {
  1:150, 2:90, 3:280, 4:50, 5:120, 6:140, 7:150, 8:80, 9:40, 10:50,
  11:50, 12:180, 13:105, 14:125, 15:200, 16:70, 17:250, 18:60, 19:50, 20:20,
  21:154, 22:150, 23:80, 24:24, 25:100, 26:50, 27:120, 28:24, 29:100, 30:60,
  31:40, 32:140, 33:40, 34:4, 35:20, 36:20, 37:160, 38:20, 39:20, 40:80,
  41:40, 42:80, 43:100, 44:50, 45:12, 46:70, 47:375, 48:40, 49:170, 50:165,
  51:260, 52:10, 53:70, 54:500, 55:290, 56:200, 57:85, 58:120, 59:15, 60:6,
  61:90, 62:20, 63:80, 64:113, 65:320, 66:18, 67:45, 68:24, 69:10, 70:10,
  71:180, 72:40, 73:20, 74:40, 75:10, 76:5, 77:15, 78:40, 79:420, 80:20, 81:140
};

const result = parser.analyze(input);

console.log('序号 | 解析 | 手搓 | 差值 | 消息内容');
console.log('-'.repeat(100));

let matchCount = 0, diffCount = 0;
let parserTotal = 0, manualTotal = 0;

result.messageSummary.forEach(function(m, i) {
  const seq = i + 1;
  const parsed = m.totalBet;
  const hand = manual[seq];
  parserTotal += parsed;
  manualTotal += (hand || 0);

  if (hand === undefined) {
    console.log(`#${seq} | ${parsed} | 无手搓 | ? | ${m.text.substring(0, 50)}`);
    return;
  }

  if (parsed === hand) {
    matchCount++;
  } else {
    diffCount++;
    const diff = parsed - hand;
    console.log(`#${seq} | ${parsed} | ${hand} | ${diff > 0 ? '+' : ''}${diff} | ${m.text.substring(0, 60)}`);
  }
});

console.log('-'.repeat(100));
console.log(`匹配: ${matchCount} 条, 不匹配: ${diffCount} 条`);
console.log(`解析总额: ${parserTotal}, 手搓总额: ${manualTotal}, 差: ${parserTotal - manualTotal}`);

// 输出差异消息的投注明细
if (diffCount > 0) {
  console.log('\n========== 差异消息明细 ==========');
  result.messageSummary.forEach(function(m, i) {
    const seq = i + 1;
    const hand = manual[seq];
    if (hand === undefined || m.totalBet === hand) return;
    console.log(`\n--- #${seq} 解析=${m.totalBet} 手搓=${hand} ---`);
    console.log(`消息: ${m.text}`);
    result.betSummary.forEach(function(b) {
      if (b.msgIndex === i) {
        console.log(`  bet=${b.bet} type=${b.type} display=${b.display}`);
      }
    });
  });
}
