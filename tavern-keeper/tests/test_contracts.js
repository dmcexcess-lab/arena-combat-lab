const assert=require('assert');
const C=require('../core.js');

const ids=C.CONTRACT_ORDER.slice();
assert.deepStrictEqual(ids,['briar_farm_wolves','greymill_rats','ashroad_caravan','blackroot_mine','wren_bridge_troll']);
assert.equal(new Set(ids).size,ids.length);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].threat),[1,2,3,4,6]);
assert.equal(C.CONTRACT,C.CONTRACTS.greymill_rats);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].paceSeconds),[30,60,120,300,960]);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].durationHint),['15 min','30 min','1h 30m','4 hr','8 hr']);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].jobGps),[1,2,3,5,8]);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].durationSeconds),[900,1800,5400,14400,28800]);
for(let i=1;i<ids.length;i++)assert.ok(C.contractActionInterval(C.CONTRACTS[ids[i]])>C.contractActionInterval(C.CONTRACTS[ids[i-1]]));

// Contract state only advances when its real-time pacing interval matures.
const pacing=new C.Expedition({hero:C.makePreset('prepared'),seed:1,contract:C.CONTRACTS.briar_farm_wolves});
pacing.tick(29);
assert.equal(pacing.areasExplored.length,0);
pacing.tick(1);
assert.ok(pacing.areasExplored.length>0);
const paceSave=C.Expedition.fromSnapshot(pacing.snapshot());
assert.equal(paceSave.actionClock,pacing.actionClock);
assert.equal(paceSave.missionComplete,pacing.missionComplete);

// Catalog validation: every route is closed over the contract graph and can reach resolution.
function reachable(contract){
  const seen=new Set(),stack=[contract.start];
  while(stack.length){
    const id=stack.pop();
    if(seen.has(id))continue;
    seen.add(id);
    const loc=contract.locations[id];
    assert.ok(loc,contract.id+' missing location '+id);
    for(const next of loc.next)stack.push(next);
  }
  return seen;
}
for(const id of ids){
  const c=C.CONTRACTS[id];
  assert.ok(c.name&&c.objective&&c.brief&&c.kind);
  assert.ok(c.incomeMult>0);
  assert.ok(c.locations[c.start]);
  assert.ok(c.locations.resolution);
  assert.equal(c.locations.resolution.next.length,0);
  const seen=reachable(c);
  assert.ok(seen.has('resolution'),id+' cannot reach resolution');
  assert.ok(Object.values(c.locations).some(l=>l.optional),id+' needs at least one optional-risk decision');
  for(const loc of Object.values(c.locations)){
    for(const next of loc.next)assert.ok(c.locations[next],id+' references missing '+next);
    if(loc.encounter)assert.ok(C.ENEMIES[loc.encounter.enemy],id+' references missing enemy '+loc.encounter.enemy);
    for(const [mat] of loc.materials)assert.ok(C.MATERIAL_NAMES[mat],id+' references missing material '+mat);
  }
  for(const mat of c.materialProfile){
    assert.ok(C.MATERIAL_NAMES[mat],id+' profile references missing material '+mat);
    assert.ok(Object.values(c.locations).some(l=>l.materials.some(pair=>pair[0]===mat)),id+' profile material never appears');
  }
}

// Threat ladder also raises potential performance-pay scaling.
for(let i=1;i<ids.length;i++){
  assert.ok(C.CONTRACTS[ids[i]].incomeMult>C.CONTRACTS[ids[i-1]].incomeMult);
}

// The new tavern's board is initially low-threat only; unavailable jobs cannot be selected.
const fresh=new C.TavernRoster();
assert.deepStrictEqual(fresh.availableContractIds(),ids.slice(0,2));
assert.equal(fresh.selectContract('blackroot_mine'),false);

// At a fully developed tavern all threats unlock, but hero readiness is still advisory.
const roster=new C.TavernRoster();
for(const facility of ['serviceLevel','kitchenLevel','barLevel','lodgingLevel'])roster.tavern[facility]=5;
roster.tavern.served=3000;
assert.deepStrictEqual(roster.availableContractIds(),ids);
for(const hero of roster.aliveHeroes()){
  for(const id of ids){
    assert.equal(roster.selectContract(id),true);
    const assessment=C.threatAssessment(hero,C.CONTRACTS[id]);
    assert.ok(['Comfortable','Reasonable','Risky','Extremely Dangerous','Likely Fatal'].includes(assessment));
    const e=roster.startExpedition(hero.id,123,id);
    assert.ok(e);
    assert.equal(e.contract.id,id);
    assert.equal(e.state,'deployed');
  }
}

// Contract selection persists; an old save with missing selection starts at the first board job.
roster.selectContract('blackroot_mine');
const saved=C.TavernRoster.deserialize(roster.serialize());
assert.equal(saved.selectedContractId,'blackroot_mine');
assert.equal(saved.getContract().id,'blackroot_mine');
const legacy=roster.snapshot();
delete legacy.selectedContractId;
legacy.version=6;
const migrated=C.TavernRoster.fromSnapshot(legacy);
assert.equal(migrated.selectedContractId,'briar_farm_wolves');

