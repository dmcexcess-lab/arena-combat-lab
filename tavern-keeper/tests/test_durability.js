const assert=require('assert');
const C=require('../core.js');

// Legacy heroes migrate to full condition.
const legacy=C.heroTemplate({equipment:{weapon:'rusty_sword',armor:'padded_armor'}});
assert.deepStrictEqual(legacy.gearDurability,{weapon:100,armor:100});

// Condition tiers materially alter readiness.
const pristine=C.heroTemplate({gearDurability:{weapon:100,armor:100}});
const worn=C.heroTemplate({gearDurability:{weapon:45,armor:45}});
const broken=C.heroTemplate({gearDurability:{weapon:0,armor:0}});
assert.equal(C.durabilityMultiplier(100),1);
assert.equal(C.durabilityMultiplier(45),0.8);
assert.equal(C.durabilityMultiplier(20),0.6);
assert.equal(C.durabilityMultiplier(0),0.25);
assert.ok(C.readinessScore(pristine)>C.readinessScore(worn));
assert.ok(C.readinessScore(worn)>C.readinessScore(broken));

// Stock condition is per physical copy and best copy equips first.
const roster=new C.TavernRoster({
  funds:100,materials:{scrap_iron:10},
  inventory:{rusty_sword:2,padded_armor:1},
  inventoryDurability:{rusty_sword:[25,88],padded_armor:[42]}
});
assert.deepStrictEqual(roster.stockDurabilities('rusty_sword'),[25,88]);
const oldDur=roster.getHero('edrin').gearDurability.weapon;
const eq=roster.equipInventoryItem('edrin','rusty_sword');
assert.equal(eq.ok,true);
assert.equal(roster.getHero('edrin').gearDurability.weapon,88);
assert.equal(roster.itemCount('rusty_sword'),2); // one taken, old equipped sword returned
assert.ok(roster.stockDurabilities('rusty_sword').includes(oldDur));

// Crafted and merchant durable gear enter stock pristine.
const craftRoster=new C.TavernRoster({funds:200,materials:{scrap_iron:20,rat_tail:20,medicinal_herb:20,strange_gland:5}});
assert.equal(craftRoster.craft('scrap_spear').ok,true);
assert.deepStrictEqual(craftRoster.stockDurabilities('scrap_spear'),[100]);
const merchant=new C.TavernRoster({funds:999,inventory:{steel_sword:1},inventoryDurability:{}});
assert.deepStrictEqual(merchant.stockDurabilities('steel_sword'),[100]);

// Combat uses wear: weapon on attacks, armor only on landed hostile hits.
const e=new C.Expedition({hero:C.makePreset('prepared'),seed:3,contract:C.CONTRACTS.greymill_rats});
e.startCombat('giant_rat',1);
const weaponBefore=e.hero.gearDurability.weapon;
for(let i=0;i<10&&e.state==='deployed'&&e.currentCombat;i++)e.combatRound();
assert.ok(e.hero.gearDurability.weapon<weaponBefore);

// Equipped repair spends exact resources/time and restores to 100.
const h=roster.getHero('edrin');
h.gearDurability.weapon=35;
const q=C.repairQuote(h.equipment.weapon,35);
const funds0=roster.funds,iron0=roster.materialCount('scrap_iron'),time0=roster.prepMinutes;
const repaired=roster.repairEquippedGear('edrin','weapon');
assert.equal(repaired.ok,true);
assert.equal(h.gearDurability.weapon,100);
assert.equal(roster.funds,funds0-q.gold);
assert.equal(roster.materialCount('scrap_iron'),iron0-q.scrapIron);
assert.equal(roster.prepMinutes,time0+q.minutes);

// Stored repair targets the worst copy only.
roster.addInventoryItem('padded_armor',1,15);
const storedBefore=roster.stockDurabilities('padded_armor').slice();
assert.ok(storedBefore.includes(15));
assert.equal(roster.repairStoredGear('padded_armor').ok,true);
const storedAfter=roster.stockDurabilities('padded_armor');
assert.equal(Math.min(...storedAfter),42); // the 15% copy became pristine; older 42% copy remains

// Failed repair is atomic.
const poor=new C.TavernRoster({funds:0,materials:{scrap_iron:0}});
poor.getHero('edrin').gearDurability.weapon=20;
const poorBefore=poor.snapshot();
assert.equal(poor.repairEquippedGear('edrin','weapon').ok,false);
assert.deepStrictEqual(poor.snapshot(),poorBefore);

// Death before 50% loses equipped durable gear.
const early=new C.TavernRoster({funds:0});
const earlyHero=early.getHero('edrin');
const earlyRun=new C.Expedition({hero:earlyHero,seed:1,contract:C.CONTRACTS.greymill_rats});
earlyRun.objectiveProgress=49;
earlyRun.finish('death','test');
const earlySettle=early.settle('edrin',earlyRun);
assert.equal(earlySettle.ok,true);
assert.equal(earlySettle.gearOutcome.recovered.length,0);
assert.equal(earlySettle.gearOutcome.lost.length,2);

// Death at/after 50% recovers equipped gear damaged into shared stock.
const deep=new C.TavernRoster({funds:0});
deep.getHero('edrin').gearDurability.weapon=72;
deep.getHero('edrin').gearDurability.armor=66;
const deepRun=new C.Expedition({hero:deep.getHero('edrin'),seed:2,contract:C.CONTRACTS.greymill_rats});
deepRun.objectiveProgress=50;
deepRun.finish('death','test');
const deepSettle=deep.settle('edrin',deepRun);
assert.equal(deepSettle.ok,true);
assert.equal(deepSettle.gearOutcome.recovered.length,2);
assert.equal(deepSettle.gearOutcome.lost.length,0);
assert.ok(deep.stockDurabilities('rusty_sword').includes(35));
assert.ok(deep.stockDurabilities('padded_armor').includes(35));
assert.deepStrictEqual(deepRun.summary().gearOutcome,deepSettle.gearOutcome);

// Durability and repair history survive persistence.
const loaded=C.TavernRoster.deserialize(roster.serialize());
assert.deepStrictEqual(loaded.snapshot(),roster.snapshot());

// Slice 8 saves without durability ledgers migrate inventory/equipped gear to pristine.
const old=roster.snapshot();
delete old.inventoryDurability;
delete old.repairHistory;
for(const hero of old.heroes)delete hero.gearDurability;
old.version=8;
const migrated=C.TavernRoster.fromSnapshot(old);
for(const hero of migrated.heroes)assert.deepStrictEqual(hero.gearDurability,{weapon:100,armor:100});
for(const [id,count] of Object.entries(migrated.inventory)){
  if(C.isDurableItem(id))assert.equal(migrated.stockDurabilities(id).length,count);
}
assert.deepStrictEqual(migrated.repairHistory,[]);

console.log('PASS durability',JSON.stringify({
  wear:[weaponBefore,e.hero.gearDurability.weapon],
  repairCost:q,
  earlyLost:earlySettle.gearOutcome.lost.map(x=>x.name),
  deepRecovered:deepSettle.gearOutcome.recovered
},null,2));
