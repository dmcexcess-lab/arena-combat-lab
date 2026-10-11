const assert=require('assert');
const C=require('../core.js');

const keys=['seats','service','kitchen','bar','lodging','infirmary','workshop'];
const opening=new C.TavernEconomy();
const starterCosts=Object.fromEntries(keys.map(id=>[id,opening.upgradeCost(id)]));
const starterTotal=Object.values(starterCosts).reduce((sum,cost)=>sum+cost,0);
assert.deepStrictEqual(starterCosts,{
  seats:700,service:1200,kitchen:900,bar:850,lodging:1100,infirmary:1300,workshop:1150
});

// An empty first few minutes must not buy even the cheapest permanent upgrade.
const shortSession=new C.TavernRoster({funds:30});
for(let i=0;i<5*60/C.OFFLINE_QUANTUM_SECONDS;i++)shortSession.tickTavern(C.OFFLINE_QUANTUM_SECONDS);
assert.ok(shortSession.funds<Math.min(...Object.values(starterCosts)));
for(const id of keys)assert.equal(shortSession.upgradeTavern(id).ok,false);

// The five upgrade tiers are substantial investments with real economic separation.
let totalCapital=0;
for(const id of keys){
  const test=new C.TavernEconomy();
  let previous=0;
  const tiers=[];
  while(test.canUpgrade(id)){
    const cost=test.upgradeCost(id);
    assert.ok(cost>previous,'improvement costs must increase');
    if(previous)assert.equal(cost,previous*C.TAVERN_UPGRADE_COST_MULTIPLIER);
    totalCapital+=cost;
    tiers.push(cost);
    assert.equal(test.upgrade(id),true);
    previous=cost;
  }
  assert.equal(tiers.length,5,'five upgrades per facility and seat expansion');
}
assert.ok(totalCapital>500000,'full development should take sustained contracting');

// One hour of low-threat work can fund a starter investment, not the whole tavern.
const t1=C.CONTRACTS.briar_farm_wolves;
const t2=C.CONTRACTS.greymill_rats;
const early=new C.Expedition({hero:C.makePreset('prepared'),contract:t1,seed:1});
early.runToEnd();
assert.equal(early.elapsed,t1.durationSeconds);
assert.ok(early.gold>=t1.jobGps*t1.durationSeconds);
assert.ok(early.peakGoldRate<=t1.jobGps*C.CONTRACT_PERFORMANCE_RATE_CAP);
assert.ok(early.gold<starterTotal/3);

// Two hours is worthwhile, but cannot finance every first-level improvement.
const intermediate=new C.Expedition({hero:C.makePreset('prepared'),contract:t2,seed:1});
intermediate.runToEnd();
assert.equal(intermediate.elapsed,t2.durationSeconds);
assert.ok(intermediate.gold>=t2.jobGps*t2.durationSeconds);
assert.ok(intermediate.peakGoldRate<=t2.jobGps*C.CONTRACT_PERFORMANCE_RATE_CAP);
assert.ok(intermediate.gold+shortSession.funds<starterTotal,'one brief absence must not clear the starting upgrade board');

// Save reload may carry old inflated rate but cannot continue minting at the old rate.
const legacy=intermediate.snapshot();
legacy.state='deployed';
legacy.goldRate=50;
const capped=C.Expedition.fromSnapshot(legacy);
assert.equal(capped.goldRate,t2.jobGps*C.CONTRACT_PERFORMANCE_RATE_CAP);
assert.deepStrictEqual(C.TAVERN_UPGRADE_BASE,starterCosts);

// Away-time revenue is intentionally less than full open-tavern income.
assert.equal(C.offlineTavernIncomeScale(0),1);
assert.equal(C.offlineTavernIncomeScale(899.75),1);
assert.equal(C.offlineTavernIncomeScale(900),0.25);
assert.equal(C.offlineTavernIncomeScale(3599.75),0.25);
assert.equal(C.offlineTavernIncomeScale(3600),0);
assert.equal(C.offlineTavernIncomeScale(28800),0);

console.log('PASS economy balance',JSON.stringify({
  starterCosts,firstFiveMinutes:Number(shortSession.funds.toFixed(2)),
  starterCapital:starterTotal,fullCapital:totalCapital,
  oneHourContract:Number(early.gold.toFixed(2)),
  twoHourContract:Number(intermediate.gold.toFixed(2)),
  maximumPerformanceMultiplier:C.CONTRACT_PERFORMANCE_RATE_CAP,
  unattendedRevenue:'100% for 15m, 25% until 1h, 0% afterward',
  expeditionOfflineCapHours:C.OFFLINE_MAX_SECONDS/3600
},null,2));
