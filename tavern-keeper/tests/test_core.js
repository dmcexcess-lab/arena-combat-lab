const assert=require('assert');
const C=require('../core.js');

function run(hero,seed){return new C.Expedition({hero,seed}).runToEnd(5000,1)}
function findSeed(hero,pred,max=400){for(let s=1;s<=max;s++){const e=new C.Expedition({hero,seed:s});const out=e.runToEnd();if(pred(out,e))return {s,out,e};}throw new Error('No matching seed found');}

// 1 success exists
const success=findSeed(C.makePreset('prepared'),o=>o.outcome==='success');assert.equal(success.out.outcome,'success');
// 2 retreat exists
const retreat=findSeed(C.makePreset('unprepared'),o=>o.outcome==='retreat');assert.equal(retreat.out.outcome,'retreat');
// 3 death exists
const death=findSeed(C.makePreset('reckless'),o=>o.outcome==='death');assert.equal(death.out.outcome,'death');
// 4 threat is advisory: even likely fatal can be instantiated/deployed
const weak=C.makePreset('unprepared');assert.ok(['Extremely Dangerous','Likely Fatal','Risky'].includes(C.threatAssessment(weak)));const weakExp=new C.Expedition({hero:weak,seed:7});assert.equal(weakExp.state,'deployed');
// 5 progress survives failure
assert.ok(retreat.out.objectiveProgress>0);assert.ok(death.out.objectiveProgress>=0);
// 6 gold rate starts low and can rise
const inc=new C.Expedition({hero:C.makePreset('prepared'),seed:success.s});const start=inc.goldRate;while(inc.state==='deployed'&&inc.elapsed<120)inc.tick();assert.ok(inc.peakGoldRate>start,`peak ${inc.peakGoldRate} start ${start}`);
// 7 rate stops on resolution
const done=new C.Expedition({hero:C.makePreset('prepared'),seed:success.s});done.runToEnd();assert.equal(done.goldRate,0);
// 8 equipment changes outcomes statistically
function average(presetName,weapon,armor){let survival=0,gold=0;for(let s=1;s<=80;s++){const h=C.makePreset(presetName);h.equipment.weapon=weapon;h.equipment.armor=armor;const o=run(h,s);if(o.heroAlive)survival++;gold+=o.totalGold;}return {survival,gold};}
const geared=average('prepared','rusty_sword','leather_armor');const poor=average('prepared','wood_axe',null);assert.ok(geared.survival>=poor.survival || geared.gold>poor.gold);
// 9 preparation matters statistically
function outcomeStats(presetName,weapon,armor){let success=0,retreat=0,death=0,gold=0;for(let s=1;s<=80;s++){const h=C.makePreset(presetName);h.equipment.weapon=weapon;h.equipment.armor=armor;const o=run(h,s);if(o.outcome==='success')success++;else if(o.outcome==='retreat')retreat++;else if(o.outcome==='death')death++;gold+=o.totalGold;}return {success,retreat,death,gold};}
const preparedStats=outcomeStats('prepared','rusty_sword','padded_armor');const unpreparedStats=outcomeStats('unprepared','wood_axe',null);assert.ok(preparedStats.success>unpreparedStats.success,JSON.stringify({preparedStats,unpreparedStats}));assert.ok(preparedStats.gold>unpreparedStats.gold,JSON.stringify({preparedStats,unpreparedStats}));
// 10 potion can be autonomously used
const potionUse=findSeed(C.makePreset('prepared'),(o,e)=>e.log.some(x=>x.text.includes('used a healing potion')));assert.ok(potionUse.e.log.some(x=>x.text.includes('used a healing potion')));
// 11 deterministic by seed
const a=new C.Expedition({hero:C.makePreset('prepared'),seed:123});const ao=a.runToEnd();const b=new C.Expedition({hero:C.makePreset('prepared'),seed:123});const bo=b.runToEnd();assert.deepStrictEqual(ao,bo);assert.deepStrictEqual(a.log,b.log);
// 12 failed contract can return nonzero reward
const failed=findSeed(C.makePreset('unprepared'),o=>o.outcome!=='success'&&o.totalGold>0);assert.ok(failed.out.totalGold>0);
// behavior sanity over batch
let outcomes={success:0,retreat:0,death:0},maxPeak=0;const batch=['prepared','unprepared','reckless'];for(let s=1;s<=180;s++){const o=run(C.makePreset(batch[s%batch.length]),s);outcomes[o.outcome]++;maxPeak=Math.max(maxPeak,o.peakGoldRate);}assert.ok(outcomes.success>0&&outcomes.retreat>0&&outcomes.death>0,JSON.stringify(outcomes));assert.ok(maxPeak<10,`income exploded: ${maxPeak}`);
console.log('PASS',JSON.stringify({successSeed:success.s,retreatSeed:retreat.s,deathSeed:death.s,potionSeed:potionUse.s,outcomes,preparedStats,unpreparedStats,maxPeak},null,2));
