const assert=require('assert');
const C=require('../core.js');

function stash(){
  return {scrap_iron:10,rat_tail:10,medicinal_herb:10,strange_gland:4};
}

// Recipes are compact, authoritative, and produce real equipment/consumables.
assert.deepStrictEqual(Object.keys(C.CRAFT_RECIPES).sort(),['field_bandage','healing_potion','plated_vest','scrap_spear']);
assert.equal(C.EQUIPMENT.scrap_spear.slot,'weapon');
assert.equal(C.EQUIPMENT.plated_vest.slot,'armor');
assert.equal(C.EQUIPMENT.healing_potion.slot,'consumable');
assert.equal(C.EQUIPMENT.field_bandage.slot,'consumable');

// Crafting consumes exact materials, advances preparation time and creates tavern stock.
const roster=new C.TavernRoster({materials:stash(),funds:0});
assert.equal(roster.aliveHeroes().length,1,'fresh tavern has one founder');
roster.heroes.push(C.makePreset('reckless')); // Explicit multi-hero fixture for supply transfers.
const iron0=roster.materialCount('scrap_iron');
const tail0=roster.materialCount('rat_tail');
const prep0=roster.prepMinutes;
const spear=roster.craft('scrap_spear');
assert.equal(spear.ok,true);
assert.equal(roster.itemCount('scrap_spear'),1);
assert.equal(roster.materialCount('scrap_iron'),iron0-3);
assert.equal(roster.materialCount('rat_tail'),tail0-1);
assert.equal(roster.prepMinutes,prep0+C.CRAFT_RECIPES.scrap_spear.minutes);
assert.equal(roster.craftHistory.length,1);

// Failed craft is atomic.
const empty=new C.TavernRoster({materials:{},inventory:{}});
const emptyBefore=empty.snapshot();
const noCraft=empty.craft('plated_vest');
assert.equal(noCraft.ok,false);
assert.deepStrictEqual(empty.snapshot(),emptyBefore);

// Equipping from stock transfers ownership and returns the old gear to shared stock.
const edrin=roster.getHero('edrin');
const oldWeapon=edrin.equipment.weapon;
const readiness0=C.readinessScore(edrin);
const equip=roster.equipInventoryItem('edrin','scrap_spear');
assert.equal(equip.ok,true);
assert.equal(roster.itemCount('scrap_spear'),0);
assert.equal(roster.itemCount(oldWeapon),1);
assert.equal(roster.getHero('edrin').equipment.weapon,'scrap_spear');
assert.ok(C.readinessScore(roster.getHero('edrin'))>readiness0);

// Armor follows the same transfer rule.
assert.equal(roster.craft('plated_vest').ok,true);
const oldArmor=roster.getHero('edrin').equipment.armor;
const armor=roster.equipInventoryItem('edrin','plated_vest');
assert.equal(armor.ok,true);
assert.equal(roster.itemCount('plated_vest'),0);
assert.equal(roster.itemCount(oldArmor),1);
assert.equal(roster.getHero('edrin').equipment.armor,'plated_vest');

// Consumables are crafted into stock before being assigned to a hero.
const borin=roster.getHero('borin');
assert.equal(borin.supplies.healing_potion,0);
assert.equal(roster.craft('healing_potion').ok,true);
assert.equal(roster.itemCount('healing_potion'),1);
const potionGive=roster.giveConsumable('borin','healing_potion',1);
assert.equal(potionGive.ok,true);
assert.equal(roster.itemCount('healing_potion'),0);
assert.equal(roster.getHero('borin').supplies.healing_potion,1);

// Field bandages craft in pairs and obey hero supply caps.
assert.equal(roster.craft('field_bandage').ok,true);
assert.equal(roster.itemCount('field_bandage'),2);
const bandageGive=roster.giveConsumable('edrin','field_bandage',1);
assert.equal(bandageGive.ok,true);
assert.equal(roster.itemCount('field_bandage'),1);
assert.equal(roster.getHero('edrin').supplies.field_bandage,1);

// Crafted bandages affect the actual autonomous expedition simulation.
let bandageUsed=null;
for(let seed=1;seed<=200;seed++){
  const h=C.makePreset('prepared');
  h.health=54;
  h.supplies.healing_potion=0;
  h.supplies.field_bandage=1;
  C.addInjury(h,'sprain',1);
  const e=new C.Expedition({hero:h,seed,debug:true});
  e.startCombat('giant_rat',1);
  if(e.state==='deployed')e.combatRound();
  if(e.log.some(x=>x.text.includes('used a field bandage'))){bandageUsed=e;break;}
}
assert.ok(bandageUsed,'expected autonomous field bandage use');
assert.equal(bandageUsed.hero.supplies.field_bandage,0);
assert.ok(bandageUsed.hero.health>54);
assert.equal(C.totalInjurySeverity(bandageUsed.hero),0);

// Potion stock has a hero carrying cap; overflow remains in tavern stock.
const capRoster=new C.TavernRoster({heroes:[C.makePreset('prepared'),C.makePreset('ranged')],materials:stash(),inventory:{healing_potion:5}});
const mara=capRoster.getHero('mara');
mara.supplies.healing_potion=2;
const capGive=capRoster.giveConsumable('mara','healing_potion',5);
assert.equal(capGive.ok,true);
assert.equal(capGive.moved,1);
assert.equal(mara.supplies.healing_potion,3);
assert.equal(capRoster.itemCount('healing_potion'),4);
assert.equal(capRoster.giveConsumable('mara','healing_potion',1).ok,false);

// Contract loot settles into the exact material stash used by crafting.
const lootRoster=new C.TavernRoster({materials:{},funds:0});
let lootingRun=null;
for(let seed=1;seed<=500;seed++){
  const e=new C.Expedition({hero:lootRoster.getHero('edrin'),seed});
  e.runToEnd();
  const qty=Object.values(e.materials).reduce((n,v)=>n+v,0);
  if(qty>0){lootingRun=e;break;}
}
assert.ok(lootingRun);
const beforeLoot=JSON.parse(JSON.stringify(lootRoster.materials));
const lootSettle=lootRoster.settle('edrin',lootingRun);
assert.equal(lootSettle.ok,true);
for(const [id,count] of Object.entries(lootingRun.materials)){
  assert.equal(lootRoster.materialCount(id),(beforeLoot[id]||0)+count);
}

// Craft stock/history persist with all prior tavern/roster state.
const persisted=C.TavernRoster.deserialize(roster.serialize());
assert.deepStrictEqual(persisted.snapshot(),roster.snapshot());

// Slice 4 saves without crafting fields migrate cleanly.
const legacy=roster.snapshot();
delete legacy.inventory;
delete legacy.craftHistory;
legacy.version=4;
const migrated=C.TavernRoster.fromSnapshot(legacy);
assert.deepStrictEqual(migrated.inventory,{});
assert.deepStrictEqual(migrated.craftHistory,[]);

// Direct invisible potion purchase is no longer a preparation action.
assert.equal(C.PREPARATION_ACTIONS.buy_potion,undefined);
const prep=new C.PreparationState({hero:C.makePreset('reckless'),funds:999});
assert.equal(prep.apply('buy_potion').ok,false);

console.log('PASS crafting',JSON.stringify({
  craftCount:roster.craftHistory.length,
  bandageSeed:bandageUsed.seed,
  lootSeed:lootingRun.seed,
  loot:lootingRun.materials,
  inventory:roster.inventory
},null,2));
