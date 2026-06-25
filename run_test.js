// Test runner using Windows Script Host (JScript)
var ZODIAC_MAP = {"马":"01,13,25,37,49","蛇":"02,14,26,38","龙":"03,15,27,39","兔":"04,16,28,40","虎":"05,17,29,41","牛":"06,18,30,42","鼠":"07,19,31,43","猪":"08,20,32,44","狗":"09,21,33,45","鸡":"10,22,34,46","猴":"11,23,35,47","羊":"12,24,36,48"};
var ALL_ZODIACS = ["马","蛇","龙","兔","虎","牛","鼠","猪","狗","鸡","猴","羊"];
var ZODIAC_CHARS = ALL_ZODIACS.join('');
var CN = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,"十一":11,"十二":12,"十三":13,"十四":14,"十五":15,"十六":16,"十七":17,"十八":18,"十九":19,"二十":20,"廿":20,"三十":30,"四十":40,"五十":50};
var CNK = [];
for(var k in CN) CNK.push(k);
CNK.sort(function(a,b){return b.length-a.length;});

function cn(s){ for(var i=0;i<CNK.length;i++){ var k=CNK[i]; if(s===k||s.indexOf(k)===0) return CN[k]; } return 0; }

// No parseCNNum needed for JScript - not used in simple tests

function stripSender(s){ return s.replace(/^[A-Za-z一-龥]{1,10}\s*[：:]\s*/,'').trim(); }
function stripMacau(s){ return s.replace(/^(?:新澳门|新奥|新澳|澳门|澳雨|澳特|澳)\s*[：:]?\s*/i,'').replace(/^[：:,,\s]+/,'').trim(); }
function expandDot(s){ return s.replace(/(\d{1,2})\.(?=\d{1,2})/g,'$1 '); }

function norm(s){
  return s.replace(/[+＋]/g,'').replace(/。/g,'')
    .replace(/个数十斤/g,'各数10斤').replace(/个数十米/g,'各数10米')
    .replace(/一个号各/g,'各').replace(/一个号/g,'').replace(/个号/g,'各号').replace(/=个/g,'各')
    .replace(/[：∶]/g,'').replace(/各\//g,'各').replace(/(\d{1,2})各\//g,'$1各')
    .replace(/(?<!各)数十斤/g,'各10斤').replace(/(?<!各)数十米/g,'各10米')
    .replace(/平特\s*一肖/g,'平特')
    .replace(/平特[—\-－—]+/g,'平特')
    .replace(/\s+(各)/g,'$1').replace(/(各)\s+/g,'$1').replace(/\s+/g,' ').trim();
}

function getVal(txt){
  var n = norm(txt);
  var KW = '(?:各数|个数|各号|号|个|各)';
  var m = n.match(new RegExp('\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(m) return parseFloat(m[1]);
  m = n.match(new RegExp('\\s*'+KW+'\\s*([\\u4e00-\\u9fa5]+)\\s*(?:斤|米|块)?\\s*$'));
  if(m){ var v=cn(m[1]); if(v>0) return v; }
  if(!/各/.test(n)){
    m=n.match(/(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
    if(m){ var b=n.slice(0,m.index).trim(); if(b.length>0) return parseFloat(m[1]); }
    m=n.match(/^(.+?)([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ var v=cn(m[2]); if(v>0) return v; }
  }
  return 0;
}

function getList(txt){
  var n = norm(txt);
  var KW = '(?:各数|个数|各号|号|个|各)';
  var stripKw = function(s){ return s.replace(/[\s个各号]+$/g,'').trim(); };
  var m = n.match(new RegExp('\\s*'+KW+'\\s*(?:[\\u4e00-\\u9fa5]+|\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(m) return expandDot(stripKw(n.slice(0,m.index)));
  m = n.match(new RegExp('\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(m) return expandDot(stripKw(n.slice(0,m.index)));
  if(!/各/.test(n)){
    m=n.match(/(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
    if(m){ var b=n.slice(0,m.index).trim(); if(b.length>0) return expandDot(b); }
    m=n.match(/^(.+?)([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m) return expandDot(m[1].trim());
  }
  return expandDot(n.trim());
}

function splitItems(lp){
  var ex = expandDot(lp);
  var items = ex.split(/[.\/、,\s，\-－—]+/).filter(function(i){return i!=='';});
  var fi = [];
  for(var i=0;i<items.length;i++){
    var item = items[i];
    if(new RegExp('^[\\u9a6c\\u86c7\\u9f99\\u5154\\u864e\\u725b\\u9f20\\u732a\\u72d7\\u9e21\\u7334\\u7f8a]+$').test(item)){
      for(var j=0;j<item.length;j++) fi.push(item.charAt(j));
    } else {
      var parts = item.match(new RegExp('[\\u9a6c\\u86c7\\u9f99\\u5154\\u864e\\u725b\\u9f20\\u732a\\u72d7\\u9e21\\u7334\\u7f8a]|\\d{1,2}','g'));
      if(parts) for(var k=0;k<parts.length;k++) fi.push(parts[k]); else fi.push(item);
    }
  }
  return fi;
}

function getTargets(items){
  var t=[];
  for(var i=0;i<items.length;i++){
    var item=items[i];
    if(/^\d{1,2}$/.test(item)){ var n=parseInt(item); if(n>=1&&n<=49) t.push(n<10?'0'+n:''+n); }
    else if(ZODIAC_MAP[item]){ var nums=ZODIAC_MAP[item].split(','); for(var j=0;j<nums.length;j++) t.push(nums[j]); }
  }
  return t;
}

// Run tests
var testCases = [
  "新奥05.17.41各10",
  "新奥29二十块",
  "平虎50斤 二连平虎狗50斤、",
  "06各/10",
  "猴，龙，狗各号5",
  "02号30米",
  "49 十斤。",
  "牛鸡马虎各数十米 09-23各十米",
  "兔猪龙一个号各3，",
  "44=个5",
  "3.4.10.11.12.16.21.22.23.28.30.33.35.40.42.47各：4米"
];

var fso = new ActiveXObject("Scripting.FileSystemObject");
var outFile = fso.CreateTextFile("D:\\686\\test_output.txt", true);

for(var ti=0; ti<testCases.length; ti++){
  var raw = testCases[ti];
  outFile.WriteLine("\n=== TEST " + (ti+1) + ': "' + raw + '" ===');

  var afterStrip = stripMacau(stripSender(raw));
  outFile.WriteLine('  1) After strip: "' + afterStrip + '"');

  var afterNorm = norm(afterStrip);
  outFile.WriteLine('  2) After norm: "' + afterNorm + '"');

  var val = getVal(afterNorm);
  outFile.WriteLine('  3) getVal: ' + (val || '0 (MISSING!)'));

  var list = getList(afterNorm);
  outFile.WriteLine('  4) getList: "' + list + '"');

  if(list){
    var items = splitItems(list);
    outFile.WriteLine('  5) splitItems: [' + items.join(',') + '] (' + items.length + ' items)');
    var targets = getTargets(items);
    outFile.WriteLine('  6) getTargets: ' + targets.length + ' codes [' + targets.join(',') + ']');
  }
}

outFile.Close();
WScript.Echo("Done! Output written to D:\\686\\test_output.txt");
