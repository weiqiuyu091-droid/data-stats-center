// 结算数据导出为 WPS/Excel 兼容的 xlsx 文件
// 用法: node export_xlsx.js                    → 导出所有历史结算
//       node export_xlsx.js <文件路径.txt>     → 导出单个结算文件

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'E:\\shuju';
const ALTERNATE_DIR = path.join(__dirname, 'shuju');

function getDataDir() {
  if (fs.existsSync(DATA_DIR)) return DATA_DIR;
  if (fs.existsSync(ALTERNATE_DIR)) return ALTERNATE_DIR;
  return null;
}

// 解析结算txt文件
function parseSettlementFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const data = {};

  for (const line of lines) {
    const m1 = line.match(/^时间:\s*(.+)/);
    if (m1) data.time = m1[1].trim();
    const m2 = line.match(/^来源:\s*(.+)/);
    if (m2) data.source = m2[1].trim();
    const m3 = line.match(/^客户端:\s*(.+)/);
    if (m3) data.clientId = m3[1].trim();
    const m4 = line.match(/^总收:\s*([\d.]+)/);
    if (m4) data.totalBet = parseFloat(m4[1]);
    const m5 = line.match(/^总派:\s*([\d.]+)/);
    if (m5) data.totalPayout = parseFloat(m5[1]);
    const m6 = line.match(/^盈利:\s*([-\d.]+)/);
    if (m6) data.netProfit = parseFloat(m6[1]);
    const m7 = line.match(/^抽水率:\s*([\d.]+)/);
    if (m7) data.waterRate = parseFloat(m7[1]);
    const m8 = line.match(/^中奖金额:\s*([\d.]+)/);
    if (m8) data.hitAmount = parseFloat(m8[1]);
    const m9 = line.match(/^条目数:\s*([\d.]+)/);
    if (m9) data.itemCount = parseInt(m9[1]);
    const m10 = line.match(/^抽水后盈利:\s*([-\d.]+)/);
    if (m10) data.netAfterWater = parseFloat(m10[1]);
    const m11 = line.match(/^特码:\s*(.+)/);
    if (m11) data.teMa = m11[1].trim();

    // 开奖号码 JSON
    const m12 = line.match(/^开奖号码:\s*(.+)/);
    if (m12) {
      try {
        const win = JSON.parse(m12[1]);
        data.winNumbers = win.numbers ? win.numbers.join(',') : '';
        data.winZodiacs = win.flatZodiacs ? win.flatZodiacs.join(',') : '';
      } catch(e) {}
    }

    // 结算明细行
    const m13 = line.match(/^(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.\-]+)\s*\|\s*([\d.]+)\s*\|\s*([-\d.]+)\s*\|\s*(.*)$/);
    if (m13) {
      if (!data.rows) data.rows = [];
      data.rows.push({
        index: parseInt(m13[1]),
        item: m13[2].trim(),
        bet: parseFloat(m13[3]),
        odds: m13[4].trim(),
        win: parseFloat(m13[5]),
        net: parseFloat(m13[6]),
        note: m13[7].trim()
      });
    }
  }

  // 文件名中的时间戳
  const bn = path.basename(filepath, '.txt');
  const tsMatch = bn.match(/settlement_(.+)/);
  if (tsMatch) data.fileTimestamp = tsMatch[1].replace(/_/g, ' ');

  return data;
}

// 获取波色
function getWaveColor(num) {
  const n = parseInt(num);
  const red = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
  const green = [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49];
  const blue = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
  if (red.includes(n)) return '红波';
  if (green.includes(n)) return '绿波';
  if (blue.includes(n)) return '蓝波';
  return '';
}

