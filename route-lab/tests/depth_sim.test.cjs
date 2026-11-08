'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../engine.js'),P=require('../plays.js');

function isolatedRun(){
 const off=P.createOffensePresets()[8],def=P.createDefensePresets()[7];
 off.training=true;off.trainingVirtualSnap=true;
 off.players=off.players.filter(p=>['oQB','oRB'].includes(p.id));
 off.players.find(p=>p.id==='oQB').x=-2;
 const rb=off.players.find(p=>p.id==='oRB');
 rb.x=0;rb.y=-5;rb.route=[{x:0,y:-2},{x:0,y:3},{x:0,y:15}];
 def.players=def.players.filter(p=>p.id==='dM');
 def.players[0].job='runfit';def.players[0].x=0;def.players[0].y=4;
 return {off,def};
}
const at=(sim,t,side,id)=>sim.frames.find(f=>f.t===t)[side].find(p=>p.id===id);

test('position defaults distinguish slot receiver, safety, tight end, and nickel',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[1];
 const get=(play,id)=>C.defaultStats(play.players.find(p=>p.id===id));
 assert.ok(get(off,'oSL').coverage<get(def,'dSS').coverage);
 assert.ok(get(off,'oX').strength<get(off,'oTE').strength);
 assert.ok(get(def,'dS').coverage>get(def,'dM').coverage,'nickel must have DB coverage');
});

test('RB reacts to a defender blocking the called hole and keeps advancing beyond the path',()=>{
 const {off,def}=isolatedRun(),inGap=C.clone(def),outside=C.clone(def);
 inGap.players[0].job='deep';inGap.players[0].zone={x:0,y:6};inGap.players[0].y=6;
 outside.players[0].x=8;outside.players[0].fitX=8;
 const blocked=C.simulate(off,inGap,9),open=C.simulate(off,outside,9);
 assert.ok(blocked.valid&&open.valid);
 assert.ok(at(blocked,2,'offense','oRB').x<at(open,2,'offense','oRB').x-1);
 assert.ok(blocked.events.some(e=>e.text==='RB reads an open lane'));
 assert.ok(at(blocked,5,'offense','oRB').y>15,'runner must continue after final run waypoint');
});

test('awareness changes safety reaction and pursuit changes the tackle spot',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];
 const slow=C.clone(def),fast=C.clone(def);
 slow.players.find(p=>p.id==='dSS').stats={awareness:1,pursuit:1};
 fast.players.find(p=>p.id==='dSS').stats={awareness:99,pursuit:99};
 const a=C.simulate(off,slow,1),b=C.simulate(off,fast,1);
 assert.ok(a.events.some(e=>e.text==='Completed to Z'));
 assert.ok(b.events.some(e=>e.text==='Completed to Z'));
 assert.ok(at(b,2.3,'defense','dSS').x>at(a,2.3,'defense','dSS').x+1);
 assert.ok(b.result.yards<a.result.yards-1);
});

test('man coverage leverage moves the defender to different route landmarks',()=>{
 const base=P.createOffensePresets()[0];base.training=true;base.trainingVirtualSnap=true;base.players=base.players.filter(p=>['oQB','oX'].includes(p.id));
 const qb=base.players.find(p=>p.id==='oQB'),receiver=base.players.find(p=>p.id==='oX');qb.x=0;qb.y=-5;qb.throwAt=10;receiver.x=-15;receiver.y=0;receiver.route=[{x:-12,y:4},{x:-8,y:11},{x:-5,y:22}];
 const shell=P.createDefensePresets()[2],corner=shell.players.find(p=>p.id==='dCB1');shell.players=[corner];corner.x=-15;corner.y=1;corner.job='man';corner.coverTarget='oX';
 const inside=C.clone(shell),outside=C.clone(shell),trail=C.clone(shell);inside.players[0].leverage='inside';outside.players[0].leverage='outside';trail.players[0].leverage='trail';
 const i=C.simulate(base,inside,31),o=C.simulate(base,outside,31),t=C.simulate(base,trail,31);
 assert.ok(i.valid&&o.valid&&t.valid);
 const frame=1.5,ix=at(i,frame,'defense','dCB1').x,ox=at(o,frame,'defense','dCB1').x;
 assert.ok(ix>ox+1.1,'inside shade should occupy a more inside landmark than outside shade');
 assert.ok(at(t,frame,'defense','dCB1').y<at(i,frame,'defense','dCB1').y-.4,'trail technique should stay deeper behind the receiver');
 assert.deepEqual(C.simulate(base,inside,31),i,'coverage technique remains seed-reproducible');
});

