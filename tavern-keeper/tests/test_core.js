const assert=require('assert');
const C=require('../core.js');

function run(hero,seed){return new C.Expedition({hero,seed}).runToEnd(5000,1)}
function findSeed(hero,pred,max=2000){for(let s=1;s<=max;s++){const e=new C.Expedition({hero,seed:s});const out=e.runToEnd();if(pred(out,e))return {s,out,e};}throw new Error('No matching seed found');}

const success=findSeed(C.makePreset('prepared'),o=>o.outcome==='success'); assert.equal(success.out.outcome,'success');
const retreat=findSeed(C.makePreset('unprepared'),o=>o.outcome==='retreat'); assert.equal(retreat.out.outcome,'retreat');
const death=findSeed(C.makePreset('reckless'),o=>o.outcome==='death'); assert.equal(death.out.outcome,'death');
const weak=C.makePreset('unprepared'); assert.ok(['Extremely Dangerous','Likely Fatal','Risky'].includes(C.threatAssessment(weak))); const weakExp=new C.Expedition({hero:weak,seed:7}); assert.equal(weakExp.state,'deployed');
assert.ok(retreat.out.objectiveProgress>0); assert.ok(death.out.objectiveProgress>=0);
const inc=new C.Expedition({hero:C.makePreset('prepared'),seed:success.s}); const start=inc.goldRate; while(inc.state==='deployed'&&inc.elapsed<120)inc.tick(); assert.ok(inc.peakGoldRate>start);
const done=new C.Expedition({hero:C.makePreset('prepared'),seed:success.s}); done.runToEnd(); assert.equal(done.goldRate,0);
function average(presetName,weapon,armor){let survival=0,gold=0;for(let s=1;s<=80;s++){const h=C.makePreset(presetName);h.equipment.weapon=weapon;h.equipment.armor=armor;const o=run(h,s);if(o.heroAlive)survival++;gold+=o.totalGold;}return {survival,gold};}
const geared=average('prepared','rusty_sword','leather_armor'); const poor=average('prepared','wood_axe',null); assert.ok(geared.survival>=poor.survival || geared.gold>poor.gold);
function outcomeStats(presetName,weapon,armor){let success=0,retreat=0,death=0,gold=0;for(let s=1;s<=80;s++){const h=C.makePreset(presetName);h.equipment.weapon=weapon;h.equipment.armor=armor;const o=run(h,s);if(o.outcome==='success')success++;else if(o.outcome==='retreat')retreat++;else if(o.outcome==='death')death++;gold+=o.totalGold;}return {success,retreat,death,gold};}
const preparedStats=outcomeStats('prepared','rusty_sword','padded_armor'); const unpreparedStats=outcomeStats('unprepared','wood_axe',null); assert.ok(preparedStats.success>unpreparedStats.success,JSON.stringify({preparedStats,unpreparedStats})); assert.ok(preparedStats.gold>unpreparedStats.gold,JSON.stringify({preparedStats,unpreparedStats}));
const potionUse=findSeed(C.makePreset('prepared'),(o,e)=>e.log.some(x=>x.text.includes('used a healing potion'))); assert.ok(potionUse.e.log.some(x=>x.text.includes('used a healing potion')));
const a=new C.Expedition({hero:C.makePreset('prepared'),seed:123}); const ao=a.runToEnd(); const b=new C.Expedition({hero:C.makePreset('prepared'),seed:123}); const bo=b.runToEnd(); assert.deepStrictEqual(ao,bo); assert.deepStrictEqual(a.log,b.log);
const failed=findSeed(C.makePreset('unprepared'),o=>o.outcome!=='success'&&o.totalGold>0); assert.ok(failed.out.totalGold>0);
let outcomes={success:0,retreat:0,death:0},maxPeak=0; for(const preset of ['prepared','unprepared','reckless']){for(let s=1;s<=240;s++){const o=run(C.makePreset(preset),s);outcomes[o.outcome]++;maxPeak=Math.max(maxPeak,o.peakGoldRate);}} assert.ok(outcomes.success>0&&outcomes.retreat>0&&outcomes.death>0,JSON.stringify(outcomes)); assert.ok(maxPeak<10,`income exploded: ${maxPeak}`);
console.log('PASS core',JSON.stringify({successSeed:success.s,retreatSeed:retreat.s,deathSeed:death.s,potionSeed:potionUse.s,outcomes,preparedStats,unpreparedStats,maxPeak},null,2));