// 获取生肖
function getZodiac(num) {
  const map = {
    马:["01","13","25","37","49"],蛇:["02","14","26","38"],龙:["03","15","27","39"],
    兔:["04","16","28","40"],虎:["05","17","29","41"],牛:["06","18","30","42"],
    鼠:["07","19","31","43"],猪:["08","20","32","44"],狗:["09","21","33","45"],
    鸡:["10","22","34","46"],猴:["11","23","35","47"],羊:["12","24","36","48"]
  };
  for (const [z, nums] of Object.entries(map)) {
    if (nums.includes(num)) return z;
  }
  return '';
}

// 生成汇总报表 xlsx
function generateSummaryXlsx(allData) {
  const wb = XLSX.utils.book_new();

  // ===== Sheet 1: 结算汇总 =====
  const summaryHeaders = [
    '序号', '结算时间', '文件时间戳', '客户端', '总收注', '总派彩',
    '净收益', '抽水率(%)', '中奖金额', '条目数', '抽水后盈利',
    '开奖号码', '特码', '开出生肖'
  ];
  const summaryRows = [summaryHeaders];

  allData.forEach((d, i) => {
    summaryRows.push([
      i + 1,
      d.time || '',
      d.fileTimestamp || '',
      d.clientId || '',
      d.totalBet || 0,
      d.totalPayout || 0,
      d.netProfit || 0,
      d.waterRate || 0,
      d.hitAmount || 0,
      d.itemCount || 0,
      d.netAfterWater !== undefined ? d.netAfterWater : (d.netProfit || 0),
      d.winNumbers || '',
      d.teMa || '',
      d.winZodiacs || ''
    ]);
  });

  // 汇总行
  const totalBetAll = allData.reduce((s, d) => s + (d.totalBet || 0), 0);
  const totalPayoutAll = allData.reduce((s, d) => s + (d.totalPayout || 0), 0);
  const totalNetAll = allData.reduce((s, d) => s + (d.netProfit || 0), 0);
  summaryRows.push([
    '', '【合计】', '', '',
    Math.round(totalBetAll * 100) / 100,
    Math.round(totalPayoutAll * 100) / 100,
    Math.round(totalNetAll * 100) / 100,
    '', '', '', '', '', '', ''
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);

  // 列宽
  ws1['!cols'] = [
    {wch: 6}, {wch: 22}, {wch: 22}, {wch: 10},
    {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10},
    {wch: 10}, {wch: 8}, {wch: 12},
    {wch: 22}, {wch: 6}, {wch: 16}
  ];

  XLSX.utils.book_append_sheet(wb, ws1, '结算汇总');

  // ===== Sheet 2: 开奖号码明细 =====
  const drawHeaders = ['序号', '期数/结算时间', '号码1', '号码2', '号码3', '号码4', '号码5', '号码6', '特码', '开出生肖'];
  const drawRows = [drawHeaders];

  allData.forEach((d, i) => {
    if (d.winNumbers) {
      const nums = d.winNumbers.split(',');
      const row = [
        i + 1,
        d.time || d.fileTimestamp || '',
        nums[0] || '', nums[1] || '', nums[2] || '',
        nums[3] || '', nums[4] || '', nums[5] || '',
        d.teMa || '',
        d.winZodiacs || ''
      ];
      drawRows.push(row);
    }
  });

  const ws2 = XLSX.utils.aoa_to_sheet(drawRows);
  ws2['!cols'] = [
    {wch: 6}, {wch: 24},
    {wch: 8}, {wch: 8}, {wch: 8},
    {wch: 8}, {wch: 8}, {wch: 8},
    {wch: 8}, {wch: 20}
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '开奖号码');

  // ===== Sheet 3: 号码统计（49个号码的波色/生肖表） =====
  const numHeaders = ['号码', '生肖', '波色', '单双', '大小'];
  const numRows = [numHeaders];
  for (let n = 1; n <= 49; n++) {
    const numStr = n.toString().padStart(2, '0');
    numRows.push([
      numStr,
      getZodiac(numStr),
      getWaveColor(numStr),
      n % 2 === 0 ? '双' : '单',
      n >= 25 ? '大' : '小'
    ]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(numRows);
  ws3['!cols'] = [
    {wch: 6}, {wch: 6}, {wch: 6}, {wch: 6}, {wch: 6}
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '号码属性表');

  // ===== Sheet 4: 每日汇总 =====
  // 按日期分组
  const dailyMap = {};
  allData.forEach(d => {
    const dateStr = (d.time || d.fileTimestamp || '').substring(0, 10);
    if (!dateStr) return;
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = { date: dateStr, count: 0, totalBet: 0, totalPayout: 0, netProfit: 0 };
    }
    dailyMap[dateStr].count++;
    dailyMap[dateStr].totalBet += d.totalBet || 0;
    dailyMap[dateStr].totalPayout += d.totalPayout || 0;
    dailyMap[dateStr].netProfit += d.netProfit || 0;
  });

  const dailyHeaders = ['日期', '结算次数', '总收注', '总派彩', '净收益', '日均净收益'];
  const dailyRows = [dailyHeaders];
  const dailySorted = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  dailySorted.forEach(d => {
    dailyRows.push([
      d.date,
      d.count,
      Math.round(d.totalBet * 100) / 100,
      Math.round(d.totalPayout * 100) / 100,
      Math.round(d.netProfit * 100) / 100,
      Math.round(d.netProfit / d.count * 100) / 100
    ]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(dailyRows);
  ws4['!cols'] = [
    {wch: 14}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}
  ];
  XLSX.utils.book_append_sheet(wb, ws4, '每日汇总');

  return wb;
}

// ===== 主逻辑 =====
function main() {
  const args = process.argv.slice(2);
  let files = [];

  if (args.length > 0 && args[0].endsWith('.txt')) {
    // 单个文件
    if (fs.existsSync(args[0])) {
      files = [args[0]];
    } else {
      console.error('文件不存在: ' + args[0]);
      process.exit(1);
    }
  } else {
    // 从数据目录读取所有结算文件
    const dir = getDataDir();
    if (!dir) {
      console.error('未找到数据目录 (E:\\shuju 或 ./shuju)');
      process.exit(1);
    }
    files = fs.readdirSync(dir)
      .filter(f => f.startsWith('settlement_') && f.endsWith('.txt'))
      .map(f => path.join(dir, f))
      .sort();
  }

  if (files.length === 0) {
    console.log('没有找到结算数据文件');
    process.exit(0);
  }

  console.log(`找到 ${files.length} 个结算文件，正在解析...`);

  const allData = [];
  files.forEach(filepath => {
    try {
      const data = parseSettlementFile(filepath);
      allData.push(data);
      console.log(`  ✓ ${path.basename(filepath)}`);
    } catch(e) {
      console.error(`  ✗ ${path.basename(filepath)}: ${e.message}`);
    }
  });

  if (allData.length === 0) {
    console.log('没有成功解析的结算文件');
    process.exit(0);
  }

  // 汇总统计
  const totalBet = allData.reduce((s, d) => s + (d.totalBet || 0), 0);
  const totalPayout = allData.reduce((s, d) => s + (d.totalPayout || 0), 0);
  const totalNet = allData.reduce((s, d) => s + (d.netProfit || 0), 0);

  console.log('');
  console.log('===== 汇总 =====');
  console.log('结算次数:', allData.length);
  console.log('总收注:', Math.round(totalBet * 100) / 100);
  console.log('总派彩:', Math.round(totalPayout * 100) / 100);
  console.log('总净收益:', Math.round(totalNet * 100) / 100);

  // 生成 xlsx
  const wb = generateSummaryXlsx(allData);

  // 输出文件
  const outDir = getDataDir() || __dirname;
  const outPath = path.join(outDir, '结算汇总_' + new Date().toISOString().slice(0,10) + '.xlsx');
  XLSX.writeFile(wb, outPath);

  console.log('');
  console.log('✓ 已导出: ' + outPath);
  console.log('  WPS 打开 → 文件 → 打开 → 选择此文件即可');
}

main();
