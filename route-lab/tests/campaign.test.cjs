'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../engine.js'), Plays = require('../plays.js'), Camp = require('../campaign.js');
test('playbook picker has offense and defense tabs, formation tabs, and searchable play cards',()=>{
 const fs=require('node:fs'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const id of ['offPlaybookBtn','defPlaybookBtn','playbookDialog','playbookSideTabs','playbookSearch','playbookFormationTabs','playbookList'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/Shotgun Trips/);assert.match(html,/Dime Prevent/);assert.match(html,/Goal Line Power O/);
});
test('all 756 formation playbook matchups remain valid 11v11', () => {
  const off=[...Plays.createOffensePresets(),Plays.createPitchBack(),Plays.createGoalLinePower()],def=Plays.createDefensePresets();
  assert.equal(off.length,36);assert.equal(def.length,21);
  assert.equal(new Set(off.map(p=>p.id)).size,off.length);assert.equal(new Set(def.map(p=>p.id)).size,def.length);
  assert.ok(off.every(p=>p.formation),'every offensive call is grouped into a formation tab');
  assert.ok(def.every(p=>p.formation),'every defensive call is grouped into a formation tab');
  for(const o of off)for(const d of def)assert.equal(Core.validate(o,d).valid,true,o.name+' / '+d.name);
});
for(const side of ['offense','defense']){
  test(side+' campaign has six simulated progressive drills',()=>{
    const lessons=Camp.lessons[side];assert.equal(lessons.length,6);
    let prevOff=0,prevDef=0;
    for(const lesson of lessons){
      const {offense,defense}=Camp.setup(lesson.off,lesson.def,lesson.os,lesson.ds);
      assert.ok(offense.players.length>=prevOff&&defense.players.length>=prevDef);
      prevOff=offense.players.length;prevDef=defense.players.length;
      const check=Core.validate(offense,defense);
      assert.equal(check.valid,true,JSON.stringify(check.errors));
      const outcome=Core.simulate(offense,defense,lesson.seed);
      assert.equal(outcome.valid,true);
      assert.ok(outcome.frames.length>2);
      assert.equal(outcome.frames[0].offense.length,lesson.os);
      assert.equal(outcome.frames[0].defense.length,lesson.ds);
    }
    assert.equal(prevOff,11);assert.equal(prevDef,11);
  });
}
test('offense first lesson observes the baseline, then requires an RB route counterplay',()=>{
 const l=Camp.lessons.offense[0],s=Camp.scrimmageSetup(l,'offense',0),start=Core.clone(s),baseline=Core.simulate(s.offense,s.defense,l.seed);
 assert.ok(baseline.result.yards>=l.minimum);
 assert.equal(Camp.assess(l,start,s.offense,s.defense,baseline).pass,false);
 s.offense.players.find(p=>p.id==='oRB').route=[{x:-4,y:-4},{x:-10,y:1},{x:-14,y:10},{x:-17,y:25}];
 const counter=Core.simulate(s.offense,s.defense,l.seed);
 assert.notEqual(counter.result.yards,baseline.result.yards);
 assert.equal(Camp.assess(l,start,s.offense,s.defense,counter).pass,true);
});
test('defense first lesson requires assignment and actual run stop',()=>{
 const l=Camp.lessons.defense[0],s=Camp.setup(l.off,l.def,l.os,l.ds),start=Core.clone(s);
 assert.equal(Camp.assess(l,start,s.offense,s.defense,Core.simulate(s.offense,s.defense,l.seed)).pass,false);
 let mlb=s.defense.players.find(p=>p.id==='dM');mlb.job='man';mlb.coverTarget='oRB';
 const out=Core.simulate(s.offense,s.defense,l.seed);
 assert.ok(out.result.yards<7);
 assert.equal(Camp.assess(l,start,s.offense,s.defense,out).pass,true);
});
test('full-squad play remains subject to legal alignment',()=>{
 const l=Camp.lessons.offense[4],s=Camp.setup(l.off,l.def,l.os,l.ds);
 s.offense.players.find(p=>p.id==='oX').onLine=false;
 assert.equal(Core.validate(s.offense,s.defense).valid,false);
});
test('blocker target must actually change',()=>{
 const l=Camp.lessons.offense[2],s=Camp.setup(l.off,l.def,l.os,l.ds),start=Core.clone(s);
 assert.equal(Camp.changed(start,s,l,'offense'),false);
 s.offense.players.find(p=>p.id==='oLT').blockTarget='dLE';
 assert.equal(Camp.changed(start,s,l,'offense'),true);
});
test('campaign progress is bounded and robust to blocked storage',()=>{
 assert.deepEqual(Camp.readProgress({getItem(){throw Error('blocked');}}),{offense:0,defense:0});
 assert.deepEqual(Camp.readProgress({getItem(){return '{"offense":3,"defense":99}';}}),{offense:3,defense:6});
});

