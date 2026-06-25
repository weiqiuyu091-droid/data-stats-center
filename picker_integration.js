// ===== 挑码数据集成模块 =====
// 用途: 将 macaulottery.com/picker 抓取的数据整合到投注分析系统
// 用法: 在 fsaf.html 中 <script src="picker_integration.js"></script>

(function() {
'use strict';

// ===== 生肖映射 (与主系统一致) =====
const ZODIAC_MAP = {
  马:["01","13","25","37","49"],蛇:["02","14","26","38"],龙:["03","15","27","39"],
  兔:["04","16","28","40"],虎:["05","17","29","41"],牛:["06","18","30","42"],
  鼠:["07","19","31","43"],猪:["08","20","32","44"],狗:["09","21","33","45"],
  鸡:["10","22","34","46"],猴:["11","23","35","47"],羊:["12","24","36","48"]
};
const ALL_ZODIACS = ["马","蛇","龙","兔","虎","牛","鼠","猪","狗","鸡","猴","羊"];

// ===== 存储的外部挑码数据 =====
let pickerExternalData = null;
let pickerReference = {
  hotNumbers: [],    // 热门号码
  coldNumbers: [],   // 冷门号码
  missing: [],       // 遗漏号码
  recommend: [],     // 推荐号码
  zodiacHot: {},     // 热门生肖
  frequency: {},     // 出现频率 (号码→次数)
  lastUpdated: null
};

// ===== 数据加载 =====
function loadPickerData(jsonData) {
  try {
    const raw = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    pickerExternalData = raw;

    // 尝试从多种数据结构中提取信息
    const sources = [
      raw,                                    // 顶层
      raw.pickerData,                         // picker专用
      raw.data,                               // 通用data
      raw.result,                             // 通用result
    ];

    sources.forEach(src => {
      if(!src) return;
      extractNumbers(src);
      extractZodiacStats(src);
      extractFrequency(src);
      extractMissing(src);
    });

    // 扫描API响应
    if(raw.api && Array.isArray(raw.api)) {
      raw.api.forEach(apiEntry => {
        if(apiEntry.data) {
          extractNumbers(apiEntry.data);
          extractZodiacStats(apiEntry.data);
          extractFrequency(apiEntry.data);
        }
      });
    }

    // 扫描DOM数据
    if(raw.dom && raw.dom.numbers1to49) {
      mergeIfBetter('dom', raw.dom.numbers1to49);
    }

    pickerReference.lastUpdated = new Date().toISOString();
    return true;
  } catch(e) {
    console.error('Picker data load error:', e);
    return false;
  }
}

function extractNumbers(obj) {
  // 热门号码
  ['hotNumbers','hot','hots','hotNums'].forEach(k => {
    if(obj[k] && Array.isArray(obj[k])) {
      pickerReference.hotNumbers = [...new Set([...pickerReference.hotNumbers, ...normalizeNums(obj[k])])];
    }
  });

  // 冷门号码
  ['coldNumbers','cold','colds','coldNums'].forEach(k => {
    if(obj[k] && Array.isArray(obj[k])) {
      pickerReference.coldNumbers = [...new Set([...pickerReference.coldNumbers, ...normalizeNums(obj[k])])];
    }
  });

  // 推荐号码
  ['recommend','recommendNumbers','picks','selected','suggest'].forEach(k => {
    if(obj[k] && Array.isArray(obj[k])) {
      pickerReference.recommend = [...new Set([...pickerReference.recommend, ...normalizeNums(obj[k])])];
    }
  });
}

function extractZodiacStats(obj) {
  // 生肖热/冷
  ['zodiacHot','hotZodiacs','zodiacStats'].forEach(k => {
    if(obj[k]) {
      const data = obj[k];
      if(Array.isArray(data)) {
        data.forEach(z => {
          if(typeof z === 'string' && ZODIAC_MAP[z]) {
            pickerReference.zodiacHot[z] = (pickerReference.zodiacHot[z]||0) + 1;
          }
        });
      } else if(typeof data === 'object') {
        Object.assign(pickerReference.zodiacHot, data);
      }
    }
  });
}

function extractFrequency(obj) {
  ['frequency','freq','counts','appearances'].forEach(k => {
    if(obj[k] && typeof obj[k] === 'object') {
      const freq = obj[k];
      Object.keys(freq).forEach(key => {
        const n = normalizeNum(key);
        if(n) pickerReference.frequency[n] = (pickerReference.frequency[n]||0) + (parseInt(freq[key])||0);
      });
    }
  });
}

function extractMissing(obj) {
  ['missing','missingNumbers','omission','coldMissing'].forEach(k => {
    if(obj[k] && Array.isArray(obj[k])) {
      pickerReference.missing = [...new Set([...pickerReference.missing, ...normalizeNums(obj[k])])];
    }
  });
}

function normalizeNums(arr) {
  return arr.map(n => normalizeNum(n)).filter(Boolean);
}

function normalizeNum(n) {
  if(typeof n === 'number') {
    return n>=1 && n<=49 ? n.toString().padStart(2,'0') : null;
  }
  if(typeof n === 'string') {
    const m = n.match(/(\d{1,2})/);
    if(m) {
      const num = parseInt(m[1]);
      return num>=1 && num<=49 ? num.toString().padStart(2,'0') : null;
    }
  }
  return null;
}

function mergeIfBetter(src, arr) {
  if(!arr || !arr.length) return;
  // DOM来源的号码列表可能是当前页面显示的所有号码
  if(!pickerReference.recommend.length) {
    pickerReference.recommend = normalizeNums(arr);
  }
}

// ===== 生成挑码参考建议 =====
function generatePickerRecommendations(allBets, liveResult) {
  const suggestions = [];

  // 1. 基于已有投注，提示遗漏的热门号码
  if(pickerReference.hotNumbers.length && allBets) {
    const betNums = new Set(Object.keys(allBets).filter(k => allBets[k] > 0));
    const missedHot = pickerReference.hotNumbers.filter(n => !betNums.has(n));
    if(missedHot.length) {
      suggestions.push({
        type: 'hot_missed',
        label: '热门未投注',
        numbers: missedHot,
        priority: 'high'
      });
    }
  }

  // 2. 推荐号码与当前投注的对比
  if(pickerReference.recommend.length && allBets) {
    const betNums = new Set(Object.keys(allBets).filter(k => allBets[k] > 0));
    const matched = pickerReference.recommend.filter(n => betNums.has(n));
    const notBet = pickerReference.recommend.filter(n => !betNums.has(n));
    if(notBet.length) {
      suggestions.push({
        type: 'recommend_missed',
        label: '推荐未覆盖',
        numbers: notBet,
        priority: 'medium'
      });
    }
    if(matched.length) {
      suggestions.push({
        type: 'recommend_matched',
        label: '推荐已覆盖',
        numbers: matched,
        priority: 'info'
      });
    }
  }

  // 3. 遗漏号码预警
  if(pickerReference.missing.length) {
    suggestions.push({
      type: 'missing',
      label: '长期遗漏',
      numbers: pickerReference.missing,
      priority: 'low'
    });
  }

  // 4. 冷热对比分析
  if(pickerReference.hotNumbers.length && pickerReference.coldNumbers.length) {
    suggestions.push({
      type: 'hot_cold',
      label: '冷热对比',
      hot: pickerReference.hotNumbers,
      cold: pickerReference.coldNumbers,
      priority: 'info'
    });
  }

  return suggestions;
}

// ===== 基于挑码数据补齐投注建议 =====
function generateMissingBets(allBets, flatBets) {
  const missing = [];
  const betNums = new Set(Object.keys(allBets).filter(k => allBets[k] > 0));
  const betZodiacs = new Set(Object.keys(flatBets).filter(k => flatBets[k] > 0));

  // 检查热门号码是否覆盖
  pickerReference.hotNumbers.forEach(n => {
    if(!betNums.has(n)) {
      missing.push({type:'hot_number', target:n, label:`热门号${n}未投注`});
    }
  });

  // 检查推荐号码
  pickerReference.recommend.forEach(n => {
    if(!betNums.has(n)) {
      missing.push({type:'recommend_number', target:n, label:`推荐号${n}未投注`});
    }
  });

  // 检查热门生肖
  Object.keys(pickerReference.zodiacHot).forEach(z => {
    if(!betZodiacs.has(z) && pickerReference.zodiacHot[z] >= 2) {
      missing.push({type:'hot_zodiac', target:z, label:`热门生肖${z}未投注`});
    }
  });

  return missing;
}

// ===== 渲染挑码参考面板 =====
function renderPickerPanel(containerId, allBets, flatBets, liveResult) {
  const container = document.getElementById(containerId);
  if(!container) return;

  if(!pickerExternalData) {
    container.innerHTML = '<div style="color:#64748b;font-size:.75rem;text-align:center;padding:20px;">暂无挑码数据<br>请先导入 macaulottery.com/picker 数据</div>';
    return;
  }

  const suggestions = generatePickerRecommendations(allBets, flatBets);
  const missingBets = generateMissingBets(allBets, flatBets);

  let html = `<div style="font-size:.75rem;">`;

  // 数据时间
  html += `<div style="color:#64748b;margin-bottom:8px;">数据更新: ${pickerReference.lastUpdated||'未知'}</div>`;

  // 热门号码条
  if(pickerReference.hotNumbers.length) {
    html += `<div style="margin-bottom:6px;"><span style="color:#ef4444;">🔥热门:</span> `;
    html += pickerReference.hotNumbers.map(n => `<span style="background:#1e293b;border:1px solid #ef4444;padding:1px 5px;border-radius:3px;margin:1px;">${n}</span>`).join(' ');
    html += `</div>`;
  }

  // 冷门号码条
  if(pickerReference.coldNumbers.length) {
    html += `<div style="margin-bottom:6px;"><span style="color:#3b82f6;">❄冷门:</span> `;
    html += pickerReference.coldNumbers.map(n => `<span style="background:#1e293b;border:1px solid #3b82f6;padding:1px 5px;border-radius:3px;margin:1px;">${n}</span>`).join(' ');
    html += `</div>`;
  }

  // 推荐号码条
  if(pickerReference.recommend.length) {
    html += `<div style="margin-bottom:6px;"><span style="color:#22c55e;">⭐推荐:</span> `;
    html += pickerReference.recommend.map(n => `<span style="background:#1e293b;border:1px solid #22c55e;padding:1px 5px;border-radius:3px;margin:1px;">${n}</span>`).join(' ');
    html += `</div>`;
  }

  // 遗漏号码
  if(pickerReference.missing.length) {
    html += `<div style="margin-bottom:6px;"><span style="color:#f59e0b;">⏳遗漏:</span> `;
    html += pickerReference.missing.map(n => `<span style="background:#1e293b;border:1px solid #f59e0b;padding:1px 5px;border-radius:3px;margin:1px;">${n}</span>`).join(' ');
    html += `</div>`;
  }

  // 建议列表
  if(suggestions.length) {
    html += `<div style="margin-top:8px;border-top:1px solid #334155;padding-top:8px;">`;
    html += `<div style="color:#94a3b8;margin-bottom:4px;">📋 分析建议:</div>`;
    suggestions.forEach(s => {
      const color = s.priority==='high'?'#ef4444':s.priority==='medium'?'#f59e0b':'#64748b';
      html += `<div style="color:${color};margin:2px 0;font-size:.7rem;">• ${s.label}: ${(s.numbers||[]).join(', ')}</div>`;
    });
    html += `</div>`;
  }

  // 缺失投注提示
  if(missingBets.length) {
    html += `<div style="margin-top:8px;border-top:1px solid #334155;padding-top:8px;">`;
    html += `<div style="color:#fbbf24;margin-bottom:4px;">⚠ 以下项目在挑码数据中有建议但未在投注中出现:</div>`;
    missingBets.forEach(m => {
      html += `<div style="color:#fbbf24;margin:2px 0;font-size:.7rem;">• ${m.label}</div>`;
    });
    html += `</div>`;
  }

  // 频率统计表
  if(Object.keys(pickerReference.frequency).length) {
    html += `<div style="margin-top:8px;border-top:1px solid #334155;padding-top:8px;">`;
    html += `<div style="color:#94a3b8;margin-bottom:4px;">📊 出现频率 (Top 10):</div>`;
    const sorted = Object.entries(pickerReference.frequency)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 10);
    sorted.forEach(([n, freq]) => {
      html += `<span style="display:inline-block;margin:2px;padding:2px 6px;background:#1e293b;border-radius:3px;font-size:.7rem;">${n}: ${freq}次</span>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// ===== 文件导入处理 =====
function setupFileImport(inputId) {
  const input = document.getElementById(inputId);
  if(!input) return;

  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
      const text = ev.target.result;
      const success = loadPickerData(text);
      if(success) {
        alert(`挑码数据导入成功!\n热门: ${pickerReference.hotNumbers.length}个\n推荐: ${pickerReference.recommend.length}个\n遗漏: ${pickerReference.missing.length}个`);
        // 触发自定义事件通知主系统刷新
        window.dispatchEvent(new CustomEvent('pickerDataLoaded', {detail: pickerReference}));
      } else {
        alert('数据导入失败：格式无法识别。请确保文件来自 picker_scraper.html 导出。');
      }
    };
    reader.readAsText(file);
  });
}

// ===== 从DOM直接提取(如果当前页面就是picker) =====
function extractFromCurrentPage() {
  const result = {
    numbers: [],
    hotZodiacs: [],
    stats: {}
  };

  // 查找当前页面中的号码元素
  const selectors = ['.ball','.number','.num','.code','[class*="ball"]','[class*="number"]'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const t = el.textContent.trim();
      if(/^\d{1,2}$/.test(t) && parseInt(t)>=1 && parseInt(t)<=49) {
        result.numbers.push(t.padStart(2,'0'));
      }
    });
  });

  return result;
}

// ===== 导出API =====
window.PickerIntegration = {
  loadPickerData,
  generatePickerRecommendations,
  generateMissingBets,
  renderPickerPanel,
  setupFileImport,
  extractFromCurrentPage,
  getReference: () => pickerReference,
  hasData: () => !!pickerExternalData
};

})();
