'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../engine.js'),P=require('../plays.js'),K=require('../campaign.js');

test('a receiver leaves the route endpoint after a catch and advances the live ball',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];
 off.training=true;off.trainingVirtualSnap=true;
 off.players=off.players.filter(p=>['oQB','oSL'].includes(p.id));
 off.players.find(p=>p.id==='oSL').route=[{x:-9,y:3},{x:-9,y:6}];
 def.players=def.players.filter(p=>p.id==='dCB2');
 const sim=C.simulate(off,def,17);
 const caught=sim.events.find(e=>e.text==='Completed to SL');
 assert.ok(caught);
 const atCatch=sim.frames.find(f=>f.t>=caught.t);
 const later=sim.frames.find(f=>f.t>=caught.t+1);
 assert.equal(atCatch.phase,'runafter');
 assert.equal(later.carrierId,'oSL');
 assert.ok(later.offense.find(p=>p.id==='oSL').y>10,
  'the ball carrier must run beyond a six-yard route endpoint');
 assert.ok(later.ball.y>atCatch.ball.y+4);
 assert.deepEqual(C.simulate(off,def,17),sim,'RAC replay must remain deterministic');
});

test('zone defenders leave their landmarks and pursue a completed pass',()=>{
 const sim=C.simulate(P.createOffensePresets()[0],P.createDefensePresets()[0],700);
 const caught=sim.events.find(e=>e.text.startsWith('Completed to '));
 assert.ok(caught);
 const first=sim.frames.find(f=>f.t>=caught.t);
 const later=sim.frames.find(f=>f.t>=caught.t+1);
 const cb=id=>first.defense.find(p=>p.id===id);
 const moved=id=>later.defense.find(p=>p.id===id);
 assert.ok(moved('dCB2').y>cb('dCB2').y+4);
 assert.ok(moved('dSS').x>cb('dSS').x+3);
 assert.ok(later.offense.find(p=>p.id===later.carrierId).y>
   first.offense.find(p=>p.id===first.carrierId).y+4);
});

test('interception remains live for a return and counts as a turnover, not offensive yards',()=>{
 const sim=C.simulate(P.createOffensePresets()[0],P.createDefensePresets()[0],418);
 assert.ok(sim.events.some(e=>e.text.startsWith('Interception by ')));
 assert.ok(sim.frames.some(f=>f.phase==='return'));
 assert.equal(sim.result.possession,'defense');
 assert.equal(sim.result.yards,0);
 assert.ok(sim.result.verdict.startsWith('Interception return '));
 assert.ok(sim.result.returnYards>=0);
});

test('negative gains lengthen the distance to gain and an end-zone sack is a safety',()=>{
 assert.deepEqual(K.advanceSeries({yardLine:40,toGain:10},-4),
  {yardLine:36,toGain:14,converted:false});
 assert.deepEqual(K.advanceSeries({yardLine:40,toGain:10},10),
  {yardLine:50,toGain:0,converted:true});
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];
 off.training=true;off.trainingVirtualSnap=true;off.yardLine=1;
 off.players=off.players.filter(p=>['oQB','oX'].includes(p.id));
 off.qbDropTime=4;off.throwAt=4;off.allowScramble=false;
 def.players=def.players.filter(p=>p.id==='dLE');
 def.players[0].x=0;def.players[0].y=1.4;
 const sim=C.simulate(off,def,71);
 assert.ok(sim.result.verdict.startsWith('Safety'));
 assert.ok(sim.result.yards<-1);
});

test('full-squad backfield players with ineligible numbers must report eligible',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];
 const lt=off.players.find(p=>p.id==='oLT'),slot=off.players.find(p=>p.id==='oSL');
 lt.onLine=false;lt.y=-2;
 slot.onLine=true;slot.y=0;slot.reportedIneligible=true;
 slot.job='passblock';slot.route=[];
 assert.equal(C.validate(off,def).valid,false);
 lt.reportedEligible=true;
 assert.equal(C.validate(off,def).valid,true);
});
