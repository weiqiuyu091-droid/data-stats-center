'use strict';

// Load all code from test_harness.js up to the datasets
var fs = require('fs');
var src = fs.readFileSync('D:/686/test_harness.js', 'utf8');
var code = src.split("// ===== DATASETS")[0];
eval(code);

// Test the problematic input
var input = "利来: 平特一肖，鼠。5000 平特一肖，狗2000 平特一肖，免1000";
console.log("Input:", JSON.stringify(input));

// After stripping
var afterSender = stripSender(input);
console.log("After stripSender:", JSON.stringify(afterSender));

var afterMacau = stripMacau(afterSender);
console.log("After stripMacau:", JSON.stringify(afterMacau));

var afterHK = stripHK(afterMacau);
console.log("After stripHK:", JSON.stringify(afterHK));

var afterNorm = norm(afterHK);
console.log("After norm:", JSON.stringify(afterNorm));

// Now trace expandLine
var s = afterNorm;
console.log("\n=== expandLine ===");
console.log("s:", JSON.stringify(s));

var flatMarker = s.includes('平特') ? '平特' : null;
console.log("flatMarker:", flatMarker);

var parts = [];
var idx = s.indexOf(flatMarker);
var prev = 0;
console.log("Initial idx:", idx, "prev:", prev);

var iter = 0;
while ((idx = s.indexOf(flatMarker, prev + 2)) !== -1) {
  iter++;
  console.log("Iter " + iter + ": idx=" + idx + ", prev=" + prev + ", slice='" + s.slice(prev, idx).trim() + "'");
  parts.push(s.slice(prev, idx).trim());
  prev = idx;
}
console.log("After loop: prev=" + prev + ", slice='" + s.slice(prev).trim() + "'");
parts.push(s.slice(prev).trim());
console.log("parts:", JSON.stringify(parts));

var merged = [];
for (var pi = 0; pi < parts.length; pi++) {
  if (/^(?:香港|港|香)$/.test(parts[pi]) && pi + 1 < parts.length) {
    parts[pi + 1] = parts[pi] + parts[pi + 1];
  } else {
    merged.push(parts[pi]);
  }
}
console.log("merged:", JSON.stringify(merged));
console.log("merged.length:", merged.length);

if (merged.length > 1) {
  var all = [];
  merged.forEach(function(p) {
    console.log("\n  Processing part:", JSON.stringify(p));
    var spResult = splitBets(p);
    console.log("  splitBets result:", JSON.stringify(spResult));
    spResult.forEach(function(sp) {
      var c = clean(sp);
      console.log("  after clean:", JSON.stringify(c));
      if (c) {
        all.push(c);
        // Try processRule immediately
        var r = processRule(c);
        console.log("  processRule result:", r ? r.display + " bet=" + r.bet : "null");
      }
    });
  });
  console.log("\nFinal all:", JSON.stringify(all));
}

// Also test processRule directly
console.log("\n=== Direct processRule tests ===");
resetState();
var r1 = processRule("平特，鼠5000");
console.log("processRule('平特，鼠5000'):", r1 ? r1.display + " bet=" + r1.bet : "null");

resetState();
var r2 = processRule("平特，狗2000");
console.log("processRule('平特，狗2000'):", r2 ? r2.display + " bet=" + r2.bet : "null");

resetState();
var r3 = processRule("平特，兔1000");
console.log("processRule('平特，兔1000'):", r3 ? r3.display + " bet=" + r3.bet : "null");