test('aware QB recognizes pressure early enough to escape an isolated rusher',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];
 off.training=true;off.trainingVirtualSnap=true;
 off.players=off.players.filter(p=>['oQB','oX'].includes(p.id));
 off.qbDropTime=2.5;off.throwAt=3;
 def.players=def.players.filter(p=>p.id==='dLE');
 def.players[0].x=0;def.players[0].y=1.4;
 const low=C.clone(off),high=C.clone(off);
 low.players.find(p=>p.id==='oQB').stats={awareness:1};
 high.players.find(p=>p.id==='oQB').stats={awareness:99};
 const a=C.simulate(low,def,4),b=C.simulate(high,def,4);
 assert.equal(a.result.sack,true);
 assert.equal(b.result.sack,false);
 assert.ok(b.events.some(e=>e.text.startsWith('QB senses pressure')));
});

test('juke, stiff arm, and spin have spatial effects and appear in structured play report',()=>{
 const {off,def}=isolatedRun();
 const variants=[['juke',{},'runner'],['stiff arm',{strength:99},'defender'],['spin',{vision:99,agility:1},'runner']];
 for(const [kind,stats,actor] of variants){
  const play=C.clone(off);play.players.find(p=>p.id==='oRB').stats=stats;
  const sim=C.simulate(play,def,3),move=sim.specialMoves.find(m=>m.move===kind&&m.outcome==='beat defender');
  assert.ok(move,kind+' must be an executed move, not a cosmetic label');
  const before=sim.frames.find(f=>f.t===+(move.t-.05).toFixed(2));
  const after=sim.frames.find(f=>f.t===move.t);
  const id=actor==='runner'?'oRB':'dM',side=actor==='runner'?'offense':'defense';
  assert.ok(Math.abs(after[side].find(p=>p.id===id).x-before[side].find(p=>p.id===id).x)>.35,kind+' changes a position');
  assert.ok(sim.events.some(e=>e.t===move.t&&e.text.includes(kind)));
  assert.deepEqual(C.simulate(play,def,3),sim,'move sequence is seeded and reproducible');
 }
});

test('every player in a full-squad replay has an observed participation record',()=>{
 const sim=C.simulate(P.createOffensePresets()[0],P.createDefensePresets()[0],700);
 assert.equal(sim.participation.length,22);
 assert.equal(sim.participation.filter(p=>p.yardsMoved>.5).length,22);
 assert.ok(sim.participation.some(p=>p.assignment==='passblock'&&p.contactSeconds>0));
 assert.ok(sim.participation.some(p=>p.assignment==='rush'&&p.contactSeconds>0));
});

test('a designed QB run does not let an off-ball RB report a carrier read',()=>{
 const off=P.createOffensePresets()[8],def=P.createDefensePresets()[0];
 off.runnerId='oQB';
 const qb=off.players.find(p=>p.id==='oQB');
 qb.job='carry';qb.route=[{x:0,y:-2},{x:3,y:4},{x:3,y:10}];
 const sim=C.simulate(off,def,3);
 assert.ok(sim.valid);
 assert.ok(sim.events.some(e=>e.text==='Direct snap to QB'));
 assert.ok(!sim.events.some(e=>e.text==='RB reads an open lane'));
 assert.equal(sim.frames.at(-1).carrierId,'oQB');
});

test('the play result displays executed special moves',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.ok(html.includes('id="moveReport"'));
 assert.ok(app.includes('sim.specialMoves.map'));
 assert.ok(app.includes('sim.participation.filter'));
});
test('the hosted inspector and encyclopedia expose man-coverage technique choices',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),ency=fs.readFileSync(path.join(__dirname,'..','encyclopedia.js'),'utf8');
 for(const technique of ['Shade inside','Shade outside','Trail the route','Balanced / match path'])assert.ok(app.includes(technique),technique);
 assert.ok(ency.includes("'Man leverage'"));assert.ok(html.includes('Coverage technique'));
});
