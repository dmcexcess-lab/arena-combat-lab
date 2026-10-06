const assert=require('assert');
const C=require('../core.js');

function cloneRoster(r){return C.TavernRoster.fromSnapshot(r.snapshot());}
function cloneManager(m){return C.ExpeditionManager.fromSnapshot(m.snapshot());}
function manualAdvance(roster,manager,seconds){
  const steps=Math.floor(seconds/C.OFFLINE_QUANTUM_SECONDS);
  for(let i=0;i<steps;i++){
    roster.tickTavern(C.OFFLINE_QUANTUM_SECONDS);
    manager.tickAll(C.OFFLINE_QUANTUM_SECONDS);
    C.settleResolvedExpeditions(roster,manager);
  }
}

// Offline catch-up must be exactly equivalent to the live 0.25-second loop.
const baseRoster=new C.TavernRoster({funds:40});
const baseManager=new C.ExpeditionManager();
baseManager.deploy({hero:baseRoster.getHero('edrin'),seed:11,contract:C.CONTRACTS.briar_farm_wolves,speed:0});
baseManager.deploy({hero:baseRoster.getHero('mara'),seed:22,contract:C.CONTRACTS.greymill_rats,speed:1});
baseManager.deploy({hero:baseRoster.getHero('borin'),seed:33,contract:C.CONTRACTS.ashroad_caravan,speed:4});

const liveRoster=cloneRoster(baseRoster),liveManager=cloneManager(baseManager);
const offRoster=cloneRoster(baseRoster),offManager=cloneManager(baseManager);
manualAdvance(liveRoster,liveManager,20);
const summary=C.advanceOffline(offRoster,offManager,20);
assert.deepStrictEqual(offRoster.snapshot(),liveRoster.snapshot());
assert.deepStrictEqual(offManager.snapshot(),liveManager.snapshot());
assert.equal(summary.appliedSeconds,20);
assert.equal(summary.steps,80);
assert.equal(summary.activeStarted,3);

// Paused expeditions stay paused through offline catch-up.
const paused=summary.progress.find(p=>p.heroId==='edrin');
assert.ok(paused);
assert.equal(paused.paused,true);
assert.equal(paused.simulatedSeconds,0);
assert.equal(offManager.entries.find(e=>e.heroId==='edrin').expedition.elapsed,0);

// Per-entry speed remains authoritative offline.
const p1=summary.progress.find(p=>p.heroId==='mara');
const p4=summary.progress.find(p=>p.heroId==='borin');
assert.ok(p1.simulatedSeconds>0);
assert.ok(p4.simulatedSeconds>=p1.simulatedSeconds);

// Long enough offline interval resolves, settles and banks a real autonomous expedition.
const settleRoster=new C.TavernRoster({funds:0});
const settleManager=new C.ExpeditionManager();
const deployed=settleManager.deploy({hero:settleRoster.getHero('edrin'),seed:7,contract:C.CONTRACTS.briar_farm_wolves,speed:12});
assert.equal(deployed.ok,true);
const fundsBefore=settleRoster.funds;
const settledSummary=C.advanceOffline(settleRoster,settleManager,60);
assert.ok(settledSummary.settlements.length>=1);
const result=settledSummary.settlements.find(x=>x.id===deployed.entry.id);
assert.ok(result);
assert.notEqual(result.outcome,'deployed');
assert.equal(settleManager.get(deployed.entry.id).settled,true);
assert.equal(settleRoster.getHero('edrin')?settleRoster.getHero('edrin').career.contracts:1,1);
assert.ok(settleRoster.funds>fundsBefore);
assert.equal(result.objectiveScore,settleManager.get(deployed.entry.id).expedition.summary().objectiveScore);

// Existing resolved-but-unsettled entries settle even with zero offline seconds.
const zeroRoster=new C.TavernRoster({funds:0});
const zeroManager=new C.ExpeditionManager();
const z=zeroManager.deploy({hero:zeroRoster.getHero('mara'),seed:5,contract:C.CONTRACTS.greymill_rats,speed:1});
z.entry.expedition.objectiveProgress=40;
z.entry.expedition.gold=9;
z.entry.expedition.finish('retreat','pre-saved resolution');
const zero=C.advanceOffline(zeroRoster,zeroManager,0);
assert.equal(zero.appliedSeconds,0);
assert.equal(zero.settlements.length,1);
assert.equal(zeroManager.get(z.entry.id).settled,true);
assert.ok(zeroRoster.funds>=9);

