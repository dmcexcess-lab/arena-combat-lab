const assert=require('assert');
const fs=require('fs');
const path=require('path');
const C=require('../core.js');

const SEEDS=250;
const FOUNDERS=['prepared','ranged','reckless'];

function batch(preset,contractId,n=SEEDS){
  const out={success:0,retreat:0,death:0,failure:0,gold:0,score:0,nonSuccessGold:0,nonSuccess:0};
  for(let seed=1;seed<=n;seed++){
    const e=new C.Expedition({hero:C.makePreset(preset),seed,contract:C.CONTRACTS[contractId]});
    const s=e.runToEnd();
    out[s.outcome]=(out[s.outcome]||0)+1;
    out.gold+=s.totalGold;
    out.score+=s.objectiveScore;
    if(s.outcome!=='success'){out.nonSuccess++;out.nonSuccessGold+=s.totalGold;}
  }
  out.successPct=out.success/n*100;
  out.deathPct=out.death/n*100;
  out.avgGold=out.gold/n;
  out.avgScore=out.score/n;
  out.avgNonSuccessGold=out.nonSuccess?out.nonSuccessGold/out.nonSuccess:0;
  return out;
}

const matrix={};
for(const id of C.CONTRACT_ORDER){
  matrix[id]={};
  for(const p of [...FOUNDERS,'unprepared'])matrix[id][p]=batch(p,id);
}
const aggregate=id=>FOUNDERS.reduce((n,p)=>n+matrix[id][p].successPct,0)/FOUNDERS.length;
const rates=C.CONTRACT_ORDER.map(id=>aggregate(id));

// Release threat curve: introductory jobs are reliable, upper board is risky, Threat 6 hardest.
assert.ok(rates[0]>=95,'Threat 1 should be a reliable starter contract');
assert.ok(rates[1]>=90,'Threat 2 should be a reliable early contract');
assert.ok(rates[2]>=15&&rates[2]<=45,'Threat 3 should be meaningfully risky');
assert.ok(rates[3]>=10&&rates[3]<=40,'Threat 4 should be meaningfully risky');
assert.ok(rates[3]<=rates[2]+6,'Threat 4 must not be dramatically easier than Threat 3');
assert.ok(rates[4]<rates[3]&&rates[4]<=25,'Threat 6 must be the hardest contract');

// Preparation remains decisive: deliberately unprepared heroes cannot brute-force the board.
for(const id of C.CONTRACT_ORDER){
  assert.ok(matrix[id].unprepared.successPct<=2,id+' unprepared success rate too high');
}

// Personality/risk behavior remains differentiated rather than flattening all heroes.
for(const id of ['ashroad_caravan','blackroot_mine','wren_bridge_troll']){
  assert.ok(matrix[id].reckless.deathPct>=35,id+' should be genuinely lethal for reckless Borin');
  assert.ok(matrix[id].prepared.deathPct<=5,id+' cautious Edrin should usually retreat instead of die');
  assert.ok(matrix[id].ranged.deathPct<=5,id+' cautious Mara should usually retreat instead of die');
}

// Paid failure remains useful on every upper-tier contract.
for(const id of ['ashroad_caravan','blackroot_mine','wren_bridge_troll']){
  for(const p of FOUNDERS){
    const b=matrix[id][p];
    if(b.nonSuccess)assert.ok(b.avgNonSuccessGold>0,id+' '+p+' produced worthless failure');
  }
}

// No high-tier contract becomes an automatic win for every founder.
for(const id of ['ashroad_caravan','blackroot_mine','wren_bridge_troll']){
  assert.ok(FOUNDERS.some(p=>matrix[id][p].successPct<50),id+' is too broadly trivial');
}

// Tavern economy sanity: early progress is available without runaway idle inflation.
function tavernGold(tavern,seconds){
  let gold=0;
  for(let i=0;i<seconds/C.OFFLINE_QUANTUM_SECONDS;i++)gold+=tavern.tick(C.OFFLINE_QUANTUM_SECONDS);
  return gold;
}
const baseTavern=new C.TavernEconomy({seed:1});
const maxTavern=new C.TavernEconomy({seed:1,seats:12,serviceLevel:6,kitchenLevel:6,barLevel:6,lodgingLevel:6,infirmaryLevel:6,workshopLevel:6});
const baseFive=tavernGold(baseTavern,300);
const maxFive=tavernGold(maxTavern,300);
assert.ok(baseFive>=50&&baseFive<=120,'baseline tavern economy outside release band');
assert.ok(maxFive>baseFive*2,'tavern upgrades should materially improve income');
assert.ok(maxFive<baseFive*4,'max tavern income is growing too explosively');
for(const id of ['service','kitchen','bar','lodging','infirmary','workshop']){
  const cost=new C.TavernEconomy().upgradeCost(id);
  assert.ok(cost>=15&&cost<=40,'starting '+id+' upgrade cost outside release band');
}

// Idle safety remains explicit.
assert.equal(C.OFFLINE_MAX_SECONDS,8*60*60);
assert.equal(C.OFFLINE_QUANTUM_SECONDS,0.25);

// Release UX static acceptance for phone/desktop web.
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(html.includes('Release Candidate — Survive, Profit, Remember'));
assert.ok(html.includes('class="panel onboarding-panel"'));
for(const phrase of ['Earn','Prepare','Choose Risk','Send Them'])assert.ok(html.includes(phrase),'missing onboarding '+phrase);
assert.ok(html.includes('width=device-width,initial-scale=1,viewport-fit=cover'));
assert.ok(css.includes('@media(hover:none),(pointer:coarse)'));
assert.ok(css.includes('button{min-height:44px}'));
assert.ok(css.includes('font-size:16px'));
assert.ok(css.includes('header{flex-direction:column}'));
assert.ok(app.includes("document.addEventListener('visibilitychange'"));
assert.ok(app.includes('renderOfflineReturn()'));
assert.ok(html.includes('id="newTavern"'));
assert.ok(html.includes('id="deploy"'));
assert.ok(html.includes('data-speed="12"'));

console.log('PASS release acceptance',JSON.stringify({
  seedsPerBuildPerContract:SEEDS,
  aggregateSuccess:Object.fromEntries(C.CONTRACT_ORDER.map((id,i)=>[id,Number(rates[i].toFixed(1))])),
  recklessDeath:Object.fromEntries(['ashroad_caravan','blackroot_mine','wren_bridge_troll'].map(id=>[id,Number(matrix[id].reckless.deathPct.toFixed(1))])),
  economy:{baseFive:Number(baseFive.toFixed(2)),maxFive:Number(maxFive.toFixed(2))},
  offlineCapHours:C.OFFLINE_MAX_SECONDS/3600
},null,2));
