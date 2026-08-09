const fs = require('fs');
const P = require('./parser.js');

const text = fs.readFileSync('D:/686/_data_0809b.txt', 'utf8');

const hand = `90
640
30
280
200
220
220
10
160
180
320	10
300
15
50
50
200
100
80	10
20
40
40
200
370	10
340	20
440
660	30
280
150
650
155	5
70
260	20
225	10
100
100
1270	30
420
30
188
80
50
240
60
345
240
10
540
80
120
100	10
1660	80
240
50
40	10
200
50
100
60
51
200
`.trim().split('\n').map(l => {
  const [t, w] = l.split('\t');
  return { total: parseFloat(t), win: w ? parseInt(w) : 0 };
});

const r = P.analyze(text);
console.log('消息条数:', r.messageSummary.length, ' 手搓条数:', hand.length);
console.log('解析器总数:', r.grandTotal, ' 手搓总数:', 13449);

let diffCount = 0, sumDiff = 0;
r.messageSummary.forEach((m, i) => {
  const h = hand[i];
  const diff = m.totalBet - h.total;
  if (Math.abs(diff) > 0.001) {
    diffCount++; sumDiff += diff;
    console.log(`#${i+1} 解析=${m.totalBet} 手搓=${h.total} 差=${diff}`);
    console.log(`   文本: ${m.fullText.length > 100 ? m.fullText.substring(0,100) + '...' : m.fullText}`);
  }
});
console.log(`\n差异条数: ${diffCount}/${r.messageSummary.length}, 总差额: ${sumDiff}`);
