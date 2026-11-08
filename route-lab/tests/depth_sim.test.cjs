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

test('press coverage creates a seeded line-of-scrimmage release contest',()=>{
 const off=P.createOffensePresets()[0];off.training=true;off.trainingVirtualSnap=true;off.players=off.players.filter(p=>['oQB','oX'].includes(p.id));
 const qb=off.players.find(p=>p.id==='oQB'),receiver=off.players.find(p=>p.id==='oX');qb.x=0;qb.y=-5;qb.throwAt=10;
 receiver.x=-15;receiver.y=0;receiver.onLine=true;receiver.route=[{x:-15,y:8},{x:-12,y:16},{x:-8,y:24}];
 const shell=P.createDefensePresets()[2],corner=shell.players.find(p=>p.id==='dCB1');shell.players=[corner];corner.x=-15;corner.y=1;corner.job='man';corner.coverTarget='oX';
 const press=C.clone(shell),offCoverage=C.clone(shell);press.players[0].leverage='press';press.players[0].stats={coverage:99,strength:99,agility:99};receiver.stats={routeRunning:1,agility:1};offCoverage.players[0].leverage='balanced';
 const a=C.simulate(off,press,1),b=C.simulate(off,offCoverage,1);assert.ok(a.valid&&b.valid);
 assert.ok(a.events.some(e=>e.text.includes('presses X #11 at the line')),'press must resolve as a play event');
 assert.ok(at(a,.6,'offense','oX').y<at(b,.6,'offense','oX').y-.2,'a lost press release must delay the receiver’s route');
 assert.deepEqual(C.simulate(off,press,1),a,'press resolution remains deterministic');
});

test('zone route match carries an in-zone route while spot-drop protects its landmark',()=>{
 const base=P.createOffensePresets()[0];base.training=true;base.trainingVirtualSnap=true;base.players=base.players.filter(p=>['oQB','oX'].includes(p.id));
 const qb=base.players.find(p=>p.id==='oQB'),receiver=base.players.find(p=>p.id==='oX');base.type='pass';qb.x=0;qb.y=-5;qb.throwAt=99;receiver.x=-10;receiver.y=0;receiver.route=[{x:-8,y:3},{x:-5,y:8},{x:-3,y:17},{x:-3,y:26}];
 const shell=P.createDefensePresets()[0],hook=shell.players.find(p=>p.id==='dM');shell.players=[hook];hook.job='zone';hook.x=-5;hook.y=4;hook.zone={x:-5,y:6,r:5,rY:5};
 const spot=C.clone(shell),match=C.clone(shell);spot.players[0].zoneTechnique='spot';match.players[0].zoneTechnique='match';
 const a=C.simulate(base,spot,55),b=C.simulate(base,match,55);assert.ok(a.valid&&b.valid);
 const insideAt=1.5;
 assert.ok(at(b,insideAt,'defense','dM').y>at(a,insideAt,'defense','dM').y+2,'match should carry the in-zone route path while spot-drop protects the landmark');
 assert.deepEqual(C.simulate(base,match,55),b,'zone match behavior remains deterministic');
});

test('overlapping match zones assign an in-zone route to only one defender',()=>{
 const base=P.createOffensePresets()[0];base.training=true;base.trainingVirtualSnap=true;base.players=base.players.filter(p=>['oQB','oX'].includes(p.id));
 const qb=base.players.find(p=>p.id==='oQB'),receiver=base.players.find(p=>p.id==='oX');base.type='pass';qb.x=0;qb.y=-5;qb.throwAt=99;receiver.x=-10;receiver.y=0;receiver.route=[{x:-8,y:3},{x:-5,y:8},{x:-3,y:17},{x:-3,y:26}];
 const shell=P.createDefensePresets()[0],near=shell.players.find(p=>p.id==='dM'),far=shell.players.find(p=>p.id==='dSS');shell.players=[near,far];
 for(const p of shell.players){p.job='zone';p.zoneTechnique='match';p.zone={x:-5,y:6,r:5,rY:7};}
 near.x=-5;near.y=4;far.x=-10;far.y=10;
 const sim=C.simulate(base,shell,55);assert.ok(sim.valid);
 const frame=1.5,nearPlayer=at(sim,frame,'defense','dM'),farPlayer=at(sim,frame,'defense','dSS');
 assert.ok(nearPlayer.y>farPlayer.y+1.8,'the nearest match defender should carry the route while the other protects its landmark');
 assert.deepEqual(C.simulate(base,shell,55),sim,'route distribution remains deterministic');
});

