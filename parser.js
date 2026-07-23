// parser.js — 投注解析共享模块 (Node + Browser)

const ZODIAC_MAP = {
  马:["01","13","25","37","49"],蛇:["02","14","26","38"],龙:["03","15","27","39"],
  兔:["04","16","28","40"],虎:["05","17","29","41"],牛:["06","18","30","42"],
  鼠:["07","19","31","43"],猪:["08","20","32","44"],狗:["09","21","33","45"],
  鸡:["10","22","34","46"],猴:["11","23","35","47"],羊:["12","24","36","48"]
};
const ALL_ZODIACS = ["马","蛇","龙","兔","虎","牛","鼠","猪","狗","鸡","猴","羊"];
const ZODIAC_CHARS = ALL_ZODIACS.join('');
const WAVE_RED = ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"];
const WAVE_BLUE = ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"];
const WAVE_GREEN = ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"];
const EVEN_NUMS = []; for (var _ei = 2; _ei <= 48; _ei += 2) EVEN_NUMS.push(_ei.toString().padStart(2,'0'));
const ODD_NUMS = []; for (var _oi = 1; _oi <= 49; _oi += 2) ODD_NUMS.push(_oi.toString().padStart(2,'0'));

const CN = {
  一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,
  十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,
  二十:20,廿:20,廿一:21,廿二:22,廿三:23,廿四:24,廿五:25,廿六:26,廿七:27,廿八:28,廿九:29,
  三十:30,卅:30,卅一:31,卅二:32,卅三:33,卅四:34,卅五:35,卅六:36,卅七:37,卅八:38,卅九:39,
  四十:40,四十一:41,四十二:42,四十三:43,四十四:44,四十五:45,四十六:46,四十七:47,四十八:48,四十九:49,
  五十:50,五十一:51,五十二:52,五十三:53,五十四:54,五十五:55,五十六:56,五十七:57,五十八:58,五十九:59,
  六十:60,六十一:61,六十二:62,六十三:63,六十四:64,六十五:65,六十六:66,六十七:67,六十八:68,六十九:69,
  七十:70,七十一:71,七十二:72,七十三:73,七十四:74,七十五:75,八十:80,九十:90,
  一百:100,一百五:150,一百五十:150,一百五十五:155,两百:200,二百:200,
  三百:300,四百:400,五百:500,六百:600,七百:700,八百:800,九百:900,
  一千:1000,一千二:1200,一千五:1500,两千:2000,二千:2000,三千:3000,四千:4000,五千:5000
};
const CNK = Object.keys(CN).sort((a,b)=>b.length-a.length);

function cn(s){ for(let k of CNK) if(s===k) return CN[k]; for(let k of CNK) if(s.startsWith(k)){ var rest=s.slice(k.length); if(!/^[一二三四五六七八九十百千万廿卅两百]$/.test(rest[0]||'')) return CN[k]; } return 0; }
function parseCNNum(s){
  if(CN[s]) return CN[s];
  let total=0, tmp=0;
  const units={千:1000,百:100,十:10};
  for(const c of s){
    if(c in units){ tmp=(tmp||1)*units[c]; total+=tmp; tmp=0; }
    else if(c==='零') continue;
    else { const v=CN[c]; if(v) tmp=v; else return 0; }
  }
  return total+tmp;
}
function isMsgDateLine(s){ return /^\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2}/.test(s); }
function stripSender(s){ return s.replace(/^([^:：]+)[：:]\s*/,function(m,p){ if(/[\d\.。,，、\-\—\－]/.test(p))return m; if(/^(?:复[试式]|[三二]中[三二]|平特|特肖|门特|香|港|香港|澳|门|[二三四五]连)/.test(p))return m; if(p.length>5)return m; var zc=(p.match(/[猴鸡狗猪鼠牛虎兔龙蛇马羊]/g)||[]).length; return zc>2?m:''; }).trim(); }
function stripMacau(s){ return s.replace(/^(?:新澳门|新奥|新澳|澳门|澳門|澳特|澳|奥|利来|门特|门|新)\s*[:：]?\s*/i,'').replace(/^[：:,，\s]+/,'').trim(); }
function stripHK(s){ return s.replace(/^(?:香港|港|香)\s*[:：]?\s*/i,'').replace(/^[：:,，\s]+/,'').trim(); }
function expandDot(s){ return s.replace(/(\d{1,2})\.(?=\d{1,2})/g,'$1 '); }

