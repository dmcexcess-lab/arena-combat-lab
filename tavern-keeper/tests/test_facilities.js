const assert=require('assert');
const C=require('../core.js');

function facilityTavern(level=1){
  return new C.TavernEconomy({
    seed:123,
    seats:4,serviceLevel:2,
    kitchenLevel:level,barLevel:level,lodgingLevel:level,infirmaryLevel:level,workshopLevel:level
  });
}
function heroForPrep(){
  const h=C.makePreset('unprepared');
  h.health=55; h.hunger=88; h.fatigue=88; h.morale=24;
  h.injuries=[];
  C.addInjury(h,'deep_bite',2);
  C.addInjury(h,'bruised_ribs',2);
  return h;
}

// New facilities default to level 1 and migrate cleanly.
const defaultTavern=new C.TavernEconomy();
assert.equal(defaultTavern.kitchenLevel,1);
assert.equal(defaultTavern.barLevel,1);
assert.equal(defaultTavern.lodgingLevel,1);
assert.equal(defaultTavern.infirmaryLevel,1);
assert.equal(defaultTavern.workshopLevel,1);
assert.deepStrictEqual(defaultTavern.facilityLevels(),{kitchen:1,bar:1,lodging:1,infirmary:1,workshop:1});

// New permanent facilities participate in the same upgrade transaction/cost system.
const upgradeRoster=new C.TavernRoster({funds:1000});
for(const id of ['lodging','infirmary','workshop']){
  const before=upgradeRoster.funds;
  const cost=upgradeRoster.tavern.upgradeCost(id);
  const result=upgradeRoster.upgradeTavern(id);
  assert.equal(result.ok,true,id);
  assert.equal(upgradeRoster.funds,before-cost,id);
  assert.equal(upgradeRoster.tavern[id+'Level'],2,id);
}

// Preparation quote is authoritative and reflects the responsible facility.
const quotes=new C.TavernRoster({funds:500,tavern:facilityTavern(6).snapshot()});
const mealQuote=quotes.preparationQuote('hearty_meal');
const restQuote=quotes.preparationQuote('full_rest');
const moraleQuote=quotes.preparationQuote('common_room');
const aidQuote=quotes.preparationQuote('first_aid');
assert.equal(mealQuote.facility,'kitchen');
assert.equal(restQuote.facility,'lodging');
assert.equal(moraleQuote.facility,'bar');
assert.equal(aidQuote.facility,'infirmary');
assert.equal(mealQuote.facilityLevel,6);
assert.ok(mealQuote.minutes<C.PREPARATION_ACTIONS.hearty_meal.minutes);
assert.ok(restQuote.minutes<C.PREPARATION_ACTIONS.full_rest.minutes);

// Kitchen quality makes the same meal stronger and faster.
const baseMeal=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(1).snapshot()});
const highMeal=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(6).snapshot()});
const bm=baseMeal.prepare('tomas','hearty_meal');
const hm=highMeal.prepare('tomas','hearty_meal');
assert.equal(bm.ok,true); assert.equal(hm.ok,true);
assert.ok(hm.event.minutes<bm.event.minutes);
assert.ok(highMeal.getHero('tomas').hunger<baseMeal.getHero('tomas').hunger);
assert.ok(highMeal.getHero('tomas').morale>baseMeal.getHero('tomas').morale);
const baseFoodBuff=baseMeal.getHero('tomas').prepEffects.find(e=>e.id==='hearty_meal');
const highFoodBuff=highMeal.getHero('tomas').prepEffects.find(e=>e.id==='hearty_meal');
assert.ok(highFoodBuff.remaining>baseFoodBuff.remaining);
assert.ok(highFoodBuff.potency>baseFoodBuff.potency);

// Higher-quality meal buff actually slows hunger growth more during an expedition.
const baseMealExp=new C.Expedition({hero:baseMeal.getHero('tomas'),seed:9});
const highMealExp=new C.Expedition({hero:highMeal.getHero('tomas'),seed:9});
const baseHunger0=baseMealExp.hero.hunger,highHunger0=highMealExp.hero.hunger;
for(let i=0;i<60;i++){baseMealExp.updateNeeds(1);highMealExp.updateNeeds(1);}
assert.ok((highMealExp.hero.hunger-highHunger0)<(baseMealExp.hero.hunger-baseHunger0));

// Commons quality improves morale recovery and creates a persistent Good Company boost.
const baseCommon=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(1).snapshot()});
const highCommon=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(6).snapshot()});
baseCommon.prepare('tomas','common_room');
const hc=highCommon.prepare('tomas','common_room');
assert.ok(highCommon.getHero('tomas').morale>baseCommon.getHero('tomas').morale);
assert.ok(hc.event.minutes<baseCommon.preparationQuote('common_room').baseMinutes);
assert.ok(highCommon.getHero('tomas').prepEffects.some(e=>e.id==='good_company'&&e.potency>1));

// Lodging quality improves rest, healing, action time, and Good Sleep potency.
const baseRest=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(1).snapshot()});
const highRest=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(6).snapshot()});
const br=baseRest.prepare('tomas','full_rest');
const hr=highRest.prepare('tomas','full_rest');
assert.ok(hr.event.minutes<br.event.minutes);
assert.ok(highRest.getHero('tomas').fatigue<baseRest.getHero('tomas').fatigue);
assert.ok(highRest.getHero('tomas').health>baseRest.getHero('tomas').health);
const baseSleep=baseRest.getHero('tomas').prepEffects.find(e=>e.id==='good_sleep');
const highSleep=highRest.getHero('tomas').prepEffects.find(e=>e.id==='good_sleep');
assert.ok(highSleep.potency>baseSleep.potency);
assert.ok(highSleep.remaining>baseSleep.remaining);

