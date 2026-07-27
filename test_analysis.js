// test_analysis.js — 逐条解析7月23日数据，输出解析结果
const parser = require('./parser.js');

const rawData = `利来
2026年07月23日 20:53
羊蛇狗虎猴牛猪各数10
45.29.35.27.44.24个数十斤

利来
2026年07月23日 20:53
澳特29各/40斤19各/10斤

利来
2026年07月23日 20:53
噢门特30各-30元

利来
2026年07月23日 20:55
狗各号10 -----33各/60

利来
2026年07月23日 20:55
22 46各/10

利来
2026年07月23日 20:55
香港马各号5斤澳特21.12.10各5斤

利来
2026年07月23日 20:55
澳特27.16.33.42各6斤

利来
2026年07月23日 20:56
澳特虎牛狗蛇龙猴各号5斤11各/10斤

利来
2026年07月23日 20:56
29各50

利来
2026年07月23日 20:57
三连蛇鼠虎五十斤

利来
2026年07月23日 20:57
新奥09.21各20
33.45各30

利来
2026年07月23日 20:57
四连鸡龙虎蛇五十斤

利来
2026年07月23日 20:59
牛个数十斤

利来
2026年07月23日 20:59
31三十米

利来
2026年07月23日 21:04
香，11,各80
07，06,各20
01,02,03,04,05,32,各10

利来
2026年07月23日 21:04
22-20米。09.21各10米。17.04各5米。47.38.34.35.12.20.11各3米。

利来
2026年07月23日 21:05
蛇/各号5，02/各30，27/23/32/14/13/03/30/04/35各10

利来
2026年07月23日 21:05
06.18.22各10

利来
2026年07月23日 21:05
07.19.18各5

利来
2026年07月23日 21:06
03.15.27.39.41.43.38各号二十斤
龙.鼠.牛.蛇，各号十斤

利来
2026年07月23日 21:06
07-21-各10米
04-16-05-17-06-18-12-24-09-27各五米

利来
2026年07月23日 21:10
澳门30各25

利来
2026年07月23日 21:11
澳门蛇龙狗各号10
03.15.27.02.14.26各15

利来
2026年07月23日 21:11
门特:狗各号30，
.21.12.36.45.47.41.35.7.19.3.27.39.各号20。

利来
2026年07月23日 21:14
澳，鼠，兔，各号10
10,21,06,26,各20

利来
2026年07月23日 21:14
34 43各号30

利来
2026年07月23日 21:16
猴虎/各号5，23/47/05/17各10

利来
2026年07月23日 21:16
23 14 15各8`;

// 写入临时文件供analyze使用
// 直接调用analyze
const result = parser.analyze(rawData);

console.log('========== 解析结果总览 ==========');
console.log(`总计投注条目: ${result.betSummary.length}`);
console.log(`总投注金额: ${result.grandTotal}`);
console.log('');

result.betSummary.forEach((r, i) => {
  const hkLabel = r.hk ? '【HK】' : '【澳】';
  console.log(`[${i}] ${hkLabel} ${r.display} | bet=${r.bet} | type=${r.type} | msg=${r.msgIndex}`);
  if (r.targets) console.log(`    → targets: [${Array.isArray(r.targets) ? r.targets.join(',') : '?'}]`);
  if (r.comboZodiacs) console.log(`    → comboZodiacs: ${r.comboZodiacs}, comboType: ${r.comboType}`);
});

console.log('\n========== 按消息分组 ==========');
result.messageSummary.forEach(m => {
  console.log(`消息#${m.index}: 总额=${m.totalBet} | ${m.text}`);
});

console.log('\n========== 逐子行展开调试 ==========');
// 手动逐行调试: 每个消息的每个子句
const text = rawData.replace(/\r\n/g, '\n').replace(/　/g, ' ').replace(/[ \t]+/g, ' ');
var rawLines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
var groupedMessages = parser.groupNewFormatMessages(rawLines);
var useNewFormat = groupedMessages !== null;

var debugLines = useNewFormat ? groupedMessages.map(m => m.content) : rawLines;
console.log(`使用新格式: ${useNewFormat}, 消息数: ${debugLines.length}`);

debugLines.forEach((rawLine, lineIdx) => {
  console.log(`\n--- 消息#${lineIdx + 1}: ${rawLine.substring(0, 100)}${rawLine.length > 100 ? '...' : ''} ---`);

  const subLines = rawLine
    .replace(/(\d)。(\d)/g, '$1.$2')
    .replace(/([^斤米块\d])。(\d)/g, '$1$2')
    .split(/[；;·。]/)
    .map(l => l.trim())
    .filter(Boolean);

  console.log(`  子句数: ${subLines.length}`);

  subLines.forEach((sl, si) => {
    console.log(`  子句[${si}]: "${sl}"`);

    // stripSender
    var stripped = parser.stripSender(sl);
    var strippedHK = parser.stripHK(stripped);
    var strippedAU = parser.stripMacau(stripped);
    var isHK = /^(?:香港|港|香)/i.test(strippedAU);
    var hasHkMarker = /香港|港|香/.test(sl);

    console.log(`    stripSender: "${stripped}"`);
    if (hasHkMarker) console.log(`    stripHK: "${strippedHK}" | HK模式`);
    console.log(`    stripMacau: "${strippedAU}"`);

    var afterNorm = parser.norm(strippedAU);
    console.log(`    norm: "${afterNorm}"`);

    // 检查分句
    var segs = parser.splitByModeMarkers(sl);
    if (segs) {
      console.log(`    ★ 模式标记分割: ${segs.length}段`);
      segs.forEach((seg, sgi) => {
        var mode = seg.isHK ? 'HK' : '澳';
        console.log(`      段[${sgi}][${mode}]: "${seg.text}"`);
        var expanded = parser.expandLine(seg.text);
        console.log(`        expandLine: ${JSON.stringify(expanded)}`);
        expanded.forEach((sr, sri) => {
          var r = parser.processRule(sr);
          if (r) {
            console.log(`        ✓ [${sri}] display="${r.display}" bet=${r.bet} type=${r.type}`);
          } else {
            console.log(`        ✗ [${sri}] 解析失败!: "${sr}"`);
          }
        });
      });
    } else {
      var expanded = parser.expandLine(sl);
      console.log(`    expandLine: ${JSON.stringify(expanded)}`);
      expanded.forEach((sr, sri) => {
        var r = parser.processRule(sr);
        if (r) {
          console.log(`    ✓ [${sri}] display="${r.display}" bet=${r.bet} type=${r.type}`);
          if (r.hk) console.log(`      HK模式`);
        } else {
          console.log(`    ✗ [${sri}] 解析失败!: "${sr}"`);
        }
      });
    }
  });
});
