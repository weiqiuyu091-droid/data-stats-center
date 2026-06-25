$file = "D:\686\fsaf.html"
$content = Get-Content -Path $file -Raw -Encoding UTF8

# === 1. Add TAIL_MAP ===
$old1 = "ALL_ZODIACS.forEach(z => ZODIAC_MAP[z].forEach(n => NUM_TO_ZODIAC[n] = z));"
$new1 = "ALL_ZODIACS.forEach(z => ZODIAC_MAP[z].forEach(n => NUM_TO_ZODIAC[n] = z));`r`nconst TAIL_MAP = {}; for(let d=0;d<=9;d++){ const k=d.toString(); TAIL_MAP[k]=[]; for(let n=1;n<=49;n++) if(n%10===d) TAIL_MAP[k].push(n.toString().padStart(2,'0')); }"
$content = $content.Replace($old1, $new1)

# === 2. Add tail detection in processRule ===
$old2 = "  // Combo`r`n  let cm=txtNoHK.match"
$new2 = "  // Tail bet`r`n  if(txtNoHK.includes('尾')){`r`n    const tailList = getList(txtNoHK);`r`n    const tailVal = getVal(txtNoHK);`r`n    if(tailList && tailVal){`r`n      const tailDigits = tailList.replace(/尾/g,'').split(/[.\/、,\s，\-－—]+/).filter(i=>i!=='').map(i=>i.trim());`r`n      const tailTargets = [];`r`n      tailDigits.forEach(d => { if(TAIL_MAP[d]) tailTargets.push(...TAIL_MAP[d]); });`r`n      if(tailTargets.length){`r`n        tailTargets.forEach(n => { numberBets[n] = (numberBets[n]||0) + tailVal; });`r`n        return {display: tailDigits.join('-')+'尾各'+tailVal+'('+tailTargets.length+'码)', bet:tailVal*tailTargets.length, type:'nums', targets:tailTargets};`r`n      }`r`n    }`r`n  }`r`n`r`n  // Combo`r`n  let cm=txtNoHK.match"
$content = $content.Replace($old2, $new2)

