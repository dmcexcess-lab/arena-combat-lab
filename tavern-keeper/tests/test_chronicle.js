const assert=require('assert');
const C=require('../core.js');

function forcedSuccess(roster,heroId,contractId,seed,gold=20,kills=3){
  const hero=roster.getHero(heroId);
  const e=new C.Expedition({hero,seed,contract:C.CONTRACTS[contractId]});
  e.objectiveProgress=100;
  e.objectiveScore=85;
  e.enemiesDefeated=kills;
  e.gold=gold;
  e.peakGoldRate=2.5;
  e.areasExplored=['a','b','c'];
  if(e.contract.kind==='Boss Hunt')e.objectiveState.bossKilled=true;
  if(e.contract.kind==='Delve')e.objectiveState.minersRescued=e.objectiveState.rescueMax;
  if(e.contract.kind==='Escort')e.objectiveState.caravanIntegrity=90;
  e.finish('success','test success');
  return e;
}

// Fresh tavern begins with a persistent opening milestone and founding roster entries.
const fresh=new C.TavernRoster({funds:500});
let summary=fresh.chronicleSummary();
assert.ok(summary.entries.some(e=>e.type==='milestone'&&e.meta.milestoneKey==='tavern_opened'));
assert.equal(summary.entries.filter(e=>e.type==='founder').length,1);
assert.equal(summary.totals.contracts,0);
assert.equal(summary.legends.length,0);

// Recruitment writes origin/cost/quality into the Chronicle.
fresh.recruitment.arrive(fresh.tavern);
const applicant=fresh.recruitment.active;
const applicantId=applicant.hero.id;
const applicantName=applicant.hero.name;
const recruit=fresh.recruitApplicant();
assert.equal(recruit.ok,true);
summary=fresh.chronicleSummary();
const recruitEntry=summary.entries.find(e=>e.type==='recruitment'&&e.heroId===applicantId);
assert.ok(recruitEntry);
assert.equal(recruitEntry.heroName,applicantName);
assert.equal(recruitEntry.meta.quality,recruit.event.quality);
assert.equal(recruitEntry.meta.cost,recruit.event.cost);
assert.equal(recruitEntry.meta.origin,'Applicant');

// Tavern upgrades are history; major facility levels create one-time milestones.
const upgradeRoster=new C.TavernRoster({funds:9999});
for(let i=0;i<2;i++)assert.equal(upgradeRoster.upgradeTavern('kitchen').ok,true); // Lv 3
let upgradeSummary=upgradeRoster.chronicleSummary();
assert.ok(upgradeSummary.entries.some(e=>e.type==='upgrade'&&e.meta.facility==='kitchen'&&e.meta.value===3));
assert.ok(upgradeSummary.milestones.some(m=>m.key==='facility_kitchen_3'));
const milestoneCount=upgradeSummary.milestones.length;
upgradeRoster.checkTavernMilestones();
assert.equal(upgradeRoster.chronicleSummary().milestones.length,milestoneCount);

// Patron/revenue milestones are derived from actual tavern totals and never duplicate.
upgradeRoster.tavern.served=100;
upgradeRoster.tavern.totalRevenue=500;
upgradeRoster.checkTavernMilestones();
upgradeSummary=upgradeRoster.chronicleSummary();
assert.ok(upgradeSummary.milestones.some(m=>m.key==='patrons_25'));
assert.ok(upgradeSummary.milestones.some(m=>m.key==='patrons_100'));
assert.ok(upgradeSummary.milestones.some(m=>m.key==='revenue_100'));
assert.ok(upgradeSummary.milestones.some(m=>m.key==='revenue_500'));
assert.equal(new Set(upgradeSummary.milestones.map(m=>m.key)).size,upgradeSummary.milestones.length);

// Contract settlement writes readable history and updates record holders.
const career=new C.TavernRoster({heroes:[C.makePreset('prepared'),C.makePreset('ranged')],funds:0});
const first=forcedSuccess(career,'edrin','briar_farm_wolves',101,31.5,4);
const firstSettle=career.settle('edrin',first,'chronicle_contract_1');
assert.equal(firstSettle.ok,true);
let careerSummary=career.chronicleSummary();
const contractEntry=careerSummary.entries.find(e=>e.type==='contract'&&e.meta.contractId==='briar_farm_wolves');
assert.ok(contractEntry);
assert.equal(contractEntry.heroId,'edrin');
assert.equal(contractEntry.meta.outcome,'success');
assert.equal(contractEntry.meta.objectiveScore,100);
assert.ok(careerSummary.records.objectiveScore);
assert.equal(careerSummary.records.objectiveScore.heroId,'edrin');
assert.equal(careerSummary.records.objectiveScore.value,100);
assert.equal(careerSummary.records.payout.heroId,'edrin');
assert.equal(careerSummary.records.payout.value,Number(first.gold.toFixed(2)));

// Major objective accomplishments become explicit feats.
const bossRun=forcedSuccess(career,'mara','wren_bridge_troll',102,80,2);
const bossSettle=career.settle('mara',bossRun,'chronicle_boss');
assert.equal(bossSettle.ok,true);
careerSummary=career.chronicleSummary();
assert.ok(careerSummary.entries.some(e=>e.type==='feat'&&e.meta.feat==='boss_kill'&&e.heroId==='mara'));
assert.equal(careerSummary.records.payout.heroId,'mara');
assert.equal(careerSummary.records.payout.value,Number(bossRun.gold.toFixed(2)));

