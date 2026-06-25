const fs = require('fs');

// Safe insert: uses index-based insertion to avoid String.replace $ issues
function insertBefore(filePath, marker, insertText) {
  let content = fs.readFileSync(filePath, 'utf8');
  const idx = content.indexOf(marker);
  if (idx === -1) { console.log('Marker not found: ' + marker.substring(0,40)); return false; }
  content = content.substring(0, idx) + insertText + content.substring(idx);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Inserted before: ' + marker.substring(0,50) + '...');
  return true;
}

function replaceText(filePath, oldText, newText) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldText)) { console.log('Old text not found'); return false; }
  content = content.split(oldText).join(newText);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Replaced text successfully');
  return true;
}

const files = ['D:/686/fsaf.html', 'D:/686/test_harness.js'];

for (const f of files) {
  console.log('\n--- ' + f + ' ---');

  // Fix 1: 元→块
  replaceText(f,
    ".replace(/候/g,'猴')  // 候→猴 纠错\n    .replace(/复试/g,'复式')",
    ".replace(/候/g,'猴')  // 候→猴 纠错\n    .replace(/元/g,'块')  // 元→块 归一化\n    .replace(/复试/g,'复式')"
  );

  // Fix 2: 下 handling - 13下15 → 13各15
  replaceText(f,
    "t = t.replace(/下(\\d+(?:\\.\\d+)?)/g,'$1');",
    "t = t.replace(/(\\d{1,2})\\s*下\\s*(\\d+(?:\\.\\d+)?)/g,'$1各$2');\n  t = t.replace(/下(\\d+(?:\\.\\d+)?)/g,'$1');"
  );

  // Fix 3: 平猪/100 → add / to fgm pattern
  replaceText(f,
    "let fgm=txtNoHK.match(new RegExp(`^平\\\\s*([${ZODIAC_CHARS}]+)\\\\s*各\\\\s*(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(?:斤|米|块)?\\\\s*$`));",
    "let fgm=txtNoHK.match(new RegExp(`^平\\\\s*([${ZODIAC_CHARS}]+)\\\\s*[各/]\\\\s*(\\\\d+(?:\\\\.\\\\d+)?)\\\\s*(?:斤|米|块)?\\\\s*$`));"
  );
}

console.log('\nDone.');
