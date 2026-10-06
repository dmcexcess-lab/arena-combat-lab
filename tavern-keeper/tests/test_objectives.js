const assert=require('assert');
const C=require('../core.js');

function exp(id,seed=1){
  return new C.Expedition({hero:C.makePreset('prepared'),seed,contract:C.CONTRACTS[id],debug:true});
}

// Contract metadata must expose explicit sub-objectives + rules.
for(const id of C.CONTRACT_ORDER){
  const c=C.CONTRACTS[id];
  assert.ok(Array.isArray(c.subObjectives)&&c.subObjectives.length>=3,id+' missing sub-objectives');
  assert.ok(c.objectiveRules&&typeof c.objectiveRules==='object',id+' missing objective rules');
}

// HUNT: trail discovery + quarry kill count + den clear are distinct score sources.
const hunt=exp('briar_farm_wolves');
hunt.objectiveLocation(C.CONTRACTS.briar_farm_wolves.locations.sheep_pens);
assert.equal(hunt.objectiveState.trailFound,true);
const huntScore0=hunt.objectiveScore;
hunt.objectiveKill('wolf',{locationId:'sheep_pens'});
hunt.objectiveKill('wolf',{locationId:'sheep_pens'});
assert.equal(hunt.objectiveState.quarryKills,2);
assert.ok(hunt.objectiveScore>huntScore0);
hunt.objectiveCombatCleared({locationId:'den'});
assert.equal(hunt.objectiveState.lairCleared,true);
assert.ok(hunt.objectiveEvents.some(e=>e.key==='hunt_lair'));

// EXTERMINATION: infestation reach + vermin cull + nest destruction.
const extermination=exp('greymill_rats');
extermination.objectiveLocation(C.CONTRACTS.greymill_rats.locations.cellar);
for(let i=0;i<3;i++)extermination.objectiveKill(i%2?'dire_rat':'giant_rat',{locationId:'cellar'});
assert.equal(extermination.objectiveState.infestationReached,true);
assert.equal(extermination.objectiveState.verminKills,3);
extermination.objectiveCombatCleared({locationId:'nest'});
assert.equal(extermination.objectiveState.nestCleared,true);
assert.ok(extermination.objectiveScore>0);

// ESCORT: checkpoint score and caravan integrity are unique state.
// Pressure can independently fail the contract while the hero remains alive.
const escort=exp('ashroad_caravan',7);
escort.objectiveCombatCleared({locationId:'first_ambush'});
assert.equal(escort.objectiveState.checkpoints,1);
const checkpointScore=escort.objectiveScore;
escort.objectiveState.caravanIntegrity=4;
let pressureAttempts=0;
while(escort.state==='deployed'&&pressureAttempts++<100)escort.escortPressure(C.ENEMIES.raider,4);
assert.equal(escort.state,'failure');
assert.equal(escort.hero.alive,true);
assert.equal(escort.objectiveState.caravanIntegrity,0);
assert.ok(escort.objectiveScore>=checkpointScore);
assert.ok(escort.gold>=escort.objectiveBonusGold);

// DELVE: discoveries and miner rescue are not kill-count objectives.
const delve=exp('blackroot_mine');
delve.objectiveLocation(C.CONTRACTS.blackroot_mine.locations.fungus_cave);
delve.objectiveLocation(C.CONTRACTS.blackroot_mine.locations.collapsed_lift);
assert.equal(delve.objectiveState.discoveries,2);
delve.hero.stats.wits=10;
delve.hero.career.skills.survival=8;
delve.objectiveCombatCleared({locationId:'miner_gallery'});
assert.equal(delve.objectiveState.minersFound,true);
assert.equal(delve.objectiveState.minersRescued,3);
assert.ok(delve.objectiveEvents.some(e=>e.key==='delve_miners_found'));
assert.equal(delve.objectiveEvents.filter(e=>e.key.startsWith('delve_rescue_')).length,3);

// BOSS HUNT: only the bridge boss counts for persistent boss-damage scoring.
const boss=exp('wren_bridge_troll');
boss.objectiveLocation(C.CONTRACTS.wren_bridge_troll.locations.bridge_approach);
const baseScore=boss.objectiveScore;
boss.objectiveDamage('troll',41,{boss:false,locationId:'troll_lair'});
assert.equal(boss.objectiveState.bossDamage,0);
assert.equal(boss.objectiveScore,baseScore);
const quarterHit=Math.ceil(boss.objectiveState.bossMaxHp*0.26);
boss.objectiveDamage('troll',quarterHit,{boss:true,locationId:'bridge'});
assert.ok(boss.objectiveState.damageMilestones.includes(25));
const score25=boss.objectiveScore;
boss.objectiveDamage('troll',quarterHit,{boss:true,locationId:'bridge'});
assert.ok(boss.objectiveState.damageMilestones.includes(50));
assert.ok(boss.objectiveScore>score25);
boss.objectiveKill('troll',{boss:true,locationId:'bridge'});
assert.equal(boss.objectiveState.bossKilled,true);
assert.ok(boss.objectiveEvents.some(e=>e.key==='boss_killed'));

