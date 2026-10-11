const assert=require('assert');
const C=require('../core.js');
function champ(){return C.heroTemplate({
  id:'champ',name:'Champion',stats:{might:12,finesse:12,endurance:12,wits:12,resolve:12},
  health:100,traits:['Brave','Resourceful'],
  equipment:{weapon:'steel_sword',armor:'chain_mail'},
  supplies:{healing_potion:3,field_bandage:1},
  career:{skills:{melee:10,ranged:6,survival:8},rank:9,xp:2500}
});}
assert.equal(C.CONTRACTS.wren_bridge_troll.locations.bridge.encounter.boss,true);
assert.equal(C.CONTRACTS.blackroot_mine.locations.brood_chamber.encounter.boss,true);
assert.equal(C.CONTRACTS.wren_bridge_troll.locations.troll_lair.encounter.boss,false);

// Only manager-deployed playable jobs switch to player-controlled boss combat.
// Existing isolated/seeded contract simulations retain fully automatic encounters.
const standalone=new C.Expedition({hero:champ(),seed:1,contract:C.CONTRACTS.wren_bridge_troll});
standalone.startCombat('troll',1,{boss:true});
assert.equal(standalone.isBossPending(),false);
assert.equal(new C.Expedition({hero:champ(),contract:C.CONTRACTS.wren_bridge_troll}).interactiveBoss,false);
const gameRoster=new C.TavernRoster({heroes:[champ(),C.makePreset('ranged')],funds:0});
const game=new C.ExpeditionManager();
const bossEntry=game.deploy({hero:gameRoster.getHero('champ'),seed:1,contract:C.CONTRACTS.wren_bridge_troll});
const regularEntry=game.deploy({hero:gameRoster.getHero('mara'),seed:2,contract:C.CONTRACTS.briar_farm_wolves});
assert.equal(bossEntry.ok,true);assert.equal(regularEntry.ok,true);
const boss=bossEntry.entry.expedition;
boss.locationId='bridge';
for(let i=0;i<4&&!boss.isBossPending();i++)boss.tick(900);
assert.equal(boss.isBossPending(),true,'arriving at bridge interrupts autonomous simulation');
const frozen=JSON.stringify({time:boss.elapsed,gold:boss.gold,wage:boss.wageGold,clock:boss.actionClock,enemy:boss.currentCombat.enemies});
const funds=gameRoster.funds;
assert.deepStrictEqual(boss.resolveBossTurn('cheat'),{ok:false,reason:'invalid battle action'});
assert.deepStrictEqual(boss.resolveBossTurn('potionless'),{ok:false,reason:'invalid battle action'});
game.tickAll(3,gameRoster);
assert.equal(JSON.stringify({time:boss.elapsed,gold:boss.gold,wage:boss.wageGold,clock:boss.actionClock,enemy:boss.currentCombat.enemies}),frozen);
assert.ok(gameRoster.funds>funds,'another expedition continues earning wages');
assert.equal(regularEntry.entry.expedition.elapsed,3);
const snap=game.snapshot();
const resumed=C.ExpeditionManager.fromSnapshot(snap);
assert.deepStrictEqual(resumed.snapshot(),snap);
assert.equal(resumed.get(bossEntry.entry.id).expedition.isBossPending(),true);
const offline=C.advanceOffline(gameRoster,game,240);
assert.equal(boss.isBossPending(),true);
assert.equal(boss.elapsed,JSON.parse(frozen).time);
assert.ok(regularEntry.entry.expedition.elapsed>3);
assert.equal(game.get(bossEntry.entry.id).settled,false);

// JRPG actions validate supplies, consume a turn and persist the battle state.
const action=boss.resolveBossTurn('guard');
assert.equal(action.ok,true);
assert.equal(boss.currentCombat.round,1);
assert.equal(boss.elapsed,JSON.parse(frozen).time);
const afterGuard=boss.snapshot();
const loaded=C.Expedition.fromSnapshot(afterGuard);
assert.equal(loaded.isBossPending(),true);
assert.deepStrictEqual(loaded.snapshot(),afterGuard);
const potionCount=loaded.hero.supplies.healing_potion;
loaded.resolveBossTurn('potion');
assert.equal(loaded.hero.supplies.healing_potion,potionCount-1);
assert.equal(loaded.currentCombat.round,2);
loaded.hero.supplies.healing_potion=0;
const noPotion=loaded.resolveBossTurn('potion');
assert.equal(noPotion.ok,false);
assert.equal(loaded.currentCombat.round,2,'invalid actions never consume a turn');

// Victory must return to autonomous travel, with boss objective credit.
const victory=new C.Expedition({hero:champ(),seed:1,contract:C.CONTRACTS.wren_bridge_troll,interactiveBoss:true});
victory.locationId='bridge';victory.startCombat('troll',1,{boss:true});
for(let n=0;n<25&&victory.isBossPending();n++)victory.resolveBossTurn(n%3===2?'guard':'heavy');
assert.equal(victory.isBossPending(),false);
assert.equal(victory.currentCombat,null);
assert.equal(victory.objectiveState.bossKilled,true);
assert.equal(victory.state,'deployed');
assert.equal(victory._entered,true);
assert.ok(victory.enemiesDefeated>=1);

// Blackroot's optional miniboss is player-controlled too.
const mine=new C.Expedition({hero:champ(),seed:1,contract:C.CONTRACTS.blackroot_mine,interactiveBoss:true});
mine.locationId='brood_chamber';
mine.startCombat('cave_stalker',2,{boss:true});
assert.equal(mine.isBossPending(),true);
assert.equal(mine.currentCombat.enemies.length,2);
mine.resolveBossTurn('guard');
assert.equal(mine.currentCombat.round,1);

// Each waiting expedition is independently commandable.
assert.equal(boss.isBossPending(),true);
assert.equal(regularEntry.entry.expedition.isBossPending(),false);
console.log('PASS interactive boss encounters',JSON.stringify({
  pausedElapsed:boss.elapsed,savedCombatRounds:loaded.currentCombat.round,
  victoryBossCredit:victory.objectiveState.bossKilled,offlineOtherExpedition:regularEntry.entry.expedition.elapsed,
  optionalMineBoss:true
},null,2));
