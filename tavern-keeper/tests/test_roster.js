const assert=require('assert');
const C=require('../core.js');

function findSeed(hero,pred,max=3000){
  for(let seed=1;seed<=max;seed++){
    const e=new C.Expedition({hero,seed});
    const out=e.runToEnd();
    if(pred(out,e))return e;
  }
  throw new Error('No matching seed found');
}

// Fresh generation starts with one founder and two low-threat jobs.
const roster=new C.TavernRoster({funds:30});
assert.equal(roster.aliveHeroes().length,1);
assert.equal(roster.aliveHeroes()[0].id,'edrin');
assert.deepStrictEqual(roster.availableContractIds(),['briar_farm_wolves','greymill_rats']);
assert.equal(roster.tavernLevel(),1);
assert.equal(roster.tavernReputation(),0);

// Job-board unlocks require BOTH tavern investment and a matching reputation tier.
const board=new C.TavernRoster();
board.tavern.served=3000;
assert.equal(board.jobBoardTier(),1,'reputation alone cannot unlock jobs');
board.tavern.served=0;
for(const facility of ['serviceLevel','kitchenLevel','barLevel','lodgingLevel'])board.tavern[facility]=5;
assert.equal(board.tavernLevel(),5);
assert.equal(board.jobBoardTier(),1,'tavern level alone cannot unlock jobs');
const thresholds=[0,20,60,140,300],expectedCounts=[2,3,4,4,5],expectedThreats=[2,3,4,4,6];
for(let i=0;i<thresholds.length;i++){
  board.tavern.served=thresholds[i]*10;
  assert.equal(board.jobBoardTier(),i+1);
  const jobs=board.availableContractIds();
  assert.equal(jobs.length,expectedCounts[i]);
  assert.equal(Math.max(...jobs.map(id=>C.CONTRACTS[id].threat)),expectedThreats[i]);
}
assert.equal(board.availableContractIds().length,5,'job board never exceeds five jobs');

// Preparing one hero spends shared tavern money but does not mutate another hero.
roster.heroes.push(C.makePreset('ranged'));
const edrinBefore=JSON.parse(JSON.stringify(roster.getHero('edrin')));
const maraBefore=JSON.parse(JSON.stringify(roster.getHero('mara')));
const fundsBefore=roster.funds;
assert.equal(roster.prepare('edrin','simple_meal').ok,true);
assert.equal(roster.funds,fundsBefore-C.PREPARATION_ACTIONS.simple_meal.cost);
assert.ok(roster.getHero('edrin').hunger<edrinBefore.hunger);
assert.deepStrictEqual(roster.getHero('mara'),maraBefore);

// A real surviving contract updates only that hero's career and history.
const heroForRun=roster.getHero('edrin');
const success=findSeed(heroForRun,o=>o.outcome==='success');
const maraCareerBefore=JSON.parse(JSON.stringify(roster.getHero('mara').career));
const settle=roster.settle('edrin',success);
assert.equal(settle.ok,true);
const veteran=roster.getHero('edrin');
assert.equal(veteran.career.contracts,1);
assert.equal(veteran.career.successes,1);
assert.ok(veteran.career.xp>0);
assert.ok(veteran.career.skills.melee>0);
assert.ok(veteran.career.skills.survival>0);
assert.equal(veteran.history.length,1);
assert.deepStrictEqual(roster.getHero('mara').career,maraCareerBefore);

// The same expedition cannot pay twice.
const fundsAfterSettle=roster.funds;
assert.equal(roster.settle('edrin',success).ok,false);
assert.equal(roster.funds,fundsAfterSettle);

// Career progression can evolve traits/titles from accumulated actual performance.
const careerHero=C.makePreset('prepared');
const fakeBase={
  objectiveProgress:100,enemiesDefeated:5,areasExplored:['a','b','c','d'],state:'success',
  gold:50,peakGoldRate:3,injuriesSuffered:1,contract:C.CONTRACT,seed:77
};
for(let i=0;i<3;i++)C.applyCareerProgress(careerHero,Object.assign({},fakeBase,{seed:77+i}));
assert.ok(careerHero.career.rank>1);
assert.equal(careerHero.career.contracts,3);
assert.ok(careerHero.traits.includes('Veteran'));
assert.ok(careerHero.traits.includes('Battle Hardened'));
assert.ok(careerHero.titles.includes('Road Regular'));
assert.ok(careerHero.titles.includes('Greymill Veteran'));
assert.ok(careerHero.titles.includes('Ratcatcher'));

