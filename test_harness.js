'use strict';

// ===== 生肖数据 =====
var ZODIAC_MAP = {
  马:["01","13","25","37","49"],蛇:["02","14","26","38"],龙:["03","15","27","39"],
  兔:["04","16","28","40"],虎:["05","17","29","41"],牛:["06","18","30","42"],
  鼠:["07","19","31","43"],猪:["08","20","32","44"],狗:["09","21","33","45"],
  鸡:["10","22","34","46"],猴:["11","23","35","47"],羊:["12","24","36","48"]
};
var ALL_ZODIACS = ["马","蛇","龙","兔","虎","牛","鼠","猪","狗","鸡","猴","羊"];
var ZODIAC_CHARS = ALL_ZODIACS.join('');
var NUM_TO_ZODIAC = {};
ALL_ZODIACS.forEach(function(z){ ZODIAC_MAP[z].forEach(function(n){ NUM_TO_ZODIAC[n] = z; }); });
var TAIL_MAP={};for(var d=0;d<=9;d++){var k=d.toString();TAIL_MAP[k]=[];for(var n=1;n<=49;n++)if(n%10===d)TAIL_MAP[k].push(n.toString().padStart(2,'0'));}

var BIG=[],SMALL=[],ODD=[],EVEN=[];
for(var i=1;i<=49;i++){ var n=i.toString().padStart(2,'0'); (i>=25?BIG:SMALL).push(n); (i%2?ODD:EVEN).push(n); }

// ===== 波色映射 =====
var WAVE_COLOR_MAP = {
  红波: ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"],
  绿波: ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"],
  蓝波: ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"]
};
var WAVE_COLORS = {"红":"红波","绿":"绿波","蓝":"蓝波"};
var WAVE_COLOR_SETS = {};
Object.keys(WAVE_COLOR_MAP).forEach(function(k){ WAVE_COLOR_SETS[k] = new Set(WAVE_COLOR_MAP[k]); });
var NUM_TO_WAVE = {};
Object.keys(WAVE_COLOR_MAP).forEach(function(k){ WAVE_COLOR_MAP[k].forEach(function(n){ NUM_TO_WAVE[n] = k; }); });
var SIZE_PARITY_MAP = {单:ODD,双:EVEN,大:BIG,小:SMALL};

// ===== 庄家固定赔率 =====
var ODDS_TM = 47;
var ODDS_PT_MA = 1.8;
var ODDS_PT_OTHER = 2;
var ODDS_TX_MA = 10;
var ODDS_TX_OTHER = 11;
var ODDS_2 = 5.5;
var ODDS_3 = 28;
var ODDS_N3 = 600;
var ODDS_N2 = 60;

// ===== 组合数学 =====
function C(n,k){ if(k>n||k<0)return 0; if(k===0||k===n)return 1; var r=1; for(var i=1;i<=k;i++) r=r*(n-i+1)/i; return r; }
function combinations(arr,k){
  if(k===0)return [[]]; if(arr.length<k)return[];
  var r=[]; for(var i=0;i<=arr.length-k;i++){ var f=arr[i]; combinations(arr.slice(i+1),k-1).forEach(function(c){ r.push([f].concat(c)); }); }
  return r;
}

// ===== 中文数字 =====
var CN = {
  一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,
  十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,
  二十:20,廿:20,廿一:21,廿二:22,廿三:23,廿四:24,廿五:25,廿六:26,廿七:27,廿八:28,廿九:29,
  三十:30,卅:30,卅一:31,卅二:32,卅三:33,卅四:34,卅五:35,卅六:36,卅七:37,卅八:38,卅九:39,
  四十:40,四十一:41,四十二:42,四十三:43,四十四:44,四十五:45,四十六:46,四十七:47,四十八:48,四十九:49,
  五十:50,五十一:51,五十二:52,五十三:53,五十四:54,五十五:55,五十六:56,五十七:57,五十八:58,五十九:59,
  六十:60,六十一:61,六十二:62,六十三:63,六十四:64,六十五:65,六十六:66,六十七:67,六十八:68,六十九:69,
  七十:70,七十一:71,七十二:72,七十三:73,七十四:74,七十五:75,八十:80,九十:90,一百:100,一百五:150,一百五十:150,一百五十五:155,两百:200
};
var CNK = Object.keys(CN).sort(function(a,b){ return b.length-a.length; });

