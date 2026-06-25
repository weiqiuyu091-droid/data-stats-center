const fs = require('fs');
const html = fs.readFileSync('fsaf.html', 'utf8');

// Extract JS from <script> tag
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const fullJS = scriptMatch[1];

// Find where init() starts and cut it off
const initIdx = fullJS.indexOf('// ===== Init =====');
const coreJS = fullJS.substring(0, initIdx);

// Mock globals used by the code
global.document = {
  getElementById: function(id) {
    var el = { textContent: '', style: {}, innerHTML: '', appendChild: function(){ return el; },
      querySelectorAll: function() { return []; }, children: [], classList: { add: function(){}, remove: function(){} },
      addEventListener: function(){}, removeEventListener: function(){}, remove: function(){},
      setAttribute: function(){}, getAttribute: function(){ return null; }, value: '' };
    return el;
  },
  createElement: function(tag) { return global.document.getElementById(''); },
  querySelectorAll: function() { return []; },
  querySelector: function() { return null; }
};
global.window = {};
global.location = { href: 'http://localhost' };
global.setTimeout = function() {};
global.alert = function(msg) { console.log('[ALERT] ' + msg); };
global.toast = function(msg) {};
global.renderAll = function() {};
global.renderMsgSummary = function() {};
global.renderNumGrid = function() {};
global.renderZodiacGrid = function() {};
global.renderComboStats = function() {};
global.renderN3Stats = function() {};
global.renderN2Stats = function() {};
global.wsReportBets = function() {};
global.wsReportSettlement = function() {};
global.wsConnect = function() {};
global.renderLiveBar = function() {};

// Run core JS
try {
  eval(coreJS);
} catch(e) {
  console.log('Error running core JS:', e.message);
}

