// 跑利来 2026-07-20 第二组数据
const fs = require("fs");
require("./parser.js");

const todayResult = {
  numbers: ["46","28","19","38","31","25","32"],
  teMa: "32",
  flatZodiacs: ["鸡","兔","鼠","蛇","猪","马"],
  expect: "2026201"
};

const rawChatLog2 = `利来
2026年07月20日 20:27
23.43.46.48.49.05.29.09.21.07.31各5
牛龙虎㺅四连10米
平特鸡八百
 鸡牛二连一百，
  鸡牛猴三连五十
鸡牛猴鼠五十
澳门
18.30.16.28.各五十，06.42.06.40.各二十，
澳特
11 17 21 23 25 27 33 37 39 41 45 04 06 12 14 20 22 26 30 34 36 48各5

利来
2026年07月20日 20:36
马，虎，各号十斤
狗，各号二十斤

利来
2026年07月20日 20:36
16.11.32.37各数50
40/100斤
兔猪猴狗各数20

平鸡1000

利来
2026年07月20日 20:50
19  13 24 22 23  21 18 01 13 20 17 15 31 05 25 30 07 10 各5

利来
2026年07月20日 20:51
05 41各10   29个9

利来
2026年07月20日 20:54
奥双各数10块

利来
2026年07月20日 20:55
07 19 01  13 25各8

利来
2026年07月20日 20:55
【8尾.6尾.9尾.3尾.1尾】个数十斤48.08.26.06.09.29.13.33.21.11个数五斤

利来
2026年07月20日 21:00
狗鸡猴龙鼠虎各数十

利来
2026年07月20日 21:04
.13.24.26.29.21.18.17.19.23.22.10 12.16.20 21 25 个数五米

利来
2026年07月20日 21:04
10,11,12,13,14,15,16,17,18,19,30,32,34,36,38各数20斤
羊猪蛇鸡各数20斤
09 二十斤

利来
2026年07月20日 21:04
猪狗鸡猴羊蛇个数十斤
32.33.22.11.24.38个数五斤

利来
2026年07月20日 21:04
虎蛇兔各20，猴各号25，狗各号30

利来
2026年07月20日 21:06
牛 鸡 兔 蛇 /各号20
 红波双/各号10

利来
2026年07月20日 21:07
01.10.03.27.23.30各5
21.33各10
澳 平特尾数1尾下200元

利来
2026年07月20日 21:08
01.02.13.24.26.29.43.44.47.48.49.21.12.05.32.38.18.40.35.33各数五米

利来
2026年07月20日 21:08
马鼠猪狗虎兔各号五米

利来
2026年07月20日 21:08
狗鸡猴个数十斤

利来
2026年07月20日 21:08
平牛500

利来
2026年07月20日 21:13
18/48/31/33/23/35/11/15/09各5，03/33/38/32各10

利来
2026年07月20日 21:13
37  15 25各10  43 21  27各10

利来
2026年07月20日 21:15
猪 羊 狗 蛇 鸡 鼠 个数15

利来
2026年07月20日 21:16
20, 21, 31, 33, 43, 45各数10


利来
2026年07月20日 21:16
09.21.各一百斤
45，各五十斤
29.49各十斤

利来
2026年07月20日 21:18
澳17.30各100
22.38.21.12.40.44.23各30
虎.狗.羊.牛.各数25

利来
2026年07月20日 21:18
澳特，鼠，虎，各.号40
特，蛇，猴，各号，10
平特一肖，鸡，2000

平特一肖，，狗1000

利来
2026年07月20日 21:19
门特:鸡蛇各号30，羊猪各号10

利来
2026年07月20日 21:20
特 鼠猪虎牛猴 各数20，猪牛猴蛇 各数20，08.20.32.44.各数20， 牛蛇猪各数10

利来
2026年07月20日 21:20
蛇猴狗兔猪各号30

利来
2026年07月20日 21:20
平特一肖，牛，3000

利来
2026年07月20日 21:22
41.46.45.47.各15
07.19.31.43各20（04.16.28.40各20）
18.30.34.26.33.各10
牛平特800

利来
2026年07月20日 21:23
41 35各50斤
02 38 11 05各20斤
17 29 23 47 14 26 各10斤
31 20 32 44 15 04 16 40各5斤

利来
2026年07月20日 21:24
23个/20

利来
2026年07月20日 21:26
45，37，07，47，30，28各6斤
25，33，08，18，38，40各5斤
17，27，06，46，34，36各4斤

利来
2026年07月20日 21:26
18.30.42.17.29.04.40.27.02.38.13.25.24.48.23.10.20个数10`;