// ===== Parsing helpers =====
function cn(s){ for(var ki=0;ki<CNK.length;ki++){ var k=CNK[ki]; if(s===k) return CN[k]; } for(var ki=0;ki<CNK.length;ki++){ var k=CNK[ki]; if(s.startsWith(k)){ var rest=s.slice(k.length); if(!/^[一二三四五六七八九十百千万廿卅两百]$/.test(rest[0]||'')) return CN[k]; } } return 0; }
function parseCNNum(s){
  if(CN[s]) return CN[s];
  var total=0, tmp=0;
  var units={千:1000,百:100,十:10};
  for(var ci=0;ci<s.length;ci++){ var c=s[ci];
    if(c in units){ tmp=(tmp||1)*units[c]; total+=tmp; tmp=0; }
    else if(c==='零') continue;
    else { var v=CN[c]; if(v) tmp=v; else return 0; }
  }
  return total+tmp;
}
function isHK(r){ return /香港|香|港/.test(r); }
function stripSender(s){ return s.replace(/^[^\d]{1,15}?[：:]\s*/,'').trim(); }
function stripMacau(s){ return s.replace(/^(?:新澳门|新奥|新澳|澳门|澳門|澳特|澳|利来|门特|门|新)\s*[:：]?\s*/i,'').replace(/^[：:,，\s]+/,'').trim(); }
function stripHK(s){ return s.replace(/^(?:香港|港|香)\s*[:：]?\s*/i,'').replace(/^[：:,，\s]+/,'').trim(); }
function expandDot(s){ return s.replace(/(\d{1,2})\.(?=\d{1,2})/g,'$1 '); }
function norm(s){
  var t = s.replace(/[+＋]/g,'').replace(/。/g,'')
    .replace(/免/g,'兔').replace(/于一肖/g,'一肖')
    .replace(/候/g,'猴')
    .replace(/元/g,'块')
    .replace(/复试/g,'复式')
    .replace(/\d+期\s*/g,'')
    .replace(/号各/g,'各数').replace(/名数/g,'各数')
    .replace(/蚊/g,'')
    .replace(/(\d{1,2})到(\d{1,2})/g, function(m, a, b){ var r=[]; for(var i=parseInt(a);i<=parseInt(b);i++) r.push(i.toString().padStart(2,'0')); return r.join(' '); })
    .replace(/个数十斤/g,'各数10斤').replace(/个数十米/g,'各数10米').replace(/个数十块/g,'各数10块')
    .replace(/个数([一二三四五六七八九十百千万廿卅两百]+)(斤|米|块)/g, function(m, n1, n2){ var v=cn(n1)||parseCNNum(n1); return '各数'+(v||'')+n2; })
    .replace(/一个号各/g,'各').replace(/一个号/g,'').replace(/个号/g,'各号').replace(/=个/g,'各').replace(/=各/g,'各').replace(/=/g,'各')
    .replace(/单数/g,'单').replace(/双数/g,'双')
    .replace(/各\.(\d)/g,'各$1')
    .replace(/[：∶:]/g,'').replace(/\s*各\s*\/\s*/g,'各').replace(/(\d{1,2})\s*各\s*\/\s*/g,'$1各')
    .replace(/(?<!各)数十斤/g,'各10斤').replace(/(?<!各)数十米/g,'各10米').replace(/(?<!各)数十块/g,'各10块')
    .replace(/平特\s*一肖/g,'平特')
    .replace(/(\d)[Oo](\d)/g,'$10$2').replace(/(\d+)[A-Za-z]+/g,'$1')
    .replace(/门\s*$/g,'')
    .replace(/(\d{1,2})\.(?=\d{1,2})/g,'$1 ').replace(/(\d{1,2})\.(?![\d]{1,2})/g,'$1 ')
    .replace(new RegExp('(['+ZODIAC_CHARS+']+)各肖\\s*(\\d+(?:\\.\\d+)?)','g'), function(m, zs, v){
      return zs.split('').map(function(z){ return '特肖'+z+' '+v; }).join(' ');
    })
    .replace(new RegExp('(['+ZODIAC_CHARS+'])肖','g'), '$1')
    .replace(/(\d{1,2})\s*([一二三四五六七八九十百千万廿卅两百]+)\s*(斤|米|块)/g, function(m,n1,n2,n3){ return n1+'各'+cn(n2)+n3; })
    .replace(/(\d{1,2})\s*[-—－]+\s*(\d+(?:\.\d+)?)\s*(斤|米|块)/g,'$1各$2$3')
    .replace(/(\d{1,2})\s*[-—－]{2,}\s*(\d+(?:\.\d+)?)/g,'$1各$2').replace(/[*、]+/g,' ').replace(/[-—－]+/g,' ')
    .replace(/(\d)([A-Za-z])?[，、](?=[红绿蓝单双大小平特特肖])/g,'$1$2 ').replace(/\s+(各)/g,'$1').replace(/(各)\s+/g,'$1').replace(/\s+/g,' ').trim();
  t = t.replace(/(\d{1,2})\s*下\s*(\d+(?:\.\d+)?)/g,'$1各$2');
  t = t.replace(/下(\d+(?:\.\d+)?)/g,'$1');
  t = t.replace(/([一二三四五六七八九十百千万廿卅两百]+)\s*(斤|米|块)/g, function(m, n1, n2){ var v=cn(n1)||parseCNNum(n1); return (v||'')+n2; });
  t = t.replace(/各组([一二三四五六七八九十百千万廿卅两百]+)/g, function(m, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return '各组' + (v || '');
  });
  t = t.replace(/^(?!.*(?:三中三|二中二))(.+)\s*各组(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/g, function(m, prefix, val){
    return prefix.split(/\s+/).map(function(seg){ return seg + val; }).join(' ');
  });
  t = t.replace(/^连肖\s*/g, '');
  t = t.replace(/复式(二连|三连|四连|五连)肖\s*(\d+(?:\.\d+)?)\s*一组(?:共(\d+)组)?/g, function(m, lx, v, cnt){
    return '复式' + lx + ' ' + v + '各' + (cnt || '?') + '组';
  });
  t = t.replace(/(\d+(?:\.\d+)?)\s*一组共(\d+)组/g, '$1各$2组');
  return t;
}
function clean(s){ return s.replace(/^[、，,\s\-－—ㅤ]+/,'').replace(/[、，,。.\s\-－—ㅤ]+$/,'').replace(/[。]/g,'').trim(); }

var KW = '(?:各数|个数|各号|号|个(?!组)|各(?!组))';

function splitBets(seg){
  var ends = new Set();
  var ps = [
    new RegExp('\\s*'+KW+'\\s*(?:[\\u4e00-\\u9fa5]+|\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?','gi'),
    new RegExp('(?:二连|三连|四连|五连)\\s*平?\\s*['+ZODIAC_CHARS+']+\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?','gi'),
    new RegExp('['+ZODIAC_CHARS+']+(?:二连|三连|四连|五连)\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?','g'),
    new RegExp('(?:平特[，,\\s]*['+ZODIAC_CHARS+']+|平['+ZODIAC_CHARS+'])\\s*[，,]?\\s*\\d+\\s*(?:斤|米|块)?','g'),
    new RegExp('(?:特肖[，,\\s]*['+ZODIAC_CHARS+']+|特肖['+ZODIAC_CHARS+'])\\s*[，,]?\\s*\\d+\\s*(?:斤|米|块)?','g'),
    new RegExp('[\\d]{1,2}(?:\\.[\\d]{1,2})+[\\s\\S]*?(?:斤|米|块|\\d)(?=\\s|$)','gi'),
    new RegExp('\\d{1,2}\\s+[一二三四五六七八九十百千万廿卅两百]+\\s*(?:斤|米|块)','gi')
  ];
  ps.forEach(function(re){ var m; var r=new RegExp(re.source,re.flags); while((m=r.exec(seg))!==null) ends.add(m.index+m[0].length); });
  var sorted=Array.from(ends).sort(function(a,b){ return a-b; });
  if(!sorted.length) return [seg.trim()].filter(Boolean);
  var parts=[]; var start=0;
  sorted.forEach(function(end){ var p=seg.slice(start,end).trim(); if(p) parts.push(p); start=end; });
  var tail=seg.slice(start).trim(); if(tail) parts.push(tail);
  return parts.length?parts:[seg.trim()];
}

function expandDashGe(l){
  var re=/(\d{1,2})\s*[—\-－~～]+\s*各\s*[—\-－~～]+\s*(\d+(?:\.\d+)?)\s*(?:斤|米|块)?/gi;
  var parts=[]; var m;
  while((m=re.exec(l))!==null){ var n=parseInt(m[1]); if(n>=1&&n<=49) parts.push(n+'各'+m[2]); }
  if(!parts.length) return null;
  var rest=l.replace(re,'').replace(/[梧影\s：:，,、]+/g,'').trim();
  return rest.length<3?parts:null;
}

function expandLine(l){
  var s=norm(stripHK(stripMacau(stripSender(l))));
  var dr=expandDashGe(s);
  if(dr){ return dr.map(function(d){ var c=clean(d); return c||null; }).filter(Boolean); }
  var fuRe = new RegExp('^(['+ZODIAC_CHARS+']+)复式(二连|三连|四连|五连)\\s+(\\d+(?:\\.\\d+)?)\\s*各(\\d+)组');
  var fuM = s.match(fuRe);
  if(fuM){
    var zs = fuM[1].split('');
    var lxType = fuM[2];
    var perVal = parseFloat(fuM[3]);
    var k = lxType==='二连'?2:lxType==='三连'?3:lxType==='四连'?4:5;
    var cb = combinations(zs, k);
    return cb.map(function(c){ return c.join('') + lxType + perVal; });
  }
  var fuShortRe = new RegExp('^(['+ZODIAC_CHARS+']+)\\s*复式(二连|三连|四连|五连)肖?\\s*(\\d+(?:\\.\\d+)?)\\s*$');
  var fuShortM = s.match(fuShortRe);
  if(fuShortM){
    var zs2 = fuShortM[1].split('');
    var lxType2 = fuShortM[2];
    var perVal2 = parseFloat(fuShortM[3]);
    var k2 = lxType2==='二连'?2:lxType2==='三连'?3:lxType2==='四连'?4:5;
    if(zs2.length >= k2){
      var cb2 = combinations(zs2, k2);
      return cb2.map(function(c){ return c.join('') + lxType2 + perVal2; });
    }
  }
  var flatMarker = s.includes('平特') ? '平特' : (s.includes('特肖') ? '特肖' : null);
  if(flatMarker){
    var parts=[]; var idx=s.indexOf(flatMarker), prev=0;
    while((idx=s.indexOf(flatMarker,prev+2))!==-1){ parts.push(s.slice(prev,idx).trim()); prev=idx; }
    parts.push(s.slice(prev).trim());
    var merged=[]; for(var pi=0;pi<parts.length;pi++){
      if(/^(?:香港|港|香)$/.test(parts[pi])&&pi+1<parts.length){ parts[pi+1]=parts[pi]+parts[pi+1]; }
      else{ merged.push(parts[pi]); }
    }
    if(merged.length>1){
      var all=[]; merged.forEach(function(p){ splitBets(p).forEach(function(sp){ var c=clean(sp); if(c) all.push(c); }); });
      return all;
    }
  }
  return splitBets(s).map(function(p){ var c=clean(p); return c||null; }).filter(Boolean);
}

function getVal(txt){
  var n=norm(txt);
  var m=n.match(new RegExp('\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(m) return parseFloat(m[1]);
  m=n.match(new RegExp('\\s*'+KW+'\\s*([\\u4e00-\\u9fa5]+)\\s*(?:斤|米|块)?\\s*$'));
  if(m){ var v=cn(m[1])||parseCNNum(m[1]); if(v>0) return v; }
  if(!/各/.test(n)){
    m=n.match(/(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
    if(m){ var b=n.slice(0,m.index).trim(); if(b.length>0) return parseFloat(m[1]); }
    m=n.match(/^(.+?)([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ var v2=cn(m[2])||parseCNNum(m[2]); if(v2>0) return v2; }
    m=n.match(/^(.+?)\s+([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ var v3=cn(m[2])||parseCNNum(m[2]); if(v3>0) return v3; }
    m=n.match(/^(\d{1,2})\s+([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ var v4=cn(m[2])||parseCNNum(m[2]); if(v4>0) return v4; }
  }
  return 0;
}

function getList(txt){
  var n=norm(txt);
  var stripKw=function(s){ return s.replace(/[\s个各号]+$/g,'').trim(); };
  var m=n.match(new RegExp('\\s*'+KW+'\\s*(?:[\\u4e00-\\u9fa5]+|\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(m) return expandDot(stripKw(n.slice(0,m.index)));
  m=n.match(new RegExp('\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(m) return expandDot(stripKw(n.slice(0,m.index)));
  if(!/各/.test(n)){
    m=n.match(/(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
    if(m){ var b=n.slice(0,m.index).trim(); if(b.length>0) return expandDot(b); }
    m=n.match(/^(.+?)([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m) return expandDot(m[1].trim());
    m=n.match(/^(.+?)\s+([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m) return expandDot(m[1].trim());
    m=n.match(/^(\d{1,2})\s+([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m) return expandDot(m[1].trim());
  }
  return expandDot(n.trim());
}

function splitItems(lp){
  var ex=expandDot(lp);
  var items=ex.split(/[.\/、,\s，\-－—]+/).filter(function(i){ return i!==''; });
  var fi=[];
  items.forEach(function(item){
    if(new RegExp('^['+ZODIAC_CHARS+']+$').test(item)){ for(var ci2=0;ci2<item.length;ci2++) fi.push(item[ci2]); }
    else { var parts=item.match(new RegExp('['+ZODIAC_CHARS+']|\\d{1,2}','g')); if(parts) parts.forEach(function(p){ fi.push(p); }); else fi.push(item); }
  });
  return fi;
}

function getTargets(items){
  var t=[];
  items.forEach(function(item){
    if(/^\d{1,2}$/.test(item)){ var n=parseInt(item); if(n>=1&&n<=49) t.push(n.toString().padStart(2,'0')); }
    else if(ZODIAC_MAP[item]) ZODIAC_MAP[item].forEach(function(n){ t.push(n); });
  });
  return t;
}

// ===== Module-level tracking state =====
var numberBets = {};
var flatBets = {};
var specialZodiacBets = {};
var comboBets = [];
var numComboBets = [];
var hkNumberBets = {};
var hkFlatBets = {};
var hkSpecialZodiacBets = {};
var hkComboBets = [];
var hkNumComboBets = [];
var betSummary = [];
var hkBetSummary = [];
var messageSummary = [];

function resetState(){
  betSummary = []; hkBetSummary = [];
  messageSummary = [];
  numberBets = {}; flatBets = {}; specialZodiacBets = {}; comboBets = []; numComboBets = [];
  hkNumberBets = {}; hkFlatBets = {}; hkSpecialZodiacBets = {}; hkComboBets = []; hkNumComboBets = [];
  for(var i=1;i<=49;i++){ numberBets[i.toString().padStart(2,'0')]=0; hkNumberBets[i.toString().padStart(2,'0')]=0; }
  ALL_ZODIACS.forEach(function(z){ flatBets[z]=0; hkFlatBets[z]=0; });
}

// ===== Core: process one rule =====
function processRule(rawRule){
  var rule=clean(rawRule); if(!rule) return null;
  var hk=isHK(rule);
  var txt=norm(stripHK(stripMacau(stripSender(rule))));
  var txtNoHK=txt.replace(/香港|香|港/g,'').trim();

  // Size/Parity
  var spm=txtNoHK.match(new RegExp('^(大|小|单|双)\\s*'+KW+'\\s*([\\d\\u4e00-\\u9fa5]+)\\s*(?:斤|米|块)?\\s*$'));
  if(spm){
    var v=/^\d/.test(spm[2])?parseFloat(spm[2]):cn(spm[2])||parseCNNum(spm[2]);
    if(v){ var pool={大:BIG,小:SMALL,单:ODD,双:EVEN}; var nums=pool[spm[1]]||[];
      nums.forEach(function(n){ numberBets[n]=(numberBets[n]||0)+v; });
      return {display:(hk?'香港':'')+spm[1]+'各数'+v+'('+nums.length+'码)', bet:v*nums.length, type:'nums', targets:nums};
    }
  }

  // Wave color + size/parity - 双组
  var wc2Re = new RegExp('^([红绿蓝]{1,3})([单双大小]+)([红绿蓝]{1,3})([单双大小]+)\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)([A-Za-z])?\\s*(?:斤|米|块)?\\s*$');
  var wc2m = txtNoHK.match(wc2Re);
  if(wc2m){
    var val2 = parseFloat(wc2m[5]);
    if(val2){
      var waveSet = new Set();
      var ck1 = WAVE_COLORS[wc2m[1]];
      if(ck1 && WAVE_COLOR_MAP[ck1]){
        var attrNums1 = SIZE_PARITY_MAP[wc2m[2]];
        if(attrNums1){
          var attrSet1 = new Set(attrNums1);
          WAVE_COLOR_MAP[ck1].forEach(function(n){ if(attrSet1.has(n)) waveSet.add(n); });
        }
      }
      var ck2 = WAVE_COLORS[wc2m[3]];
      if(ck2 && WAVE_COLOR_MAP[ck2]){
        var attrNums2 = SIZE_PARITY_MAP[wc2m[4]];
        if(attrNums2){
          var attrSet2 = new Set(attrNums2);
          WAVE_COLOR_MAP[ck2].forEach(function(n){ if(attrSet2.has(n)) waveSet.add(n); });
        }
      }
      var targets = Array.from(waveSet).sort(function(a,b){ return parseInt(a)-parseInt(b); });
      if(targets.length){
        targets.forEach(function(n){ numberBets[n] = (numberBets[n] || 0) + val2; });
        var hkPrefix = hk ? '香港' : '';
        return {display: hkPrefix + wc2m[1]+wc2m[2]+wc2m[3]+wc2m[4]+'各数'+val2+'('+targets.length+'码)', bet: val2 * targets.length, type: 'nums', targets: targets};
      }
    }
  }

  // Wave color + size/parity combined
  var wcRe = new RegExp('^([红绿蓝]{1,3})\\s*波?\\s*([单双大小]+)\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)([A-Za-z])?\\s*(?:斤|米|块)?\\s*$');
  var wcm = txtNoHK.match(wcRe);
  if(wcm){
    var colors = wcm[1];
    var attrs = wcm[2];
    var val3 = parseFloat(wcm[3]);
    if(val3){
      var waveSet2 = new Set();
      for(var ci3=0;ci3<colors.length;ci3++){
        var c=colors[ci3];
        var ck3 = WAVE_COLORS[c];
        if(ck3 && WAVE_COLOR_MAP[ck3]) WAVE_COLOR_MAP[ck3].forEach(function(n){ waveSet2.add(n); });
      }
      for(var ai=0;ai<attrs.length;ai++){
        var a=attrs[ai];
        var attrNums3 = SIZE_PARITY_MAP[a];
        if(!attrNums3) continue;
        var attrSet3 = new Set(attrNums3);
        waveSet2 = new Set(Array.from(waveSet2).filter(function(n){ return attrSet3.has(n); }));
      }
      var targets2 = Array.from(waveSet2).sort(function(a,b){ return parseInt(a)-parseInt(b); });
      if(targets2.length){
        targets2.forEach(function(n){ numberBets[n] = (numberBets[n] || 0) + val3; });
        var hkPrefix2 = hk ? '香港' : '';
        return {display: hkPrefix2 + colors + attrs + '各数' + val3 + '(' + targets2.length + '码)', bet: val3 * targets2.length, type: 'nums', targets: targets2};
      }
    }
  }

  // 平特X尾
  var ptTailM = txtNoHK.match(new RegExp('^平特\\s*(\\d)尾\\s*下?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(ptTailM){
    var tailDigit = ptTailM[1];
    var flatTotal = parseFloat(ptTailM[2]);
    var tailNums = TAIL_MAP[tailDigit] || [];
    if(tailNums.length){
      tailNums.forEach(function(n){ numberBets[n] = (numberBets[n]||0) + flatTotal; });
      return {display: '平特'+tailDigit+'尾 '+flatTotal+'('+tailNums.length+'码)', bet:flatTotal, type:'nums', targets:tailNums};
    }
  }

  // Tail bet (尾)
  if(txtNoHK.includes('尾')){
    var tailList = getList(txtNoHK);
    var tailVal = getVal(txtNoHK);
    if(tailList && tailVal){
      var tailDigitMatches = tailList.match(/(\d)尾/g);
      var tailDigits = tailDigitMatches ? tailDigitMatches.map(function(m){ return m.replace('尾',''); }) : [];
      if(!tailDigits.length){
        tailDigits = tailList.replace(/尾/g,'').split(/[.\/、,\s，\-－—]+/).filter(function(i){ return i!==''; }).map(function(i){ return i.trim(); });
      }
      var tailTargets = [];
      tailDigits.forEach(function(d){ if(TAIL_MAP[d]){ for(var ti=0;ti<TAIL_MAP[d].length;ti++) tailTargets.push(TAIL_MAP[d][ti]); } });
      if(tailTargets.length){
        tailTargets.forEach(function(n){ numberBets[n] = (numberBets[n]||0) + tailVal; });
        return {display: tailDigits.join('-')+'尾各'+tailVal+'('+tailTargets.length+'码)', bet:tailVal*tailTargets.length, type:'nums', targets:tailTargets};
      }
    }
  }

  // Number combo (三中三/二中二)
  if(txtNoHK.includes('三中三') || txtNoHK.includes('二中二')){
    var ncm=txtNoHK.match(/([\d]{1,2}(?:[.\s,]+[\d]{1,2})*)\s*(?:[复復]试|[复復]式)?\s*(三中三|二中二)\s*(?:各组?\s*)?(.+)$/);
    if(ncm){
      var numSet = {};
      var numParts = ncm[1].split(/[.\s,]+/).filter(function(n){ return /^\d{1,2}$/.test(n); }).map(function(n){ return n.padStart(2,'0'); });
      numParts.forEach(function(n){ numSet[n]=true; });
      var nums2=Object.keys(numSet);
      var k=ncm[2]==='三中三'?3:2;
      if(nums2.length>=k){
        var vs=ncm[3].replace(/^[个各]组?\s*/,'').replace(/\s*(?:斤|米|块)\s*$/,'').trim();
        var val4=/^\d+(?:\.\d+)?$/.test(vs)?parseFloat(vs):(cn(vs)||parseCNNum(vs)||0);
        if(val4>0){
          var cc=C(nums2.length,k);
          var tb=cc*val4;
          var odds=k===3?ODDS_N3:ODDS_N2;
          numComboBets.push({numbers:nums2,perUnit:val4,count:cc,k:k,type:k===3?'n3':'n2'});
          nums2.forEach(function(n){ numberBets[n]=(numberBets[n]||0)+val4; });
          return {display:(hk?'香港':'')+ncm[1]+(k===3?'三中三':'二中二')+' '+val4+'('+cc+'组)', bet:tb, type:k===3?'n3':'n2', numbers:nums2, comboCount:cc, perUnit:val4, k:k, odds:odds};
        }
      }
    }
  }

  // Combo
  var cm=txtNoHK.match(new RegExp('(?:二连|三连|四连|五连)\\s*平?\\s*(['+ZODIAC_CHARS+']+)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?'));
  if(!cm) cm=txtNoHK.match(new RegExp('(['+ZODIAC_CHARS+']+)(?:五连|四连|三连|二连)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?'));
  if(cm){
    var zStr=cm[1], cv=parseFloat(cm[2]);
    var ct='double';
    if(txtNoHK.includes('五连')||(zStr.length===5&&!txtNoHK.includes('三连')&&!txtNoHK.includes('四连'))) ct='quintuple';
    else if(txtNoHK.includes('四连')||(zStr.length===4&&!txtNoHK.includes('三连')&&!txtNoHK.includes('五连'))) ct='quadruple';
    else if(txtNoHK.includes('三连')) ct='triple';
    var zs=zStr.split('');
    comboBets.push({zodiacs:zs,value:cv,type:ct,isHK:hk});
    var typeName=ct==='quintuple'?'五连':ct==='quadruple'?'四连':ct==='triple'?'三连':'二连';
    return {display:(hk?'香港':'')+zStr+typeName+' '+cv, bet:cv, type:'combo', comboZodiacs:zStr, comboType:ct};
  }

  // Flat zodiac reverse: 虎平200
  var frm = txtNoHK.match(new RegExp('^(['+ZODIAC_CHARS+'])\\s*平\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(frm){
    var zs3=[frm[1]], v5=parseFloat(frm[2]);
    zs3.forEach(function(z){ flatBets[z]=(flatBets[z]||0)+v5; });
    return {display:(hk?'香港':'')+'平特'+frm[1]+' '+v5, bet:v5, type:'flat', targets:zs3};
  }

  // Flat zodiac (平特)
  var fm=txtNoHK.match(new RegExp('^平特[，,\\s]*(['+ZODIAC_CHARS+']+)\\s*[，,、]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(!fm) fm=txtNoHK.match(new RegExp('^平特[，,\\s]*(['+ZODIAC_CHARS+']+)\\s*'+KW+'\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(!fm) fm=txtNoHK.match(new RegExp('^平特[，,\\s]*(['+ZODIAC_CHARS+']+)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(fm){
    var zs4=fm[1].split(''), v6=parseFloat(fm[2]);
    zs4.forEach(function(z){ flatBets[z]=(flatBets[z]||0)+v6; });
    return {display:(hk?'香港':'')+'平特'+fm[1]+' '+v6, bet:v6*zs4.length, type:'flat', targets:zs4};
  }

  // 特肖
  var txm = txtNoHK.match(new RegExp('^特肖(['+ZODIAC_CHARS+'])\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$'));
  if(!txm) txm = txtNoHK.match(new RegExp('^特肖\\s*(['+ZODIAC_CHARS+'](?:\\s*['+ZODIAC_CHARS+'])*)\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$'));
  if(txm){
    var zs5 = txm[1].replace(/\s+/g,'').split(''), v7 = txm[2] ? parseFloat(txm[2]) : getVal(txtNoHK);
    if(!v7) return null;
    zs5.forEach(function(z){ specialZodiacBets[z] = (specialZodiacBets[z] || 0) + v7; });
    var odds2 = zs5.map(function(z){ return z === '马' ? ODDS_TX_MA : ODDS_TX_OTHER; }).join(',');
    return {display: '特肖'+zs5.join('')+'各'+v7+'(赔率'+odds2+')', bet: v7 * zs5.length, type: 'special_zodiac', targets: zs5};
  }

  // Flat shorthand with 各: 平蛇虎各500
  var fgm=txtNoHK.match(new RegExp('^平\\s*(['+ZODIAC_CHARS+']+)\\s*[各/]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(fgm){
    var fgzs=fgm[1].split(''), fgv=parseFloat(fgm[2]);
    fgzs.forEach(function(z){ flatBets[z]=(flatBets[z]||0)+fgv; });
    return {display:(hk?'香港':'')+'平特'+fgm[1]+' '+fgv, bet:fgv*fgzs.length, type:'flat', targets:fgzs};
  }

  // Flat shorthand (平X and 平X Y)
  var fms=txtNoHK.match(new RegExp('^平(['+ZODIAC_CHARS+'])\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$'));
  if(!fms) fms=txtNoHK.match(new RegExp('^平\\s*(['+ZODIAC_CHARS+'](?:\\s*['+ZODIAC_CHARS+'])*)\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$'));
  if(fms){
    var zs6=fms[1].replace(/\s+/g,'').split(''), v8=fms[2]?parseFloat(fms[2]):getVal(txtNoHK);
    if(!v8) return null;
    zs6.forEach(function(z){ flatBets[z]=(flatBets[z]||0)+v8; });
    return {display:(hk?'香港':'')+'平'+fms[1]+'各'+v8, bet:v8*zs6.length, type:'flat', targets:zs6};
  }

  // Implicit combo (2-5 zodiacs + number)
  var icm=txtNoHK.match(new RegExp('^(['+ZODIAC_CHARS+']{2,5})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$'));
  if(icm){
    var zStr2=icm[1], zv=parseFloat(icm[2]);
    var ct2='double';
    if(zStr2.length===5) ct2='quintuple'; else if(zStr2.length===4) ct2='quadruple'; else if(zStr2.length===3) ct2='triple';
    var zs7=zStr2.split('');
    comboBets.push({zodiacs:zs7,value:zv,type:ct2,isHK:hk});
    var typeName2=ct2==='quintuple'?'五连':ct2==='quadruple'?'四连':ct2==='triple'?'三连':'二连';
    return {display:(hk?'香港':'')+zStr2+typeName2+' '+zv, bet:zv, type:'combo', comboZodiacs:zStr2, comboType:ct2};
  }

  var value=getVal(txtNoHK); if(!value) return null;

  if(txtNoHK.includes('平特')){
    var matchedZs=ALL_ZODIACS.filter(function(z){ return txtNoHK.includes(z); });
    if(matchedZs.length>0){ matchedZs.forEach(function(z){ flatBets[z]=(flatBets[z]||0)+value; });
    return {display:(hk?'香港':'')+'平特'+matchedZs.join('')+' '+value, bet:value*matchedZs.length, type:'flat', targets:matchedZs}; }
    return null;
  }

  var lp=getList(txtNoHK), items=splitItems(lp), targets=getTargets(items);
  if(!targets.length) return null;
  targets.forEach(function(n){ numberBets[n]=(numberBets[n]||0)+value; });
  return {display:(hk?'香港':'')+targets.join('.')+' 各'+value+'('+targets.length+'码)', bet:value*targets.length, type:'nums', targets:targets};
}

// ===== parseAll =====
function parseAll(rawLines) {
  resetState();

  rawLines.forEach(function(rawLine, lineIdx){
    var msgBet = 0;
    var subLines = rawLine
      .replace(/(\d)。(\d)/g, '$1.$2')
      .replace(/([^斤米块\d])。(\d)/g, '$1$2')
      .split(/[；;·。]/)
      .map(function(l){ return l.trim(); })
      .filter(Boolean);
    var curHKMode = false;
    subLines.forEach(function(sl){
      var slNoSender = sl.replace(/^[^\d]{1,15}?[：:]\s*/, '').trim();
      if(/^(?:香港|港|香)[\s，：:。、]/.test(slNoSender)) curHKMode = true;
      else if(/^(?:澳门|澳門|澳特|澳|利来|门特|门|新澳|新奥|新)[\s，：:。、]/.test(slNoSender)) curHKMode = false;
      expandLine(sl).forEach(function(sr){
        var r = processRule(sr);
        if(r){
          r.msgIndex = lineIdx;
          r.hk = curHKMode;
          msgBet += r.bet;
          if(curHKMode){ hkBetSummary.push(r); }
          else { betSummary.push(r); }
          if(curHKMode){
            if(r.type==='nums'&&r.targets) r.targets.forEach(function(t){ hkNumberBets[t]=(hkNumberBets[t]||0)+parseFloat((r.bet/r.targets.length).toFixed(2)); });
            else if(r.type==='flat'&&r.targets) r.targets.forEach(function(z){ hkFlatBets[z]=(hkFlatBets[z]||0)+parseFloat((r.bet/r.targets.length).toFixed(2)); });
            else if(r.type==='special_zodiac'&&r.targets) r.targets.forEach(function(z){ hkSpecialZodiacBets[z]=(hkSpecialZodiacBets[z]||0)+parseFloat((r.bet/r.targets.length).toFixed(2)); });
            else if(r.type==='combo') hkComboBets.push(r);
            else if(r.type==='n3'||r.type==='n2') hkNumComboBets.push(r);
          }
        }
      });
    });
    messageSummary.push({
      index: lineIdx + 1,
      text: rawLine.length > 80 ? rawLine.substring(0, 80) + '...' : rawLine,
      fullText: rawLine,
      totalBet: Math.round(msgBet * 100) / 100
    });
  });

  var allSummary = betSummary.concat(hkBetSummary);
  var totalBet = Math.round(allSummary.reduce(function(s, r){ return s + r.bet; }, 0) * 100) / 100;

  return {
    summary: allSummary,
    numberBets: numberBets,
    flatBets: flatBets,
    specialZodiacBets: specialZodiacBets,
    comboBets: comboBets,
    numComboBets: numComboBets,
    totalBet: totalBet,
    messageSummary: messageSummary
  };
}

// ===== DATASETS =====
var dataset1 = [
  "利来: 07.02.11.08.06各数20",
  "利来: 平虎1000",
  "利来: 平蛇虎各500",
  "利来: 03 15 27 21 33 09 18 30 06 04 16 28各二十",
  "利来: 03.04.07.08.13.14.21.25.28.29.47.48.11.23.31.37.39.24.26.30.36.38.40.46.06 09 10 19 20 44 49个数十斤",
  "利来: 01.08.09.10.11.13.14.16.19.35.38.44.45.04.05.06.12.17.20.21.22.25.26.28.29.31.32.33.37.41.46.48.49各十米",
  "利来: 虎兔羊龙鸡狗猪各数十斤",
  "利来: 狗鼠猴各数10，龙牛各数5",
  "利来: 马个数十米鼠个数二十米",
  "利来: 鸡个数五米",
  "利来: 07,12,22,26,36,37,45各数二十斤",
  "利来: 09,10,22,25,37,45,46,49各数二十斤",
  "利来: 45  一百斤",
  "利来: 07,12,,26,36,45.09,10,22,25,37,46,49个数十斤",
  "利来: 07,09,10,12,22,25,26,36,37,45,46,49 各数十斤",
  "利来: 澳门02-07各10米，19-31-43-05-17-29-41-11-23-35-47-14-26-38各5米",
  "利来: 猪羊狗牛龙个数五米",
  "利来: 23.47.05.03.11.13.37.21 20.40.22.30.10.28.02.14各数十斤",
  "利来: 猴兔各数五米",
  "利来: 澳，狗，各号10 11,13,19,31,43，27,39各10",
  "利来: 18.09.21.33.45.03.15.27.39各130",
  "利来: 马各号10",
  "利来: 包马每个五 13下15",
  "利来: 27 39各10米",
  "利来: 18.09.21.33.45.03.15.27.39各10",
  "利来: 平特一肖，鼠。5000 平特一肖，狗2000 平特一肖，免1000",
  "利来: 澳平猪/100",
  "利来: 平猴200",
  "利来: 羊狗牛各数5米. 虎龙马各数3米09.23.11.21.45.31.07各数10米",
  "利来: 05-10元",
  "利来: 澳：02、38、33、35、10、47、36各/10",
  "利来: 03-15-27-39-05-17-29-41-01各3斤",
  "利来: 01.13.25.37.49.09.21.33.45.46.41名10斤",
  "利来: 01=10斤",
  "利来: 42/38各号50",
  "利来: 鸡各数5",
  "利来: 鸡蛇狗牛猴龙各号20",
];

var dataset2 = [
  "利来: 39.31.11.05.35.30.16.21复试二中二各组二十五",
  "利来: 羊各数三十斤 蛇龙兔各数十斤",
  "利来: 三连蛇猴牛 四连蛇虎鸡猴 五连龙鸡蛇牛虎各组五十斤",
  "利来: 龙牛鸡狗蛇马兔羊个数十斤",
  "利来: 蛇个数十斤",
  "利来: 03.04.07.08.13.14.21.25.28.29.47.48各十米",
  "利来: 牛马各数5 兔鸡各数10",
  "利来: 07.31.01.14.26.38.06.09.33.41.47各2米。16.11各3米。28.40.03.05各5米。15.17各10米。",
  "利来: 澳特，马狗羊兔猴鸡各号5斤23.39.07.48.27.19.14.42.40.10.25.21.20.16.32各5斤",
  "利来: 05.15.25.35.45.28各5米",
  "利来: 猪兔羊各数2",
  "利来: 10.13.14.18.21.32.39.41.43.48个数五米",
  "利来: 19 41 07 18 17 23各2",
  "利来: 31 19各2",
  "利来: 鼠各数2",
  "利来: 12.21.25.33各10米",
  "利来: 45十斤",
  "利来: 门特13/25/49各10",
  "利来: 23 35各5米",
  "利来: 平鸡700",
  "利来: 02-42各2斤",
  "利来: 01.13.25.37.49.04各5斤",
  "利来: 18.07, 11, 13, 27, 30, 33, 39, 47, 49各60",
  "利来: 34 45 39各20斤 10 09 03 21 15 46各10斤 24 48 31 43 49 25 27 33 22各5斤",
  "利来: 18.07, 11, 13, 27, 30, 33, 39, 47, 49个数十斤",
  "利来: 03.15各5",
  "利来: 新奥特07, 11, 13, 27, 30, 33, 39, 47, 49各号80",
  "利来: 23-35各100",
  "利来: 06 08 10 11 20 21 22 25 27 38 39 44 48各5米",
  "利来: 12/30/35/6/12/22/23/24/25/30/35各5米",
  "利来: 狗各数25",
  "利来: 07, 11, 13, 27, 30, 33, 39, 47, 49  各5米",
  "利来: 07, 11, 13, 27, 30, 33, 39, 47, 49  各30",
  "利来: 11.47各5斤",
  "利来: 羊鸡牛各号5米 13.37.12.36.42.06.10.34各5米",
  "利来: 龙每个号10",
];

// ===== TEST RUNNER =====
function runTest(name, dataset, expectedTotal) {
  console.log('='.repeat(80));
  console.log('  ' + name + ' — ' + dataset.length + ' lines');
  console.log('='.repeat(80));

  var result = parseAll(dataset);

  var parsedCount = 0;
  var failedCount = 0;

  var runningTotal = 0;
  result.messageSummary.forEach(function(ms){
    var lineNum = ms.index;
    var input = ms.fullText;
    var lineBets = result.summary.filter(function(r){ return r.msgIndex === (lineNum - 1); });

    var lineTotal = lineBets.reduce(function(s,r){ return s + r.bet; }, 0);
    runningTotal += lineTotal;
    console.log('');
    console.log('--- Line ' + lineNum + ' [bet=' + lineTotal + ' running=' + runningTotal + '] ---');
    console.log('  Input:  ' + input);

    if(lineBets.length === 0){
      console.log('  Result: [SKIP] No parseable bets found');
      failedCount++;
    } else {
      lineBets.forEach(function(r, i){
        console.log('  Parsed['+(i+1)+']: display="' + r.display + '"  bet=' + r.bet + '  type=' + r.type);
        parsedCount++;
      });
    }
  });

  console.log('');
  console.log('-'.repeat(80));
  console.log('  ' + name + ' SUMMARY:');
  console.log('    Messages: ' + result.messageSummary.length);
  console.log('    Parsed entries: ' + parsedCount);
  console.log('    Failed messages: ' + failedCount);
  console.log('    Total bet: ' + result.totalBet);

  if(expectedTotal !== null && expectedTotal !== undefined){
    var match = result.totalBet === expectedTotal;
    var diff = result.totalBet - expectedTotal;
    console.log('    Expected total: ' + expectedTotal);
    console.log('    Match: ' + (match ? 'PASS' : 'FAIL') + ' (diff = ' + (diff > 0 ? '+' : '') + diff + ')');
  }

  console.log('');
  return result;
}

// ===== MAIN =====
console.log('Macau Mark Six — Parsing Test Harness');
console.log('Extracted from fsaf.html');
console.log('Node.js version: ' + process.version);
console.log('');

var r1 = runTest('Dataset 1', dataset1, 15376);
var r2 = runTest('Dataset 2', dataset2, 5465);

console.log('='.repeat(80));
console.log('  GRAND SUMMARY');
console.log('='.repeat(80));
console.log('  Dataset 1 total: ' + r1.totalBet + '  (expected: 15376)  ' + (r1.totalBet === 15376 ? 'PASS' : 'FAIL'));
console.log('  Dataset 2 total: ' + r2.totalBet + '  (expected: 5465)   ' + (r2.totalBet === 5465 ? 'PASS' : 'FAIL'));
console.log('');
