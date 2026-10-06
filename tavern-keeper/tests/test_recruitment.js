const assert=require('assert');
const C=require('../core.js');

function tavernForQuality(q){
  if(q===1)return new C.TavernEconomy({seats:2,serviceLevel:1,kitchenLevel:1,barLevel:1});
  if(q===2)return new C.TavernEconomy({seats:4,serviceLevel:2,kitchenLevel:2,barLevel:2});
  return new C.TavernEconomy({seats:4,serviceLevel:3,kitchenLevel:3,barLevel:3});
}
function spawnApplicant(seed,quality){
  const r=new C.RecruitmentSystem({seed,nextArrival:0});
  r.tick(0.25,tavernForQuality(quality));
  assert.ok(r.active);
  return r;
}

// Tavern development determines applicant quality.
assert.equal(C.applicantQuality(tavernForQuality(1)),1);
assert.equal(C.applicantQuality(tavernForQuality(2)),2);
assert.equal(C.applicantQuality(tavernForQuality(3)),3);

// Equal seed/tavern/ticks generate the exact same applicant.
const d1=spawnApplicant(1234,2);
const d2=spawnApplicant(1234,2);
assert.deepStrictEqual(d1.snapshot(),d2.snapshot());
assert.equal(d1.active.quality,2);

// Applicant records are complete persistent heroes with bounded quality-scaled stats/condition/gear.
for(const q of [1,2,3]){
  const r=spawnApplicant(800+q,q);
  const a=r.active,h=a.hero;
  const ranges={1:[3,6],2:[4,7],3:[5,8]}[q];
  for(const v of Object.values(h.stats))assert.ok(v>=ranges[0]&&v<=ranges[1]);
  assert.equal(h.career.rank,1);
  assert.equal(h.career.contracts,0);
  assert.ok(h.traits.length>=1);
  assert.ok(h.traits.every(t=>C.APPLICANT_TRAITS.includes(t)));
  assert.ok(C.EQUIPMENT[h.equipment.weapon]);
  assert.ok(!h.equipment.armor||C.EQUIPMENT[h.equipment.armor]);
  assert.ok(!['scrap_spear','plated_vest'].includes(h.equipment.weapon));
  assert.notEqual(h.equipment.armor,'plated_vest');
  assert.ok(a.cost>0);
  assert.equal(h.recruitment.quality,q);
}
const q1=spawnApplicant(44,1).active;
const q3=spawnApplicant(44,3).active;
assert.ok(q3.cost>q1.cost);
assert.ok(Object.values(q3.hero.stats).reduce((a,b)=>a+b,0)>Object.values(q1.hero.stats).reduce((a,b)=>a+b,0));

// Generation varies between applicants rather than cloning one template.
const variants=[];
for(let seed=1;seed<=10;seed++){
  const a=spawnApplicant(seed,1).active.hero;
  variants.push(JSON.stringify({name:a.name,stats:a.stats,traits:a.traits,equipment:a.equipment,health:a.health,hunger:a.hunger,fatigue:a.fatigue,morale:a.morale}));
}
assert.ok(new Set(variants).size>=8);

// Applicants are finite visitors and expire if not hired.
const expiry=new C.RecruitmentSystem({seed:9,nextArrival:0});
expiry.tick(0.25,tavernForQuality(1));
const expiredName=expiry.active.hero.name;
for(let i=0;i<330;i++)expiry.tick(0.25,tavernForQuality(1));
assert.equal(expiry.active,null);
assert.equal(expiry.expired,1);
assert.ok(expiry.nextArrival>0);
assert.ok(expiry.log.some(e=>e.text.includes(expiredName)&&e.type==='departure'));

// Hiring spends exact shared gold and transfers the exact inspected person into the roster.
const roster=new C.TavernRoster({
  funds:200,
  tavern:tavernForQuality(2).snapshot(),
  recruitment:{seed:42,nextArrival:0}
});
roster.tickTavern(0.25);
assert.ok(roster.recruitment.active);
const viewed=JSON.parse(JSON.stringify(roster.recruitment.active));
const fundsBefore=roster.funds;
const countBefore=roster.heroes.length;
const hire=roster.recruitApplicant();
assert.equal(hire.ok,true);
assert.equal(roster.heroes.length,countBefore+1);
assert.equal(roster.funds,fundsBefore-viewed.cost);
assert.equal(roster.recruitment.active,null);
assert.equal(roster.recruitmentHistory.length,1);
const hired=roster.getHero(viewed.hero.id);
assert.ok(hired);
assert.equal(hired.name,viewed.hero.name);
assert.deepStrictEqual(hired.stats,viewed.hero.stats);
assert.deepStrictEqual(hired.traits,viewed.hero.traits);
assert.deepStrictEqual(hired.equipment,viewed.hero.equipment);
assert.equal(hired.health,viewed.hero.health);
assert.equal(hired.hunger,viewed.hero.hunger);
assert.equal(hired.fatigue,viewed.hero.fatigue);
assert.equal(hired.morale,viewed.hero.morale);
assert.equal(hired.recruitment.quality,viewed.quality);
assert.equal(hired.recruitment.cost,viewed.cost);

