const assert=require('assert');
const C=require('../core.js');

// Three different heroes can be deployed simultaneously.
const roster=new C.TavernRoster({funds:50});
const manager=new C.ExpeditionManager();
const a=manager.deploy({hero:roster.getHero('edrin'),seed:11,contract:C.CONTRACTS.briar_farm_wolves,speed:0});
const b=manager.deploy({hero:roster.getHero('mara'),seed:22,contract:C.CONTRACTS.greymill_rats,speed:1});
const c=manager.deploy({hero:roster.getHero('borin'),seed:33,contract:C.CONTRACTS.ashroad_caravan,speed:4});
assert.equal(a.ok,true);
assert.equal(b.ok,true);
assert.equal(c.ok,true);
assert.equal(manager.activeEntries().length,3);
assert.equal(new Set(manager.entries.map(e=>e.id)).size,3);
assert.equal(manager.hasHero('edrin'),true);
assert.equal(manager.hasHero('mara'),true);
assert.equal(manager.hasHero('borin'),true);

// Same hero cannot be deployed twice while already away.
const duplicate=manager.deploy({hero:roster.getHero('edrin'),seed:44,contract:C.CONTRACTS.blackroot_mine});
assert.equal(duplicate.ok,false);
assert.equal(duplicate.reason,'hero already deployed');
assert.equal(manager.entries.length,3);

// Speed is per expedition, not global.
manager.tickAll();
assert.equal(a.entry.expedition.elapsed,0);
assert.equal(b.entry.expedition.elapsed,1);
assert.equal(c.entry.expedition.elapsed,4);
assert.equal(a.entry.speed,0);
assert.equal(b.entry.speed,1);
assert.equal(c.entry.speed,4);
assert.equal(manager.setSpeed(a.entry.id,12),true);
assert.equal(manager.setSpeed(b.entry.id,0),true);
manager.tickAll();
assert.equal(a.entry.expedition.elapsed,12);
assert.equal(b.entry.expedition.elapsed,1);
assert.ok(c.entry.expedition.elapsed>=8);

// Focus selection is independent from simulation.
assert.equal(manager.select(b.entry.id),true);
assert.equal(manager.get().id,b.entry.id);
manager.tickAll();
assert.equal(manager.get().id,b.entry.id);
assert.ok(a.entry.expedition.elapsed>12);

// Multi-expedition state round-trips exactly and then stays deterministic.
const saved=C.ExpeditionManager.fromSnapshot(manager.snapshot());
assert.deepStrictEqual(saved.snapshot(),manager.snapshot());
for(let i=0;i<5;i++){manager.tickAll();saved.tickAll();}
assert.deepStrictEqual(saved.snapshot(),manager.snapshot());

// Controlled mixed outcomes settle independently.
const settlementRoster=new C.TavernRoster({funds:0});
const runs=new C.ExpeditionManager();
const s1=runs.deploy({hero:settlementRoster.getHero('edrin'),seed:101,contract:C.CONTRACTS.briar_farm_wolves});
const s2=runs.deploy({hero:settlementRoster.getHero('mara'),seed:102,contract:C.CONTRACTS.greymill_rats});
const s3=runs.deploy({hero:settlementRoster.getHero('borin'),seed:103,contract:C.CONTRACTS.wren_bridge_troll});
s1.entry.expedition.objectiveProgress=100;
s1.entry.expedition.gold=12.5;
s1.entry.expedition.finish('success','test success');
s2.entry.expedition.objectiveProgress=42;
s2.entry.expedition.gold=7.25;
s2.entry.expedition.finish('retreat','test retreat');
s3.entry.expedition.objectiveProgress=20;
s3.entry.expedition.gold=3.5;
s3.entry.expedition.finish('death','test death');

const r1=settlementRoster.settle('edrin',s1.entry.expedition,s1.entry.id);
const r2=settlementRoster.settle('mara',s2.entry.expedition,s2.entry.id);
const r3=settlementRoster.settle('borin',s3.entry.expedition,s3.entry.id);
assert.equal(r1.ok,true);
assert.equal(r2.ok,true);
assert.equal(r3.ok,true);
runs.markSettled(s1.entry.id,r1);
runs.markSettled(s2.entry.id,r2);
runs.markSettled(s3.entry.id,r3);

