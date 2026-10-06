const assert=require('assert');
const C=require('../core.js');

function developedTavern(level){
  if(level===1)return new C.TavernEconomy({seats:2,serviceLevel:1,kitchenLevel:1,barLevel:1});
  if(level===2)return new C.TavernEconomy({seats:4,serviceLevel:2,kitchenLevel:2,barLevel:2});
  return new C.TavernEconomy({seats:4,serviceLevel:3,kitchenLevel:3,barLevel:3});
}

// Merchant quality is derived from tavern development, not hero progress.
assert.equal(C.merchantQuality(developedTavern(1)),1);
assert.equal(C.merchantQuality(developedTavern(2)),2);
assert.equal(C.merchantQuality(developedTavern(3)),3);

// Visits are timed and deterministic.
const m1=new C.MerchantSystem({seed:123,nextArrival:2});
const m2=new C.MerchantSystem({seed:123,nextArrival:2});
for(let i=0;i<12;i++){m1.tick(0.25,developedTavern(2));m2.tick(0.25,developedTavern(2));}
assert.ok(m1.active);
assert.deepStrictEqual(m1.snapshot(),m2.snapshot());
assert.equal(m1.active.quality,2);
assert.ok(m1.active.remaining>0);

// Stock is finite, bounded and excludes crafted-only items.
assert.ok(m1.active.offers.length>=4);
assert.equal(new Set(m1.active.offers.map(o=>o.id)).size,m1.active.offers.length);
for(const offer of m1.active.offers){
  assert.ok(offer.quantity>=1);
  assert.ok(C.MERCHANT_GOODS[offer.id]);
  assert.notEqual(offer.id,'scrap_spear');
  assert.notEqual(offer.id,'plated_vest');
  assert.notEqual(offer.id,'field_bandage');
}

// Quality gates real stock: Q1 cannot offer Q2/Q3; Q3 can produce exclusive high-grade ordinary gear.
for(let seed=1;seed<=80;seed++){
  const m=new C.MerchantSystem({seed,nextArrival:0});
  m.tick(0.25,developedTavern(1));
  assert.ok(m.active.offers.every(o=>C.MERCHANT_GOODS[o.id].minQuality<=1));
}
let sawQ3Exclusive=false;
for(let seed=1;seed<=120;seed++){
  const m=new C.MerchantSystem({seed,nextArrival:0});
  m.tick(0.25,developedTavern(3));
  if(m.active.offers.some(o=>o.id==='steel_sword'||o.id==='chain_mail')){sawQ3Exclusive=true;break;}
}
assert.ok(sawQ3Exclusive,'quality 3 should be able to surface exclusive gear');

// Purchase flows into the existing shared material/item inventories and spends exact gold.
const roster=new C.TavernRoster({
  funds:500,
  tavern:{seats:4,serviceLevel:2,kitchenLevel:2,barLevel:2},
  merchants:{seed:44,nextArrival:0}
});
roster.merchants.tick(0.25,roster.tavern);
assert.ok(roster.merchants.active);
const materialOffer=roster.merchants.active.offers.find(o=>o.type==='material');
const itemOffer=roster.merchants.active.offers.find(o=>o.type==='item');
assert.ok(materialOffer);
assert.ok(itemOffer);

const matBefore=roster.materialCount(materialOffer.id);
const fundsBeforeMat=roster.funds;
const matQtyBefore=materialOffer.quantity;
const buyMat=roster.purchaseMerchantOffer(materialOffer.key,1);
assert.equal(buyMat.ok,true);
assert.equal(roster.materialCount(materialOffer.id),matBefore+1);
assert.equal(roster.funds,fundsBeforeMat-materialOffer.unitPrice);
assert.equal(materialOffer.quantity,matQtyBefore-1);

const itemBefore=roster.itemCount(itemOffer.id);
const fundsBeforeItem=roster.funds;
const itemQtyBefore=itemOffer.quantity;
const buyItem=roster.purchaseMerchantOffer(itemOffer.key,1);
assert.equal(buyItem.ok,true);
assert.equal(roster.itemCount(itemOffer.id),itemBefore+1);
assert.equal(roster.funds,fundsBeforeItem-itemOffer.unitPrice);
assert.equal(itemOffer.quantity,itemQtyBefore-1);
assert.equal(roster.purchaseHistory.length,2);

