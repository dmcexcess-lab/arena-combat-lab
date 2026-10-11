const assert=require('assert');
const C=require('../core.js');

const basicTavern=new C.TavernEconomy();
const eliteTavern=new C.TavernEconomy({seats:12,serviceLevel:6,kitchenLevel:6,barLevel:6});
function candidate(tavern,seed=44){
  const recruitment=new C.RecruitmentSystem({seed,nextArrival:0});
  recruitment.tick(0.25,tavern);
  return recruitment.active;
}
const novice=candidate(basicTavern),elite=candidate(eliteTavern);
assert.equal(novice.quality,1);
assert.equal(elite.quality,5);
assert.ok(novice.cost<200);
assert.ok(elite.cost>25000);
assert.ok(elite.cost>novice.cost*100);
const boss=C.CONTRACTS.wren_bridge_troll;
assert.equal(boss.jobGps,9);
const noviceRate=new C.Expedition({hero:novice.hero,contract:boss,seed:1}).goldRate;
const eliteRate=new C.Expedition({hero:elite.hero,contract:boss,seed:1}).goldRate;
assert.ok(noviceRate<=boss.jobGps*0.05);
assert.ok(eliteRate>=boss.jobGps*0.6);
assert.ok(eliteRate>noviceRate*15,'elite is a real cash cow, not just a cosmetic applicant');
// The early contracts continue to pay their posted salary regardless of hero tier.
assert.equal(new C.Expedition({hero:novice.hero,contract:C.CONTRACTS.briar_farm_wolves}).goldRate,0.3);
assert.equal(new C.Expedition({hero:novice.hero,contract:C.CONTRACTS.greymill_rats}).goldRate,0.5);

// A high-grade merc is powerful but does not become immortal on the 8h boss job.
let fatal=null;
for(let seed=1;seed<=250;seed++){
  const e=new C.Expedition({hero:elite.hero,contract:boss,seed});
  const out=e.runToEnd();
  if(out.outcome==='death'){fatal=e;break;}
}
assert.ok(fatal,'the most expensive baseline hire must still face permanent-death risk');
const roster=new C.TavernRoster({heroes:[elite.hero],funds:0,tavern:eliteTavern.snapshot()});
const settlement=roster.settle(elite.hero.id,fatal);
assert.equal(settlement.ok,true);
assert.equal(settlement.heroAlive,false);
assert.equal(roster.aliveHeroes().length,0);
assert.equal(roster.fallen.length,1);
assert.equal(roster.fallen[0].hero.recruitment.quality,5);
assert.ok(settlement.gearOutcome.lost.length+settlement.gearOutcome.recovered.length>0);
assert.equal(roster.settle(elite.hero.id,fatal).ok,false);

// The tavern's food/drink simulation can finance the replacement without a
// surviving hero or a mandatory reset, including after offline catch-up.
roster.funds=0;
roster.recruitment.active=null;
roster.recruitment.nextArrival=0;
roster.tickTavern(.25);
assert.equal(roster.recruitment.active.quality,1);
assert.ok(roster.recruitment.active.cost<200);
const before=roster.funds;
const offline=C.advanceOffline(roster,new C.ExpeditionManager(),70*60);
assert.ok(offline.tavernGold>0);
assert.ok(roster.funds>before);
assert.equal(offline.offlineRebuildRate,0.10);
assert.ok(roster.funds>=roster.recruitment.active?.cost||roster.funds>=200);

console.log('PASS mercenary risk and recovery',JSON.stringify({
  noviceCost:novice.cost,eliteCost:elite.cost,noviceBossGps:noviceRate,
  eliteBossGps:eliteRate,deathSeed:fatal.seed,fallen:roster.fallen.length,
  tavernRecoveryGold:Number(offline.tavernGold.toFixed(2))
},null,2));
