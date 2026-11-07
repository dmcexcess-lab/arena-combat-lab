'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../engine.js'),P=require('../plays.js'),K=require('../campaign.js');
test('default scouting ratings cover each attribute and clamp authored values',()=>{
 for(const p of [...P.createOffensePresets()[0].players,...P.createDefensePresets()[0].players]){
  const s=C.statsOf(p);
  for(const key of C.RATING_KEYS)assert.ok(s[key]>=1&&s[key]<=99,key);
 }
 const x=P.createOffensePresets()[0].players.find(p=>p.label==='QB');
 x.stats={throwAccuracy:109,speed:-20};assert.equal(C.statsOf(x).throwAccuracy,99);assert.equal(C.statsOf(x).speed,1);
});
test('all campaign scrimmages are valid and grow into 11v11',()=>{
 const counts=[[3,1],[3,3],[5,5],[7,7],[11,11],[11,11]];
 for(const side of ['offense','defense'])for(let i=0;i<6;i++){
  const lesson=K.lessons[side][i];
  for(let wave=0;wave<4;wave++){
   const s=K.scrimmageSetup(lesson,side,wave);
   assert.deepEqual([s.offense.players.length,s.defense.players.length],counts[i],side+'/'+i+'/'+wave);
   assert.equal(C.validate(s.offense,s.defense).valid,true,side+'/'+i+'/'+wave+': '+C.validate(s.offense,s.defense).errors.join(';'));
   assert.equal(!!s.offense.trainingVirtualSnap,i===1);
   const ids=new Set(s.offense.players.map(p=>p.id));
   for(const defender of s.defense.players)if(defender.coverTarget)assert.ok(ids.has(defender.coverTarget));
   const sim=C.simulate(s.offense,s.defense,71+wave);
   assert.ok(sim.valid&&sim.frames.length>2);
  }
 }
});
test('opponent rotation is explicit: man, zone, blitz',()=>{
 const l=K.lessons.offense[3],a=K.scrimmageSetup(l,'offense',1),b=K.scrimmageSetup(l,'offense',2),c=K.scrimmageSetup(l,'offense',3);
 assert.ok(a.defense.players.some(p=>p.job==='man'&&p.coverTarget));
 assert.ok(b.defense.players.some(p=>p.job==='zone'&&p.zone));
 assert.ok(c.defense.players.some(p=>p.job==='blitz'));
 assert.deepEqual(K.SCRIMMAGE_WAVES.map(x=>x.id),['base','man','zone','blitz']);
});
test('identical seed and ratings preserve deterministic replay',()=>{
 const a=K.scrimmageSetup(K.lessons.offense[4],'offense',2);
 a.offense.players.find(p=>p.label==='QB').stats={throwAccuracy:58};
 const x=C.simulate(a.offense,a.defense,991),y=C.simulate(a.offense,a.defense,991);
 assert.deepEqual(x.frames,y.frames);assert.deepEqual(x.decisions,y.decisions);
});
test('telestrator mode UI, attribute editor and opponent progress are present',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const mode of ['assignments','coverage','protection','pressure','run-fits','open-space','matchups'])
  assert.ok(html.includes('value="'+mode+'"'),mode);
 assert.ok(html.includes('scrimmageScout'));
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.ok(app.includes("key.startsWith('stats.')"));
 assert.ok(app.includes("campaignWave<K.SCRIMMAGE_WAVES.length-1"));
 assert.ok(app.includes("renderCoachLayer(live,offCoords,defCoords)"));
});

test('introductory man look shadows the ball carrier rather than pretending no one is assigned',()=>{
 const l=K.lessons.offense[0],s=K.scrimmageSetup(l,'offense',1);
 assert.equal(s.defense.players[0].job,'man');
 assert.equal(s.defense.players[0].coverTarget,s.offense.runnerId);
});
test('QB arm and awareness ratings participate in core pass logic',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','engine.js'),'utf8');
 assert.ok(source.includes('statsOf(qb).throwPower'));
 assert.ok(source.includes('statsOf(qb).awareness'));
});
