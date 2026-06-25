const fs = require("fs");
const src = fs.readFileSync("D:/686/test_harness.js", "utf8");

// Custom eval to get the functions
const m = {};
const module = {exports: m};
const exports = m;
const require = function() { return {}; };

// Evaluate just the constants + functions (skip the test runner)
const sections = src.split("// ====");
const code = sections.slice(0, 5).join("\n");
eval(code);

// Test line 26
const input = "利来: 平特一肖，鼠。5000 平特一肖，狗2000 平特一肖，免1000";
const s = norm(stripHK(stripMacau(stripSender(input))));
console.log("After norm:", JSON.stringify(s));

// Simulate expandLine's flatMarker logic
const flatMarker = s.includes('平特') ? '平特' : null;
const parts=[]; let idx=s.indexOf(flatMarker), prev=0;
while((idx=s.indexOf(flatMarker,prev+2))!==-1){ parts.push(s.slice(prev,idx).trim()); prev=idx; }
parts.push(s.slice(prev).trim());
console.log("Parts count:", parts.length);
parts.forEach(function(p, i){
  console.log("Part["+i+"]:", JSON.stringify(p));
  var sp = splitBets(p);
  console.log("  splitBets:", JSON.stringify(sp));
  sp.forEach(function(sub, j){
    var c = clean(sub);
    console.log("  clean["+j+"]:", JSON.stringify(c));
    resetState();
    var r = processRule(c);
    console.log("  result["+j+"]:", r ? r.display + " bet=" + r.bet : "null");
  });
});

// Also test what expandLine returns
console.log("\n=== expandLine ===");
resetState();
const expanded = expandLine(input);
console.log("Expanded:", JSON.stringify(expanded));
expanded.forEach(function(p, i){
  resetState();
  var r = processRule(p);
  console.log("Rule["+i+"]:", r ? r.display + " bet=" + r.bet : "null");
});