// Test data
const testData = `友仔: 兔狗各数100     牛各数50
友仔: 07.19.43.09.33.04.28各50斤
友仔: 22.34各50
友仔: 23.42各十元
友仔: 06.12.16.20.21.24.31.36.各五元
友仔: 16.12.24.36.29.06.42.23.35.47.01.49.各三元
友仔: 鼠各数100
友仔: 马兔各数100 鼠鸡各数150
友仔: 01,16,25,49各50 09,11,12,29,42各100
友仔: 02,05,14,18,20,23,27,30 33,36,38,39,41,45,47,48各150
友仔: 猴狗各数20   23。21.33各40  11.8.2.9各数10
友仔: 06.08.10.13.20.22.23各30 11.17各50
友仔: 虎鸡各数二十，
友仔: 猴虎鸡狗各数十
友仔: 狗牛各数20 鼠鸡各数15 21-33-30各30 虎各数10
友仔: 29-43-45各10 05-34-35-43-06-07-29-38-39-46各5
友仔: 21  45  24  各15 12  09  33  14  06  18  17  25各10
友仔: 澳门36-06-11-33各10米，48-17-41-21各5米
友仔: 30.32.25.36.33各数20
友仔: 09.08.10.01.05各数10
友仔: 虎牛鼠猪鸡猴兔羊个数二十斤
友仔: 15.23.31.35.37.39.02.16.18.20.24.30.32.10.03.04.07.08.13.14.21.25.28.29.47.48个数十斤
友仔: 猴鼠狗虎兔鸡牛羊各数十
友仔: 马数各20 兔数各10
友仔: 虎各数二十斤 狗羊牛各数五斤
友仔: 虎鼠各数2O0 兔猴各数30 狗各数20
友仔: 澳门，01，07，11，23，35，47，各10蚊。香港，02，14，26，38，10蚊。
友仔: 06,16,22.28.32.38. 17,27.39,49. 07,08,12,18,19,29,46.各.15
友仔: 牛鸡各10   猴鼠各5
友仔: 18  42  23  47  11  07  19  43各十蚊，18  42  07各二十蚊
友仔: 07.19.43.09.33.04.28 22 34 各10
友仔: 01.03.04.07.08.11.14.16.17.20 26.29.33.35.37.39.43.46.47.48个十米
友仔: 奥 27.29.12.45.各数十
友仔: 18.30.01.49.09.21.33.45.各5，06-各20，42-各60
友仔: 01-06-13-21-30-各5， 33-42各15
友仔: 39.17各五
友仔: 06-各10     30各20
友仔: 虎鼠牛羊，各5斤
友仔: 鼠牛猪狗虎各5斤，
友仔: 19各10
友仔: 香港：03.15.27.39.08.20.32.44.06.18.30.42.47.11.09.21.04.16.28.40各10
友仔: 澳门：01.13.25.37.49.03.15.27.39.10.22.34.46.06.18.30.42各10
友仔: 05....29....11...23....35....47....各5斤，09....45....各10斤，21....33....17...41....各50斤，新门。
友仔: 25.20.16.14.34.各20斤，
友仔: 猴鸡羊蛇虎鼠各数10 羊鸡虎各数50蛇马各数20
友仔: 22 34各5
友仔: 09,10,11,17,20,21,24各数二十斤
友仔: 01,09,13,21各数五十斤
友仔: 34  46  04  28  20  32  22  42  各5
友仔: 07 50斤
友仔: 23.各20斤
友仔: 12.24.36.48.各10米10/22/34/46/29/26/28/30/44/36各20米
友仔: 澳 31-33-21-09-41-43-46-04-40-05-17-29-41个数五
友仔: 虎各数30斤，兔猴各数10斤，马狗鼠各数50斤，牛羊鸡龙各数5斤，31、33数各50斤，01、25、37、49、21、45、43、41数各10斤，05、29数各5斤，
友仔: 蛇马羊各数10
友仔: 虎龙牛马猪兔狗各数20
友仔: 兔龙各数100
友仔: 虎兔鼠猴各数5
友仔: 04/16/40/06/18/42/各30米
友仔: 澳，21.45..各10A，35.46.26..33..08..29.32.48.02..09..05..23.24.10.43..16.44..01.各5A
友仔: 05–15-11-21各10 35-42-30-40-28-48各5
友仔: 07*13*25*06名数5A 马兔鸡各数10A 49*30A
友仔: 牛兔各数50
友仔: 香 猴牛数各10。 01到12数各10。 11.23.06各30。 06=100。11.23.35.47.28.37.18.30.42各5。 澳 鸡猴虎数各5。 10.11.23.22各20。47.35.46.34各15。02.04.05.07.08.09.10.12各5。
友仔: 03.15.27.39.25.13各30
友仔: 17-41各5
友仔: 鼠牛虎兔各数10
友仔: 鸡猴马蛇虎牛特各号50
友仔: 24=50A.46.13.16.46.47各20A.34.27.23.12.08.07.18.42.40各10A.绿双各数20A，绿单各数10A门
友仔: 兔鸡牛  各数5 42——60
友仔: 01，02，14，04，16，18，08，20，12，24，36，07，19，31，37，11，23，09，21，17，32各10
友仔: 01,02,10,11,14,18,22,25,27,29,34,36,38,46,47各30
友仔: 牛鼠猪狗猴各数20
友仔: 36.42各50。  48各20
友仔: 澳特，虎马猴鸡各号5斤澳特29.36.23.05.13.35各5斤
友仔: 05 17 29 21 33 09 18 30 06 04 16 28各20
友仔: 39.11.7.16.19.5.17.49 各 50
友仔: 34.  12.  24各50 羊鸡虎马各30
友仔: 羊鸡虎马各数40， 猴鼠狗32.30.15.27各数10
友仔: 狗牛猴鼠各300
友仔: 虎猴鼠猪数各10鸡狗数各5 05,09,10,11,17,20,21,22,31,32,33,41,43,44,47各10
友仔: 03 04 07 08 09 10 11 12 13 16 19 20 21 22 23 25 26 27 30 31 32 35 37 44 45 46 48 49个数十斤
友仔: 牛马龙各数20
友仔: 06-18-30-42-12-24-36-48-10-22-34-46-08-20-32-44-01-13-25-37-49-07-19-31-43=各5A门 10-22-34-46-08-20-32-44=各10A门 04-16-28-40-03-15-27-39=各5A门
友仔: 虎兔各数15A，龙牛羊各数10A，狗各数5A门
友仔: 28.15.47.36.48.16.17.10.28.20.02.03.06.25.37各5A.17.18.19.15.11.13.28.06.18.30.01.49.43.45.49各3A，门
友仔: 01，12，13，24，29，36，41各2A， 05，17，25，37，48，49各3A。
友仔: 25.20.16.14.34.各10
友仔: 01十斤
友仔: 绿单各数5 05.11.17.21各5 猴肖各数5 单数各数5
友仔: 23，27，07，各30
友仔: 虎鸡各数10
友仔: 鼠猴兔猪马狗羊各5斤
友仔: 31.43.05.17.41.04.16.28.14.26.38.11.47.各10A，蓝双各数5A，虎兔猴鼠各数5A门
友仔: 03,09,17,20,21,40各数十斤 09,10,11,17,20,21,24各数十斤 01,09,13,21各数十斤
友仔: 46，47各六十斤
友仔: 12.24.36.18.30.42.23.35.11.38.22.34.46.13.25各10
友仔: 47.10.22各30
友仔: 19/40
友仔: 鸡各数15A，蓝单各数5A门
友仔: 门特:48.47.13.39.11.8.14.1.18.35.4.6.46.9各号20
友仔: 07.13.06.25.43.30.18.11.21.24.49.27 01.48.39.15.32.16.03.04.20.08.40.28.44各40
友仔: 27＝50
友仔: 01.13.25.37.49.09.21.33.45.05.17.29.41各10斤`;