// Bounded catch-up uses the same simulation but never exceeds the cap.
const capRosterA=new C.TavernRoster({funds:0});
const capManagerA=new C.ExpeditionManager();
const capRosterB=cloneRoster(capRosterA),capManagerB=cloneManager(capManagerA);
const capped=C.advanceOffline(capRosterA,capManagerA,10,{maxSeconds:2});
manualAdvance(capRosterB,capManagerB,2);
assert.equal(capped.capped,true);
assert.equal(capped.appliedSeconds,2);
assert.equal(capped.cappedSeconds,8);
assert.deepStrictEqual(capRosterA.snapshot(),capRosterB.snapshot());
assert.deepStrictEqual(capManagerA.snapshot(),capManagerB.snapshot());
assert.equal(C.OFFLINE_MAX_SECONDS,8*60*60);

// Negative/backward-clock time never rewinds or mutates simulation.
const negRoster=new C.TavernRoster({funds:12});
const negManager=new C.ExpeditionManager();
const negBeforeRoster=negRoster.snapshot(),negBeforeManager=negManager.snapshot();
const neg=C.advanceOffline(negRoster,negManager,-500);
assert.equal(neg.appliedSeconds,0);
assert.deepStrictEqual(negRoster.snapshot(),negBeforeRoster);
assert.deepStrictEqual(negManager.snapshot(),negBeforeManager);

// Tavern visitors/service continue offline and summary reports their deltas.
const tavernRoster=new C.TavernRoster({funds:0});
const tavernManager=new C.ExpeditionManager();
const tavernSummary=C.advanceOffline(tavernRoster,tavernManager,180);
assert.ok(tavernSummary.tavernGold>0);
assert.ok(tavernSummary.patronsServed>0);
assert.ok(tavernSummary.merchantVisits>0);
assert.ok(tavernSummary.applicantVisits>0);
assert.equal(Number((tavernRoster.funds).toFixed(4)),Number((tavernSummary.totalFundsGained).toFixed(4)));

// Multi-expedition objective/durability/RNG state remains deterministic across offline save/resume.
const detRosterA=new C.TavernRoster({funds:0});
const detManagerA=new C.ExpeditionManager();
detManagerA.deploy({hero:detRosterA.getHero('edrin'),seed:321,contract:C.CONTRACTS.blackroot_mine,speed:4});
detManagerA.deploy({hero:detRosterA.getHero('mara'),seed:654,contract:C.CONTRACTS.wren_bridge_troll,speed:1});
const detRosterB=cloneRoster(detRosterA),detManagerB=cloneManager(detManagerA);
const first=C.advanceOffline(detRosterA,detManagerA,12.75);
const midRoster=C.TavernRoster.fromSnapshot(detRosterA.snapshot());
const midManager=C.ExpeditionManager.fromSnapshot(detManagerA.snapshot());
const second=C.advanceOffline(midRoster,midManager,7.25);
C.advanceOffline(detRosterB,detManagerB,20);
assert.deepStrictEqual(midRoster.snapshot(),detRosterB.snapshot());
assert.deepStrictEqual(midManager.snapshot(),detManagerB.snapshot());
assert.equal(first.appliedSeconds+second.appliedSeconds,20);

// Summary accounting separates tavern income from banked expedition payout.
const accountRoster=new C.TavernRoster({funds:0});
const accountManager=new C.ExpeditionManager();
const acc=accountManager.deploy({hero:accountRoster.getHero('edrin'),seed:19,contract:C.CONTRACTS.briar_farm_wolves,speed:12});
const account=C.advanceOffline(accountRoster,accountManager,120);
assert.ok(account.tavernGold>0);
if(account.settlements.length){
  assert.ok(account.expeditionGold>0);
  assert.equal(
    Number(account.totalFundsGained.toFixed(4)),
    Number((account.tavernGold+account.expeditionGold).toFixed(4))
  );
}

console.log('PASS offline',JSON.stringify({
  exactLiveEquivalent:true,
  pausedHeroSeconds:paused.simulatedSeconds,
  capSeconds:C.OFFLINE_MAX_SECONDS,
  autonomousResult:result.outcome,
  autonomousScore:result.objectiveScore,
  tavern:{gold:Number(tavernSummary.tavernGold.toFixed(2)),served:tavernSummary.patronsServed,merchants:tavernSummary.merchantVisits,applicants:tavernSummary.applicantVisits},
  deterministicSplit:first.appliedSeconds+second.appliedSeconds
},null,2));
