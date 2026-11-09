'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../engine.js'),P=require('../plays.js'),K=require('../campaign.js');

function averageYards(off,def,start=300,count=24){
 let total=0;
 for(let seed=start;seed<start+count;seed++)total+=C.simulate(off,def,seed).result.yards;
 return total/count;
}
function completions(off,def,start=700,count=30){
 let total=0;
 for(let seed=start;seed<start+count;seed++){
  const result=C.simulate(off,def,seed);
  total+=result.events.some(event=>event.text.startsWith('Completed to '))?1:0;
 }
 return total;
}

test('ratings have role defaults, remain 1–99, and old player records gain new ratings',()=>{
 const rb=P.createOffensePresets()[0].players.find(p=>p.id==='oRB');
 const edge=P.createDefensePresets()[0].players.find(p=>p.id==='dLE');
 assert.equal(C.RATING_KEYS.length,16);
 assert.ok(C.statsOf(rb).vision>C.statsOf(edge).vision);
 assert.ok(C.statsOf(edge).passRush>C.statsOf(rb).passRush);
 rb.stats={speed:130,stamina:-5,vision:'bad'};
 assert.equal(C.statsOf(rb).speed,99);
 assert.equal(C.statsOf(rb).stamina,1);
 assert.equal(C.statsOf(rb).vision,C.defaultStats(rb).vision);
});

test('same seed reproduces movement, energy, decisions, and outcome',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[2];
 const a=C.simulate(off,def,704),b=C.simulate(off,def,704);
 assert.deepEqual(a,b);
 assert.ok(a.frames.some(frame=>frame.offense.some(player=>player.energy<1)));
});

test('runner speed and vision affect the run while defender pursuit and tackling counter it',()=>{
 const off=P.createOffensePresets()[8],def=P.createDefensePresets()[0];
 const slow=C.clone(off),fast=C.clone(off),weak=C.clone(def),strong=C.clone(def);
 slow.players.find(p=>p.id==='oRB').stats={speed:15,vision:15};
 fast.players.find(p=>p.id==='oRB').stats={speed:99,vision:99};
 weak.players.find(p=>p.id==='dM').stats={pursuit:1,tackling:1};
 strong.players.find(p=>p.id==='dM').stats={pursuit:99,tackling:99};
 assert.ok(averageYards(fast,def)>averageYards(slow,def)+1);
 assert.ok(averageYards(off,weak)>averageYards(off,strong)+.4);
});

test('coverage contests arrive at the catch point and corner skill changes completions',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[2];
 const poor=C.clone(def),strong=C.clone(def);
 poor.players.find(p=>p.id==='dCB2').stats={coverage:1,awareness:1};
 strong.players.find(p=>p.id==='dCB2').stats={coverage:99,awareness:99};
 const weakCatches=completions(off,poor),strongCatches=completions(off,strong);
 assert.ok(weakCatches>strongCatches+5);
 assert.ok(strongCatches>0,'tight coverage should still allow some catches');
});

test('route running, pass rush, and stamina affect the actual player frames',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[2];
 off.training=true;off.trainingVirtualSnap=true;
 off.players=off.players.filter(p=>['oQB','oX'].includes(p.id));
 def.players=def.players.filter(p=>p.id==='dCB1');
 off.players.find(p=>p.id==='oX').route=[{x:-19,y:3},{x:-8,y:11},{x:-3,y:15}];
 const low=C.clone(off),high=C.clone(off);
 low.players.find(p=>p.id==='oX').stats={routeRunning:1,agility:60};
 high.players.find(p=>p.id==='oX').stats={routeRunning:99,agility:60};
 const lowX=C.simulate(low,def,42).frames.find(f=>f.t===2).offense.find(p=>p.id==='oX').x;
 const highX=C.simulate(high,def,42).frames.find(f=>f.t===2).offense.find(p=>p.id==='oX').x;
 assert.ok(highX>lowX+.05);

 const rush=P.createDefensePresets()[3];rush.players=rush.players.filter(p=>p.id==='dLE');
 const poorRush=C.clone(rush),greatRush=C.clone(rush);
 poorRush.players[0].stats={passRush:1};greatRush.players[0].stats={passRush:99};
 const poorFrame=C.simulate(off,poorRush,42).frames.find(f=>f.t===.8).defense[0];
 const greatFrame=C.simulate(off,greatRush,42).frames.find(f=>f.t===.8).defense[0];
 assert.ok(greatFrame.y<poorFrame.y-.1);

 const drill=K.scrimmageSetup(K.lessons.offense[0],'offense',0);
 const tired=C.clone(drill.offense),fit=C.clone(drill.offense);
 const route=[{x:-4,y:-4},{x:-10,y:1},{x:-14,y:10},{x:-17,y:25}];
 tired.players.find(p=>p.id==='oRB').route=route;
 fit.players.find(p=>p.id==='oRB').route=route;
 tired.players.find(p=>p.id==='oRB').stats={stamina:1};
 fit.players.find(p=>p.id==='oRB').stats={stamina:99};
 const lowEnergy=C.simulate(tired,drill.defense,71).frames.find(f=>f.t===4).offense.find(p=>p.id==='oRB');
 const highEnergy=C.simulate(fit,drill.defense,71).frames.find(f=>f.t===4).offense.find(p=>p.id==='oRB');
 assert.ok(highEnergy.energy>lowEnergy.energy+.02);
 assert.ok(highEnergy.y>lowEnergy.y);
});