// Infirmary quality heals more and removes more injury severity from the same action.
const baseAid=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(1).snapshot()});
const highAid=new C.TavernRoster({heroes:[heroForPrep()],funds:500,tavern:facilityTavern(6).snapshot()});
const ba=baseAid.prepare('tomas','first_aid');
const ha=highAid.prepare('tomas','first_aid');
assert.ok(ha.event.minutes<ba.event.minutes);
assert.ok(highAid.getHero('tomas').health>baseAid.getHero('tomas').health);
assert.ok(C.totalInjurySeverity(highAid.getHero('tomas'))<C.totalInjurySeverity(baseAid.getHero('tomas')));
const highPatch=highAid.getHero('tomas').prepEffects.find(e=>e.id==='patched_up');
assert.ok(highPatch&&highPatch.potency>1);

// A developed home produces a measurably more ready hero from the same starting condition.
const baseReady=new C.TavernRoster({heroes:[heroForPrep()],funds:999,tavern:facilityTavern(1).snapshot()});
const highReady=new C.TavernRoster({heroes:[heroForPrep()],funds:999,tavern:facilityTavern(6).snapshot()});
for(const action of ['hearty_meal','full_rest','common_room','first_aid']){
  assert.equal(baseReady.prepare('tomas',action).ok,true);
  assert.equal(highReady.prepare('tomas',action).ok,true);
}
const baseScore=C.readinessScore(baseReady.getHero('tomas'));
const highScore=C.readinessScore(highReady.getHero('tomas'));
assert.ok(highScore>baseScore,JSON.stringify({baseScore,highScore}));

// Workshop quality reduces repair cost/time and can save scrap on major repairs.
const lowRepair=C.repairQuote('steel_sword',10,1);
const highRepair=C.repairQuote('steel_sword',10,6);
assert.ok(highRepair.gold<lowRepair.gold);
assert.ok(highRepair.minutes<lowRepair.minutes);
assert.ok(highRepair.scrapIron<=lowRepair.scrapIron);

const repairHero=C.makePreset('prepared');
repairHero.equipment.weapon='steel_sword';
repairHero.gearDurability.weapon=10;
const repairRoster=new C.TavernRoster({
  heroes:[repairHero],
  funds:500,materials:{scrap_iron:10},
  tavern:facilityTavern(6).snapshot()
});
const fundsBefore=repairRoster.funds,ironBefore=repairRoster.materialCount('scrap_iron'),timeBefore=repairRoster.prepMinutes;
const repaired=repairRoster.repairEquippedGear('edrin','weapon');
assert.equal(repaired.ok,true);
assert.equal(repaired.event.workshopLevel,6);
assert.equal(repairRoster.funds,fundsBefore-highRepair.gold);
assert.equal(repairRoster.materialCount('scrap_iron'),ironBefore-highRepair.scrapIron);
assert.equal(repairRoster.prepMinutes,timeBefore+highRepair.minutes);

// Workshop quality also speeds crafting without changing recipe material requirements/output.
const lowCraft=new C.TavernRoster({funds:0,materials:{scrap_iron:10,rat_tail:10},tavern:facilityTavern(1).snapshot()});
const highCraft=new C.TavernRoster({funds:0,materials:{scrap_iron:10,rat_tail:10},tavern:facilityTavern(6).snapshot()});
const lowCraftQuote=lowCraft.craftQuote('scrap_spear');
const highCraftQuote=highCraft.craftQuote('scrap_spear');
assert.ok(highCraftQuote.minutes<lowCraftQuote.minutes);
assert.equal(lowCraft.craft('scrap_spear').ok,true);
assert.equal(highCraft.craft('scrap_spear').ok,true);
assert.equal(lowCraft.itemCount('scrap_spear'),1);
assert.equal(highCraft.itemCount('scrap_spear'),1);
assert.equal(lowCraft.materialCount('scrap_iron'),highCraft.materialCount('scrap_iron'));

// Facility state persists exactly.
const persistent=new C.TavernRoster({
  funds:123,
  tavern:new C.TavernEconomy({kitchenLevel:4,barLevel:3,lodgingLevel:5,infirmaryLevel:2,workshopLevel:6}).snapshot()
});
const loaded=C.TavernRoster.deserialize(persistent.serialize());
assert.deepStrictEqual(loaded.snapshot(),persistent.snapshot());
assert.equal(loaded.snapshot().version,11);
assert.equal(loaded.tavern.snapshot().version,2);

// Slice 11/older tavern snapshots without new facility fields migrate all new facilities to level 1.
const old=persistent.snapshot();
delete old.tavern.lodgingLevel;
delete old.tavern.infirmaryLevel;
delete old.tavern.workshopLevel;
old.tavern.version=1;
old.version=9;
const migrated=C.TavernRoster.fromSnapshot(old);
assert.equal(migrated.tavern.lodgingLevel,1);
assert.equal(migrated.tavern.infirmaryLevel,1);
assert.equal(migrated.tavern.workshopLevel,1);
assert.equal(migrated.tavern.kitchenLevel,4);
assert.equal(migrated.tavern.barLevel,3);

console.log('PASS facilities',JSON.stringify({
  baseReadiness:Number(baseScore.toFixed(2)),
  developedReadiness:Number(highScore.toFixed(2)),
  mealMinutes:[bm.event.minutes,hm.event.minutes],
  restMinutes:[br.event.minutes,hr.event.minutes],
  repair:[lowRepair,highRepair],
  craftMinutes:[lowCraftQuote.minutes,highCraftQuote.minutes]
},null,2));
