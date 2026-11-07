'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../engine.js'), Plays = require('../plays.js'), Camp = require('../campaign.js');
test('all 88 sandbox matchups remain valid 11v11', () => {
  const off=Plays.createOffensePresets(),def=Plays.createDefensePresets();
  assert.equal(off.length,11);assert.equal(def.length,8);
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
test('offense first lesson earns an actual yardage result',()=>{
 const l=Camp.lessons.offense[0],s=Camp.setup(l.off,l.def,l.os,l.ds),start=Core.clone(s),out=Core.simulate(s.offense,s.defense,l.seed);
 assert.equal(Camp.assess(l,start,s.offense,s.defense,out).pass,true);
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
