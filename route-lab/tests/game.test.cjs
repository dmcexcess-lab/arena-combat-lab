'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../game.js');
const C=require('../engine.js'),P=require('../plays.js');
const fake=(verdict,yards,seconds=4,possession='offense',ballY=yards)=>({valid:true,result:{verdict,yards,seconds,possession,returnYards:0},frames:[{ball:{y:ballY}}]});
test('full game opens with kickoff, receives at a legal spot, and gives the next offense a play',()=>{
 let s=G.createGame();assert.equal(s.phase,'kickoff');const k=G.kick(s,'kickoff',10);assert.ok(k.accepted);assert.equal(k.state.phase,'scrimmage');assert.equal(k.state.possession,'home');assert.ok(k.state.ball>=1&&k.state.ball<=99);assert.equal(k.state.down,1);
 const p=G.autoPick(k.state,P.createOffensePresets(),P.createDefensePresets());assert.ok(p.offense&&p.defense);
});
test('drive advances downs, first down, fourth-down turnover and arbitrary field spot',()=>{
 let s=G.createGame();G.setSpot(s,'home',40);let r=G.finishScrimmage(s,fake('Tackle',4),10);assert.equal(r.state.down,2);assert.equal(r.state.ball,44);assert.equal(r.state.toGain,6);
 r=G.finishScrimmage(r.state,fake('Tackle',7),10);assert.equal(r.state.down,1);assert.equal(r.state.ball,51);assert.equal(r.state.toGain,10);
 G.setSpot(s,'away',22,4,8);r=G.finishScrimmage(s,fake('Incomplete pass',0),10);assert.equal(r.state.possession,'home');assert.equal(r.state.down,1);assert.equal(r.state.ball,22);
});
test('touchdown, try, field goal, and safety lead to correct scoring and kick states',()=>{
 let s=G.createGame();G.setSpot(s,'home',98);let r=G.finishScrimmage(s,fake('Touchdown',3));assert.equal(r.state.score.home,6);assert.equal(r.state.phase,'try');
 let x=G.kick(r.state,'extraPoint',7);assert.equal(x.state.phase,'kickoff');assert.ok([6,7].includes(x.state.score.home));
 G.setSpot(s,'away',30);r=G.finishScrimmage(s,fake('Safety — Sack',-35));assert.equal(r.state.score.home,2);assert.equal(r.state.phase,'safetyKick');
 G.setSpot(s,'home',80);x=G.kick(s,'fieldGoal',1);assert.equal(x.kick.team,'home');assert.equal(x.state.score.home,3);
});
test('interception uses return spot, and punt kicker is current possession',()=>{
 let s=G.createGame();G.setSpot(s,'away',60);let r=G.finishScrimmage(s,fake('Interception return tackled',0,5,'defense',-12));assert.equal(r.state.possession,'home');assert.equal(r.state.ball,72);
 G.setSpot(s,'home',40);const k=G.kick(s,'punt',4);assert.equal(k.kick.team,'home');assert.equal(k.state.possession,'away');assert.ok(k.kick.returnYards>=0);
});
test('timeouts are limited and delay of game is enforced without a snap',()=>{
 let s=G.createGame();G.setSpot(s,'home',50);assert.equal(G.timeout(s,'home'),true);assert.equal(G.timeout(s,'home'),false,'same team cannot take consecutive timeouts before a snap');
 for(let i=0;i<2;i++){s=G.finishScrimmage(s,fake('Tackle',0),0).state;assert.equal(G.timeout(s,'home'),true);}assert.equal(s.timeouts.home,0);assert.equal(G.timeout(s,'home'),false);
 const delay=G.createGame();G.setSpot(delay,'home',50);const r=G.finishScrimmage(delay,fake('Tackle',5),41);assert.equal(r.accepted,false);assert.equal(r.state.ball,45);assert.equal(r.state.down,1);assert.equal(r.state.toGain,15);
});
test('real play outcome enters the same persistent game-state path',()=>{
 const off=P.createOffensePresets()[8],def=P.createDefensePresets()[0];let s=G.createGame();G.setSpot(s,'home',50);off.yardLine=50;const sim=C.simulate(off,def,9),result=G.finishScrimmage(s,sim,10);assert.equal(result.accepted,true);assert.equal(result.state.plays,1);assert.ok(result.state.clock<900);
});
test('four quarters complete with kicks, tries, possession changes and final whistle',()=>{
 let s=G.createGame(),n=0;while(s.phase!=='final'&&n++<500){
  if(s.phase==='kickoff'||s.phase==='safetyKick')s=G.kick(s,s.phase,n).state;
  else if(s.phase==='try')s=G.kick(s,'extraPoint',n).state;
  else if(s.down===4)s=G.kick(s,s.ball>65&&s.possession==='home'||s.ball<35&&s.possession==='away'?'fieldGoal':'punt',n).state;
  else {const r=G.finishScrimmage(s,fake(n%6===0?'Incomplete pass':'Tackle',n%4===0?12:3,6),25);s=r.state;}
 }
 assert.equal(s.phase,'final');assert.ok(s.quarter===4||s.quarter===5);assert.ok(s.plays>30);
});
test('tied regulation enters ten-minute overtime and each team gets a possession',()=>{
 const s=G.createGame();G.setSpot(s,'home',50);s.quarter=4;s.clock=1;s.score={home:10,away:10};let r=G.finishScrimmage(s,fake('Tackle',0,2),0);assert.equal(r.state.quarter,5);assert.equal(r.state.phase,'kickoff');assert.equal(r.state.clock,600);assert.equal(r.state.timeouts.home,2);
 const k=G.kick(r.state,'kickoff',15);assert.equal(k.state.quarter,5);assert.equal(k.state.otSeen[k.state.possession],true);
});
test('specialist ratings change field goal and return outcomes with same seed',()=>{
 const s=G.createGame();G.setSpot(s,'home',58);const low=C.clone(s),high=C.clone(s);low.specialists.home.kicker.accuracy=1;high.specialists.home.kicker.accuracy=99;
 let changed=false;for(let seed=1;seed<100;seed++){if(G.kick(low,'fieldGoal',seed).kick.made!==G.kick(high,'fieldGoal',seed).kick.made){changed=true;break;}}
 assert.ok(changed);const k=G.kick(s,'punt',25);assert.equal(k.kick.coveragePlayers,11);assert.equal(k.kick.returnBlockers,10);
});
test('hosted page embeds game module and interactive full-field controls',()=>{
 const fs=require('node:fs'),path=require('node:path');const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8').trimEnd();assert.ok(html.includes(source));for(const id of ['fullField','fullGameBtn','continueBtn','startSpotBtn','timeoutHomeBtn','timeoutAwayBtn','kickoffBtn','puntBtn','fieldGoalBtn','extraPointBtn','twoPointBtn'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('officials enforce encroachment and illegal formation with the proper chain adjustment',()=>{
 const s=G.createGame();G.setSpot(s,'home',50,2,5);let r=G.flag(s,'defense','Defensive encroachment');assert.equal(r.state.ball,55);assert.equal(r.state.down,1);assert.equal(r.state.toGain,10);
 r=G.flag(s,'offense','Illegal formation');assert.equal(r.state.ball,45);assert.equal(r.state.down,2);assert.equal(r.state.toGain,10);
});
test('2026 declared onside kick can be attempted at any kickoff and has a recoverable live spot',()=>{
 const s=G.createGame();const r=G.kick(s,'onside',23);assert.equal(r.accepted,true);assert.equal(r.kick.kind,'onside');assert.ok(r.kick.kickYards>=10);assert.ok(['home','away'].includes(r.state.possession));assert.equal(r.state.phase,'scrimmage');
});
test('losses increase the distance to a first down and the two-minute warning stops the clock',()=>{
 const s=G.createGame();G.setSpot(s,'home',50);let r=G.finishScrimmage(s,fake('Sack',-6),10);assert.equal(r.state.toGain,16);
 s.quarter=2;s.clock=124;r=G.finishScrimmage(s,fake('Tackle',1,6),0);assert.equal(r.state.clock,118);assert.equal(r.state.clockRunning,false);assert.ok(r.state.log.some(x=>x.includes('two-minute warning')));
});
test('player fatigue persists across snaps, affects replay state, and recovers during the huddle',()=>{
 const s=G.createExhibition(482),off=P.createOffensePresets()[0],def=P.createDefensePresets()[0];G.setSpot(s,'home',50);
 const offense=G.dressPlay(s,off,'home','offense'),defense=G.dressPlay(s,def,'away','defense');
 const qb=offense.players.find(p=>p.label==='QB');qb.fatigue=.48;
 const sim=C.simulate(offense,defense,712);const used=offense.players.find(p=>p.id===qb.id);const qbLoad=sim.participation.find(p=>p.id===qb.id);
 assert.ok(qbLoad.fatigue>.48,'snap movement should add to fatigue already carried in');
 const result=G.finishScrimmage(s,sim,0,{offense,defense});const row=result.state.teams.home.depth.offense.find(v=>v.label==='QB');
 assert.equal(row.players[0].fatigue,qbLoad.fatigue);
 const rested=G.dressPlay(result.state,off,'home','offense').players.find(p=>p.label==='QB');
 assert.ok(rested.fatigue<qbLoad.fatigue,'huddle time should restore some energy');
 const fresh=C.simulate({...offense,players:offense.players.map(p=>p.id===qb.id?{...p,fatigue:0}:p)},defense,712);
 assert.notDeepEqual(sim.frames,fresh.frames,'incoming fatigue should affect movement');
 assert.ok(qbLoad&&used.rosterIndex===0);
});
test('a heavily fatigued starter yields to an available depth-chart teammate',()=>{
 const s=G.createExhibition(482),row=s.teams.home.depth.offense.find(v=>v.label==='RB');row.players[0].fatigue=.72;row.players[1].fatigue=.08;row.players[2].fatigue=.35;
 const play=P.createOffensePresets()[0],rb=G.dressPlay(s,play,'home','offense').players.find(p=>p.label==='RB');
 assert.equal(rb.rosterIndex,1);assert.equal(rb.rosterName,row.players[1].name);
});