function norm(s, debug){
  var t = s;
  if (debug) console.log('[norm] 输入:', JSON.stringify(t));
  t = t.replace(/[+＋]/g,'').replace(/。/g,'')
    .replace(/免/g,'兔').replace(/于一肖/g,'一肖')
    .replace(/候/g,'猴').replace(/㺅/g,'猴')
    .replace(/[，,]/g,' ')
    .replace(/[（(]\s*\d+\s*[码个]?\s*[）)]/g,'')
    .replace(/】【/g, '，').replace(/【/g, '').replace(/】/g, '')
    .replace(/每组/g, '各组')
    .replace(/元/g,'块')
    .replace(/复试/g,'复式')
    .replace(/\d+期\s*/g,'')
    .replace(/号个/g,'号各').replace(/一个号各/g,'各').replace(/一个号/g,'').replace(/号各/g,'各数').replace(/名数/g,'各数').replace(/每个号码/g,'各数').replace(/每个号/g,'各数').replace(/号\/(\d)/g,'号$1')
    .replace(/蚊/g,'')
    .replace(/[嘛呀啊呢吧哦噢哟唉]+/g, '')
    .replace(/(\d{1,2})到(\d{1,2})/g, function(m, a, b){ var r=[]; for(var i=parseInt(a);i<=parseInt(b);i++) r.push(i.toString().padStart(2,'0')); return r.join(' '); }).replace(/(\d)头/g, function(m, d){ var r=[]; for(var i=0;i<=9;i++){ var n=parseInt(d)*10+i; if(n>=1&&n<=49) r.push(n.toString().padStart(2,'0')); } return r.join(' '); }).replace(/尾数(\d)尾/g, '$1尾').replace(/(\d)尾/g, function(m, d){ var r=[]; for(var i=0;i<=4;i++){ var n=i*10+parseInt(d); if(n>=1&&n<=49) r.push(n.toString().padStart(2,'0')); } return r.join(' '); })
    // 红波/蓝波/绿波+单/双组合展开
    .replace(/(红波|蓝波|绿波)(单|双)/g, function(m, wave, od) {
      var base = wave==='红波'?WAVE_RED:wave==='蓝波'?WAVE_BLUE:WAVE_GREEN;
      var filtered = od==='双' ? base.filter(function(n){ return parseInt(n)%2===0; }) : base.filter(function(n){ return parseInt(n)%2===1; });
      return filtered.join(' ');
    })
    // 独立"双"/"单"展开为所有双数/单数 (红波双等已在前面展开,此处处理剩余的独立双/单)
    .replace(/双各/g, EVEN_NUMS.join(' ')+'各')
    .replace(/单各/g, ODD_NUMS.join(' ')+'各')
    .replace(/个数十斤/g,'各数10斤').replace(/个数十米/g,'各数10米').replace(/个数十块/g,'各数10块')
    .replace(/个数([一二三四五六七八九十百千万廿卅两百]+)(斤|米|块)/g, function(m, n1, n2){ var v=cn(n1)||parseCNNum(n1); return '各数'+(v||'')+n2; })
    .replace(/个字/g,'各数')
    .replace(/字/g,'各数')
    .replace(/号个/g,'各数')
    .replace(/一个号各/g,'各').replace(/一个号/g,'').replace(/个号/g,'各号').replace(/=个/g,'各').replace(/=各/g,'各').replace(/=/g,'各')
    .replace(/单数/g,'单').replace(/双数/g,'双')
    .replace(/各\.(\d)/g,'各$1')
    .replace(/[：∶:]/g,'').replace(/\s*各\s*\/\s*/g,'各').replace(/(\d{1,2})\s*各\s*\/\s*/g,'$1各')
    .replace(/(?<!各)数十斤/g,'各10斤').replace(/(?<!各)数十米/g,'各10米').replace(/(?<!各)数十块/g,'各10块')
    .replace(/平特\s*一肖/g,'平特')
    .replace(/平特(三连|二连|四连|五连)肖/g, '$1')
    .replace(/平特(三连|二连|四连|五连)(?!肖)/g, '$1')
    .replace(/(\d)[Oo](\d)/g,'$10$2').replace(/(\d+)[A-Za-z]+/g,'$1')
    .replace(/门\s*$/g,'')
    .replace(/(\d{1,2})\.(?=\d{1,2})/g,'$1 ').replace(/(\d{1,2})\.(?![\d]{1,2})/g,'$1 ')
    .replace(new RegExp(`([${ZODIAC_CHARS}])\\.(?=[${ZODIAC_CHARS}])`, 'g'), '$1 ')
    .replace(/\.(?=\s*各)/g, ' ')
    .replace(new RegExp(`([${ZODIAC_CHARS}]+)各肖各?(\\d+(?:\\.\\d+)?)`,'g'), function(m, zs, v){
      return zs.split('').map(function(z){ return '特肖'+z+' '+v; }).join(' ');
    })
    .replace(new RegExp(`([${ZODIAC_CHARS}])肖`,'g'), '$1')
    .replace(/(二连|三连|四连|五连)肖/g, '$1')
    .replace(/(\d{1,2})\s*([一二三四五六七八九十百千万廿卅两百]+)\s*(斤|米|块)/g, (m,n1,n2,n3)=>n1+'各'+cn(n2)+n3)
    .replace(/(\d{1,2})\s*[-—－]+\s*(\d+(?:\.\d+)?)\s*(斤|米|块)/g,'$1各$2$3')
    .replace(/--/g,'-')
    .replace(/(\d{1,2})\s*[-—－]{2,}\s*(\d+(?:\.\d+)?)/g,'$1各$2').replace(/[*、]+/g,' ').replace(/[-—－]+/g,' ')
    .replace(/([斤米块])\s*，/g, '$1；')
	    .replace(/(二连|三连|四连|五连)[.\/]/g,'$1 ').replace(/\/(二连|三连|四连|五连)/g,' $1')
	    .replace(/\/(\d+(?:\.\d+)?)\s*(二连|三连|四连|五连)/g,'$2$1')
	    .replace(/\s*\/\s*各/g,'各')
	    .replace(new RegExp('([' + ZODIAC_CHARS + '])\\s+(?=[' + ZODIAC_CHARS + '])', 'g'), '$1')
	    .replace(/(二连|三连|四连|五连)各(\d)/g,'$1 $2')
    .replace(/(\d)([A-Za-z])?[，、](?=[红绿蓝单双大小平特特肖])/g,'$1$2 ').replace(/\s+(各(?!组))/g,'$1').replace(/(各)\s+/g,'$1').replace(/\s+/g,' ').trim();
  // 展开无分隔符连肖: "二连狗猴30狗虎30猴虎30" → "狗猴二连30；狗虎二连30；猴虎二连30"
  t = t.replace(new RegExp('^(二连|三连|四连|五连)([' + ZODIAC_CHARS + ']+)(\\d+(?:\\.\\d+)?)((?:[' + ZODIAC_CHARS + ']+\\d+(?:\\.\\d+)?)+)$'), function(m, comboType, firstZodiacs, firstVal, rest) {
    var k = comboType === '二连' ? 2 : comboType === '三连' ? 3 : comboType === '四连' ? 4 : 5;
    var groups = [];
    groups.push(firstZodiacs + comboType + firstVal);
    var restStr = rest;
    while (restStr.length > 0) {
      var m2 = restStr.match(new RegExp('^([' + ZODIAC_CHARS + ']{' + k + '})(\\d+(?:\\.\\d+)?)'));
      if (!m2) break;
      groups.push(m2[1] + comboType + m2[2]);
      restStr = restStr.substring(m2[0].length);
    }
    if (groups.length <= 1) return m;
    return groups.join('；');
  });
  t = t.replace(/(三中三|二中二)(\d)/g, '$1 $2');
  t = t.replace(/(\d{1,2})\s*下\s*(\d+(?:\.\d+)?)/g,'$1各$2');
  t = t.replace(/下(\d+(?:\.\d+)?)/g,'$1');
  t = t.replace(/(三中三|二中二)([一二三四五六七八九十百千万廿卅两百]+)(斤|米|块)/g, function(m, type, cnVal, unit) {
    var v = cn(cnVal) || parseCNNum(cnVal);
    return type + (v || '') + unit;
  });
  t = t.replace(/([一二三四五六七八九十百千万廿卅两百]+)\s*(斤|米|块)/g, function(m, n1, n2){ var v=cn(n1)||parseCNNum(n1); return (v||'')+n2; });
  t = t.replace(/各组([一二三四五六七八九十百千万廿卅两百]+)/g, function(m, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return '各组' + (v || '');
  });
  t = t.replace(/([\d\s]+)复式(三中三|二中二)\s*各组(\d+(?:\.\d+)?)\s*(斤|米|块)?/g, function(m, nums, type, val, unit){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    var k = type === '三中三' ? 3 : 2;
    if (numsArr.length < k) return m;
    var combos = combinations(numsArr, k);
    return combos.map(function(c){ return c.join(' ') + ' ' + type + ' ' + val + (unit || ''); }).join('；');
  });
  t = t.replace(/复式(三中三|二中二)\s*([\d\s]*\d)各组(\d+(?:\.\d+)?)\s*(斤|米|块)?/g, function(m, type, nums, val, unit){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    var k = type === '三中三' ? 3 : 2;
    if (numsArr.length < k) return m;
    var combos = combinations(numsArr, k);
    return combos.map(function(c){ return c.join(' ') + ' ' + type + ' ' + val + (unit || ''); }).join('；');
  });
  t = t.replace(/([\d\s]+)复式(三中三|二中二)\s*各(\d+(?:\.\d+)?)\s*(斤|米|块)?/g, function(m, nums, type, val, unit){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    var k = type === '三中三' ? 3 : 2;
    if (numsArr.length < k) return m;
    var combos = combinations(numsArr, k);
    return combos.map(function(c){ return c.join(' ') + ' ' + type + ' ' + val + (unit || ''); }).join('；');
  });
  t = t.replace(/([\d\s]+)三中三复式各(\d+(?:\.\d+)?)\s*(斤|米|块)?/g, function(m, nums, val, unit){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    if (numsArr.length < 3) return m;
    var combos = combinations(numsArr, 3);
    return combos.map(function(c){ return c.join(' ') + ' 三中三 ' + val + (unit || ''); }).join('；');
  });
  t = t.replace(/([\d\s]+)二中二复式各(\d+(?:\.\d+)?)\s*(斤|米|块)?/g, function(m, nums, val, unit){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    if (numsArr.length < 2) return m;
    var combos = combinations(numsArr, 2);
    return combos.map(function(c){ return c.join(' ') + ' 二中二 ' + val + (unit || ''); }).join('；');
  });
  // 二中二复式: N1 N2 N3...各组V  (复式关键词在前)
  t = t.replace(/二中二复式\s*([\d\s]+)各组(\d+(?:\.\d+)?)\s*(斤|米|块)?/g, function(m, nums, val, unit){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    if (numsArr.length < 2) return m;
    var combos = combinations(numsArr, 2);
    return combos.map(function(c){ return c.join(' ') + ' 二中二 ' + val + (unit || ''); }).join('；');
  });
  t = t.replace(/复式(二连|三连|四连|五连)\s*各组(\d+(?:\.\d+)?)/g, '复式$1 $2');
  // 三中三/二中二多行合并: "三中三 N1 N2 N3...组V" → 展开为独立组合
  t = t.replace(/三中三\s+([\d\s]+?)组(\d+(?:\.\d+)?)\s*$/g, function(m, nums, val){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    if (numsArr.length < 3 || numsArr.length % 3 !== 0) return m;
    var triplets = [];
    for (var i = 0; i < numsArr.length; i += 3) {
      triplets.push(numsArr.slice(i, i+3).join(' ') + ' 三中三 ' + val);
    }
    return triplets.join('；');
  });
  t = t.replace(/二中二\s+([\d\s]+?)组(\d+(?:\.\d+)?)\s*$/g, function(m, nums, val){
    var numsArr = nums.trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    if (numsArr.length < 2 || numsArr.length % 2 !== 0) return m;
    var pairs = [];
    for (var i = 0; i < numsArr.length; i += 2) {
      pairs.push(numsArr.slice(i, i+2).join(' ') + ' 二中二 ' + val);
    }
    return pairs.join('；');
  });
  t = t.replace(/各([一二三四五六七八九十百千万廿卅两百]+)(\d)/g, function(m, cnVal, nextDigit){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return '各' + (v || '') + ' ' + nextDigit;
  });
  t = t.replace(/各([一二三四五六七八九十百千万廿卅两百]+)/g, function(m, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return '各' + (v || '');
  });
  // 数字+中文数字结尾（如"36十"→"36各10"），先处理
  t = t.replace(/(\d)\s*([一二三四五六七八九十百千万廿卅两百]+)$/, function(m, digit, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return digit + '各' + (v || '');
  });
  // 生肖+中文数字结尾（如"平牛十"→"平牛各10"）
  t = t.replace(new RegExp(`([${ZODIAC_CHARS}])([一二三四五六七八九十百千万廿卅两百]+)$`), function(m, zo, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return zo + '各' + (v || '');
  });
  // 其余中文数字结尾（如"二十斤"已由前面处理，这里做最后兜底）
  t = t.replace(/([一二三四五六七八九十百千万廿卅两百]+)$/, function(m, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return (v || cnVal).toString();
  });
  t = t.replace(/^(?!.*(?:三中三|二中二|复式(?:二连|三连|四连|五连)))(.+)\s*各组(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/g, function(m, prefix, val){
    return prefix.split(/\s+/).map(function(seg){ return seg + val; }).join(' ');
  });
  t = t.replace(/^连肖\s*/g, '');
  t = t.replace(/复式(二连|三连|四连|五连)肖\s*(\d+(?:\.\d+)?)\s*一组(?:共(\d+)组)?/g, function(m, lx, v, cnt){
    return '复式' + lx + ' ' + v + '各' + (cnt || '?') + '组';
  });
  t = t.replace(/(\d+(?:\.\d+)?)\s*一组共(\d+)组/g, '$1各$2组');
  t = t.replace(/^(三中三|二中二)\s+(\d+)组\s+各组(\d+(?:\.\d+)?)\s*(斤|米|块)?\s+(.+)$/g, function(m, type, cntStr, val, unit, groupsStr){
    var triplets = groupsStr.split(/[，,、]/).filter(Boolean);
    var expanded = [];
    var k = type === '三中三' ? 3 : 2;
    for (var t = 0; t < triplets.length; t++) {
      var nums = triplets[t].trim().split(/[\s\.\-\－\—]+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
      for (var ni = 0; ni + k <= nums.length; ni += k) {
        expanded.push(nums.slice(ni, ni + k).join(' ') + ' ' + type + ' ' + val + (unit || ''));
      }
    }
    return expanded.length > 0 ? expanded.join('；') : m;
  });
  t = t.replace(/^(三中三|二中二)\s*([\d\s\.\-\－\—，,、]+?)(?:各?组?)(\d+(?:\.\d+)?)\s*(斤|米|块)?$/g, function(m, type, groups, val, unit) {
    var groupList = groups.split(/[，,、]/).filter(Boolean);
    if (groupList.length === 1 && /\s/.test(groupList[0])) {
      var flatNums = groupList[0].trim().split(/\s+/);
      var k = type === '三中三' ? 3 : 2;
      groupList = [];
      for (var i = 0; i < flatNums.length; i += k) {
        groupList.push(flatNums.slice(i, i + k).join('.'));
      }
    }
    return groupList.map(function(g) {
      var nums = g.trim().replace(/[-\－\—\s]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
      return nums + type + val + (unit || '');
    }).join('；');
  });
  t = t.replace(/(\d{1,2})\s*\/\s*(\d+(?:\.\d+)?)\s*(?=[斤米块，；。\s]|$)/g, '$1各$2');
  if (debug) console.log('[norm] 输出:', JSON.stringify(t));
  return t;
}

function clean(s){ return s.replace(/^[、，,\s\-—－ㅤ]+/,'').replace(/[、，,。.\s\-—－ㅤ]+$/,'').replace(/[。]/g,'').trim(); }

const KW = '(?:各数|个数|各号|号|个(?!组)|各(?!组))';

function splitBets(seg){
  const ends = new Set();
  const ps = [
    new RegExp(`\\s*${KW}\\s*(?:[\\u4e00-\\u9fa5]+|\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?`,'gi'),
    new RegExp(`(?:二连|三连|四连|五连)\\s*平?\\s*[${ZODIAC_CHARS}]+\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?`,'gi'),
    new RegExp(`[${ZODIAC_CHARS}]+\\s*(?:二连|三连|四连|五连)\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?`,'g'),
    new RegExp(`(?:平特[，,\\s]*[${ZODIAC_CHARS}]+|平[${ZODIAC_CHARS}])\\s*[，,]?\\s*\\d+\\s*(?:斤|米|块)?`,'g'),
    new RegExp(`(?:特肖[，,\\s]*[${ZODIAC_CHARS}]+|特肖[${ZODIAC_CHARS}])\\s*[，,]?\\s*\\d+\\s*(?:斤|米|块)?`,'g'),
    new RegExp(`[\\d]{1,2}(?:\\.[\\d]{1,2})+[\\s\\S]*?(?:斤|米|块|\\d)(?=\\s|$)`,'gi'),
    new RegExp(`\\d{1,2}\\s+[一二三四五六七八九十百千万廿卅两百]+\\s*(?:斤|米|块)`,'gi')
  ];
  ps.forEach(re=>{ let m; const r=new RegExp(re.source,re.flags); while((m=r.exec(seg))!==null) ends.add(m.index+m[0].length); });
  const sorted=[...ends].sort((a,b)=>a-b);
  if(!sorted.length) return [seg.trim()].filter(Boolean);
  const parts=[]; let start=0;
  sorted.forEach(end=>{ const p=seg.slice(start,end).trim(); if(p) parts.push(p); start=end; });
  const tail=seg.slice(start).trim(); if(tail) parts.push(tail);
  return parts.length?parts:[seg.trim()];
}

function expandDashGe(l){
  const re=/(\d{1,2})\s*[—\-－~～]+\s*各\s*[—\-－~～]+\s*(\d+(?:\.\d+)?)\s*(?:斤|米|块)?/gi;
  const parts=[]; let m;
  while((m=re.exec(l))!==null){ const n=parseInt(m[1]); if(n>=1&&n<=49) parts.push(`${n}各${m[2]}`); }
  if(!parts.length) return null;
  const rest=l.replace(re,'').replace(/[梧影\s：:，,、]+/g,'').trim();
  return rest.length<3?parts:null;
}

function C(n,k){ if(k>n||k<0)return 0; if(k===0||k===n)return 1; let r=1; for(let i=1;i<=k;i++) r=r*(n-i+1)/i; return r; }
function combinations(arr,k){
  if(k===0)return[[]]; if(arr.length<k)return[];
  const r=[]; for(let i=0;i<=arr.length-k;i++){ const f=arr[i]; combinations(arr.slice(i+1),k-1).forEach(c=>r.push([f,...c])); }
  return r;
}

function expandLine(l){
  const s=norm(stripHK(stripMacau(stripSender(l))));
  if(s.includes('；')||s.includes(';')){
    const parts=s.split(/[；;]/).filter(Boolean);
    const all=[]; parts.forEach(function(p){ expandLine(p).forEach(function(sr){ all.push(sr); }); });
    return all;
  }
  const dr=expandDashGe(s);
  if(dr){ return dr.map(d=>{ const c=clean(d); return c||null; }).filter(Boolean); }
  const fuRe = new RegExp(`^([${ZODIAC_CHARS}]+)复式(二连|三连|四连|五连)\\s+(\\d+(?:\\.\\d+)?)\\s*各(\\d+)组`);
  const fuM = s.match(fuRe);
  if(fuM){
    const zs = fuM[1].split('');
    const lxType = fuM[2];
    const perVal = parseFloat(fuM[3]);
    const k = lxType==='二连'?2:lxType==='三连'?3:lxType==='四连'?4:5;
    const cb = combinations(zs, k);
    return cb.map(function(c){ return c.join('') + lxType + perVal; });
  }
  const fuShortRe = new RegExp(`^([${ZODIAC_CHARS}]+)\\s*复式(二连|三连|四连|五连)肖?\\s*(\\d+(?:\\.\\d+)?)\\s*$`);
  const fuShortM = s.match(fuShortRe);
  if(fuShortM){
    const zs = fuShortM[1].split('');
    const lxType = fuShortM[2];
    const perVal = parseFloat(fuShortM[3]);
    const k = lxType==='二连'?2:lxType==='三连'?3:lxType==='四连'?4:5;
    if(zs.length >= k){
      const cb = combinations(zs, k);
      return cb.map(function(c){ return c.join('') + lxType + perVal; });
    }
  }
  const flatMarker = s.includes('平特') ? '平特' : (s.includes('特肖') ? '特肖' : null);
  if(flatMarker){
    const parts=[]; let idx=s.indexOf(flatMarker), prev=0;
    while((idx=s.indexOf(flatMarker,prev+2))!==-1){ parts.push(s.slice(prev,idx).trim()); prev=idx; }
    parts.push(s.slice(prev).trim());
    const merged=[]; for(var pi=0;pi<parts.length;pi++){
      if(/^(?:香港|港|香)$/.test(parts[pi])&&pi+1<parts.length){ parts[pi+1]=parts[pi]+parts[pi+1]; }
      else{ merged.push(parts[pi]); }
    }
    if(merged.length>1){
      const all=[]; merged.forEach(function(p){ splitBets(p).forEach(function(sp){ var c=clean(sp); if(c) all.push(c); }); });
      return all;
    }
  }
  var sparts = splitBets(s);
  // 金额继承: 尾部只有号码无金额时，继承前一段的"各<金额><单位>"
  var lastKW = null;
  for (var si = 0; si < sparts.length; si++) {
    var sn = norm(sparts[si]);
    var sv = getVal(sn);
    if (sv > 0) {
      var km = sn.match(new RegExp(`(${KW}\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?)\\s*$`));
      if (km) lastKW = km[1];
    } else if (lastKW) {
      var sl = getList(sn);
      if (sl && /[\d马蛇龙兔虎牛鼠猪狗鸡猴羊]/.test(sl)) {
        sparts[si] = sparts[si] + lastKW;
      }
    }
  }
  return sparts.map(p=>{ const c=clean(p); return c||null; }).filter(Boolean);
}

function getVal(txt){
  const n=norm(txt);
  let m=n.match(new RegExp(`\\s*${KW}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(m) return parseFloat(m[1]);
  m=n.match(new RegExp(`\\s*${KW}\\s*([\\u4e00-\\u9fa5]+)\\s*(?:斤|米|块)?\\s*$`));
  if(m){ const v=cn(m[1])||parseCNNum(m[1]); if(v>0) return v; }
  if(!/各/.test(n)){
    var numToks_gv = n.match(/\b\d{1,2}\b/g) || [];
    if (!/[斤米块]/.test(n) && numToks_gv.length >= 3 && !/二中二|三中三/.test(n)) return 0;
    m=n.match(/(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
    if(m){ const b=n.slice(0,m.index).trim(); if(b.length>0) return parseFloat(m[1]); }
    m=n.match(/^(.+?)([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ const v=cn(m[2])||parseCNNum(m[2]); if(v>0) return v; }
    m=n.match(/^(.+?)\s+([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ const v=cn(m[2])||parseCNNum(m[2]); if(v>0) return v; }
    m=n.match(/^(\d{1,2})\s+([一二三四五六七八九十百千万廿卅两]+)\s*(?:斤|米|块)?\s*$/);
    if(m){ const v=cn(m[2])||parseCNNum(m[2]); if(v>0) return v; }
  }
  return 0;
}

function getList(txt){
  const n=norm(txt);
  const stripKw=s=>s.replace(/[\s个各号]+$/g,'').trim();
  let m=n.match(new RegExp(`\\s*${KW}\\s*(?:[\\u4e00-\\u9fa5]+|\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(m) return expandDot(stripKw(n.slice(0,m.index)));
  m=n.match(new RegExp(`\\s*${KW}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(m) return expandDot(stripKw(n.slice(0,m.index)));
  if(!/各/.test(n)){
    m=n.match(/(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
    if(m){ const b=n.slice(0,m.index).trim(); if(b.length>0) return expandDot(b); }
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
  const ex=expandDot(lp);
  const items=ex.split(/[.\/、,\s，\-—－]+/).filter(i=>i!=='');
  const fi=[];
  items.forEach(item=>{
    if(new RegExp(`^[${ZODIAC_CHARS}]+$`).test(item)){ for(let c of item) fi.push(c); }
    else { const parts=item.match(new RegExp(`[${ZODIAC_CHARS}]|\\d{1,2}`,'g')); if(parts) parts.forEach(p=>fi.push(p)); else fi.push(item); }
  });
  return fi;
}

function getTargets(items){
  const t=[];
  items.forEach(item=>{
    if(/^\d{1,2}$/.test(item)){ const n=parseInt(item); if(n>=1&&n<=49) t.push(n.toString().padStart(2,'0')); }
    else if(ZODIAC_MAP[item]) ZODIAC_MAP[item].forEach(n=>t.push(n));
  });
  return t;
}

// ===== processRule — 按优先级 P1(最高)→P5(最低) 匹配 =====
function processRule(rawRule){
  const rule=clean(rawRule); if(!rule) return null;
  const txt=norm(stripHK(stripMacau(stripSender(rule))));
  const txtNoHK=txt.replace(/香港|香|港/g,'').trim();

  // ==== P1: 连肖组合 (二连/三连/四连/五连) ====
  // 先合并相邻生肖之间的空格（"鼠 牛 兔"→"鼠牛兔"），否则正则只捕获最后一个
  let comboZodiacSpaceRe = new RegExp(`([${ZODIAC_CHARS}])\\s+([${ZODIAC_CHARS}])`, 'g');
  let txtCombo = txtNoHK;
  let prevCombo;
  do { prevCombo = txtCombo; txtCombo = txtCombo.replace(comboZodiacSpaceRe, '$1$2'); } while (txtCombo !== prevCombo);
  let cm=txtCombo.match(new RegExp(`(?:二连|三连|四连|五连)\\s*平?\\s*([${ZODIAC_CHARS}]+)\\s*各?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?`));
  if(!cm) cm=txtCombo.match(new RegExp(`([${ZODIAC_CHARS}]+)\\s*(?:五连|四连|三连|二连)\\s*各?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?`));
  if(cm){
    const zStr=cm[1], cv=parseFloat(cm[2]);
    let ct='double';
    if(txtNoHK.includes('五连')||(zStr.length===5&&!txtNoHK.includes('三连')&&!txtNoHK.includes('四连'))) ct='quintuple';
    else if(txtNoHK.includes('四连')||(zStr.length===4&&!txtNoHK.includes('三连')&&!txtNoHK.includes('五连'))) ct='quadruple';
    else if(txtNoHK.includes('三连')) ct='triple';
    const typeName=ct==='quintuple'?'五连':ct==='quadruple'?'四连':ct==='triple'?'三连':'二连';
    return {display:`${zStr}${typeName} ${cv}`, bet:cv, type:'combo', comboZodiacs:zStr, comboType:ct};
  }

  // ==== P2: 三中三/二中二显式数字组 ====
  let ssm = txtNoHK.match(new RegExp(`^(\\d{1,2}(?:\\s+\\d{1,2}){1,})\\s*(三中三|二中二)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if (ssm) {
    const nums = ssm[1].split(/\s+/).filter(Boolean);
    const sstype = ssm[2], ssval = parseFloat(ssm[3]);
    const k = sstype === '三中三' ? 3 : 2;
    if (nums.length === k) return {display:`${nums.join(' ')}${sstype} ${ssval}`, bet:ssval, type:'combo_nums', targets:nums};
  }

  // ==== P3: 特肖 ====
  let txm = txtNoHK.match(new RegExp(`^特肖([${ZODIAC_CHARS}])\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(!txm) txm = txtNoHK.match(new RegExp(`^特肖\\s*([${ZODIAC_CHARS}](?:\\s*[${ZODIAC_CHARS}])*)\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(txm){
    const zs = txm[1].replace(/\s+/g,'').split(''), v = txm[2] ? parseFloat(txm[2]) : getVal(txtNoHK);
    if(!v) return null;
    return {display:`特肖${zs.join('')}各${v}`, bet:v*zs.length, type:'special_zodiac', targets:zs};
  }

  // ==== P4: 平特 (flat bet) — 单平/平特/平特尾 ====
  var frm = txtNoHK.match(new RegExp(`^([${ZODIAC_CHARS}])\\s*平\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(frm){ return {display:`平特${frm[1]} ${parseFloat(frm[2])}`, bet:parseFloat(frm[2]), type:'flat', targets:[frm[1]]}; }
  // <zodiacs>平特<val> — "牛平特800" → 平特牛 800
  var frmt = txtNoHK.match(new RegExp(`^([${ZODIAC_CHARS}]+)\\s*平特\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(frmt){ const zs2=[...frmt[1]], v2=parseFloat(frmt[2]); return {display:`平特${frmt[1]} ${v2}`, bet:v2*zs2.length, type:'flat', targets:zs2}; }

  let fm=txtNoHK.match(new RegExp(`^平特[，,\\s]*([${ZODIAC_CHARS}]+)\\s*[，,、]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(!fm) fm=txtNoHK.match(new RegExp(`^平特[，,\\s]*([${ZODIAC_CHARS}]+)\\s*${KW}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(!fm) fm=txtNoHK.match(new RegExp(`^平特[，,\\s]*([${ZODIAC_CHARS}]+)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(fm){ const zs=[...fm[1]], v=parseFloat(fm[2]); return {display:`平特${fm[1]} ${v}`, bet:v*zs.length, type:'flat', targets:zs}; }

  let fgm=txtNoHK.match(new RegExp(`^平\\s*([${ZODIAC_CHARS}]+)\\s*[各/]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(fgm){ var fgzs=[...fgm[1]], fgv=parseFloat(fgm[2]); return {display:`平特${fgm[1]} ${fgv}`, bet:fgv*fgzs.length, type:'flat', targets:fgzs}; }

  let fms=txtNoHK.match(new RegExp(`^平([${ZODIAC_CHARS}])\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(!fms) fms=txtNoHK.match(new RegExp(`^平\\s*([${ZODIAC_CHARS}](?:\\s*[${ZODIAC_CHARS}])*)\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(fms){ const zs=fms[1].replace(/\s+/g,'').split(''), v=fms[2]?parseFloat(fms[2]):getVal(txtNoHK); if(!v) return null; return {display:`平${fms[1]}各${v}`, bet:v*zs.length, type:'flat', targets:zs}; }

  // 平特尾: 平特+号码列表 flat bet, 金额不乘号码数
  var ptnm = txtNoHK.match(/^平特\s*(\d{1,2}(?:\s+\d{1,2})*)\s*各?\s*(\d+(?:\.\d+)?)\s*(?:斤|米|块)?\s*$/);
  if (ptnm) {
    var ptNums = ptnm[1].trim().split(/\s+/).filter(function(n){ return /^\d{1,2}$/.test(n); });
    var ptVal = parseFloat(ptnm[2]);
    if (ptNums.length > 0) return {display:`平特${ptNums.join('.')} ${ptVal}`, bet:ptVal, type:'flat_tail', targets:ptNums};
  }

  // ==== P5: 隐式连肖 (纯生肖串+金额, 如"狗猴30"=二连) ====
  const icm=txtNoHK.match(new RegExp(`^([${ZODIAC_CHARS}]{2,5})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(icm){
    const zStr=icm[1], zv=parseFloat(icm[2]);
    let ct='double';
    if(zStr.length===5) ct='quintuple'; else if(zStr.length===4) ct='quadruple'; else if(zStr.length===3) ct='triple';
    const typeName=ct==='quintuple'?'五连':ct==='quadruple'?'四连':ct==='triple'?'三连':'二连';
    return {display:`${zStr}${typeName} ${zv}`, bet:zv, type:'combo', comboZodiacs:zStr, comboType:ct};
  }

  const value=getVal(txtNoHK); if(!value) return null;
  const lp=getList(txtNoHK), items=splitItems(lp), targets=getTargets(items);
  if(!targets.length) return null;
  return {display:`${targets.join('.')} 各${value}(${targets.length}码)`, bet:value*targets.length, type:'nums', targets};
}

// ===== splitByModeMarkers — 复刻 fsaf.html 1328行 =====
function isHKMarker(m){ return m==='香港'; }

function splitByModeMarkers(sl){
  var re = /(?:^|[\s，：:。、])(香港|澳门|澳門)(?=[\s，：:。、]|[一-鿿\d]|$)/g;
  var matches = [];
  var m;
  while ((m = re.exec(sl)) !== null) {
    matches.push({ marker: m[1], idx: m.index + m[0].indexOf(m[1]) });
  }
  if (matches.length === 0) return null;
  var segs = [];
  var prev = 0;
  for (var i = 0; i < matches.length; i++) {
    var before = sl.substring(prev, matches[i].idx).trim();
    if (before) segs.push({ text: before, isHK: i > 0 ? isHKMarker(matches[i-1].marker) : false });
    prev = matches[i].idx;
  }
  var after = sl.substring(prev).trim();
  if (after) segs.push({ text: after, isHK: isHKMarker(matches[matches.length-1].marker) });
  return segs.length > 1 ? segs : null;
}

// ===== groupNewFormatMessages — 复刻 fsaf.html 1365行 =====
function groupNewFormatMessages(lines){
  var dateCount = 0;
  for(var i=0;i<lines.length;i++){ if(isMsgDateLine(lines[i])) dateCount++; }
  if(dateCount===0) return null;

  var messages = [];
  var current = [];
  var collecting = false;

  for(var i=0;i<lines.length;i++){
    var line = lines[i].trim();
    if(!line) continue;

    if(isMsgDateLine(line)){
      if(current.length>0){
        messages.push({content:current.join('；'), displayText:current.join('\n')});
        current=[];
      }
      collecting=true;
      continue;
    }

    if(!collecting) continue;

    if(i+1<lines.length && isMsgDateLine(lines[i+1].trim()) && !/[:：]/.test(line) && !/\d/.test(line)){
      continue;
    }

    current.push(line);
  }

  if(current.length>0){
    messages.push({content:current.join('；'), displayText:current.join('\n')});
  }

  return messages.length>0 ? messages : null;
}

// ===== analyze() — 复刻 fsaf.html 1404行行为 =====
function analyze(inputText){
  const text = inputText.replace(/\r\n/g,'\n').replace(/　/g,' ').replace(/[ \t]+/g,' ');
  var rawLines = text.split(/\n/).map(l=>l.trim()).filter(Boolean);

  var groupedMessages = groupNewFormatMessages(rawLines);
  var useNewFormat = groupedMessages !== null;
  if(useNewFormat){
    rawLines = groupedMessages.map(function(m){ return m.content; });
  }

  var betSummary = [];
  var messageSummary = [];
  var grandTotal = 0;

  rawLines.forEach(function(rawLine, lineIdx){
    var msgBet = 0;
    const subLines = rawLine.replace(/(\d)。(\d)/g, '$1.$2').replace(/([^斤米块\d])。(\d)/g, '$1$2').split(/[；;·。]/).map(function(l){ return l.trim(); }).filter(Boolean);
    // 合并续行: 前一行只有号码/生肖但无金额标记时，与后一行合并
    // 检测消息中是否有三中三/二中二结构（防止级联破坏独立投注行）
    var hasComboStruct = subLines.some(function(sl) {
      return /三中三|二中二/.test(stripSender(sl));
    });
    for (var si = 0; si < subLines.length - 1; si++) {
      var slNorm = norm(stripHK(stripMacau(stripSender(subLines[si]))));
      if (getVal(slNorm) === 0) {
        var listPart = getList(slNorm);
        if (listPart && /[\d马蛇龙兔虎牛鼠猪狗鸡猴羊]/.test(listPart)) {
          if (hasComboStruct) {
            // 结构化投注: 仅当下行有金额时才合并，防止三中三/二中二行级联
            var nextNorm = norm(stripHK(stripMacau(stripSender(subLines[si+1]))));
            if (getVal(nextNorm) > 0) {
              subLines[si+1] = subLines[si] + ' ' + subLines[si+1];
              subLines[si] = '';
            }
          } else {
            // 普通数字列表: 正常级联合并
            subLines[si+1] = subLines[si] + ' ' + subLines[si+1];
            subLines[si] = '';
          }
        }
      }
    }
    // 反向合并: 后一行无金额时，合并到前一行 (处理三中三显式组合)
    for (var si = 1; si < subLines.length; si++) {
      if (!subLines[si]) continue;
      var slNormR = norm(stripHK(stripMacau(stripSender(subLines[si]))));
      if (getVal(slNormR) === 0) {
        var listPartR = getList(slNormR);
        // 允许纯数字行或末尾带"组\d+"的行被合并（如三中三的"06-17-39组12"）
        if (listPartR && (/^[\d\s\.\-\－\—，,、]+$/.test(listPartR) || /组\d+\s*$/.test(slNormR))) {
          for (var pi = si - 1; pi >= 0; pi--) {
            if (subLines[pi]) {
              subLines[pi] = subLines[pi] + '，' + subLines[si];
              subLines[si] = '';
              break;
            }
          }
        }
      }
    }
    // 过滤被合并掉的空行
    for (var si = subLines.length - 1; si >= 0; si--) {
      if (!subLines[si]) subLines.splice(si, 1);
    }
    var curHKMode = false;
    subLines.forEach(function(sl){
      var segs = splitByModeMarkers(sl);
      if (segs) {
        segs.forEach(function(seg) {
          var mode = seg.isHK;
          expandLine(seg.text).forEach(function(sr){
            var r = processRule(sr);
            if (r) {
              r.msgIndex = lineIdx;
              r.hk = mode;
              msgBet += r.bet;
              betSummary.push(r);
            }
          });
        });
        return;
      }
      // Default: prefix-based mode detection
      var slNoSender = sl.replace(/^[^\d]{1,15}?[：:]\s*/, '').trim();
      if (/^(?:香港|港|香)(?:[\s，：:。、]|[一-鿿\d])/.test(slNoSender) || /香港/.test(slNoSender) || /(?:[\s\d]|^)(?:港|香)(?:$|[\s，：:。、]|[一-鿿])/.test(slNoSender) || /^(?:香港|港|香)[：:\s]*$/.test(sl)) curHKMode = true;
      else if (/^(?:澳门|澳門|澳特|澳|利来|门特|门|新澳|新奥|新)(?:[\s，：:。、]|[一-鿿\d])/.test(slNoSender) || /澳门|澳門/.test(slNoSender) || /(?:[\s\d]|^)(?:澳特|利来|门特|新澳|新奥)(?:$|[\s，：:。、]|[一-鿿])/.test(slNoSender)) curHKMode = false;
      expandLine(sl).forEach(function(sr){
        var r = processRule(sr);
        if (r) {
          r.msgIndex = lineIdx;
          r.hk = curHKMode;
          msgBet += r.bet;
          betSummary.push(r);
        }
      });
    });
    var displayText = useNewFormat ? (groupedMessages[lineIdx].displayText || rawLine) : rawLine;
    messageSummary.push({
      index: lineIdx + 1,
      text: displayText.length > 80 ? displayText.substring(0, 80) + '...' : displayText,
      fullText: displayText,
      totalBet: Math.round(msgBet * 100) / 100
    });
    grandTotal += msgBet;
  });

  return { betSummary, messageSummary, grandTotal: Math.round(grandTotal * 100) / 100, groupedMessages, useNewFormat };
}

// ===== Node.js module export =====
if (typeof module !== "undefined" && module.exports) {
  var _exports = {
    ZODIAC_MAP, ALL_ZODIACS, ZODIAC_CHARS, CN, CNK, KW,
    cn, parseCNNum, isMsgDateLine,
    stripSender, stripMacau, stripHK, expandDot,
    norm, C, combinations,
    clean, splitBets, getVal, getList, splitItems, getTargets,
    expandDashGe, expandLine,
    processRule, analyze
  };
  for (var _k in _exports) { global[_k] = _exports[_k]; }
  module.exports = _exports;
}