// Objective rewards are banked immediately and therefore survive failed contracts.
for(const e of [hunt,extermination,delve,boss]){
  const before=e.objectiveBonusGold;
  assert.ok(before>0,e.contract.id+' should have partial objective bonus');
  e.finish('retreat','test partial failure');
  const s=e.summary();
  assert.ok(s.objectiveScore>0);
  assert.equal(s.objectiveBonusGold,before);
  assert.ok(s.totalGold>=before);
  assert.ok(s.objectiveEvents.length>0);
}

// Successful completion always closes the scorecard at 100 without erasing earlier events.
const success=exp('briar_farm_wolves');
success.objectiveLocation(C.CONTRACTS.briar_farm_wolves.locations.sheep_pens);
success.objectiveKill('wolf',{locationId:'sheep_pens'});
const eventsBefore=success.objectiveEvents.length;
success.finish('success','test complete');
assert.equal(success.objectiveScore,100);
assert.ok(success.objectiveEvents.length>eventsBefore);
assert.ok(success.objectiveEvents.some(e=>e.key==='primary_complete'));

// Objective state/events persist and continue deterministically after reload.
const savedSource=exp('wren_bridge_troll',99);
savedSource.objectiveLocation(C.CONTRACTS.wren_bridge_troll.locations.bridge_approach);
savedSource.objectiveDamage('troll',25,{boss:true,locationId:'bridge'});
const restored=C.Expedition.fromSnapshot(savedSource.snapshot(),{debug:true});
assert.deepStrictEqual(restored.objectiveState,savedSource.objectiveState);
assert.deepStrictEqual(restored.objectiveEvents,savedSource.objectiveEvents);
assert.equal(restored.objectiveScore,savedSource.objectiveScore);
assert.equal(restored.objectiveBonusGold,savedSource.objectiveBonusGold);

// Slice 10 expedition snapshots without objective fields migrate safely from route progress.
const legacy=savedSource.snapshot();
delete legacy.objectiveScore;
delete legacy.objectiveMax;
delete legacy.objectiveBonusGold;
delete legacy.objectiveEvents;
delete legacy.objectiveAwards;
delete legacy.objectiveState;
legacy.version=3;
legacy.objectiveProgress=43;
const migrated=C.Expedition.fromSnapshot(legacy);
assert.equal(migrated.objectiveScore,43);
assert.equal(migrated.objectiveMax,100);
assert.deepStrictEqual(migrated.objectiveEvents,[]);
assert.ok(migrated.objectiveState);

// Real route simulation produces explicit scorecards for every contract.
for(const id of C.CONTRACT_ORDER){
  const e=new C.Expedition({hero:C.heroTemplate({
    id:'tester',name:'Objective Tester',
    stats:{might:10,finesse:10,endurance:10,wits:10,resolve:10},
    health:100,hunger:0,fatigue:0,morale:95,
    traits:['Brave','Resourceful','Veteran','Battle Hardened'],
    equipment:{weapon:'steel_sword',armor:'chain_mail'},
    gearDurability:{weapon:100,armor:100},
    supplies:{healing_potion:3,field_bandage:4},
    career:{skills:{melee:8,ranged:5,survival:8},xp:2000,rank:7}
  }),seed:123,contract:C.CONTRACTS[id]});
  const out=e.runToEnd();
  assert.ok(out.objectiveScore>0,id+' emitted no objective score');
  assert.ok(out.objectiveEvents.length>0,id+' emitted no objective events');
  assert.ok(out.objectiveBonusGold>0,id+' emitted no objective bonus');
  if(out.outcome==='success')assert.equal(out.objectiveScore,100);
}

// Career progression recognizes objective score as meaningful partial performance.
const careerHero=C.makePreset('prepared');
const partial=exp('wren_bridge_troll');
partial.objectiveLocation(C.CONTRACTS.wren_bridge_troll.locations.bridge_approach);
partial.objectiveDamage('troll',42,{boss:true,locationId:'bridge'});
partial.objectiveProgress=5;
partial.finish('retreat','test');
const rec=C.applyCareerProgress(careerHero,partial);
assert.equal(rec.objectiveScore,partial.objectiveScore);
assert.equal(rec.objectiveBonusGold,Number(partial.objectiveBonusGold.toFixed(2)));
assert.ok(rec.xpGained>1);

console.log('PASS objectives',JSON.stringify({
  huntScore:hunt.objectiveScore,
  exterminationScore:extermination.objectiveScore,
  escort:{score:escort.objectiveScore,integrity:escort.objectiveState.caravanIntegrity,outcome:escort.state},
  delve:{score:delve.objectiveScore,rescued:delve.objectiveState.minersRescued},
  boss:{score:boss.objectiveScore,damage:boss.objectiveState.bossDamage},
  successScore:success.objectiveScore
},null,2));
