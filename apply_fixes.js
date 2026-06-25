const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix 1: Add 元→块 normalization in norm function
  content = content.replace(
    ".replace(/候/g,'猴')  // 候→猴 纠错\n    .replace(/复试/g,'复式')",
    ".replace(/候/g,'猴')  // 候→猴 纠错\n    .replace(/元/g,'块')  // 元→块 归一化\n    .replace(/复试/g,'复式')"
  );

  // Fix 2: Fix "下" handling — "13下15" → "13各15", keep original "下1200"→"1200"
  content = content.replace(
    "t = t.replace(/下(\\d+(?:\\.\\d+)?)/g,'$1');",
    "t = t.replace(/(\\d{1,2})\\s*下\\s*(\\d+(?:\\.\\d+)?)/g,'$1各$2');  // 13下15 → 13各15\n  t = t.replace(/下(\\d+(?:\\.\\d+)?)/g,'$1');  // 下1200 → 1200"
  );

  // Fix 3: Handle "平X/100" as "平特X100" — normalize "/" before flat amount
  // Done earlier in norm by replacing / with space, but for flat pattern specifically:
  // Add pattern: "平<zodiac>/<val>" → in norm, convert 平猪/100 → 平猪 100
  // Actually, need to insert this before the / is treated as a separator.
  // The issue: "平猪/100" — after stripMacau, norm turns / to space, but then
  // the zodiac+number pattern doesn't match flat shorthand.
  // Better: add a specific replacement in norm: 平<zodiac>/<val> → 平特<zodiac> <val>
  // OR: add / to the flat shorthand fgm regex

  // Fix 3: Update fgm pattern to also match 平<zodiacs>/<val>
  content = content.replace(
    "let fgm=txtNoHK.match(new RegExp(`^平\\\\s*([${ZODIAC_CHARS}]+)\\\\s*各\\\\s*(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(?:斤|米|块)?\\\\s*$`));",
    "let fgm=txtNoHK.match(new RegExp(`^平\\\\s*([${ZODIAC_CHARS}]+)\\\\s*[各/]\\\\s*(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(?:斤|米|块)?\\\\s*$`));"
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Patched: ' + filePath);
}

patchFile('D:/686/fsaf.html');
patchFile('D:/686/test_harness.js');
console.log('All fixes applied.');
