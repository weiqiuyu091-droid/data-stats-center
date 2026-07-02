// 完整解析测试 - 模拟 fsaf.html 核心逻辑
const fs = require('fs');

// 加载当前开奖数据
const rawJson = fs.readFileSync('D:/686/lottery_result.json', 'utf-8').replace(/^﻿/, '');
const lotteryData = JSON.parse(rawJson);
let liveResult;
if (lotteryData.numbers) {
  liveResult = {
    numbers: lotteryData.numbers,
    teMa: lotteryData.teMa,
    flatZodiacs: lotteryData.flatZodiacs
  };
} else if (Array.isArray(lotteryData)) {
  const d = lotteryData[0] || lotteryData;
  liveResult = {
    numbers: d.openCode ? d.openCode.split(',').map(s => s.trim()) : [],
    teMa: d.openCode ? d.openCode.split(',').map(s => s.trim())[6] || '' : '',
    flatZodiacs: d.zodiac ? [...new Set(d.zodiac.split(',').map(s => s.trim()))] : []
  };
}

console.log('开奖数据:', JSON.stringify(liveResult));

const ZODIAC_MAP = {
  马:["01","13","25","37","49"],蛇:["02","14","26","38"],龙:["03","15","27","39"],
  兔:["04","16","28","40"],虎:["05","17","29","41"],牛:["06","18","30","42"],
  鼠:["07","19","31","43"],猪:["08","20","32","44"],狗:["09","21","33","45"],
  鸡:["10","22","34","46"],猴:["11","23","35","47"],羊:["12","24","36","48"]
};
const ALL_ZODIACS = ["马","蛇","龙","兔","虎","牛","鼠","猪","狗","鸡","猴","羊"];
const ZODIAC_CHARS = ALL_ZODIACS.join('');
const NUM_TO_ZODIAC = {};
ALL_ZODIACS.forEach(z => ZODIAC_MAP[z].forEach(n => NUM_TO_ZODIAC[n] = z));

