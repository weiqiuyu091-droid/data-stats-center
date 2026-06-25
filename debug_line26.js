const fs = require("fs");
const src = fs.readFileSync("D:/686/test_harness.js", "utf8");
const code = src.split("// SECTION 6")[0];
eval(code);

const input = "利来: 平特一肖，鼠。5000 平特一肖，狗2000 平特一肖，免1000";
const s = norm(stripHK(stripMacau(stripSender(input))));
console.log("After norm:", JSON.stringify(s));

const flatMarker = "平特";
const parts=[]; let idx=s.indexOf(flatMarker), prev=0;
while((idx=s.indexOf(flatMarker,prev+2))!==-1){ parts.push(s.slice(prev,idx).trim()); prev=idx; }
parts.push(s.slice(prev).trim());
console.log("Parts:", JSON.stringify(parts));

parts.forEach(function(p, i){
  var sp = splitBets(p);
  console.log("  Part " + i + ":", JSON.stringify(p), "-> splitBets:", JSON.stringify(sp));
  sp.forEach(function(sub){
    var c = clean(sub);
    console.log("    clean:", JSON.stringify(c));
    var r = processRule(c);
    console.log("    processRule:", r ? r.display + " bet=" + r.bet : "null");
  });
});
