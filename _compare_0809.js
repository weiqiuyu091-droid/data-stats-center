const fs = require('fs');
const P = require('./parser.js');

const text = fs.readFileSync('D:/686/_data_0809.txt', 'utf8');

// 手搓数据: 序号 -> {total, win}
const hand = `36	2
10
4
70
60
145
4
10
15	3
60
140
140	5
320
580
4
20
240	5
125
30
60
60
10	2
35
100
20
120
40
33
40
40
33
25
9	3
360
5
30
80
5
8	2
100
60
30
1000
40
120
16
3
5
40
100
60
40
600
480	20
270
140
210	5
5
15
120	5
9	3
160
1280
500
240
9
260	20
5
8
10
8
4
4
3
4
355
20
60
490	10
2	2
3
40
40
300
`.trim().split('\n').map(l => {
  const [t, w] = l.split('\t');
  return { total: parseFloat(t), win: w ? parseInt(w) : 0 };
});

const r = P.analyze(text);
console.log('消息条数:', r.messageSummary.length, ' 手搓条数:', hand.length);
console.log('解析器总数:', r.grandTotal, ' 手搓总数:', 10334);

let diffCount = 0;
let sumDiff = 0;
r.messageSummary.forEach((m, i) => {
  const h = hand[i];
  const diff = m.totalBet - h.total;
  const mark = Math.abs(diff) > 0.001 ? '  <<< 差异' : '';
  if (Math.abs(diff) > 0.001) {
    diffCount++;
    sumDiff += diff;
    console.log(`#${i+1} 解析=${m.totalBet} 手搓=${h.total} 差=${diff}${mark}`);
    console.log(`   文本: ${m.fullText.length > 90 ? m.fullText.substring(0,90) + '...' : m.fullText}`);
  }
});
console.log(`\n差异条数: ${diffCount}/${r.messageSummary.length}, 总差额: ${sumDiff}`);