// Career skill feeds back into actual readiness.
const rookie=C.makePreset('prepared');
const experienced=C.makePreset('prepared');
experienced.career.skills.melee=5;
experienced.career.skills.survival=4;
assert.ok(C.readinessScore(experienced)>C.readinessScore(rookie));

// Death removes a hero from the living roster and records a memorial snapshot.
const deathRoster=new C.TavernRoster({heroes:[C.makePreset('prepared'),C.makePreset('reckless')],funds:0});
const deadRun=findSeed(deathRoster.getHero('borin'),o=>o.outcome==='death');
const deathSettlement=deathRoster.settle('borin',deadRun);
assert.equal(deathSettlement.ok,true);
assert.equal(deathSettlement.heroAlive,false);
assert.equal(deathRoster.getHero('borin'),null);
assert.equal(deathRoster.fallen.length,1);
assert.equal(deathRoster.fallen[0].hero.id,'borin');
assert.equal(deathRoster.fallen[0].deathRecord.outcome,'death');
assert.ok(deathRoster.fallen[0].hero.history.length>=1);

// Tavern roster snapshot round-trips all persistent career/death/economy state.
const roundTrip=C.TavernRoster.deserialize(deathRoster.serialize());
assert.deepStrictEqual(roundTrip.snapshot(),deathRoster.snapshot());

// Active expedition snapshot resumes deterministically after a page-style reload.
const original=new C.Expedition({hero:C.makePreset('ranged'),seed:2468,debug:true});
for(let i=0;i<18&&original.state==='deployed';i++)original.tick(1);
const restored=C.Expedition.fromSnapshot(original.snapshot(),{debug:true});
const finalA=original.runToEnd();
const finalB=restored.runToEnd();
assert.deepStrictEqual(finalB,finalA);
assert.deepStrictEqual(restored.log,original.log);
assert.deepStrictEqual(restored.hero,original.hero);

// Selection survives persistence and invalid selected IDs recover safely.
const sel=new C.TavernRoster({heroes:[C.makePreset('prepared'),C.makePreset('ranged')]});
assert.equal(sel.selectHero('mara'),true);
const selLoaded=C.TavernRoster.deserialize(sel.serialize());
assert.equal(selLoaded.selectedHeroId,'mara');
const recovered=C.TavernRoster.fromSnapshot(Object.assign({},sel.snapshot(),{selectedHeroId:'missing'}));
assert.ok(recovered.getHero(recovered.selectedHeroId));

// Old Slice 2-shaped heroes without career/history fields normalize into valid persistent heroes.
const oldHero={id:'legacy',name:'Legacy Hero',alive:true,stats:{might:5,finesse:5,endurance:5,wits:5,resolve:5},maxHealth:100,health:90,hunger:30,fatigue:20,morale:60,traits:['Cautious'],equipment:{weapon:'wood_axe',armor:null},supplies:{healing_potion:0},moodlets:[],injuries:[],prepEffects:[]};
const legacyRoster=new C.TavernRoster({heroes:[oldHero],selectedHeroId:'legacy'});
assert.equal(legacyRoster.getHero('legacy').career.rank,1);
assert.deepStrictEqual(legacyRoster.getHero('legacy').history,[]);
assert.deepStrictEqual(legacyRoster.getHero('legacy').titles,[]);

console.log('PASS roster',JSON.stringify({
  successSeed:success.seed,
  deathSeed:deadRun.seed,
  edrinRank:veteran.career.rank,
  evolvedRank:careerHero.career.rank,
  fallen:deathRoster.fallen.length,
  restoredOutcome:finalB.outcome
},null,2));