// Repeated real career progress can create a legend and career advancement entries.
for(let i=0;i<3;i++){
  const e=forcedSuccess(career,'edrin','greymill_rats',200+i,25+i,4);
  assert.equal(career.settle('edrin',e,'legend_'+i).ok,true);
}
careerSummary=career.chronicleSummary();
const edrin=career.getHero('edrin');
assert.ok(C.isLegendaryHero(edrin));
assert.ok(careerSummary.legends.some(x=>x.id==='edrin'));
assert.equal(careerSummary.entries.filter(e=>e.type==='legend'&&e.heroId==='edrin').length,1);
assert.ok(careerSummary.entries.some(e=>e.type==='career'&&e.heroId==='edrin'));
assert.equal(careerSummary.records.contracts.heroId,'edrin');

// Death becomes a memorial and the fallen hero remains eligible for records/legend status.
const deathRoster=new C.TavernRoster({heroes:[C.makePreset('prepared'),C.makePreset('reckless')],funds:0});
const deathExp=new C.Expedition({hero:deathRoster.getHero('borin'),seed:303,contract:C.CONTRACTS.ashroad_caravan});
deathExp.objectiveProgress=58;
deathExp.objectiveScore=62;
deathExp.enemiesDefeated=7;
deathExp.gold=19;
deathExp.hero.alive=false;
deathExp.finish('death','fell defending the caravan');
const deathSettle=deathRoster.settle('borin',deathExp,'chronicle_death');
assert.equal(deathSettle.ok,true);
assert.equal(deathSettle.heroAlive,false);
const deathSummary=deathRoster.chronicleSummary();
const memorial=deathSummary.entries.find(e=>e.type==='death'&&e.heroId==='borin');
assert.ok(memorial);
assert.ok(memorial.text.includes('contracts'));
assert.equal(deathSummary.totals.deaths,1);
assert.ok(deathRoster.fallen.some(f=>f.hero.id==='borin'));

// Tavern contract-count milestones are driven by persistent history.
const milestoneRoster=new C.TavernRoster({funds:0});
for(let i=0;i<10;i++){
  const e=forcedSuccess(milestoneRoster,'edrin','briar_farm_wolves',400+i,10,1);
  assert.equal(milestoneRoster.settle('edrin',e,'milestone_'+i).ok,true);
}
const milestoneSummary=milestoneRoster.chronicleSummary();
assert.ok(milestoneSummary.milestones.some(m=>m.key==='contracts_10'));

// Chronicle round-trips exactly with roster state.
const persistent=C.TavernRoster.deserialize(career.serialize());
assert.deepStrictEqual(persistent.snapshot(),career.snapshot());
assert.deepStrictEqual(persistent.chronicleSummary(),career.chronicleSummary());
assert.equal(persistent.snapshot().version,11);

// Slice 13 / version-10 saves without Chronicle reconstruct existing ledgers instead of losing history.
const legacy=career.snapshot();
delete legacy.chronicle;
legacy.version=10;
const migrated=C.TavernRoster.fromSnapshot(legacy);
const migratedSummary=migrated.chronicleSummary();
assert.ok(migratedSummary.entries.some(e=>e.type==='milestone'&&e.meta.milestoneKey==='legacy_reconstructed'));
assert.ok(migratedSummary.entries.some(e=>e.type==='contract'&&e.heroId==='edrin'));
assert.ok(migratedSummary.entries.some(e=>e.type==='contract'&&e.heroId==='mara'));
assert.equal(migratedSummary.records.contracts.value,careerSummary.records.contracts.value);
assert.equal(migratedSummary.records.payout.value,careerSummary.records.payout.value);

// Legacy Fallen state reconstructs an explicit death memorial even without Chronicle data.
const legacyDeath=deathRoster.snapshot();
delete legacyDeath.chronicle;
legacyDeath.version=10;
const migratedDeath=C.TavernRoster.fromSnapshot(legacyDeath);
assert.ok(migratedDeath.chronicleSummary().entries.some(e=>e.type==='death'&&e.heroId==='borin'));

// Offline resolution uses the same settlement path and therefore writes Chronicle history.
const offlineRoster=new C.TavernRoster({funds:0});
const offlineManager=new C.ExpeditionManager();
const od=offlineManager.deploy({hero:offlineRoster.getHero('edrin'),seed:7,contract:C.CONTRACTS.briar_farm_wolves});
assert.equal(od.ok,true);
const offline=C.advanceOffline(offlineRoster,offlineManager,16*60);
assert.ok(offline.settlements.some(x=>x.id===od.entry.id));
assert.ok(offlineRoster.chronicleSummary().entries.some(e=>e.type==='contract'&&e.heroId==='edrin'));

console.log('PASS chronicle',JSON.stringify({
  freshEntries:summary.entries.length,
  careerEntries:careerSummary.entries.length,
  legends:careerSummary.legends.map(x=>x.name),
  records:Object.fromEntries(Object.entries(careerSummary.records).map(([k,v])=>[k,v.value])),
  deathMemorial:memorial.title,
  migratedEntries:migratedSummary.entries.length
},null,2));
