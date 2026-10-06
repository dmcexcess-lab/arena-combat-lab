const assert=require('assert');
const C=require('../core.js');

// Meals are real tavern actions: cost/time plus hunger/morale effects.
const mealState=new C.PreparationState({hero:C.makePreset('unprepared'),funds:20});
const mealBefore=mealState.snapshot(); const meal=mealState.apply('simple_meal');
assert.equal(meal.ok,true); assert.equal(mealState.funds,18); assert.equal(mealState.prepMinutes,20); assert.ok(mealState.hero.hunger<mealBefore.hero.hunger); assert.ok(mealState.hero.morale>=mealBefore.hero.morale);

// Morale has a direct tavern-side recovery option.
const moraleHero=C.makePreset('unprepared'); const moraleState=new C.PreparationState({hero:moraleHero,funds:20}); const morale0=moraleState.hero.morale; assert.equal(moraleState.apply('common_room').ok,true); assert.ok(moraleState.hero.morale>morale0+20);

// Full rest is a tradeoff: fatigue falls dramatically, time passes, hunger rises, Good Sleep is applied.
const restHero=C.makePreset('unprepared'); restHero.hunger=35; restHero.fatigue=88;
const restState=new C.PreparationState({hero:restHero,funds:20}); const h0=restState.hero.hunger; const f0=restState.hero.fatigue; const rest=restState.apply('full_rest');
assert.equal(rest.ok,true); assert.ok(restState.hero.fatigue<f0-60); assert.ok(restState.hero.hunger>h0); assert.ok(restState.hero.moodlets.includes('Good Sleep'));

// Hearty meal applies a meaningful expedition effect that slows hunger growth.
const fed=C.makePreset('prepared'); fed.hunger=20; const fedState=new C.PreparationState({hero:fed,funds:20}); fedState.apply('hearty_meal');
const buffed=new C.Expedition({hero:fedState.hero,seed:5}); const plainHero=C.makePreset('prepared'); plainHero.hunger=fedState.hero.hunger; const plain=new C.Expedition({hero:plainHero,seed:5});
for(let i=0;i<30;i++){if(buffed.state==='deployed')buffed.updateNeeds(1);if(plain.state==='deployed')plain.updateNeeds(1);} assert.ok(buffed.hero.hunger<plain.hero.hunger);

// Injuries reduce readiness and first aid/physician can improve them.
const injured=C.makePreset('prepared'); C.addInjury(injured,'bruised_ribs',2); const injuredScore=C.readinessScore(injured);
const aidState=new C.PreparationState({hero:injured,funds:30}); const aid=aidState.apply('first_aid'); assert.equal(aid.ok,true); assert.equal(C.totalInjurySeverity(aidState.hero),1); assert.ok(C.readinessScore(aidState.hero)>injuredScore);
const doc=aidState.apply('physician'); assert.equal(doc.ok,true); assert.equal(C.totalInjurySeverity(aidState.hero),0);

// Insufficient funds cannot mutate condition or time.
const broke=new C.PreparationState({hero:C.makePreset('unprepared'),funds:0}); const brokeBefore=broke.snapshot(); const denied=broke.apply('hearty_meal'); assert.equal(denied.ok,false); assert.deepStrictEqual(broke.snapshot(),brokeBefore);

// Potion purchase respects a small supply cap and costs funds.
const potHero=C.makePreset('reckless'); const potState=new C.PreparationState({hero:potHero,funds:30}); assert.equal(potState.hero.supplies.healing_potion,0); assert.equal(potState.apply('buy_potion').ok,true); assert.equal(potState.hero.supplies.healing_potion,1); assert.equal(potState.apply('buy_potion').ok,true); assert.equal(potState.hero.supplies.healing_potion,2); assert.equal(potState.apply('buy_potion').ok,false);

// Surviving expedition condition and injuries carry home; expedition gold/materials bank once.
let survivor=null;
for(let seed=1;seed<=1200;seed++){
  const e=new C.Expedition({hero:C.makePreset('prepared'),seed}); e.runToEnd();
  if(e.hero.alive && (e.hero.health<100 || e.hero.fatigue>8 || e.hero.hunger>10)){survivor=e;break;}
}
assert.ok(survivor,'need a surviving expedition');
const home=new C.PreparationState({hero:C.makePreset('prepared'),funds:5}); const startingFunds=home.funds; const settled=home.settle(survivor); assert.equal(settled.ok,true); assert.equal(home.funds,startingFunds+survivor.gold); assert.equal(home.hero.health,survivor.hero.health); assert.equal(home.hero.fatigue,survivor.hero.fatigue); assert.equal(home.hero.hunger,survivor.hero.hunger); assert.deepStrictEqual(home.hero.injuries,survivor.hero.injuries); const afterFirst=home.funds; const settledAgain=home.settle(survivor); assert.equal(settledAgain.ok,false); assert.equal(home.funds,afterFirst);

// Pre-expedition effects are consumed by the expedition and do not become permanent tavern buffs.
const buffHome=new C.PreparationState({hero:C.makePreset('prepared'),funds:20}); buffHome.apply('hearty_meal'); const buffExp=new C.Expedition({hero:buffHome.hero,seed:1}); buffExp.runToEnd(); buffHome.settle(buffExp); assert.equal(buffHome.hero.prepEffects.length,0);

// Combat can create a persistent injury in a deterministic run.
let injuredRun=null;
for(let seed=1;seed<=3000;seed++){
  const h=C.makePreset('reckless'); h.health=100; const e=new C.Expedition({hero:h,seed}); e.runToEnd();
  if(e.hero.alive && C.totalInjurySeverity(e.hero)>0){injuredRun=e;break;}
}
assert.ok(injuredRun,'expected a surviving injury seed'); const injuryHome=new C.PreparationState({hero:C.makePreset('prepared'),funds:20}); injuryHome.settle(injuredRun); assert.ok(C.totalInjurySeverity(injuryHome.hero)>0);

// Death remains permanent for the current hero; tavern can still bank expedition proceeds/materials.
let dead=null;
for(let seed=1;seed<=1200;seed++){const e=new C.Expedition({hero:C.makePreset('reckless'),seed});e.runToEnd();if(!e.hero.alive){dead=e;break;}}
assert.ok(dead); const deathHome=new C.PreparationState({hero:C.makePreset('reckless'),funds:0}); const deathSettle=deathHome.settle(dead); assert.equal(deathSettle.heroAlive,false); assert.equal(deathHome.hero.alive,false); assert.ok(deathHome.funds>=dead.gold); assert.equal(deathHome.apply('simple_meal').ok,false);

// Preparation does not become a hard deployment gate.
const awful=C.makePreset('unprepared'); C.addInjury(awful,'deep_bite',3); awful.health=20; awful.hunger=99; awful.fatigue=99; awful.morale=5; const fatalAssessment=C.threatAssessment(awful); const awfulExp=new C.Expedition({hero:awful,seed:22}); assert.equal(awfulExp.state,'deployed'); assert.ok(['Extremely Dangerous','Likely Fatal'].includes(fatalAssessment));

console.log('PASS preparation',JSON.stringify({survivorSeed:survivor.seed,injurySeed:injuredRun.seed,deathSeed:dead.seed,restMoodlets:restState.hero.moodlets,fatalAssessment},null,2));
