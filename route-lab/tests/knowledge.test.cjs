'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../engine.js'),P=require('../plays.js'),K=require('../campaign.js'),E=require('../encyclopedia.js');
test('encyclopedia contains indexed terms in every teaching domain',()=>{
 assert.ok(E.entries.length>=50);
 for(const category of ['Game','Rules','Personnel','Routes','Concepts','Coverage','Defense','Coaching']) assert.ok(E.entries.filter(x=>x.category===category).length>=3);
 assert.ok(E.byTitle('Eligible receiver'));
});
test('every campaign lesson contains a complete coaching clinic and quiz',()=>{
 for(const side of ['offense','defense'])for(const l of K.lessons[side]){
  assert.equal(l.clinic.theory.length,3);assert.equal(l.clinic.craft.length,3);
  assert.ok(l.clinic.observe.length>30);assert.ok(l.clinic.choices[l.clinic.answer]);
  for(const term of l.clinic.terms)assert.ok(E.byTitle(term),term);
 }
});
test('QB reads and frames are deterministic when rerunning a seed',()=>{
 const o=P.createOffensePresets()[0],d=P.createDefensePresets()[0];
 const a=C.simulate(o,d,71),b=C.simulate(o,d,71);
 assert.deepEqual(a.decisions,b.decisions);assert.deepEqual(a.frames,b.frames);
 assert.ok(a.decisions[0].candidates.length>=2);
});
test('different seeds choose more than one viable receiver on the same play',()=>{
 const o=P.createOffensePresets()[0],d=P.createDefensePresets()[0],targets=new Set(),outcomes=new Set();
 for(let seed=71;seed<101;seed++){let s=C.simulate(o,d,seed);assert.ok(s.valid);for(let x of s.decisions)if(x.target)targets.add(x.target);outcomes.add(s.result.verdict);}
 assert.ok(targets.size>=2,[...targets].join(','));assert.ok(outcomes.size>=2);
});
test('defensive matchup alters passer decisions',()=>{
 const o=P.createOffensePresets()[0],ds=P.createDefensePresets();
 assert.ok(new Set(ds.map(d=>C.simulate(o,d,71).decisions[0]?.target)).size>1);
});
test('hosted standalone HTML embeds exactly the maintained modules',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const scripts=[...source.matchAll(/<script>\s*([\s\S]*?)\s*<\/script>/g)].map(x=>x[1].trim());
 const names=['engine.js','plays.js','campaign.js','game.js','encyclopedia.js','app.js'];
 assert.equal(scripts.length,names.length);
 for(let i=0;i<names.length;i++)assert.equal(scripts[i],fs.readFileSync(path.join(__dirname,'..',names[i]),'utf8').trim(),names[i]);
});