// Purchased ordinary gear uses the same stock-transfer loadout path as crafted gear.
if(C.EQUIPMENT[itemOffer.id].slot==='weapon'||C.EQUIPMENT[itemOffer.id].slot==='armor'){
  const equip=roster.equipInventoryItem('edrin',itemOffer.id);
  assert.equal(equip.ok,true);
  assert.equal(roster.getHero('edrin').equipment[C.EQUIPMENT[itemOffer.id].slot],itemOffer.id);
}

// Insufficient funds and sold-out offers cannot mutate state.
const poor=new C.TavernRoster({
  funds:0,
  tavern:{seats:4,serviceLevel:2,kitchenLevel:2,barLevel:2},
  merchants:{seed:51,nextArrival:0}
});
poor.merchants.tick(0.25,poor.tavern);
const poorOffer=poor.merchants.active.offers[0];
const poorBefore=poor.snapshot();
assert.equal(poor.purchaseMerchantOffer(poorOffer.key,1).ok,false);
assert.deepStrictEqual(poor.snapshot(),poorBefore);

const finite=new C.TavernRoster({
  funds:999,
  tavern:{seats:4,serviceLevel:2,kitchenLevel:2,barLevel:2},
  merchants:{seed:64,nextArrival:0}
});
finite.merchants.tick(0.25,finite.tavern);
const finiteOffer=finite.merchants.active.offers[0];
while(finiteOffer.quantity>0)assert.equal(finite.purchaseMerchantOffer(finiteOffer.key,1).ok,true);
const afterSellout=finite.snapshot();
assert.equal(finite.purchaseMerchantOffer(finiteOffer.key,1).ok,false);
assert.deepStrictEqual(finite.snapshot(),afterSellout);

// Merchant departs, then a later visit rotates name/stock and reevaluates quality.
const cycle=new C.MerchantSystem({seed:9,nextArrival:0});
const low=developedTavern(1);
cycle.tick(0.25,low);
const firstName=cycle.active.name;
const firstOffers=JSON.stringify(cycle.active.offers);
for(let i=0;i<250;i++)cycle.tick(0.25,low);
assert.equal(cycle.active,null);
assert.ok(cycle.nextArrival>0);
const high=developedTavern(3);
for(let i=0;i<230;i++)cycle.tick(0.25,high);
assert.ok(cycle.active);
assert.notEqual(cycle.active.name,firstName);
assert.equal(cycle.active.quality,3);
assert.notEqual(JSON.stringify(cycle.active.offers),firstOffers);

// Merchant/purchase state persists exactly with the tavern roster.
const saved=C.TavernRoster.deserialize(roster.serialize());
assert.deepStrictEqual(saved.snapshot(),roster.snapshot());

// Slice 5 saves without merchant fields migrate cleanly to a scheduled future visit.
const legacy=roster.snapshot();
delete legacy.merchants;
delete legacy.purchaseHistory;
legacy.version=5;
const migrated=C.TavernRoster.fromSnapshot(legacy);
assert.ok(migrated.merchants instanceof C.MerchantSystem);
assert.deepStrictEqual(migrated.purchaseHistory,[]);
assert.equal(migrated.merchants.active,null);
assert.ok(migrated.merchants.nextArrival>0);

// Merchant availability advances with the live tavern clock.
const ticking=new C.TavernRoster({funds:0,merchants:{seed:88,nextArrival:1}});
ticking.tickTavern(0.5);
assert.equal(ticking.merchants.active,null);
ticking.tickTavern(0.6);
assert.ok(ticking.merchants.active);

console.log('PASS merchants',JSON.stringify({
  q1:C.merchantQuality(developedTavern(1)),
  q2:C.merchantQuality(developedTavern(2)),
  q3:C.merchantQuality(developedTavern(3)),
  firstVisitor:m1.active.name,
  purchaseCount:roster.purchaseHistory.length,
  migratedNextArrival:migrated.merchants.nextArrival
},null,2));
