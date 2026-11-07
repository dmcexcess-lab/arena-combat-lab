'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../engine.js'),K=require('../campaign.js');
const routeAway=[{x:2,y:-3},{x:-4,y:1},{x:-8,y:9},{x:-10,y:25}];

test('Mission One treats the unchanged SCOUT run as film study, then requires an RB counterplay',()=>{
 const lesson=K.lessons.offense[0],setup=K.scrimmageSetup(lesson,'offense',0),before=C.clone(setup);
 const baseline=C.simulate(setup.offense,setup.defense,lesson.seed);
 assert.ok(baseline.valid&&baseline.result.yards>=lesson.minimum);
 assert.equal(K.assess(K.objectiveForWave(lesson,'offense',0),before,setup.offense,setup.defense,baseline).pass,false,
  'yardage alone must not clear the opening rep');
 setup.offense.players.find(p=>p.id==='oRB').route=routeAway;
 const counter=C.simulate(setup.offense,setup.defense,lesson.seed);
 assert.ok(counter.valid&&counter.result.yards>=lesson.minimum);
 assert.notEqual(counter.result.yards,baseline.result.yards,'the edited path must change the simulated outcome');
 assert.equal(K.assess(K.objectiveForWave(lesson,'offense',0),before,setup.offense,setup.defense,counter).pass,true);
});

test('Mission One carries the same RB-route objective through all four defensive looks',()=>{
 const lesson=K.lessons.offense[0];
 for(let wave=0;wave<K.SCRIMMAGE_WAVES.length;wave++){
  const setup=K.scrimmageSetup(lesson,'offense',wave),before=C.clone(setup),objective=K.objectiveForWave(lesson,'offense',wave);
  assert.deepEqual(objective.editable,['oRB']);
  const unchanged=C.simulate(setup.offense,setup.defense,lesson.seed+wave*131);
  assert.equal(K.assess(objective,before,setup.offense,setup.defense,unchanged).pass,false,'unchanged wave '+wave);
  setup.offense.players.find(p=>p.id==='oRB').route=routeAway;
  const result=C.simulate(setup.offense,setup.defense,lesson.seed+wave*131);
  assert.equal(K.assess(objective,before,setup.offense,setup.defense,result).pass,true,'counterplay wave '+wave);
 }
});

test('Mission One shows live player responsibilities and the RB-versus-MLB matchup in the hosted build',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const source of [app,html]){
  assert.ok(source.includes('Mission One assignment scout'));
  assert.ok(source.includes('Intended matchup: trace the RB'));
  assert.ok(source.includes('objectiveForWave(lesson,campaign.side,campaignWave)'));
 }
 for(const file of ['engine.js','plays.js','campaign.js','encyclopedia.js','app.js']){
  const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8').trimEnd();
  assert.ok(html.includes(source),file+' must be synchronized into the hosted HTML');
 }
});