// Set liveResult and hkResult
const macauNums = ["15","08","34","13","28","21","41"];
const macauTeMa = "41";
const macauFlatZodiacs = ["龙","猪","鸡","马","兔","狗","虎"];
const hkNums = ["39","41","15","34","25","02"];
const hkTeMa = "10";
const hkFlatZodiacs = ["龙","虎","鸡","马","蛇"];

global.liveResult = { numbers: macauNums, teMa: macauTeMa, flatZodiacs: macauFlatZodiacs, validCount: 7 };
global.hkResult = { numbers: hkNums, teMa: hkTeMa, flatZodiacs: hkFlatZodiacs };

// Set input
global.document.getElementById('inputRule').value = testData;

// Run analyze
global.analyze();

// Run calcAll
global.calcAll();

// Print summary
console.log('\n=== Settlement Summary ===');
console.log('Total bet (from summary): ' + global.document.getElementById('sumTotalBet').textContent);
console.log('Total payout: ' + global.document.getElementById('sumTotalPayout').textContent);
console.log('Hit Amount: ' + global.document.getElementById('sumHitCount').textContent);

// Now print per-row details for winning rows
console.log('\n=== Macau Winning Rows ===');
var macTotal = 0;
global.betSummary.forEach(function(r, i) {
  var sr = global.settleRow(r, macauNums, macauTeMa, macauFlatZodiacs);
  if(sr.note) {
    macTotal += sr.hitBet;
    console.log('M[' + i + '] hitBet=' + sr.hitBet + ' bet=' + r.bet + ' type=' + r.type + ' display=' + JSON.stringify(r.display).substring(0,60) + ' note=' + sr.note);
  }
});
console.log('Macau total: ' + Math.round(macTotal * 100) / 100);

console.log('\n=== HK Winning Rows ===');
var hkTotal = 0;
global.hkBetSummary.forEach(function(r, i) {
  var sr = global.settleRow(r, hkNums, hkTeMa, hkFlatZodiacs);
  if(sr.note) {
    hkTotal += sr.hitBet;
    console.log('H[' + i + '] hitBet=' + sr.hitBet + ' bet=' + r.bet + ' type=' + r.type + ' display=' + JSON.stringify(r.display).substring(0,60) + ' note=' + sr.note);
  }
});
console.log('HK total: ' + Math.round(hkTotal * 100) / 100);

console.log('\nCOMBINED: ' + Math.round((macTotal + hkTotal) * 100) / 100);
console.log('Expected: 847');
console.log('Diff: ' + Math.round((macTotal + hkTotal - 847) * 100) / 100);