test('Cover 2 safeties rotate over their own vertical threats and reduce the matched deep-pass sample',()=>{
 const off=C.clone(P.createOffensePresets().find(play=>play.name==='Four Verticals'));
 off.training=true;off.trainingVirtualSnap=true;off.players=off.players.filter(p=>['oQB','oX','oZ'].includes(p.id));
 off.qbDropTime=2.4;off.throwAt=3.3;off.players.find(p=>p.id==='oQB').y=-6;
 const left=off.players.find(p=>p.id==='oX');left.x=-19;left.y=0;left.route=[{x:-19,y:9},{x:-19,y:25},{x:-19,y:32}];
 const right=off.players.find(p=>p.id==='oZ');right.x=19;right.y=-2;right.route=[{x:19,y:7},{x:19,y:23},{x:19,y:30}];
 const shell=C.clone(P.createDefensePresets().find(play=>play.name==='4–3 Cover 2'));
 shell.players=shell.players.filter(p=>['dFS','dSS'].includes(p.id));
 const spotDrop=C.clone(shell);spotDrop.name='Cover 2 spot-drop comparison';delete spotDrop.coverageScheme;
 const sample=C.simulate(off,shell,71),comparison=C.simulate(off,spotDrop,71);
 assert.ok(sample.valid&&comparison.valid);
 assert.deepEqual(sample.coverageReads.map(r=>[r.defender,r.receiver,r.decision]),[
  ['FS','X','rotates to cap vertical'],['SS','Z','rotates to cap vertical']]);
 assert.ok(sample.events.some(e=>e.text.includes('FS rotates to cap X'))&&sample.events.some(e=>e.text.includes('SS rotates to cap Z')));
 assert.deepEqual(C.simulate(off,shell,71),sample,'safety rotations remain deterministic');
 let helped=0,baseline=0;const count=20;
 for(let seed=1;seed<=count;seed++){
  helped+=C.simulate(off,shell,seed).result.yards;
  baseline+=C.simulate(off,spotDrop,seed).result.yards;
 }
 assert.ok(helped/count<baseline/count-5,`safety help should reduce this fixed deep-vertical sample (${helped/count} vs ${baseline/count})`);
 const tampa=P.createDefensePresets().find(play=>play.name==='Tampa 2');
 tampa.players=tampa.players.filter(p=>['dFS','dSS'].includes(p.id));
 const tampaReads=C.simulate(off,tampa,71).coverageReads;
 assert.ok(tampaReads.some(r=>r.defender==='FS')&&tampaReads.some(r=>r.defender==='SS'),'Tampa 2 safeties should make the same deep-half reads');
});

test('Tampa 2 middle linebacker carries the inside seam and reduces a seeded seam-pass sample',()=>{
 const off=C.clone(P.createOffensePresets().find(play=>play.name==='Four Verticals'));
 off.training=true;off.trainingVirtualSnap=true;off.players=off.players.filter(p=>['oQB','oTE'].includes(p.id));
 off.qbDropTime=2.4;off.throwAt=3.3;off.players.find(p=>p.id==='oQB').y=-6;
 const te=off.players.find(p=>p.id==='oTE');te.x=0;te.y=0;te.route=[{x:0,y:8},{x:0,y:22},{x:0,y:30}];
 const tampa=C.clone(P.createDefensePresets().find(play=>play.name==='Tampa 2'));tampa.players=tampa.players.filter(p=>p.id==='dM');
 const spotDrop=C.clone(tampa);spotDrop.name='Tampa 2 spot-drop comparison';delete spotDrop.coverageScheme;
 const sample=C.simulate(off,tampa,71),comparison=C.simulate(off,spotDrop,71);assert.ok(sample.valid&&comparison.valid);
 assert.ok(sample.coverageReads.some(r=>r.defender==='MLB'&&r.receiver==='TE'&&r.role==='Tampa 2 middle seam'&&r.decision==='carries inside vertical'));
 assert.ok(sample.events.some(e=>e.text==='MLB carries TE up the inside seam'));
 assert.deepEqual(C.simulate(off,tampa,71),sample,'the seam carry remains deterministic');
 let carried=0,baseline=0;const count=20;
 for(let seed=1;seed<=count;seed++){
  carried+=C.simulate(off,tampa,seed).result.yards;
  baseline+=C.simulate(off,spotDrop,seed).result.yards;
 }
 assert.ok(carried/count<baseline/count-3,`Tampa 2 seam help should reduce this fixed sample (${carried/count} vs ${baseline/count})`);
});


test('Quarters Match uses route ownership and reduces the seeded vertical-route gain sample',()=>{
 const off=P.createOffensePresets().find(play=>play.name==='Four Verticals');
 const quarters=P.createDefensePresets().find(play=>play.name==='Quarters Match');
 const spot=C.clone(quarters);
 assert.ok(quarters.players.filter(p=>p.job==='zone').length>=4);
 assert.ok(quarters.players.filter(p=>p.job==='zone').every(p=>p.zoneTechnique==='match'),
  'the Quarters Match call must use match-zone assignments');
 for(const p of spot.players)if(p.job==='zone')p.zoneTechnique='spot';
 let matchYards=0,spotYards=0;const count=80;
 for(let seed=1;seed<=count;seed++){
  const matched=C.simulate(off,quarters,seed),dropped=C.simulate(off,spot,seed);
  assert.ok(matched.valid&&dropped.valid);
  matchYards+=matched.result.yards;spotYards+=dropped.result.yards;
  assert.deepEqual(C.simulate(off,quarters,seed),matched,'match assignment must remain deterministic');
 }
 assert.ok(matchYards/count<spotYards/count-2,
  `pattern matching should close vertical-route space in this fixed sample (${matchYards/count} vs ${spotYards/count})`);
});
