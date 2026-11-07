'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../game.js');

function play(verdict,yards=0,seconds=4,seed=9){return {valid:true,result:{verdict,yards,deadBallY:yards,seconds,seed,possession:'offense'},frames:[{t:0,offense:[],defense:[],ball:{y:yards}}]};}

test('contact exposure produces a reproducible medical event and substitutes the next player',()=>{
 const state=G.createExhibition(492);G.setSpot(state,'home',50);
 const row=state.teams.home.depth.offense.find(v=>v.label==='QB');
 const name=row.players[row.starter].name;
 const offense={players:[{id:row.slot,label:'QB',rosterName:name,stats:row.players[0].stats}]},defense={players:[]};
 const sim=play('Tackle',3,4,917);
 sim.participation=[{id:row.slot,label:'QB',side:'o',yardsMoved:12,contactSeconds:0}];
 sim.contacts=Array.from({length:400},(_,i)=>({t:i*.01,kind:'tackle',offenseId:row.slot,defenseId:'none',relativeSpeed:25}));
 const first=G.finishScrimmage(state,sim,0,{offense,defense});
 const second=G.finishScrimmage(state,sim,0,{offense,defense});
 assert.deepEqual(first.injuries,second.injuries);
 assert.ok(first.injuries.length>0);
 assert.equal(first.state.teams.home.depth.offense.find(v=>v.label==='QB').starter!==0,true);
 assert.notEqual(G.dressPlay(first.state,{players:[{id:row.slot,label:'QB'}]},'home','offense').players[0].rosterName,name);
 assert.ok(first.state.log.some(v=>v.includes('Medical timeout')));
});

test('late offensive injury uses the available timeout, then an excess injury can run off ten seconds',()=>{
 const state=G.createExhibition(492);G.setSpot(state,'home',50);state.quarter=4;state.clock=80;state.clockRunning=true;state.timeouts.home=1;
 const row=state.teams.home.depth.offense.find(v=>v.label==='QB');
 const offense={players:[{id:row.slot,label:'QB',rosterName:row.players[0].name,stats:row.players[0].stats}]},defense={players:[]};
 const sim=play('Tackle',3,4,917);sim.participation=[{id:row.slot,label:'QB',side:'o',yardsMoved:12,contactSeconds:0}];sim.contacts=Array.from({length:400},(_,i)=>({t:i*.01,kind:'tackle',offenseId:row.slot,defenseId:'none',relativeSpeed:25}));
 let result=G.finishScrimmage(state,sim,0,{offense,defense});assert.equal(result.state.timeouts.home,0);assert.equal(result.state.clock,76);
 state.timeouts.home=0;result=G.finishScrimmage(state,sim,0,{offense,defense});assert.equal(result.state.clock,66);assert.ok(result.state.log.some(v=>v.includes('10-second injury runoff')));
});

test('overtime grants both possessions, then ends on a decisive second possession',()=>{
 const state=G.createGame();state.quarter=5;state.clock=600;state.score={home:20,away:20};G.setSpot(state,'home',95);
 let first=G.finishScrimmage(state,play('Touchdown',6),0);assert.equal(first.state.phase,'kickoff');assert.equal(first.state.score.home,26);
 G.setSpot(first.state,'away',95);let second=G.finishScrimmage(first.state,play('Touchdown',6),0);assert.equal(second.state.score.away,26);assert.notEqual(second.state.phase,'final');
 G.setSpot(second.state,'home',95);let third=G.finishScrimmage(second.state,play('Touchdown',6),0);assert.equal(third.state.phase,'final');
});

test('out-of-bounds clock resumes on the ready early, and on the snap late',()=>{
 const early=G.createGame();G.setSpot(early,'home',50);let result=G.finishScrimmage(early,play('Out of bounds',3),0);assert.equal(result.state.clockRunning,true);
 const late=G.createGame();G.setSpot(late,'home',50);late.quarter=4;late.clock=250;result=G.finishScrimmage(late,play('Out of bounds',3),0);assert.equal(result.state.clockRunning,false);
});