# === 3. Add combo stats tab button ===
$old3 = "<button class=`"tab-btn`" onclick=`"switchTab('picker')`">挑码参考</button>"
$new3 = "<button class=`"tab-btn`" onclick=`"switchTab('picker')`">挑码参考</button>`r`n`t`t  <button class=`"tab-btn`" onclick=`"switchTab('combo')`">连码统计</button>"
$content = $content.Replace($old3, $new3)

# === 4. Add combo stats panel ===
$old4 = '<div class="card card-first" id="tabZodiac" style="display:none;">'
$comboPanel = '<div class="card card-first" id="tabCombo" style="display:none;">' + "`r`n" +
'  <div class="card-header">' + "`r`n" +
'    <span class="card-title">连码投注统计</span>' + "`r`n" +
'    <span style="font-size:.7rem;color:#64748b;">二连 / 三连</span>' + "`r`n" +
'  </div>' + "`r`n" +
'  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" id="comboStatsGrid">' + "`r`n" +
'    <div style="background:#0f172a;border:1px solid #334155;border-radius:6px;padding:10px;" id="comboDoublePanel">' + "`r`n" +
'      <div style="font-size:.8rem;color:#60a5fa;margin-bottom:8px;font-weight:600;">二连投注</div>' + "`r`n" +
'      <div id="comboDoubleBody" style="font-size:.72rem;color:#64748b;">等待分析...</div>' + "`r`n" +
'    </div>' + "`r`n" +
'    <div style="background:#0f172a;border:1px solid #334155;border-radius:6px;padding:10px;" id="comboTriplePanel">' + "`r`n" +
'      <div style="font-size:.8rem;color:#f59e0b;margin-bottom:8px;font-weight:600;">三连投注</div>' + "`r`n" +
'      <div id="comboTripleBody" style="font-size:.72rem;color:#64748b;">等待分析...</div>' + "`r`n" +
'    </div>' + "`r`n" +
'  </div>' + "`r`n" +
'</div>'
$content = $content.Replace($old4, $comboPanel + "`r`n`r`n" + $old4)

# === 5. Update switchTab tabs array ===
$old5 = "const tabs=['bets','detail','zodiac','picker'];"
$new5 = "const tabs=['bets','detail','zodiac','picker','combo'];"
$content = $content.Replace($old5, $new5)

# === 6. Update switchTab display toggle ===
$old6 = "document.getElementById('tabPicker').style.display = tab==='picker'?'':'none';"
$new6 = "document.getElementById('tabPicker').style.display = tab==='picker'?'':'none';`r`n  document.getElementById('tabCombo').style.display = tab==='combo'?'':'none';"
$content = $content.Replace($old6, $new6)

# === 7. Add renderComboStats function before renderAll ===
$old7 = "function renderAll(){"
$comboRender = "function renderComboStats(winNums){" + "`r`n" +
"  const doubleBody = document.getElementById('comboDoubleBody');" + "`r`n" +
"  const tripleBody = document.getElementById('comboTripleBody');" + "`r`n" +
"  if(!doubleBody || !tripleBody) return;" + "`r`n" +
"  const doubles = comboBets.filter(c => c.type==='double');" + "`r`n" +
"  const triples = comboBets.filter(c => c.type==='triple');" + "`r`n" +
"  const renderGroup = (combos, winNums) => {" + "`r`n" +
"    if(!combos.length) return '<div style=\"color:#475569;\">无</div>';" + "`r`n" +
"    const agg = {};" + "`r`n" +
"    combos.forEach(c => {" + "`r`n" +
"      const key = c.zodiacs.join('');" + "`r`n" +
"      if(!agg[key]) agg[key] = {zodiacs:c.zodiacs, totalBet:0, isHK:c.isHK};" + "`r`n" +
"      agg[key].totalBet += c.value;" + "`r`n" +
"    });" + "`r`n" +
"    let h = ''; let grandTotal = 0;" + "`r`n" +
"    Object.values(agg).forEach(a => {" + "`r`n" +
"      grandTotal += a.totalBet;" + "`r`n" +
"      const allNums = []; a.zodiacs.forEach(z => { if(ZODIAC_MAP[z]) allNums.push(...ZODIAC_MAP[z]); });" + "`r`n" +
"      let hitCount = 0;" + "`r`n" +
"      if(winNums && winNums.length) allNums.forEach(n => { if(winNums.includes(n)) hitCount++; });" + "`r`n" +
"      const odds = a.zodiacs.length===3 ? (a.zodiacs.includes('马')?8:10) : (a.zodiacs.includes('马')?3.5:4);" + "`r`n" +
"      const risk = a.totalBet * odds;" + "`r`n" +
"      const hitColor = hitCount>0 ? '#4ade80' : '#64748b';" + "`r`n" +
"      h += '<div style=\"display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #1e293b;\">';" + "`r`n" +
"      h += '<span>'+a.zodiacs.map(z=>'<span style=\"color:#60a5fa;\">'+z+'</span>').join('')+(a.isHK?' <span style=\"color:#ef4444;font-size:.6rem;\">HK</span>':'')+'</span>';" + "`r`n" +
"      h += '<span style=\"text-align:right;\">';" + "`r`n" +
"      h += '<span style=\"color:#94a3b8;\">投'+a.totalBet+'</span> ';" + "`r`n" +
"      h += '<span style=\"color:#fbbf24;\">赔'+odds+'</span> ';" + "`r`n" +
"      h += '<span style=\"color:#ef4444;\">险'+risk+'</span> ';" + "`r`n" +
"      h += '<span style=\"color:'+hitColor+';\">'+(winNums&&winNums.length?(hitCount>0?'中'+hitCount:'未中'):'')+'</span>';" + "`r`n" +
"      h += '</span></div>';" + "`r`n" +
"    });" + "`r`n" +
"    h += '<div style=\"text-align:right;color:#e2e8f0;font-weight:600;padding-top:4px;\">合计: '+grandTotal+' (组数:'+Object.keys(agg).length+')</div>';" + "`r`n" +
"    return h;" + "`r`n" +
"  };" + "`r`n" +
"  doubleBody.innerHTML = renderGroup(doubles, winNums);" + "`r`n" +
"  tripleBody.innerHTML = renderGroup(triples, winNums);" + "`r`n" +
"}" + "`r`n`r`n" +
"function renderAll(){"
$content = $content.Replace($old7, $comboRender)

# === 8. Call renderComboStats in renderAll ===
$old8 = "  renderNumGrid(wn, tm);`r`n  renderZodiacGrid(wf);"
$new8 = "  renderNumGrid(wn, tm);`r`n  renderZodiacGrid(wf);`r`n  renderComboStats(wn);"
$content = $content.Replace($old8, $new8)

# === 9. Call renderComboStats in calcAll ===
$old9 = "  renderNumGrid(winNums, teMa);`r`n  renderZodiacGrid(winFlat);"
$new9 = "  renderNumGrid(winNums, teMa);`r`n  renderZodiacGrid(winFlat);`r`n  renderComboStats(winNums);"
$content = $content.Replace($old9, $new9)

# === 10. Update placeholder ===
$old10 = "平特猪狗各300&#10;牛狗羊三连500 · 香港虎牛二连500&#10;香港平狗200 · 大各数10 · 单各10&#10;09各五十斤 · 狗龙虎鼠猪各号45"
$new10 = "平特猪狗各300&#10;牛狗羊三连500 · 香港虎牛二连500&#10;香港平狗200 · 大各数10 · 单各10&#10;09各五十斤 · 狗龙虎鼠猪各号45&#10;7-5-4-6-8-1-3尾各数十 · 2-8尾各5"
$content = $content.Replace($old10, $new10)

# === 11. Update analyzer to also call renderComboStats ===
$old11 = "  renderAll();`r`n`t`t  toast(`已解析"
$new11 = "  renderAll();`r`n`t`t  renderComboStats(null);`r`n`t`t  toast(`已解析"
$content = $content.Replace($old11, $new11)

# Write back
Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline:$false
Write-Output "All patches applied successfully."