test('tries do not consume the game clock and throwaways stop it',()=>{
 const s=G.createGame();G.setSpot(s,'home',98);s.phase='try';s.clockRunning=true;const result=G.finishScrimmage(s,fake('Tackle by LB',0,3),0);assert.equal(result.state.clock,900);assert.equal(result.state.clockRunning,false);
 const pass=G.createGame();G.setSpot(pass,'home',50);pass.clockRunning=true;const incomplete=G.finishScrimmage(pass,fake('Throwaway — incomplete pass',0,3),0);assert.equal(incomplete.state.clock,897);assert.equal(incomplete.state.clockRunning,false);
});
test('CPU fourth-down kick is staged for Run and can be overridden',()=>{
 const s=G.createGame();G.setSpot(s,'home',40,4,8);assert.equal(G.cpuFourthDownKick(s),'punt');assert.equal(G.cpuFourthDownKick(s,true),null);
 G.setSpot(s,'home',70,4,8);assert.equal(G.cpuFourthDownKick(s),'fieldGoal');G.setSpot(s,'home',70,4,2);assert.equal(G.cpuFourthDownKick(s),null);
});
test('an exhausted depth slot cannot put an injured starter back on the field',()=>{
 const s=G.createExhibition(42),off=P.createOffensePresets()[0],def=P.createDefensePresets()[0],row=s.teams.home.depth.offense.find(v=>v.slot==='oLT');row.players.forEach(p=>{p.outForGame=true;});
 const dressed=G.dressPlay(s,off,'home','offense');assert.equal(dressed.players.find(p=>p.id==='oLT').unavailable,true);assert.ok(!C.validate(dressed,def).valid);
});
test('a defensive fumble recovery is not passed through the offensive tackle loop',()=>{
 const off=P.createOffensePresets()[8],def=P.createDefensePresets()[0];off.enableLooseBall=true;const sim=C.simulate(off,def,22);assert.ok(sim.result.loose?.recoverySide==='d');assert.equal(sim.contacts.some(c=>c.offenseId===c.defenseId),false);
});

