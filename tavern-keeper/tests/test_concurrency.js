const assert=require('assert');
const C=require('../core.js');

const founders=[C.makePreset('prepared'),C.makePreset('ranged'),C.makePreset('reckless')];
const roster=new C.TavernRoster({heroes:founders,funds:50});
const manager=new C.ExpeditionManager();
const a=manager.deploy({hero:roster.getHero('edrin'),seed:11,contract:C.CONTRACTS.briar_farm_wolves});
const b=manager.deploy({hero:roster.getHero('mara'),seed:22,contract:C.CONTRACTS.greymill_rats});
const c=manager.deploy({hero:roster.getHero('borin'),seed:33,contract:C.CONTRACTS.ashroad_caravan});
assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(c.ok,true);
assert.equal(manager.activeEntries().length,3);
assert.equal(manager.hasHero('edrin'),true);
assert.equal(manager.deploy({hero:roster.getHero('edrin'),seed:44,contract:C.CONTRACTS.blackroot_mine}).ok,false);

manager.tickAll(1);
assert.equal(a.entry.expedition.elapsed,1);
assert.equal(b.entry.expedition.elapsed,1);
assert.equal(c.entry.expedition.elapsed,1);
assert.equal('speed' in a.entry,false);
assert.equal(typeof manager.setSpeed,'undefined');

assert.equal(manager.select(b.entry.id),true);
manager.tickAll(1);
assert.equal(manager.get().id,b.entry.id);
assert.equal(a.entry.expedition.elapsed,2);
assert.equal(b.entry.expedition.elapsed,2);
assert.equal(c.entry.expedition.elapsed,2);

const saved=C.ExpeditionManager.fromSnapshot(manager.snapshot());
assert.deepStrictEqual(saved.snapshot(),manager.snapshot());
for(let i=0;i<5;i++){manager.tickAll(1);saved.tickAll(1);}
assert.deepStrictEqual(saved.snapshot(),manager.snapshot());

const settlementRoster=new C.TavernRoster({heroes:founders,funds:0});
const runs=new C.ExpeditionManager();
const s1=runs.deploy({hero:settlementRoster.getHero('edrin'),seed:101,contract:C.CONTRACTS.briar_farm_wolves});
const s2=runs.deploy({hero:settlementRoster.getHero('mara'),seed:102,contract:C.CONTRACTS.greymill_rats});
const s3=runs.deploy({hero:settlementRoster.getHero('borin'),seed:103,contract:C.CONTRACTS.wren_bridge_troll});
for(const [entry,kind,gold] of [[s1.entry,'success',12.5],[s2.entry,'retreat',7.25],[s3.entry,'death',3.5]]){
  entry.expedition.objectiveProgress=kind==='success'?100:kind==='retreat'?42:20;
  entry.expedition.gold=gold;entry.expedition.finish(kind,'test '+kind);
}
const r1=settlementRoster.settle('edrin',s1.entry.expedition,s1.entry.id);
const r2=settlementRoster.settle('mara',s2.entry.expedition,s2.entry.id);
const r3=settlementRoster.settle('borin',s3.entry.expedition,s3.entry.id);
for(const [entry,result] of [[s1.entry,r1],[s2.entry,r2],[s3.entry,r3]])runs.markSettled(entry.id,result);
assert.equal(r1.ok,true);assert.equal(r2.ok,true);assert.equal(r3.ok,true);
assert.equal(settlementRoster.getHero('borin'),null);
assert.equal(runs.activeEntries().length,0);

const repeat=runs.deploy({hero:settlementRoster.getHero('edrin'),seed:101,contract:C.CONTRACTS.briar_farm_wolves});
repeat.entry.expedition.objectiveProgress=100;repeat.entry.expedition.gold=12.5;repeat.entry.expedition.finish('success','test success');
const repeatSettle=settlementRoster.settle('edrin',repeat.entry.expedition,repeat.entry.id);
assert.equal(repeatSettle.ok,true);runs.markSettled(repeat.entry.id,repeatSettle);
assert.equal(settlementRoster.settle('edrin',repeat.entry.expedition,repeat.entry.id).ok,false);

const live=runs.deploy({hero:settlementRoster.getHero('mara'),seed:909,contract:C.CONTRACTS.blackroot_mine});
assert.equal(runs.close(live.entry.id),false);
const gold0=live.entry.expedition.gold;
runs.tickAll(2);
assert.ok(live.entry.expedition.gold>gold0);
const roundTrip=C.ExpeditionManager.fromSnapshot(runs.snapshot());
assert.deepStrictEqual(roundTrip.snapshot(),runs.snapshot());

console.log('PASS concurrency',JSON.stringify({singleSpeed:true,concurrent:3,active:runs.activeEntries().length},null,2));