// Each contract is deterministic for equal hero/seed.
for(const id of ids){
  const contract=C.CONTRACTS[id];
  const a=new C.Expedition({hero:C.makePreset('prepared'),seed:991,contract});
  const b=new C.Expedition({hero:C.makePreset('prepared'),seed:991,contract});
  assert.deepStrictEqual(a.runToEnd(),b.runToEnd(),id+' summary nondeterministic');
  assert.deepStrictEqual(a.log,b.log,id+' log nondeterministic');
}

// Active expedition snapshot preserves the selected contract rather than falling back to Greymill.
const mine=new C.Expedition({hero:C.makePreset('ranged'),seed:2468,contract:C.CONTRACTS.blackroot_mine,debug:true});
for(let i=0;i<22&&mine.state==='deployed';i++)mine.tick(1);
const snap=mine.snapshot();
assert.equal(snap.contractId,'blackroot_mine');
const restored=C.Expedition.fromSnapshot(snap,{debug:true});
assert.equal(restored.contract.id,'blackroot_mine');
assert.deepStrictEqual(restored.runToEnd(),mine.runToEnd());
assert.deepStrictEqual(restored.log,mine.log);

// Old Slice 6 expedition snapshots without a contract ID migrate to Greymill.
const oldSnap=new C.Expedition({hero:C.makePreset('prepared'),seed:77,contract:C.CONTRACTS.greymill_rats}).snapshot();
delete oldSnap.contractId;
oldSnap.version=1;
assert.equal(C.Expedition.fromSnapshot(oldSnap).contract.id,'greymill_rats');

// Every contract can produce a successful run for a strong prepared hero.
function strongHero(){
  return C.heroTemplate({
    id:'tester',name:'Contract Tester',
    stats:{might:10,finesse:10,endurance:10,wits:10,resolve:10},
    health:100,hunger:0,fatigue:0,morale:95,
    traits:['Brave','Resourceful','Veteran','Battle Hardened'],
    equipment:{weapon:'steel_sword',armor:'chain_mail'},
    supplies:{healing_potion:3,field_bandage:4},
    career:{skills:{melee:8,ranged:5,survival:8},xp:2000,rank:7}
  });
}
const successSeeds={};
for(const id of ids){
  let found=null;
  for(let seed=1;seed<=500;seed++){
    const e=new C.Expedition({hero:strongHero(),seed,contract:C.CONTRACTS[id]});
    const out=e.runToEnd();
    if(out.outcome==='success'){found={seed,out};break;}
  }
  assert.ok(found,id+' should be completable');
  successSeeds[id]=found.seed;
}

// Failure is still productive: even an overmatched/poorly prepared hero can bank partial performance gold.
const failureGold={};
for(const id of ids){
  let found=null;
  for(let seed=1;seed<=120;seed++){
    const h=C.makePreset('unprepared');
    h.health=38;h.hunger=92;h.fatigue=91;h.morale=18;
    const e=new C.Expedition({hero:h,seed,contract:C.CONTRACTS[id]});
    const out=e.runToEnd();
    if(out.outcome!=='success'&&out.totalGold>0){found=out;break;}
  }
  assert.ok(found,id+' needs a paid failure case');
  failureGold[id]=Number(found.totalGold.toFixed(2));
}

// Contract-specific material profiles actually produce differentiated loot tendencies across a seed sample.
const totals={};
for(const id of ids){
  totals[id]={};
  for(let seed=1;seed<=80;seed++){
    const e=new C.Expedition({hero:strongHero(),seed,contract:C.CONTRACTS[id]});
    const out=e.runToEnd();
    for(const [mat,n] of Object.entries(out.materials))totals[id][mat]=(totals[id][mat]||0)+n;
  }
  assert.ok(Object.keys(totals[id]).length>0,id+' yielded no materials');
}
assert.ok((totals.briar_farm_wolves.medicinal_herb||0)>(totals.briar_farm_wolves.strange_gland||0));
assert.ok((totals.wren_bridge_troll.strange_gland||0)>0);
assert.ok((totals.ashroad_caravan.scrap_iron||0)>0);

// Settlement identity now contains the contract ID, preventing cross-contract payout-key collisions.
const settleRoster=new C.TavernRoster({funds:0});
const e=new C.Expedition({hero:settleRoster.getHero('edrin'),seed:successSeeds.greymill_rats,contract:C.CONTRACTS.greymill_rats});
e.runToEnd();
assert.equal(settleRoster.settle('edrin',e).ok,true);
assert.ok(settleRoster.snapshot().settledKeys[0].includes('greymill_rats'));

console.log('PASS contracts',JSON.stringify({
  threats:ids.map(id=>C.CONTRACTS[id].threat),
  successSeeds,
  failureGold,
  sampleLoot:totals
},null,2));