// Insufficient funds are atomic and do not consume/change the applicant.
const poor=new C.TavernRoster({
  funds:0,
  tavern:tavernForQuality(3).snapshot(),
  recruitment:{seed:81,nextArrival:0}
});
poor.tickTavern(0.25);
const poorBefore=poor.snapshot();
const denied=poor.recruitApplicant();
assert.equal(denied.ok,false);
assert.equal(denied.reason,'insufficient funds');
assert.deepStrictEqual(poor.snapshot(),poorBefore);

// Recruitment recovers from a total party wipe: no living heroes is no longer a forced reset state.
const wiped=new C.TavernRoster({
  heroes:[],
  funds:200,
  recruitment:{seed:71,nextArrival:0}
});
assert.equal(wiped.aliveHeroes().length,0);
wiped.tickTavern(0.25);
assert.ok(wiped.recruitment.active);
const recovery=wiped.recruitApplicant();
assert.equal(recovery.ok,true);
assert.equal(wiped.aliveHeroes().length,1);
assert.equal(wiped.selectedHeroId,recovery.hero.id);

// A recruited hero can be sent to every contract; threat remains advisory.
for(const id of C.CONTRACT_ORDER){
  const e=wiped.startExpedition(recovery.hero.id,55,id);
  assert.ok(e,id);
  assert.equal(e.contract.id,id);
}

// Recruited heroes participate in the same permanent-death/fallen flow.
let deathRun=null;
for(let seed=1;seed<=250;seed++){
  const weak=C.heroTemplate(recovery.hero);
  weak.health=Math.min(weak.health,45);
  weak.hunger=Math.max(weak.hunger,80);
  weak.fatigue=Math.max(weak.fatigue,80);
  weak.morale=Math.min(weak.morale,32);
  const e=new C.Expedition({hero:weak,seed,contract:C.CONTRACTS.wren_bridge_troll});
  e.runToEnd();
  if(e.state==='death'){deathRun=e;break;}
}
assert.ok(deathRun,'expected recruited hero to have a lethal troll seed');
const deathRoster=new C.TavernRoster({heroes:[deathRun.hero],funds:0});
deathRoster.heroes[0]=C.heroTemplate(recovery.hero);
const lethal=new C.Expedition({hero:deathRoster.heroes[0],seed:deathRun.seed,contract:C.CONTRACTS.wren_bridge_troll});
lethal.hero.health=Math.min(lethal.hero.health,45);
lethal.hero.hunger=Math.max(lethal.hero.hunger,80);
lethal.hero.fatigue=Math.max(lethal.hero.fatigue,80);
lethal.hero.morale=Math.min(lethal.hero.morale,32);
lethal.runToEnd();
assert.equal(lethal.state,'death');
const settled=deathRoster.settle(deathRoster.heroes[0].id,lethal);
assert.equal(settled.ok,true);
assert.equal(settled.heroAlive,false);
assert.equal(deathRoster.aliveHeroes().length,0);
assert.equal(deathRoster.fallen.length,1);
assert.equal(deathRoster.fallen[0].hero.recruitment.quality,recovery.hero.recruitment.quality);

// Recruitment state/history round-trip with the rest of the tavern.
const persistRoster=new C.TavernRoster({
  funds:300,
  tavern:tavernForQuality(3).snapshot(),
  recruitment:{seed:333,nextArrival:0}
});
persistRoster.tickTavern(0.25);
persistRoster.recruitApplicant();
persistRoster.tickTavern(12);
const loaded=C.TavernRoster.deserialize(persistRoster.serialize());
assert.deepStrictEqual(loaded.snapshot(),persistRoster.snapshot());

// Slice 7 saves without recruitment fields migrate to a valid scheduled applicant system.
const legacy=roster.snapshot();
delete legacy.recruitment;
delete legacy.recruitmentHistory;
legacy.version=7;
const migrated=C.TavernRoster.fromSnapshot(legacy);
assert.ok(migrated.recruitment instanceof C.RecruitmentSystem);
assert.deepStrictEqual(migrated.recruitmentHistory,[]);
assert.equal(migrated.recruitment.active,null);
assert.ok(migrated.recruitment.nextArrival>0);

// Applicant clock advances through the same TavernRoster live tick as patrons/merchants.
const ticking=new C.TavernRoster({funds:0,recruitment:{seed:91,nextArrival:1}});
ticking.tickTavern(0.5);
assert.equal(ticking.recruitment.active,null);
ticking.tickTavern(0.6);
assert.ok(ticking.recruitment.active);

console.log('PASS recruitment',JSON.stringify({
  deterministicApplicant:d1.active.hero.name,
  q1Cost:q1.cost,
  q3Cost:q3.cost,
  hired:viewed.hero.name,
  recoveryHero:recovery.hero.name,
  deathSeed:deathRun.seed,
  migratedNextArrival:migrated.recruitment.nextArrival
},null,2));
