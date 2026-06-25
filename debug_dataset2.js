'use strict';
var fs = require('fs');
var src = fs.readFileSync('D:/686/test_harness.js', 'utf8');
var code = src.split("// ===== DATASETS")[0];
eval(code);

console.log("Line-by-line totals for Dataset 2:\n");

dataset2.forEach(function(line, i){
  resetState();
  var subLines = line
    .replace(/(\d)。(\d)/g, '$1.$2')
    .replace(/([^斤米块\d])。(\d)/g, '$1$2')
    .split(/[；;·。]/)
    .map(function(l){ return l.trim(); })
    .filter(Boolean);

  var lineTotal = 0;
  subLines.forEach(function(sl){
    expandLine(sl).forEach(function(sr){
      var r = processRule(sr);
      if(r) lineTotal += r.bet;
    });
  });
  console.log("Line " + (i+1).toString().padStart(2) + ": bet=" + lineTotal.toString().padStart(5) + "  |  " + line.substring(0, 70));
});

// Total
resetState();
var result = parseAll(dataset2);
console.log("\nTotal: " + result.totalBet);
console.log("Expected: 5465");
console.log("Diff: " + (result.totalBet - 5465));