const CN = {
  一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,
  十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,
  二十:20,廿:20,廿一:21,廿二:22,廿三:23,廿四:24,廿五:25,廿六:26,廿七:27,廿八:28,廿九:29,
  三十:30,卅:30,卅一:31,卅二:32,卅三:33,卅四:34,卅五:35,卅六:36,卅七:37,卅八:38,卅九:39,
  四十:40,四十一:41,四十二:42,四十三:43,四十四:44,四十五:45,四十六:46,四十七:47,四十八:48,四十九:49,
  五十:50,五十一:51,五十二:52,五十三:53,五十四:54,五十五:55,五十六:56,五十七:57,五十八:58,五十九:59,
  六十:60,六十一:61,六十二:62,六十三:63,六十四:64,六十五:65,六十六:66,六十七:67,六十八:68,六十九:69,
  七十:70,七十一:71,七十二:72,七十三:73,七十四:74,七十五:75,八十:80,九十:90,一百:100,一百五:150,一百五十:150,一百五十五:155,两百:200
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
function stripSender(s){ return s.replace(/^[^\d]{1,15}?[：:]\s*/,'').trim(); }
function stripMacau(s){ return s.replace(/^(?:新澳门|新奥|新澳|澳门|澳門|澳特|澳|利来|门特|门|新)\s*[:：]?\s*/i,'').replace(/^[：:,，\s]+/,'').trim(); }
function stripHK(s){ return s.replace(/^(?:香港|港|香)\s*[:：]?\s*/i,'').replace(/^[：:,，\s]+/,'').trim(); }

const ODDS_TM = 47;
const ODDS_PT_MA = 1.8;
const ODDS_PT_OTHER = 2;
const ODDS_TX_MA = 10;
const ODDS_TX_OTHER = 11;
const ODDS_2 = 5.5;
const ODDS_3 = 28;
const ODDS_N3 = 600;
const ODDS_N2 = 65;

function C(n,k){ if(k>n||k<0)return 0; if(k===0||k===n)return 1; let r=1; for(let i=1;i<=k;i++) r=r*(n-i+1)/i; return r; }
function combinations(arr,k){
  if(k===0)return [[]]; if(arr.length<k)return[];
  const r=[]; for(let i=0;i<=arr.length-k;i++){ const f=arr[i]; combinations(arr.slice(i+1),k-1).forEach(c=>r.push([f,...c])); }
  return r;
}

function norm(s){
  let t = s.replace(/[+＋]/g,'').replace(/。/g,'')
    .replace(/免/g,'兔').replace(/于一肖/g,'一肖')
    .replace(/候/g,'猴')
    .replace(/元/g,'块')
    .replace(/复试/g,'复式')
    .replace(/\d+期\s*/g,'')
    .replace(/号个/g,'号各').replace(/号各/g,'各数').replace(/名数/g,'各数').replace(/号\/(\d)/g,'号$1')
    .replace(/蚊/g,'')
    .replace(/(\d{1,2})到(\d{1,2})/g, function(m, a, b){ var r=[]; for(var i=parseInt(a);i<=parseInt(b);i++) r.push(i.toString().padStart(2,'0')); return r.join(' '); })
	    .replace(/(\d)头/g, function(m, d){ var r=[]; for(var i=0;i<=9;i++){ var n=parseInt(d)*10+i; if(n>=1&&n<=49) r.push(n.toString().padStart(2,'0')); } return r.join(' '); })
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
    .replace(new RegExp(`([${ZODIAC_CHARS}]+)各肖\\s*(\\d+(?:\\.\\d+)?)`,'g'), function(m, zs, v){
      return zs.split('').map(function(z){ return '特肖'+z+' '+v; }).join(' ');
    })
    .replace(new RegExp(`([${ZODIAC_CHARS}])肖`,'g'), '$1')
    .replace(/(\d{1,2})\s*([一二三四五六七八九十百千万廿卅两百]+)\s*(斤|米|块)/g, (m,n1,n2,n3)=>n1+'各'+cn(n2)+n3)
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
	t = t.replace(/复式(二连|三连|四连|五连)\s*各组(\d+(?:\.\d+)?)/g, '复式$1 $2');
  t = t.replace(/各([一二三四五六七八九十百千万廿卅两百]+)/g, function(m, cnVal){
    var v = cn(cnVal) || parseCNNum(cnVal);
    return '各' + (v || '');
  });
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
  return t;
}

const KW = '(?:各数|个数|各号|号|个(?!组)|各(?!组))';

function getVal(txt){
  const n=norm(txt);
  let m=n.match(new RegExp(`\\s*${KW}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(m) return parseFloat(m[1]);
  m=n.match(new RegExp(`\\s*${KW}\\s*([\\u4e00-\\u9fa5]+)\\s*(?:斤|米|块)?\\s*$`));
  if(m){ const v=cn(m[1])||parseCNNum(m[1]); if(v>0) return v; }
  if(!/各/.test(n)){
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

function clean(s){ return s.replace(/^[、，,\s\-－—ㅤ]+/,'').replace(/[、，,。.\s\-－—ㅤ]+$/,'').replace(/[。]/g,'').trim(); }
function expandDot(s){ return s.replace(/(\d{1,2})\.(?=\d{1,2})/g,'$1 '); }

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
  const items=ex.split(/[.\/、,\s，\-－—]+/).filter(i=>i!=='');
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

function isHK(r){ return /香港|港|香/.test(r); }

function splitBets(seg){
  const ends = new Set();
  const ps = [
    new RegExp(`\\s*${KW}\\s*(?:[\\u4e00-\\u9fa5]+|\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?`,'gi'),
    new RegExp(`(?:二连|三连|四连|五连)\\s*平?\\s*[${ZODIAC_CHARS}]+\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?`,'gi'),
    new RegExp(`[${ZODIAC_CHARS}]+(?:二连|三连|四连|五连)\\s*\\d+(?:\\.\\d+)?\\s*(?:斤|米|块)?`,'g'),
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

function expandLine(l){
  const s=norm(stripHK(stripMacau(stripSender(l))));
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
  return splitBets(s).map(p=>{ const c=clean(p); return c||null; }).filter(Boolean);
}

function processRule(rawRule){
  const rule=clean(rawRule); if(!rule) return null;
  const hk=isHK(rule);
  const txt=norm(stripHK(stripMacau(stripSender(rule))));
  const txtNoHK=txt.replace(/香港|香|港/g,'').trim();

  // Size/Parity
  const spm=txtNoHK.match(new RegExp(`^(大|小|单|双)\\s*${KW}\\s*([\\d\\u4e00-\\u9fa5]+)\\s*(?:斤|米|块)?\\s*$`));
  if(spm){
    const v=/^\d/.test(spm[2])?parseFloat(spm[2]):cn(spm[2])||parseCNNum(spm[2]);
    if(v){ const pool={大:['25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49'],小:['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24'],单:['01','03','05','07','09','11','13','15','17','19','21','23','25','27','29','31','33','35','37','39','41','43','45','47','49'],双:['02','04','06','08','10','12','14','16','18','20','22','24','26','28','30','32','34','36','38','40','42','44','46','48']};
      const nums=pool[spm[1]]||[]; return {display:`${hk?'HK':''}${spm[1]}各数${v}`, bet:v*nums.length, type:'nums', targets:nums}; }
  }

  // Wave color combined (simplified)
  const wcRe = new RegExp('^([红绿蓝]{1,3})\\s*波?\\s*([单双大小]+)\\s*' + KW + '\\s*(\\d+(?:\\.\\d+)?)([A-Za-z])?\\s*(?:斤|米|块)?\\s*$');
  const wcm = txtNoHK.match(wcRe);
  if(wcm){
    const WAVE_COLOR_MAP = {红波:["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"],绿波:["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"],蓝波:["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"]};
    const WAVE_COLORS = {"红":"红波","绿":"绿波","蓝":"蓝波"};
    const SIZE_PARITY_MAP = {单:['01','03','05','07','09','11','13','15','17','19','21','23','25','27','29','31','33','35','37','39','41','43','45','47','49'],双:['02','04','06','08','10','12','14','16','18','20','22','24','26','28','30','32','34','36','38','40','42','44','46','48'],大:['25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49'],小:['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24']};
    const colors = wcm[1], attrs = wcm[2], val = parseFloat(wcm[3]);
    if(val){
      let waveSet = new Set();
      for(let c of colors){ const ck = WAVE_COLORS[c]; if(ck && WAVE_COLOR_MAP[ck]) WAVE_COLOR_MAP[ck].forEach(n => waveSet.add(n)); }
      for(let a of attrs){ const attrNums = SIZE_PARITY_MAP[a]; if(!attrNums) continue; const attrSet = new Set(attrNums); waveSet = new Set([...waveSet].filter(n => attrSet.has(n))); }
      const targets = [...waveSet].sort((a,b)=>parseInt(a)-parseInt(b));
      if(targets.length){ return {display:`${hk?'HK':''}${colors}${attrs}各数${val}`, bet:val*targets.length, type:'nums', targets}; }
    }
  }

  // 平特X尾
  var ptTailM = txtNoHK.match(new RegExp(`^平特\\s*(\\d)尾\\s*下?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(ptTailM){
    const TAIL_MAP={'0':[],'1':[],'2':[],'3':[],'4':[],'5':[],'6':[],'7':[],'8':[],'9':[]};
    for(let d=0;d<=9;d++){ const k=d.toString(); for(let n=1;n<=49;n++) if(n%10===d) TAIL_MAP[k].push(n.toString().padStart(2,'0')); }
    var tailDigit = ptTailM[1], flatTotal = parseFloat(ptTailM[2]), tailNums = TAIL_MAP[tailDigit] || [];
    if(tailNums.length){ return {display:'平特'+tailDigit+'尾 '+flatTotal, bet:flatTotal, type:'nums', targets:tailNums}; }
  }

  // Tail
  if(txtNoHK.includes('尾')){
    const TAIL_MAP={'0':[],'1':[],'2':[],'3':[],'4':[],'5':[],'6':[],'7':[],'8':[],'9':[]};
    for(let d=0;d<=9;d++){ const k=d.toString(); for(let n=1;n<=49;n++) if(n%10===d) TAIL_MAP[k].push(n.toString().padStart(2,'0')); }
    const tailList = getList(txtNoHK), tailVal = getVal(txtNoHK);
    if(tailList && tailVal){
      const tailDigitMatches = tailList.match(/(\d)尾/g);
      let tailDigits = tailDigitMatches ? tailDigitMatches.map(function(m){ return m.replace('尾',''); }) : [];
      const remaining = tailList.replace(/(\d)尾/g,'').replace(/尾/g,'');
      const extraDigits = remaining.match(/\d/g) || [];
      tailDigits = [...new Set([...tailDigits, ...extraDigits])];
      const tailTargets = [];
      tailDigits.forEach(function(d){ if(TAIL_MAP[d]) tailTargets.push(...TAIL_MAP[d]); });
      if(tailTargets.length){ return {display: tailDigits.join('-')+'尾各'+tailVal, bet:tailVal*tailTargets.length, type:'nums', targets:tailTargets}; }
    }
  }

  // Number combo
  if(txtNoHK.includes('三中三') || txtNoHK.includes('二中二')){
    const ncm=txtNoHK.match(/([\d]{1,2}(?:[.\s,]+[\d]{1,2})*)\s*(?:[复復]试|[复復]式)?\s*(三中三|二中二)\s*(?:各组?\s*)?(.+)$/);
    if(ncm){
      const nums=[...new Set(ncm[1].split(/[.\s,]+/).filter(n=>/^\d{1,2}$/.test(n)).map(n=>n.padStart(2,'0')))];
      const k=ncm[2]==='三中三'?3:2;
      if(nums.length>=k){
        let vs=ncm[3].replace(/^[个各]组?\s*/,'').replace(/\s*(?:斤|米|块)\s*$/,'').trim();
        let val=/^\d+(?:\.\d+)?$/.test(vs)?parseFloat(vs):(cn(vs)||parseCNNum(vs)||0);
        if(val>0){
          const cc=C(nums.length,k);
          const odds=k===3?ODDS_N3:ODDS_N2;
          return {display:`${hk?'HK':''}${ncm[1]}${k===3?'三中三':'二中二'} ${val}(${cc}组)`, bet:cc*val, type:k===3?'n3':'n2', numbers:nums, comboCount:cc, perUnit:val, k, odds};
        }
      }
    }
  }

  // Combo
  let cm=txtNoHK.match(new RegExp(`(?:二连|三连|四连|五连)\\s*平?\\s*([${ZODIAC_CHARS}]+)\\s*各?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?`));
  if(!cm) cm=txtNoHK.match(new RegExp(`([${ZODIAC_CHARS}]+)(?:五连|四连|三连|二连)\\s*各?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?`));
  if(cm){
    const zStr=cm[1], cv=parseFloat(cm[2]);
    let ct='double';
    if(txtNoHK.includes('五连')||(zStr.length===5&&!txtNoHK.includes('三连')&&!txtNoHK.includes('四连'))) ct='quintuple';
    else if(txtNoHK.includes('四连')||(zStr.length===4&&!txtNoHK.includes('三连')&&!txtNoHK.includes('五连'))) ct='quadruple';
    else if(txtNoHK.includes('三连')) ct='triple';
    const zs=zStr.split('');
    const typeName=ct==='quintuple'?'五连':ct==='quadruple'?'四连':ct==='triple'?'三连':'二连';
    return {display:`${hk?'HK':''}${zStr}${typeName} ${cv}`, bet:cv, type:'combo', comboZodiacs:zStr, comboType:ct};
  }

  // Flat reverse: 虎平200
  var frm = txtNoHK.match(new RegExp(`^([${ZODIAC_CHARS}])\\s*平\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(frm){ var zs=[frm[1]], v=parseFloat(frm[2]); return {display:`${hk?'HK':''}平特${frm[1]} ${v}`, bet:v, type:'flat', targets:zs}; }

  // Flat 平特
  let fm=txtNoHK.match(new RegExp(`^平特[，,\\s]*([${ZODIAC_CHARS}]+)\\s*[，,、]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(!fm) fm=txtNoHK.match(new RegExp(`^平特[，,\\s]*([${ZODIAC_CHARS}]+)\\s*${KW}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(!fm) fm=txtNoHK.match(new RegExp(`^平特[，,\\s]*([${ZODIAC_CHARS}]+)\\s+(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(fm){ const zs=[...fm[1]], v=parseFloat(fm[2]); return {display:`${hk?'HK':''}平特${fm[1]} ${v}`, bet:v*zs.length, type:'flat', targets:zs}; }

  // 特肖
  let txm = txtNoHK.match(new RegExp(`^特肖([${ZODIAC_CHARS}])\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(!txm) txm = txtNoHK.match(new RegExp(`^特肖\\s*([${ZODIAC_CHARS}](?:\\s*[${ZODIAC_CHARS}])*)\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(txm){ const zs = txm[1].replace(/\s+/g,'').split(''), v = txm[2] ? parseFloat(txm[2]) : getVal(txtNoHK); if(!v) return null; return {display:`特肖${zs.join('')}各${v}`, bet:v*zs.length, type:'special_zodiac', targets:zs}; }

  // Flat shorthand with 各: 平蛇虎各500
  let fgm=txtNoHK.match(new RegExp(`^平\\s*([${ZODIAC_CHARS}]+)\\s*[各/]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(fgm){ var fgzs=[...fgm[1]], fgv=parseFloat(fgm[2]); return {display:`${hk?'HK':''}平特${fgm[1]} ${fgv}`, bet:fgv*fgzs.length, type:'flat', targets:fgzs}; }

  // Flat shorthand without 各
  let fms=txtNoHK.match(new RegExp(`^平([${ZODIAC_CHARS}])\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(!fms) fms=txtNoHK.match(new RegExp(`^平\\s*([${ZODIAC_CHARS}](?:\\s*[${ZODIAC_CHARS}])*)\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:斤|米|块)?\\s*$`));
  if(fms){ const zs=fms[1].replace(/\s+/g,'').split(''), v=fms[2]?parseFloat(fms[2]):getVal(txtNoHK); if(!v) return null; return {display:`${hk?'HK':''}平${fms[1]}各${v}`, bet:v*zs.length, type:'flat', targets:zs}; }

  // Implicit combo
  const icm=txtNoHK.match(new RegExp(`^([${ZODIAC_CHARS}]{2,5})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:斤|米|块)?\\s*$`));
  if(icm){
    const zStr=icm[1], zv=parseFloat(icm[2]);
    let ct='double';
    if(zStr.length===5) ct='quintuple'; else if(zStr.length===4) ct='quadruple'; else if(zStr.length===3) ct='triple';
    const zs=zStr.split('');
    const typeName=ct==='quintuple'?'五连':ct==='quadruple'?'四连':ct==='triple'?'三连':'二连';
    return {display:`${hk?'HK':''}${zStr}${typeName} ${zv}`, bet:zv, type:'combo', comboZodiacs:zStr, comboType:ct};
  }

  const value=getVal(txtNoHK); if(!value) return null;
  const lp=getList(txtNoHK), items=splitItems(lp), targets=getTargets(items);
  if(!targets.length) return null;
  return {display:`${hk?'HK':''}${targets.join('.')} 各${value}(${targets.length}码)`, bet:value*targets.length, type:'nums', targets};
}

// ===== Main logic =====
const input = `ㅤ: 42.15.33.01.31.18.47.26复试二中二各组十斤
ㅤ: 07,14,16,17,19,25,28,29,46,49各数二十斤
ㅤ: 07,16,17,25,29各数50斤
ㅤ: 03 15 27 21 33 09 18 30 06 04 16 28各十
ㅤ: 05.09.03.12.10各数20
ㅤ:香港 30.32.25.36.33各数10
香港平牛300
ㅤ: 澳门08.20.44.24.48.38.27各10米32.12.36.02.14.26.03各5米
ㅤ: 鼠，兔，各号十斤 40.43.各二十斤
ㅤ: 07,14,16,17,19,25,28,29,46,49各十斤
ㅤ: 03.06.10.13.25.27.36.37.38.39.40.02.09.13.23.44.05.16.17.34.41.42.45.19.20.29.30.31 .11各十斤
ㅤ: 猪，狗，各十斤
ㅤ: 三连猪鸡猴 四连猪鸡羊鼠 五连牛猪鸡羊蛇各组五十
ㅤ: 平特鸡猪各100
ㅤ: 牛,虎,兔,马,鸡,狗,猪,猴.鼠个数十斤
ㅤ: 牛兔猴马狗蛇鸡鼠各数十斤
ㅤ: 13十斤
ㅤ: 平猴鸡各一百
ㅤ: 40 12 27 5 33 19 46 8 21 36 3 17 49 24 11 30 7 42 15 38 25各十斤
ㅤ: 猴狗牛猪各数五米
ㅤ: 08 10 13 15 18 20 22 25 29 30 32 33 39 42 45 49个十斤
ㅤ: 01.03.15.32.33.35.36.39.43.45.48.49.44各10 15.39各20
ㅤ: 05.17.29.07.19.43.25.37.49各10斤
ㅤ: 10.22.34.46各30米 01.13.25.37.49.11.23.35.47各3米
ㅤ: 鼠牛虎猴狗猪鸡兔个数十斤
ㅤ: 04.16.08.20.19.31.43各5
ㅤ: 香港：兔 各数5斤
ㅤ: 平龙400，15各五十斤
ㅤ: 鼠兔猪各数5
ㅤ: 21-27-39各5斤 06-18-30-42各4斤
ㅤ: 04.16.24.40.31.41各5斤
ㅤ: 10.34.46.22各10
ㅤ: 澳门05/10米
ㅤ: 鼠兔猪各数4斤
ㅤ: 33-47-35-12个20米
ㅤ: 03-37-42-48-32-33-39-44 各10-15-20-25-26-11-16-17-27-28-04-43-41各5
19, 22, 32, 33, 42, 43, 45, 46, 49各10`;

const text=input.replace(/\r\n/g,'\n').replace(/　/g,' ').replace(/[ \t]+/g,' ');
const rawLines=text.split(/\n/).map(l=>l.trim()).filter(Boolean);

const betSummary = [], hkBetSummary = [];
let totalBetAll = 0;

rawLines.forEach(function(rawLine, lineIdx){
  var msgBet = 0;
  const subLines=rawLine.replace(/(\d)。(\d)/g, '$1.$2').replace(/([^斤米块\d])。(\d)/g, '$1$2').split(/[；;·。]/).map(function(l){ return l.trim(); }).filter(Boolean);
  var curHKMode = false;
  subLines.forEach(function(sl){
    var slNoSender = sl.replace(/^[^\d]{1,15}?[：:]\s*/,'').trim();
    if(/^(?:香港|港|香)[\s，：:。、]/.test(slNoSender)) curHKMode = true;
    else if(/^(?:澳门|澳門|澳特|澳|利来|门特|门|新澳|新奥|新)[\s，：:。、]/.test(slNoSender)) curHKMode = false;
    expandLine(sl).forEach(function(sr){
      const r=processRule(sr);
      if(r){
        r.msgIndex = lineIdx;
        r.hk = curHKMode;
        msgBet += r.bet;
        if(curHKMode){ hkBetSummary.push(r); }
        else { betSummary.push(r); }
        totalBetAll += r.bet;
      }
    });
  });
  console.log(`L${String(lineIdx+1).padStart(2,'0')}: ${String(msgBet).padStart(4)} | ${rawLine.substring(0,70)}`);
});

console.log('总投注额:', Math.round(totalBetAll*100)/100);
console.log('澳门盘:', betSummary.length, '条, 投注额:', Math.round(betSummary.reduce((a,r)=>a+r.bet,0)*100)/100);
console.log('香港盘:', hkBetSummary.length, '条, 投注额:', Math.round(hkBetSummary.reduce((a,r)=>a+r.bet,0)*100)/100);
console.log('');

// Settlement
if(liveResult && liveResult.numbers){
  const winNums = liveResult.numbers;
  const teMa = liveResult.teMa;
  const winFlat = liveResult.flatZodiacs;

  console.log('开奖号码:', winNums.join(','), '特码:', teMa);
  console.log('开出平特:', winFlat.join(','));
  console.log('');

  function settleRow(s){
    let win = 0, odds = 0, note = '', hitBet = 0;
    if(s.type==='nums'){
      odds = ODDS_TM;
      const perBet = s.targets.length>0 ? s.bet/s.targets.length : s.bet;
      s.targets.forEach(t=>{
        if(t === teMa){ win += perBet * ODDS_TM; hitBet += perBet; }
      });
      if(hitBet > 0){ note = `中特码 (${odds}x)`; }
    } else if(s.type==='flat'){
      const perBet = s.targets.length>0 ? s.bet/s.targets.length : s.bet;
      let hitZs = [];
      s.targets.forEach(z=>{
        if(winFlat.includes(z)){
          odds = z==='马' ? ODDS_PT_MA : ODDS_PT_OTHER;
          win += perBet * odds;
          hitBet += perBet;
          hitZs.push(z);
        }
      });
      if(hitZs.length){ note = `中${hitZs.join(',')} (平特${odds})`; }
    } else if(s.type==='special_zodiac'){
      const teMaZodiac = NUM_TO_ZODIAC[teMa];
      const perBet = s.targets.length>0 ? s.bet/s.targets.length : s.bet;
      let hitZs = [];
      s.targets.forEach(z=>{
        if(z === teMaZodiac){
          odds = z==='马' ? ODDS_TX_MA : ODDS_TX_OTHER;
          win += perBet * odds;
          hitBet += perBet;
          hitZs.push(z);
        }
      });
      if(hitZs.length){ note = `中${hitZs.join(',')} (特肖${odds}倍)`; }
    } else if(s.type==='n3' || s.type==='n2'){
      const k = s.k;
      odds = s.type==='n3' ? ODDS_N3 : ODDS_N2;
      const regularNums = winNums.filter(function(n){ return n !== teMa; });
      const matchedNums = s.numbers.filter(function(n){ return regularNums.includes(n); });
      if(matchedNums.length >= k){
        const winGroups = C(matchedNums.length, k);
        win = winGroups * s.perUnit * odds;
        hitBet = winGroups * s.perUnit;
        note = `中${winGroups}组(${matchedNums.join(',')}) (${s.type==='n3'?'三中三':'二中二'}${odds}x)`;
      }
    } else if(s.type==='combo'){
      if(s.comboType==='quintuple'){ odds = s.comboZodiacs.includes('马') ? 80 : 100; }
      else if(s.comboType==='quadruple'){ odds = s.comboZodiacs.includes('马') ? 25 : 30; }
      else if(s.comboType==='triple'){ odds = s.comboZodiacs.includes('马') ? 8 : 10; }
      else { odds = s.comboZodiacs.includes('马') ? 3.5 : 4; }
      const drawnZodiacs = new Set(winNums.map(function(n){ return NUM_TO_ZODIAC[n]; }).filter(Boolean));
      const zs = s.comboZodiacs.split('');
      const allHit = zs.every(function(z){ return drawnZodiacs.has(z); });
      if(allHit){
        win = s.bet * odds;
        hitBet = s.bet;
        const typeName=s.comboType==='quintuple'?'五连':s.comboType==='quadruple'?'四连':s.comboType==='triple'?'三连':'二连';
        note = `中${zs.join('')}全中 (${typeName}${odds}x)`;
      }
    }
    const net = win - s.bet;
    return {...s, win:Math.round(win*100)/100, odds, net:Math.round(net*100)/100, note, hitBet:Math.round(hitBet*100)/100};
  }

  let totalBet = 0, totalPayout = 0;
  const allRows = [];

  betSummary.forEach(s=>{
    const r = settleRow(s);
    totalBet += r.bet;
    totalPayout += r.win;
    if(r.note) console.log('澳门中奖:', r.display, '| 投注:', r.bet, '| 中奖额:', r.win, '| 赔率:', r.odds, '|', r.note);
    allRows.push(r);
  });

  hkBetSummary.forEach(s=>{
    const r = settleRow(s);
    totalBet += r.bet;
    totalPayout += r.win;
    if(r.note) console.log('香港中奖:', r.display, '| 投注:', r.bet, '| 中奖额:', r.win, '| 赔率:', r.odds, '|', r.note);
    allRows.push(r);
  });

  const netProfit = totalBet - totalPayout;
  console.log('');
  console.log('===== 结算结果 =====');
  console.log('总收注:', Math.round(totalBet*100)/100);
  console.log('总派彩:', Math.round(totalPayout*100)/100);
  console.log('净收益:', Math.round(netProfit*100)/100);
}
