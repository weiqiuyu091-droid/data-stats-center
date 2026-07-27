var parser = require('./parser.js');
var fs = require('fs');

// Extract test input
var testJs = fs.readFileSync('D:/686/test_0727.js', 'utf8');
var lines = testJs.split('\n');
var startIdx = -1, endIdx = -1;
for (var i = 0; i < lines.length; i++) {
  if (startIdx < 0 && lines[i].indexOf('const input = \`') >= 0) { startIdx = i + 1; continue; }
  if (startIdx > 0 && lines[i].trim().endsWith('\`;')) { endIdx = i; break; }
}
var input = lines.slice(startIdx, endIdx).join('\n');
// 末行包含关闭反引号,提取其内容部分
if (endIdx < lines.length) {
  var lastContent = lines[endIdx].replace(/\`\s*;?\s*$/, '');
  if (lastContent.trim()) input += '\n' + lastContent;
}

// User's expected values (81 messages)
var expected = [
  150, 90, 280, 50, 120, 140, 150, 80, 40, 50,
  50, 180, 105, 125, 200, 70, 250, 60, 50, 20,
  154, 150, 80, 24, 100, 50, 120, 24, 100, 60,
  40, 140, 40, 4, 20, 20, 160, 20, 20, 80,
  40, 80, 100, 50, 12, 70, 375, 40, 170, 165,
  260, 10, 70, 500, 290, 200, 85, 120, 15, 6,
  90, 20, 80, 133, 320, 18, 45, 24, 10, 10,
  180, 40, 20, 40, 10, 5, 15, 40, 420, 20,
  140
];

var result = parser.analyze(input);

console.log('=== 差异对比 ===');
var diffs = [];
for (var i = 0; i < expected.length; i++) {
  var actual = result.messageSummary[i] ? result.messageSummary[i].totalBet : 0;
  if (actual !== expected[i]) {
    diffs.push({ idx: i+1, expected: expected[i], actual: actual, text: result.messageSummary[i] ? result.messageSummary[i].text.substring(0, 100) : 'MISSING' });
    console.log('  [' + (i+1) + '] 期望=' + expected[i] + ' 实际=' + actual + ' Δ=' + (actual - expected[i]));
    console.log('        ' + (result.messageSummary[i] ? result.messageSummary[i].text.substring(0, 120) : 'MISSING'));
  }
}

if (diffs.length === 0) {
  console.log('  全部对齐！');
} else {
  console.log('\n共 ' + diffs.length + ' 条差异，总Δ=' + diffs.reduce(function(s,d){ return s+(d.actual-d.expected); }, 0));
}

console.log('\n总金额: 实际=' + result.grandTotal + ' 期望=8004 Δ=' + (result.grandTotal - 8004));