const userManual2 = [
  {idx:1, bet:1455, win:'', note:'平800'},
  {idx:2, bet:170, win:'', note:''},
  {idx:3, bet:1620, win:'', note:'平1000特70'},
  {idx:4, bet:90, win:'', note:''},
  {idx:5, bet:29, win:'', note:''},
  {idx:6, bet:240, win:'10', note:''},
  {idx:7, bet:40, win:'', note:''},
  {idx:8, bet:300, win:'', note:''},
  {idx:9, bet:240, win:'', note:''},
  {idx:10, bet:80, win:'', note:''},
  {idx:11, bet:640, win:'40', note:''},
  {idx:12, bet:270, win:'15', note:''},
  {idx:13, bet:460, win:'', note:''},
  {idx:14, bet:410, win:'', note:''},
  {idx:15, bet:250, win:'', note:'平尾200'},
  {idx:16, bet:100, win:'5', note:''},
  {idx:17, bet:125, win:'5', note:''},
  {idx:18, bet:120, win:'', note:''},
  {idx:19, bet:500, win:'', note:''},
  {idx:20, bet:85, win:'10', note:''},
  {idx:21, bet:60, win:'', note:''},
  {idx:22, bet:360, win:'15', note:''},
  {idx:23, bet:60, win:'', note:''},
  {idx:24, bet:270, win:'', note:''},
  {idx:25, bet:810, win:'', note:''},
  {idx:26, bet:3400, win:'', note:'平2000'},
  {idx:27, bet:320, win:'10', note:''},
  {idx:28, bet:920, win:'70', note:''},
  {idx:29, bet:600, win:'30', note:''},
  {idx:30, bet:3000, win:'', note:''},
  {idx:31, bet:1070, win:'', note:''},
  {idx:32, bet:280, win:'5', note:''},
  {idx:33, bet:20, win:'', note:''},
  {idx:34, bet:90, win:'', note:''},
  {idx:35, bet:170, win:'', note:''},
];

console.log('='.repeat(80));
console.log('利来 2026-07-20 第二组 — 投注解析对比');
console.log('开奖号码: ' + todayResult.numbers.join(',') + ' 特码: ' + todayResult.teMa);
console.log('='.repeat(80));

const result = analyze(rawChatLog2);

console.log('\n按消息汇总 (脚本 vs 用户):');
console.log('-'.repeat(80));
console.log('序号 | 脚本投注额 | 用户投注额 | 差额 | 消息摘要');
console.log('-'.repeat(80));

let totalScript = 0;
let totalUser = 0;
let diffs = [];

result.messageSummary.forEach((msg, i) => {
  const u = userManual2[i] || {bet:0, win:''};
  const diff = msg.totalBet - u.bet;
  totalScript += msg.totalBet;
  totalUser += u.bet;
  if (diff !== 0) {
    diffs.push({idx: msg.index, script: msg.totalBet, user: u.bet, diff, text: msg.text.substring(0,80)});
  }
  const text = msg.text.replace(/\n/g, ' ').substring(0, 70);
  const flag = diff === 0 ? '  ' : (diff > 0 ? '+'+diff : diff);
  console.log(`${String(msg.index).padStart(3)} | ${String(msg.totalBet).padStart(8)} | ${String(u.bet).padStart(8)} | ${String(flag).padStart(5)} | ${text}`);
});

console.log('-'.repeat(80));
console.log(`合计 | ${String(totalScript).padStart(8)} | ${String(totalUser).padStart(8)} | ${String(totalScript - totalUser).padStart(5)} |`);

if (diffs.length > 0) {
  console.log('\n差异明细:');
  diffs.forEach(d => {
    console.log(`  #${d.idx}: 脚本=${d.script} 用户=${d.user} 差额=${d.diff} | ${d.text}`);
  });
} else {
  console.log('\n全部匹配!');
}

// 详细展开差异消息的投注项
if (diffs.length > 0) {
  console.log('\n\n差异消息投注项展开:');
  diffs.forEach(d => {
    const bets = result.betSummary.filter(b => b.msgIndex === d.idx);
    console.log(`\n[消息#${d.idx}] 用户=${d.user} 脚本=${d.script}:`);
    bets.forEach(b => {
      console.log(`  ${b.display.padEnd(50)} | ${b.type.padEnd(12)} | HK:${String(b.hk||false).padEnd(5)} | ${b.bet}`);
    });
  });
}
