const assert=require('assert');
const C=require('../core.js');

function runEconomy(economy,seconds,dt=0.25){
  let earned=0;
  for(let t=0;t<seconds;t+=dt)earned+=economy.tick(dt);
  return earned;
}

// Default tavern is a real positive-income service system, not a flat timer.
const tavern=new C.TavernEconomy({seed:1234});
assert.equal(tavern.seats,2);
assert.equal(tavern.serviceLevel,1);
assert.ok(tavern.projectedGoldRate()>0);
const projectedStart=tavern.projectedGoldRate();
const earned=runEconomy(tavern,180);
assert.ok(earned>0);
assert.ok(tavern.served>0);
assert.ok(tavern.totalRevenue>0);
assert.ok(tavern.foodServed+tavern.drinksServed>=tavern.served);
assert.ok(tavern.active.length<=tavern.seats);
assert.ok(tavern.queue.length<=tavern.maxQueue());
assert.ok(tavern.rollingGoldRate()>=0);

// Patron simulation is deterministic when seed/state and elapsed ticks match.
const a=new C.TavernEconomy({seed:777});
const b=new C.TavernEconomy({seed:777});
runEconomy(a,140);
runEconomy(b,140);
assert.deepStrictEqual(a.snapshot(),b.snapshot());

// Seating is a real capacity bottleneck at the opening configuration.
const seating=new C.TavernEconomy({seed:5});
const seatingRate0=seating.projectedGoldRate();
assert.equal(seating.upgrade('seats'),true);
const seatingRate1=seating.projectedGoldRate();
assert.ok(seatingRate1>seatingRate0,JSON.stringify({seatingRate0,seatingRate1}));

// Service improves throughput after seating is available.
const service=new C.TavernEconomy({seed:6,seats:4});
const serviceRate0=service.projectedGoldRate();
assert.equal(service.upgrade('service'),true);
const serviceRate1=service.projectedGoldRate();
assert.ok(serviceRate1>serviceRate0,JSON.stringify({serviceRate0,serviceRate1}));

// Kitchen and bar improve patron value rather than fake service speed.
const quality=new C.TavernEconomy({seed:7,seats:4,serviceLevel:3});
const qualityRate0=quality.projectedGoldRate();
assert.equal(quality.upgrade('kitchen'),true);
const kitchenRate=quality.projectedGoldRate();
assert.ok(kitchenRate>qualityRate0);
assert.equal(quality.upgrade('bar'),true);
assert.ok(quality.projectedGoldRate()>kitchenRate);

// TavernRoster receives service revenue directly into shared funds.
const roster=new C.TavernRoster({funds:10});
const funds0=roster.funds;
let rosterEarned=0;
for(let i=0;i<800;i++)rosterEarned+=roster.tickTavern(0.25);
assert.ok(rosterEarned>0);
assert.ok(roster.funds>funds0);
assert.ok(Math.abs((roster.funds-funds0)-rosterEarned)<1e-8);

// Upgrades spend shared funds and alter the authoritative economy state.
const rich=new C.TavernRoster({funds:500});
const richFunds0=rich.funds;
const seatCost=rich.tavern.upgradeCost('seats');
const up=rich.upgradeTavern('seats');
assert.equal(up.ok,true);
assert.equal(up.cost,seatCost);
assert.equal(rich.tavern.seats,4);
assert.equal(rich.funds,richFunds0-seatCost);

// Insufficient funds cannot mutate the tavern.
const poor=new C.TavernRoster({funds:0});
const poorBefore=poor.tavern.snapshot();
const denied=poor.upgradeTavern('service');
assert.equal(denied.ok,false);
assert.deepStrictEqual(poor.tavern.snapshot(),poorBefore);

// Economy persists exactly with the roster.
runEconomy(rich.tavern,65);
const persisted=C.TavernRoster.deserialize(rich.serialize());
assert.deepStrictEqual(persisted.snapshot(),rich.snapshot());

// Slice 3 save state without a tavern field migrates to a valid default tavern.
const legacy=rich.snapshot();
delete legacy.tavern;
legacy.version=3;
const migrated=C.TavernRoster.fromSnapshot(legacy);
assert.ok(migrated.tavern instanceof C.TavernEconomy);
assert.equal(migrated.tavern.seats,2);
assert.ok(migrated.tavern.projectedGoldRate()>0);

// Tavern keeps earning even with no living heroes.
const empty=new C.TavernRoster({heroes:[],funds:0});
assert.equal(empty.aliveHeroes().length,0);
const emptyEarned=(()=>{let n=0;for(let i=0;i<720;i++)n+=empty.tickTavern(0.25);return n;})();
assert.ok(emptyEarned>0);
assert.ok(empty.funds>0);

// Tavern and hero earnings are additive but remain distinct systems.
const dual=new C.TavernRoster({funds:0});
const hero=dual.getHero('edrin');
let successful=null;
for(let seed=1;seed<=1000;seed++){
  const e=new C.Expedition({hero,seed});
  e.runToEnd();
  if(e.state==='success'){successful=e;break;}
}
assert.ok(successful);
const beforeService=dual.funds;
for(let i=0;i<320;i++)dual.tickTavern(0.25);
const tavernOnly=dual.funds-beforeService;
assert.ok(tavernOnly>0);
const beforeSettle=dual.funds;
const settlement=dual.settle('edrin',successful);
assert.equal(settlement.ok,true);
assert.ok(Math.abs((dual.funds-beforeSettle)-successful.gold)<1e-8);

console.log('PASS tavern',JSON.stringify({
  projectedStart,
  earned180:earned,
  served180:tavern.served,
  seatingRate0,
  seatingRate1,
  serviceRate0,
  serviceRate1,
  qualityRate:quality.projectedGoldRate(),
  emptyEarned,
  heroGold:successful.gold
},null,2));
