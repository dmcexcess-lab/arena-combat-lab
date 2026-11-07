/* Route Lab campaigns: progressive small-sided instructional drills and full-squad challenges. */
(function(root){
'use strict';
const C=root.GridironCore||(typeof require!=="undefined"?require("./engine.js"):null),P=root.GridironPlays||(typeof require!=="undefined"?require("./plays.js"):null);
const clone=C.clone;
const O=P.createOffensePresets(),D=P.createDefensePresets();
const offIds=['oC','oQB','oRB','oX','oSL','oLT','oLG','oRG','oRT','oTE','oZ'];
const defIds=['dM','dCB1','dLE','dW','dDT1','dDT2','dRE','dS','dCB2','dFS','dSS'];
function setup(offName,defName,os,ds,options={}){
 const o=clone(O.find(p=>p.name===offName)||O[0]),d=clone(D.find(p=>p.name===defName)||D[0]);
 if(os!==11){o.players=o.players.filter(p=>offIds.slice(0,os).includes(p.id));o.training=true;}
 if(ds!==11){d.players=d.players.filter(p=>defIds.slice(0,ds).includes(p.id));d.training=true;}
 if(os!==11||ds!==11){o.training=true;d.training=true;}
 if(ds===1){const only=d.players[0];only.job='runfit';only.fitX=2;}
 for(const p of o.players){if(p.blockTarget&&!d.players.some(q=>q.id===p.blockTarget))p.blockTarget='';}
 for(const p of d.players){if(p.coverTarget&&!o.players.some(q=>q.id===p.coverTarget)){p.coverTarget='';if(p.job==='man'){p.job='zone';p.zone={x:p.x,y:p.y+5,r:7,rY:7};}}}
 if(!o.players.some(p=>p.id===o.runnerId))o.runnerId='oQB';
 if(!o.players.some(p=>p.id===o.primaryTarget))o.primaryTarget=o.players.find(p=>p.job==='route')?.id||'oQB';
 Object.assign(o,options);
 return {offense:o,defense:d};
}
const lessons={
 offense:[
 {title:'The Snap & the Ball',role:'Quarterback',detail:'The center starts the play. The quarterback receives the snap and decides whether to hand off, throw or keep it. Here only the center, QB and running back face one defender.',task:'Run the starter play, then get at least 2 yards. You can edit the runner’s path with Draw route.',hint:'Select the RB, choose Draw route, and plot a path away from the defender.',off:'Inside Zone',def:'4–3 Cover 2',os:3,ds:1,goal:'gain',minimum:2,editable:['oRB','oQB'],seed:71},
 {title:'Getting Open',role:'Receivers & routes',detail:'An eligible receiver runs a route to create separation. A defender can follow in man coverage or protect an area. Change the X receiver’s route to attack open space.',task:'Edit a receiver route, then execute a positive-gain passing play.',hint:'Select X, try a Curl or Drag in the Route preset, then run the play. The QB will choose an open target.',off:'Slant / Flat',def:'4–3 Cover 2',os:4,ds:2,goal:'pass',minimum:1,edit:'route',editable:['oX'],seed:83},
 {title:'Protection Matters',role:'The offensive line',detail:'Linemen control the pocket. A blocker can be assigned to a specific rusher, which changes the pressure and gives routes time to develop.',task:'Assign the left tackle to the defensive edge, then complete a pass.',hint:'Select LT, choose Assign target, then tap the opposing DE (or set Block target in the inspector).',off:'Shotgun Mesh',def:'4–3 Cover 2',os:6,ds:3,goal:'pass',minimum:1,edit:'block',editable:['oLT','oX','oSL'],seed:91},
 {title:'Use the Whole Field',role:'Spacing, reads & hot routes',detail:'Multiple receivers stretch the coverage. Change a hot route or read priority to give your quarterback an answer against pressure.',task:'Set a hot route or change a receiver route and gain at least 3 yards.',hint:'Select a receiver and check Hot route, or draw a route that separates from the defenders.',off:'Shotgun Mesh',def:'4–3 Cover 2',os:8,ds:5,goal:'gain',minimum:3,edit:'receiver',editable:['oX','oSL','oTE'],seed:121},
 {title:'Eleven on Eleven',role:'Formation & legal alignment',detail:'Now every position is present. The snap formation must have at least seven on the line, eligible ends, a center, and backs clearly behind the line. The normal rules validator applies.',task:'Change any eligible route, keep the play legal, and gain 4 yards.',hint:'Try X on a Hitch, Drag or Shallow route. Keep your formation legal and review Rules Check before running.',off:'Slant / Flat',def:'4–3 Cover 2',os:11,ds:11,goal:'gain',minimum:4,edit:'route',editable:['oX','oSL','oZ','oTE','oRB'],seed:71},
 {title:'Call Your Own Touchdown Drive',role:'Offensive coordinator',detail:'You have full control of your offense against a real 11-man defense. Adjust routes, blocks and the ball carrier before each snap. Chain together first downs and finish in the end zone; a turnover on downs restarts the drive.',task:'Design your own legal plays and score a touchdown before four downs expire. A tactical edit is required before your first snap.',hint:'Mix run and pass, take what the defense gives, and modify the plan between snaps. Your drive starts at the opponent’s 20-yard line.',off:'Inside Zone',def:'4–3 Cover 2',os:11,ds:11,goal:'touchdown',edit:'any',drive:true,editable:null,seed:71}
 ],
 defense:[
 {title:'Who Stops the Ball?',role:'Pursuit & tackling',detail:'The linebacker is the last line of defense in this small-sided run drill. Your job is to keep a runner from getting free; pursuit angle matters.',task:'Assign MLB to shadow the RB, then stop the run before 7 yards.',hint:'Select MLB, switch its job to Man, and choose RB as its Cover target. You may reposition the defender as well.',off:'Inside Zone',def:'4–3 Cover 2',os:3,ds:1,goal:'stop',maximum:7,edit:'runner',editable:['dM'],seed:71},
 {title:'Man Coverage',role:'Stay with your receiver',detail:'Man coverage assigns a defender to a particular eligible receiver. It differs from protecting a zone of turf.',task:'Assign the corner to X in man coverage and limit the play to 9 yards.',hint:'Select CB, change Job to Man, then assign X as Cover target in the inspector.',off:'Slant / Flat',def:'4–3 Cover 2',os:4,ds:2,goal:'stop',maximum:9,edit:'man',editable:['dCB1'],seed:83},
 {title:'Pressure the Quarterback',role:'Pass rush',detail:'A pass rusher attacks the passer, while a coverage defender buys that rusher time. Blitzes create pressure but can leave the secondary exposed.',task:'Set a defender to Rush or Blitz and prevent a gain of 8 or more yards.',hint:'Select DE, try Rush or Blitz, and run the play to see when pressure reaches the quarterback.',off:'Shotgun Mesh',def:'4–3 Cover 2',os:6,ds:3,goal:'stop',maximum:8,edit:'rush',editable:['dLE','dM'],seed:91},
 {title:'Protect a Zone',role:'Zone coverage & spacing',detail:'Zone defenders cover an area instead of a single receiver. Adjust the center and radius to close an open passing window.',task:'Move or resize a zone and hold the offense to fewer than 10 yards.',hint:'Select a linebacker, use Set zone, then tap the spot where receivers are likely to cross.',off:'Shotgun Mesh',def:'4–3 Cover 2',os:8,ds:5,goal:'stop',maximum:10,edit:'zone',editable:['dW','dM','dCB1'],seed:121},
 {title:'Coordinated Coverage',role:'Front seven & secondary',detail:'The whole defense is on the field. Blend pass rush, underneath coverage, and deep protection without leaving a free running lane.',task:'Change a coverage or rush assignment; force a gain below 8 yards with a legal 11-on-11 matchup.',hint:'Try man, zone, or a blitz. You can also reposition the secondary before the snap.',off:'Slant / Flat',def:'4–3 Cover 2',os:11,ds:11,goal:'stop',maximum:8,edit:'defense',editable:null,seed:71},
 {title:'Win the Defensive Stand',role:'Defensive coordinator',detail:'Now call your own 11-man defense. The opposing coordinator attacks your position repeatedly. Four downs without a first down wins the game; a touchdown loses the stand.',task:'Make a tactical edit, then stop the offense from converting four downs. Reconfigure assignments between snaps.',hint:'Watch the yards-to-gain and adapt your rush and coverage after every snap. The offense starts 10 yards from a first down.',off:'Shotgun Mesh',def:'4–3 Cover 2',os:11,ds:11,goal:'turnover',edit:'any',drive:true,editable:null,seed:71}
 ]
};
const START_PROGRESS={offense:0,defense:0};
function readProgress(storage){try{const p=JSON.parse(storage.getItem('route-lab-campaign-v1')||'{}');return {offense:Math.max(0,Math.min(lessons.offense.length,Number(p.offense)||0)),defense:Math.max(0,Math.min(lessons.defense.length,Number(p.defense)||0))};}catch{return {...START_PROGRESS};}}
function changed(before,after,lesson,side){const bp=before[side].players,ap=after[side].players;const e=lesson.edit;if(!e)return true;
 const pairs=ap.filter(p=>!lesson.editable||lesson.editable.includes(p.id)).map(p=>[bp.find(q=>q.id===p.id),p]).filter(([a])=>a);
 const diff=(a,b,fields)=>fields.some(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
 if(e==='route')return pairs.some(([a,b])=>diff(a,b,['route','pattern']));
 if(e==='block')return pairs.some(([a,b])=>['passblock','runblock','block'].includes(b.job)&&!!b.blockTarget&&b.blockTarget!==a.blockTarget);
 if(e==='receiver')return pairs.some(([a,b])=>diff(a,b,['route','hot','read','pattern']));
 if(e==='position')return pairs.some(([a,b])=>diff(a,b,['x','y']));
 if(e==='runner')return pairs.some(([a,b])=>b.job==='man'&&b.coverTarget==='oRB'&&(a.job!=='man'||a.coverTarget!==b.coverTarget));
 if(e==='man')return pairs.some(([a,b])=>b.job==='man'&&b.coverTarget==='oX'&&(a.job!=='man'||a.coverTarget!==b.coverTarget));
 if(e==='rush')return pairs.some(([a,b])=>['rush','blitz'].includes(b.job)&&a.job!==b.job);
 if(e==='zone')return pairs.some(([a,b])=>b.job==='zone'&&diff(a,b,['zone','job']));
 if(e==='defense')return pairs.some(([a,b])=>diff(a,b,['job','coverTarget','zone','x','y']));
 return pairs.some(([a,b])=>diff(a,b,['job','blockTarget','coverTarget','route','hot','zone','motion','x','y','pattern']))||JSON.stringify(before[side].type)!==JSON.stringify(after[side].type);
}
function assess(lesson,before,offense,defense,sim){const s=lesson.role.startsWith('Defensive')?'defense':null;
 const team=lessons.defense.includes(lesson)?'defense':'offense';
 if(!sim?.valid)return {pass:false,message:'Fix the formation and run the simulation.'};
 if(!changed(before,{offense,defense},lesson,team))return {pass:false,message:'Make the requested tactical edit first. Then rerun the play.'};
 const y=sim.result.yards, verdict=sim.result.verdict;
 if(lesson.goal==='pass')return {pass:verdict.startsWith('Touchdown')||sim.events.some(e=>e.text.startsWith('Completed')),message:'Complete a pass after applying the required assignment.'};
 if(lesson.goal==='gain')return {pass:y>=lesson.minimum&&!verdict.includes('Interception'),message:`Gain at least ${lesson.minimum} yards (last play ${y.toFixed(1)}).`};
 if(lesson.goal==='stop')return {pass:y<lesson.maximum&&!verdict.includes('Touchdown'),message:`Keep the offense below ${lesson.maximum} yards (last play ${y.toFixed(1)}).`};
 return {pass:false,message:'Finish the drive objective.'};
}
root.RouteCampaign={lessons,setup,readProgress,changed,assess};
if(typeof module!=='undefined'&&module.exports)module.exports=root.RouteCampaign;
})(typeof window!=='undefined'?window:globalThis);