test('match coverage hands a route to the next zone defender and reports the exchange',()=>{
 const base=P.createOffensePresets()[0];base.training=true;base.trainingVirtualSnap=true;base.type='pass';
 base.players=base.players.filter(p=>['oQB','oX'].includes(p.id));
 const qb=base.players.find(p=>p.id==='oQB'),receiver=base.players.find(p=>p.id==='oX');qb.x=0;qb.y=-6;qb.throwAt=99;
 receiver.x=-16;receiver.y=0;receiver.route=[{x:-12,y:2},{x:-8,y:4},{x:-3,y:4},{x:3,y:4},{x:10,y:4}];
 const shell=P.createDefensePresets()[0],first=shell.players.find(p=>p.id==='dM'),second=shell.players.find(p=>p.id==='dSS');shell.players=[first,second];
 for(const p of shell.players){p.job='zone';p.zoneTechnique='match';p.y=3;p.zone={x:p.id==='dM'?-8:2,y:4,r:6,rY:6};}
 first.x=-8;second.x=2;
 const sim=C.simulate(base,shell,56);assert.ok(sim.valid);
 const handoff=sim.events.find(e=>e.text.includes('passes X to'));
 assert.ok(handoff,'the play report should identify the defender who passes off the route and the next defender');
 assert.ok(handoff.t>0.8&&handoff.t<5,'the exchange should occur as the route crosses between zones');
 const before=at(sim,+Math.max(0,handoff.t-.3).toFixed(2),'defense','dM'),after=at(sim,+Math.min(11.9,handoff.t+.3).toFixed(2),'defense','dSS');
 assert.ok(after.x<3.5,'the receiving zone defender should move toward the route after the handoff');
 assert.ok(before.x<-.5,'the first defender should carry the route before the boundary');
 assert.deepEqual(C.simulate(base,shell,56),sim,'zone exchanges remain deterministic');
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

test('defensive awareness changes break timing toward the pass target',()=>{
 const off=P.createOffensePresets()[0],shell=P.createDefensePresets()[0];off.training=true;off.trainingVirtualSnap=true;off.type='pass';
 off.players=off.players.filter(p=>['oQB','oX'].includes(p.id));const qb=off.players.find(p=>p.id==='oQB'),receiver=off.players.find(p=>p.id==='oX');
 qb.x=0;qb.y=-5;qb.throwAt=1.2;receiver.x=-10;receiver.y=0;receiver.route=[{x:-8,y:4},{x:-5,y:8},{x:-3,y:12}];
 shell.players=shell.players.filter(p=>p.id==='dM');const low=C.clone(shell),high=C.clone(shell);
 for(const def of [low,high]){def.players[0].job='deep';def.players[0].zone={x:-10,y:2};def.players[0].x=-10;def.players[0].y=2;}
 low.players[0].stats={awareness:1};high.players[0].stats={awareness:99};
 const a=C.simulate(off,low,122),b=C.simulate(off,high,122);assert.ok(a.valid&&b.valid);
 const throwAt=sim=>sim.decisions.find(e=>e.action==='pass')?.t;assert.equal(throwAt(a),throwAt(b),'QB choice should not change when only defensive awareness changes');
 const ta=throwAt(a),fa=a.frames.find(f=>f.t>=ta+.4&&f.phase==='air'),fb=b.frames.find(f=>f.t>=ta+.4&&f.phase==='air');
 assert.ok(fa&&fb,'fixture should include a live pass flight');
 const target=sim=>sim.decisions.find(e=>e.action==='pass').targetId;
 const lowY=fa.defense.find(p=>p.id==='dM').y,highY=fb.defense.find(p=>p.id==='dM').y;
 assert.ok(highY>lowY+.5,`high-awareness defender should break toward the pass earlier (${lowY.toFixed(2)} vs ${highY.toFixed(2)}; ${target(a)} vs ${target(b)})`);
 assert.deepEqual(C.simulate(off,high,122),b,'ball-break reaction is deterministic');
});

test('Play Action Cross sells the handoff, holds the QB, and gives run-fit defenders an awareness-timed read',()=>{
 const preset=P.createOffensePresets().find(p=>p.name==='Play Action Cross'),shell=P.createDefensePresets()[0];
 const off=C.clone(preset);off.training=true;off.trainingVirtualSnap=true;
 off.players=off.players.filter(p=>['oQB','oRB','oSL'].includes(p.id));off.playActionFake={receiverId:'oRB',x:2,y:-1.2};off.qbDropTime=1.1;off.throwAt=2.4;
 const rb=off.players.find(p=>p.id==='oRB');rb.job='passblock';rb.route=[];
 const def=C.clone(shell);def.players=def.players.filter(p=>p.id==='dM');def.players[0].job='runfit';def.players[0].x=2;def.players[0].y=2;
 const low=C.clone(def),high=C.clone(def);low.players[0].stats={awareness:1};high.players[0].stats={awareness:99};
 const a=C.simulate(off,low,45),b=C.simulate(off,high,45);
 assert.ok(a.events.some(e=>e.text.includes('handoff fake')));
 assert.equal(a.frames.find(f=>f.t===.5).carrierId,'oQB','the fake never transfers possession');
 assert.ok(at(a,.5,'offense','oRB').y>-7+1,'the back must sell the mesh across the formation');
 assert.ok(a.decisions.find(d=>d.action==='pass').t>=1.4,'the fake delays the QB release window');
 assert.ok(at(a,.9,'defense','dM').y>at(b,.9,'defense','dM').y+.2,'low-awareness fit should bite later while the aware defender stays disciplined');
 assert.deepEqual(C.simulate(off,high,45),b,'play-action reads remain deterministic');
});

test('defender hands convert a close breakup into a seeded interception',()=>{
 const off=P.createOffensePresets()[0];off.training=true;off.trainingVirtualSnap=true;off.type='pass';
 off.players=off.players.filter(p=>['oQB','oX'].includes(p.id));const qb=off.players.find(p=>p.id==='oQB'),receiver=off.players.find(p=>p.id==='oX');
 qb.x=0;qb.y=-5;qb.throwAt=1.2;qb.qbDropTime=1.15;receiver.x=0;receiver.y=0;receiver.route=[{x:0,y:4},{x:0,y:10},{x:0,y:14}];
 const shell=P.createDefensePresets()[0];shell.players=shell.players.filter(p=>p.id==='dM');const low=C.clone(shell),high=C.clone(shell);
 for(const def of [low,high]){def.players[0].job='zone';def.players[0].zone={x:0,y:10,r:8,rY:8};def.players[0].x=0;def.players[0].y=8;}
 low.players[0].stats={hands:1,awareness:99,coverage:99};high.players[0].stats={hands:99,awareness:99,coverage:99};
 const a=C.simulate(off,low,91),b=C.simulate(off,high,91);
 assert.ok(a.events.some(e=>e.text==='Pass broken up by MLB'));
 assert.ok(b.events.some(e=>e.text.startsWith('Interception by MLB')));
 assert.deepEqual(C.simulate(off,high,91),b,'defensive ball skills remain deterministic');
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

test('a live snap travels from the center to the quarterback before possession',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0],center=off.players.find(p=>p.label==='C'),qb=off.players.find(p=>p.label==='QB');
 const sim=C.simulate(off,def,801);assert.ok(sim.valid);
 assert.equal(sim.frames[0].phase,'snap');
 assert.ok(Math.hypot(sim.frames[0].ball.x-center.x,sim.frames[0].ball.y-center.y)<.01);
 const caught=sim.events.find(e=>e.text.startsWith('Center snaps'));
 assert.ok(caught,'snap should have a completed center-to-QB exchange');
 const received=sim.frames.find(f=>f.t===caught.t),receiver=received.offense.find(p=>p.id===qb.id);
 assert.ok(Math.hypot(received.ball.x-receiver.x,received.ball.y-receiver.y)<.01);
});

test('the QB and runner exchange only when they meet at the designed mesh',()=>{
 const {off,def}=isolatedRun(),sim=C.simulate(off,def,803);
 const mesh=sim.decisions.find(d=>d.action==='handoff');
 assert.ok(mesh,'reachable run mesh should complete');
 assert.ok(mesh.exchangeDistance<=1.25);
 assert.equal(sim.frames.find(f=>f.t===mesh.t).carrierId,'oRB');
 assert.equal(sim.frames.find(f=>f.t===+(mesh.t-.05).toFixed(2)).carrierId,'oQB');
 assert.ok(sim.events.some(e=>e.t===mesh.t&&e.text.includes('exchange secured')));
});

test('an unreachable snap or handoff mesh is rejected before the play starts',()=>{
 const off=P.createOffensePresets().find(p=>p.name==='Inside Zone'),def=P.createDefensePresets()[0],qb=off.players.find(p=>p.id==='oQB'),rb=off.players.find(p=>p.id==='oRB');
 qb.y=-12;assert.ok(C.validate(off,def).errors.some(e=>e.includes('reachable snap distance')));
 qb.y=-5;rb.route[0]={x:16,y:18};assert.ok(C.validate(off,def).errors.some(e=>e.includes('designed handoff mesh')));
});

test('the engine watchdog returns a diagnostic instead of inventing a dead-ball result',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];off.training=true;off.trainingVirtualSnap=true;off.type='pass';
 off.players=off.players.filter(p=>['oQB','oRB'].includes(p.id));const qb=off.players.find(p=>p.id==='oQB');
 qb.y=-5;qb.throwAt=99;qb.qbDropTime=99;off.allowScramble=false;off.players.find(p=>p.id==='oRB').job='passblock';off.players.find(p=>p.id==='oRB').route=[];
 def.players=def.players.filter(p=>p.id==='dS');def.players[0].job='deep';def.players[0].x=22;def.players[0].y=22;
 const sim=C.simulate(off,def,809);assert.equal(sim.valid,false);assert.equal(sim.result.completed,false);
 assert.match(sim.diagnostic.message,/before a football dead-ball event/);
 assert.equal(sim.result.verdict,'');
});

test('the play result displays executed special moves',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.ok(html.includes('id="moveReport"'));
 assert.ok(app.includes('sim.specialMoves.map'));
 assert.ok(app.includes('sim.participation.filter'));
});
test('the hosted inspector and encyclopedia expose coverage technique choices',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),ency=fs.readFileSync(path.join(__dirname,'..','encyclopedia.js'),'utf8');
 for(const technique of ['Shade inside','Shade outside','Trail the route','Balanced / match path','Press at the line'])assert.ok(app.includes(technique),technique);
 assert.ok(ency.includes("'Man leverage'"));assert.ok(html.includes('Coverage technique'));
 assert.ok(app.includes('Match route inside zone'));assert.ok(app.includes('one defender carries each route'));assert.ok(ency.includes("'Spot drop and route match'"));assert.ok(ency.includes("'Press release'"));assert.ok(html.includes('Route response'));
 assert.ok(app.includes('awareness shortens the read delay'));assert.ok(ency.includes("'Break on the ball'"));
});