const mixedFunds=r1.banked+r2.banked+r3.banked;
assert.equal(settlementRoster.funds,mixedFunds);
assert.equal(settlementRoster.getHero('edrin').career.contracts,1);
assert.equal(settlementRoster.getHero('mara').career.contracts,1);
assert.equal(settlementRoster.getHero('borin'),null);
assert.equal(settlementRoster.fallen.some(f=>f.hero.id==='borin'),true);
assert.equal(runs.activeEntries().length,0);
assert.equal(runs.entries.every(e=>e.settled),true);

// A resolved/settled hero is available for a new deployment while other reports remain.
const repeat=runs.deploy({hero:settlementRoster.getHero('edrin'),seed:101,contract:C.CONTRACTS.briar_farm_wolves});
assert.equal(repeat.ok,true);
assert.notEqual(repeat.entry.id,s1.entry.id);

// Persistent expedition IDs allow deterministic identical repeat runs to settle separately.
repeat.entry.expedition.objectiveProgress=100;
repeat.entry.expedition.gold=12.5;
repeat.entry.expedition.finish('success','test success');
const repeatSettle=settlementRoster.settle('edrin',repeat.entry.expedition,repeat.entry.id);
assert.equal(repeatSettle.ok,true);
runs.markSettled(repeat.entry.id,repeatSettle);
assert.equal(settlementRoster.getHero('edrin').career.contracts,2);
assert.equal(settlementRoster.funds,mixedFunds+repeatSettle.banked);

// Reusing the same persistent expedition ID is still blocked as a duplicate settlement.
const duplicateSettle=settlementRoster.settle('edrin',repeat.entry.expedition,repeat.entry.id);
assert.equal(duplicateSettle.ok,false);
assert.equal(duplicateSettle.reason,'already settled');

// Closing a report removes only that completed entry; active entries cannot be closed.
const live=runs.deploy({hero:settlementRoster.getHero('mara'),seed:909,contract:C.CONTRACTS.blackroot_mine});
assert.equal(runs.close(live.entry.id),false);
const countBeforeClose=runs.entries.length;
assert.equal(runs.close(s2.entry.id),true);
assert.equal(runs.entries.length,countBeforeClose-1);
assert.ok(runs.get(live.entry.id));

// Independent income continues accumulating only for running entries.
runs.setSpeed(live.entry.id,4);
const liveGold0=live.entry.expedition.gold;
const ticksToReward=Math.ceil(C.contractActionInterval(live.entry.expedition.contract)/4)+1;
for(let i=0;i<ticksToReward&&live.entry.expedition.state==='deployed';i++)runs.tickAll();
assert.ok(live.entry.expedition.gold>liveGold0);

// Save/resume preserves active + completed reports, speeds, settlement status and selected focus.
runs.select(live.entry.id);
const roundTrip=C.ExpeditionManager.fromSnapshot(runs.snapshot());
assert.deepStrictEqual(roundTrip.snapshot(),runs.snapshot());

// Legacy single expedition snapshots can be wrapped into the new manager without changing the expedition.
const legacyExp=new C.Expedition({hero:C.makePreset('prepared'),seed:2468,contract:C.CONTRACTS.blackroot_mine,debug:true});
for(let i=0;i<14&&legacyExp.state==='deployed';i++)legacyExp.tick(1);
const legacyManager=C.ExpeditionManager.fromSnapshot({
  version:1,nextId:2,selectedId:'exp_1',
  entries:[{id:'exp_1',heroId:legacyExp.hero.id,speed:1,settled:false,settlement:null,expedition:legacyExp.snapshot()}]
});
assert.equal(legacyManager.entries.length,1);
assert.equal(legacyManager.get().heroId,legacyExp.hero.id);
assert.deepStrictEqual(legacyManager.get().expedition.snapshot(),legacyExp.snapshot());

console.log('PASS concurrency',JSON.stringify({
  initialConcurrent:3,
  independentElapsed:[a.entry.expedition.elapsed,b.entry.expedition.elapsed,c.entry.expedition.elapsed],
  mixedFunds:Number(mixedFunds.toFixed(2)),
  repeatCareer:settlementRoster.getHero('edrin').career.contracts,
  activeAfterSettlement:runs.activeEntries().length,
  legacyContract:legacyManager.get().expedition.contract.id
},null,2));
