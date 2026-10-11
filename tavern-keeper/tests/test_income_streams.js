const assert=require('assert');
const C=require('../core.js');

const ids=C.CONTRACT_ORDER;
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].durationSeconds),[3600,7200,10800,18000,28800]);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].jobGps),[0.3,0.5,0.75,1,1.5]);
assert.deepStrictEqual(ids.map(id=>C.CONTRACTS[id].returnGold),[260,420,850,1400,2600]);

// Tavern service and adventurer salaries enter the same bank as distinct sources.
const roster=new C.TavernRoster({funds:0});
const manager=new C.ExpeditionManager();
const d=manager.deploy({hero:roster.getHero('edrin'),seed:7,contract:C.CONTRACTS.briar_farm_wolves});
assert.ok(d.ok);
for(let i=0;i<40;i++)manager.tickAll(0.25,roster);
const e=d.entry.expedition;
assert.ok(Math.abs(roster.funds-3)<1e-8,'ten seconds pays 3g in quest wages');
assert.ok(Math.abs(e.wageGold-3)<1e-8);
assert.ok(Math.abs(e.creditedWages-e.wageGold)<1e-8);

// Reloading the paid expedition retains its credit ledger and cannot duplicate wages.
const resumedRoster=C.TavernRoster.fromSnapshot(roster.snapshot());
const resumed=C.ExpeditionManager.fromSnapshot(manager.snapshot());
assert.deepStrictEqual(resumed.snapshot(),manager.snapshot());
const before=resumedRoster.funds;
resumed.tickAll(0.25,resumedRoster);
assert.ok(Math.abs(resumedRoster.funds-before-.075)<1e-8);
assert.ok(Math.abs(resumed.get(d.entry.id).expedition.creditedWages-3.075)<1e-8);

// At return, the hero pays only the completion bonus and brings materials.
const heroExp=resumed.get(d.entry.id).expedition;
heroExp.finish('success','synthetic contract completion');
const reward=heroExp.returnGold;
assert.ok(reward>=200&&reward<=350,'easy quest comes home with a few hundred gold');
assert.ok((heroExp.materials.medicinal_herb||0)>=1);
const fundsBefore=resumedRoster.funds;
const records=C.settleResolvedExpeditions(resumedRoster,resumed);
assert.equal(records.length,1);
assert.ok(Math.abs(records[0].banked-reward)<1e-8);
assert.ok(Math.abs(resumedRoster.funds-fundsBefore-reward)<1e-8);
assert.equal(C.settleResolvedExpeditions(resumedRoster,resumed).length,0);
assert.equal(resumedRoster.funds,fundsBefore+reward);

// Without ongoing wage credit (legacy caller), settlement still pays earned wages once.
const standalone=new C.TavernRoster({funds:0});
const legacyExp=new C.Expedition({hero:standalone.getHero('edrin'),seed:7,contract:C.CONTRACTS.briar_farm_wolves});
legacyExp.tick(10); legacyExp.finish('success','direct test');
const legacyResult=standalone.settle('edrin',legacyExp);
assert.equal(legacyResult.ok,true);
assert.ok(Math.abs(legacyResult.banked-legacyExp.gold)<1e-8);
assert.equal(standalone.settle('edrin',legacyExp).ok,false);

// Offline simulation must deposit wages at the same rate as active play.
const offlineRoster=new C.TavernRoster({funds:0});
const offlineManager=new C.ExpeditionManager();
offlineManager.deploy({hero:offlineRoster.getHero('edrin'),seed:7,contract:C.CONTRACTS.briar_farm_wolves});
const report=C.advanceOffline(offlineRoster,offlineManager,10);
assert.ok(Math.abs(report.adventurerGold-3)<1e-7);
assert.ok(Math.abs(report.totalFundsGained-report.tavernGold-report.adventurerGold)<1e-4);
assert.equal(report.expeditionGold,0);
assert.equal(report.settlements.length,0);

// Contract completes during an absence; already-paid wages must never be paid twice.
const finished=C.advanceOffline(offlineRoster,offlineManager,60*60);
assert.ok(finished.settlements.length>=1);
const settlement=finished.settlements[0];
assert.ok(settlement.banked>=200&&settlement.banked<=350);
assert.ok(finished.expeditionGold>=settlement.banked);
assert.ok(finished.adventurerGold>0);
assert.ok(Math.abs(finished.totalFundsGained-finished.tavernGold-finished.adventurerGold-finished.expeditionGold)<1e-3);
assert.equal(offlineManager.get(settlement.id).settled,true);

console.log('PASS two income streams',JSON.stringify({
  earlyHourlyWage:C.CONTRACTS.briar_farm_wolves.jobGps,
  secondHourlyWage:C.CONTRACTS.greymill_rats.jobGps,
  returnGold:reward,
  offlineSalary:report.adventurerGold,
  completionGold:settlement.banked,
  wageLedger:true,saveRestore:true,duplicateSettlementPrevented:true
},null,2));