test('rejected pre-snap fouls use a fresh attempt seed on retry',()=>{
 const off=P.createOffensePresets()[0],def=P.createDefensePresets()[0],s=G.createGame();G.setSpot(s,'home',50);let first=null,attemptSim=null;
 for(let seed=1;seed<=5000&&!first;seed++){const sim={...fake('Tackle',2),result:{...fake('Tackle',2).result,seed}};const r=G.finishScrimmage(s,sim,0,{offense:off,defense:def});if(r.foul){first=r;attemptSim=sim;}}
 assert.ok(first,'fixture should produce a pre-snap foul');assert.equal(first.state.preSnapAttempts,1);
 const retry=G.finishScrimmage(first.state,attemptSim,0,{offense:off,defense:def});if(retry.foul)assert.notEqual(retry.foul.attemptSeed,first.foul.attemptSeed);else assert.equal(retry.state.preSnapAttempts,0);
});

test('depth-chart dressing passes the exact to-gain into the QB decision context',()=>{
 const s=G.createExhibition(71),off=G.dressPlay(s,P.createOffensePresets()[0],'home','offense');G.setSpot(s,'home',50,3,2);const thirdAndTwo=G.dressPlay(s,P.createOffensePresets()[0],'home','offense');assert.equal(thirdAndTwo.toGain,2);assert.equal(thirdAndTwo.yardLine,50);assert.ok(off.toGain>0);
});
test('a kickoff is stopped when the selected kicker has no active replacement',()=>{
 const s=G.createExhibition(17);G.flipCoin(s,'heads','heads');const row=s.teams[s.kicking].depth.special.find(v=>v.slot==='K');row.players.forEach(p=>{p.outForGame=true;});const result=G.kick(s,'kickoff',3);assert.equal(result.accepted,false);assert.match(result.call,/No available kicker/);
});
