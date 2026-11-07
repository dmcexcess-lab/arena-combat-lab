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
// Four-part coaching clinics are independent of the outcome gate; each lesson is a
// genuine reading/practice exercise, not a slideshow that auto-awards progress.
const clinics={
 offense:[
 {objective:'Understand the snap, the possession chain and the difference between a handoff and a pass.',
  theory:['The center starts every scrimmage play with a snap. The QB must receive it cleanly before distributing the ball. A run does not automatically mean the QB keeps the football: the back must meet the exchange point and follow an assigned path.','The offense advances toward the top of the board. The line of scrimmage is the starting reference for yards gained; a tackle behind it is a loss. A single defender can stop a careless run if the ball carrier attacks directly into the pursuit angle.','These training drills deliberately use fewer than 11 players. Their alignments are instructional and are NOT legal NFL game formations.'],
  craft:['Identify C, QB and RB on the field. Select each and inspect the job assigned.','Run once without editing, watch the carrier marker and follow the event log for the handoff.','Adjust the RB’s route away from the run-fit defender; repeat. Compare where contact occurs and the resulting yards.'],
  observe:'Where was the ball at the instant of the handoff? Did the defender take a direct route or an angle to the projected runner?',
  terms:['Snap','Quarterback (QB)','Running back (RB)','Line of scrimmage','Run fit'],
  question:'Which player normally initiates a scrimmage play by snapping the ball?',choices:['Quarterback','Center','Running back'],answer:1,explain:'The center snaps it; the QB then receives the ball or executes the next action.'},
 {objective:'Write a route that creates a throwing window rather than merely moving a receiver.',
  theory:['A receiver runs a route to put a defender in conflict. A slant attacks inside quickly; an out attacks the boundary; a drag crosses the defense at shallow depth. Different shapes solve different coverage problems.','The QB does not throw solely because a receiver is first in the progression. Separation, position, ball-flight timing, defender leverage and pressure determine whether a window is viable.','A receiver can look open at the snap but be covered at ball arrival. Watch both the defender and receiver as the football travels.'],
  craft:['Select X and review the route waypoints and receiving job.','Try a short break into available space, such as a curl, drag or shallow cross.','Run two attempts with different seeds, then replay each at the instant of the throw.'],
  observe:'Did the QB choose X on both attempts? If not, how did the position of the covering defender change the read?',terms:['Wide receiver (WR)','Slant','Drag and shallow cross','Progression read','Leverage'],
  question:'What makes an otherwise attractive receiver a poor target?',choices:['A defender in the anticipated catch window','Being second in the progression','Running a shorter route'],answer:0,explain:'A covered arrival point or contested passing lane can make a throw unsafe regardless of nominal read order.'},
 {objective:'Use blocking assignments to buy enough time for a route to develop.',
  theory:['Pass protection creates a pocket; it is not a race to push every defender forward. A tackle usually handles a threatening edge, while interior blockers protect the shortest line to the QB.','An assignment needs a defined opponent or area. Sending the LT to the wrong defender can leave a free rusher. Blocking also has limits: a slower blocker may lose a matchup or fail to redirect a rusher.','Every route has a time cost. A five-yard hitch can be available early; a deep post may require the QB to survive much longer.'],
  craft:['Find the defender attacking the offensive left edge. Select LT and bind his block target to that defender.','Compare elapsed time to the first pressure or sack before and after the assignment.','If pressure still arrives, modify a route to give the QB an earlier answer rather than treating protection as infallible.'],
  observe:'Which blocker contacted the rush first, and which receiving window was available before pressure?',terms:['Guards and tackles','Pass rush and blitz','Hot route','Checkdown','Gap integrity'],
  question:'Why can a quick outlet improve a play with weak protection?',choices:['It makes every block stronger','It gives the QB an earlier viable throw','It removes the defensive line'],answer:1,explain:'Short answers can be delivered before a rusher wins, without changing the blockers’ physical ability.'},
 {objective:'Design a concept that makes a single defender choose between multiple threats.',
  theory:['Good play calls combine routes: short/long and inside/outside threats stress the same defender. If both receivers run into the same space, one defender may cover both.','A hot read is a built-in response to an expected blitz. It should be accessible early, with an angle and location the QB can identify. It is not an automatic completion button.','Read priority is guidance, not a hard lock. A QB should reject an unsafe first read and move to another window or avoid the throw.'],
  craft:['Map the likely linebacker zone and choose two different routes that force a commitment.','Assign a hot receiver or adjust the read numbers so the QB has an early outlet.','Try the same concept against multiple seeds and identify which defender each successful completion exploited.'],
  observe:'At the snap, which two routes put a defender in conflict? Which read won after the snap?',terms:['Route concept','Spacing concept','Hot route','Progression read','Post-snap read'],
  question:'Which route combination creates more useful spacing?',choices:['Two receivers finishing on the same spot','A flat underneath with a slant behind it','Two receivers both waiting behind the QB'],answer:1,explain:'Different depths and horizontal areas can force one defender to choose a threat.'},
 {objective:'Retain legal alignment while modifying a full 11-player offensive concept.',
  theory:['With 11 players the formation becomes a legal design problem. Seven or more are on the offensive line at the snap. The two ends of the line are eligible positions; interior linemen normally cannot catch a forward pass.','A receiver lined up ON the line outside a tight end may cover the tight end, removing that end’s eligibility. A back clearly behind the line can remain eligible if his number and status permit.','The legality checker is an instructional subset of NFL enforcement. It detects important formation and assignment violations but does not yet officiate all movement, contact or live-ball rules.'],
  craft:['Count the on-line players and locate each end-of-line eligible receiver.','Change an eligible route while leaving the interior blockers and snap structure intact.','Inspect Rules Check. If it fails, correct the exact offender instead of abandoning your concept.'],
  observe:'Did all receiving routes belong to eligible players? Which defenders were stressed by the revised design?',terms:['Legal offensive formation','Eligible receiver','Line of scrimmage','Legal motion and shift','Illegal man downfield'],
  question:'Under the NFL scrimmage formation rule, at least how many offensive players must be on the line?',choices:['Five','Six','Seven'],answer:2,explain:'At least seven offensive players must align on the line of scrimmage.'},
 {objective:'Call a sequence of legal, complementary plays to score a touchdown.',
  theory:['A touchdown drive requires situational football, not one perfect diagram. Keep track of down, yards to go, field position and the defense’s strengths. A three-yard gain is useful on 2nd & 2 but not enough on 4th & 8.','Use plays in families: run to challenge gap integrity, a quick pass to counter pressure, a deeper concept to punish defensive overreaction. Running and passing should make each other harder to defend.','A good coordinator observes the previous snap. Did the blitz arrive? Did the CB stay in man? Did the safety rotate? Adapt assignments between downs rather than replaying the identical call without thought.'],
  craft:['Start by reading the down and distance. Identify one safe concept and one higher-reward alternative.','Change at least one tactical assignment, then run and evaluate the QB’s candidate scores and contact points.','Manage the next down. Earn a fresh set of downs when needed and cross the goal line before turning it over.'],
  observe:'Which calls generated positive expected yards against pressure? Did your alterations improve the drive or just increase risk?',terms:['Down and distance','Touchdown','Turnover on downs','Film review','Checkdown','Pre-snap read'],
  question:'On 3rd & 2 near the goal line, what is the most relevant design goal?',choices:['Always target the deepest receiver','Gain the needed yards while controlling risk','Throw only to the first read'],answer:1,explain:'Distance to gain, coverage and turnover risk determine which play is most useful.'}
 ],
 defense:[
 {objective:'Learn pursuit, run fits and the role of the second-level defender.',
  theory:['A defender should not chase the current ball position blindly. A pursuit angle closes the runner’s likely future path. A linebacker is a gap fitter and a tackler, not merely a stationary X.','Front defenders control lanes; second-level defenders clean up when a runner chooses a crease. A bad fit creates a hole even when several defenders seem close.','A single-defender drill strips away team complexity so you can see pursuit decisions and the effect of an assignment.'],
  craft:['Inspect MLB’s default job and identify the ball carrier.','Assign the RB as the linebacker’s responsibility, then run and inspect the angle of pursuit.','Reposition the linebacker and compare where contact occurs. Do not judge a defense purely by the first second of motion.'],
  observe:'Did the defender meet the runner’s path or chase behind it?',terms:['Linebacker (LB)','Run fit','Gap integrity','Contain and force'],
  question:'What is a sound pursuit principle?',choices:['Chase the runner’s previous location','Intercept the runner’s likely path','Always rush straight upfield'],answer:1,explain:'Interception angles beat reactive chasing, especially in space.'},
 {objective:'Assign man coverage and recognize leverage advantages.',
  theory:['In man coverage a defender is responsible for an eligible player rather than a fixed patch of grass. The defender’s starting leverage influences which cuts he can defend.','Man assignments remain vulnerable to traffic, sharp inside breaks and receiver speed. Outside help or a deep safety can change the technique.','Man versus zone is a responsibility distinction, not merely whether a corner runs next to someone in an animation.'],
  craft:['Assign CB1 to X and confirm the target label in the inspector.','Run multiple seeds. Inspect whether the corner stays with X through the break.','Move the corner a little inside or outside and test which break it best protects.'],
  observe:'Did the receiver win inside, outside or vertically? Was another defensive player available for help?',terms:['Man coverage','Cornerback (CB)','Leverage','Cover 1','Drag and shallow cross'],
  question:'In man coverage, who is the primary assigned responsibility?',choices:['An individual eligible opponent','A fixed rectangle of grass','Only the QB'],answer:0,explain:'Man coverage tracks a particular offensive player, with help rules where the scheme provides them.'},
 {objective:'Create pressure without sacrificing all viable coverage answers.',
  theory:['A rush of four can create pressure while preserving seven in coverage. Blitzing a linebacker may speed arrival at the QB, but it also removes an underneath body.','A successful rush is a race against the route. The defense must reach the passer before the receiver makes a safe throwing window.','Contain matters against QB movement. An edge defender who loses outside leverage may give the passer a scramble escape route.'],
  craft:['Inspect a pass-rushing DE and change one assignment to Rush or Blitz.','Replay the instant pressure reaches the QB and note whether the pass was already released.','Adjust another defender into coverage if your blitz leaves a short outlet completely unprotected.'],
  observe:'Which defender created pressure, and what space did the rushing choice leave open?',terms:['Pass rush and blitz','Contain and force','Hot route','Checkdown','Quarterback (QB)'],
  question:'What is the main tradeoff when sending an extra blitzer?',choices:['More pressure but fewer coverage defenders','Automatic interception','Less pressure and more coverage'],answer:0,explain:'Extra rushers trade coverage resources for a faster path to the QB.'},
 {objective:'Protect areas as a coordinated zone defense instead of just following receivers.',
  theory:['Zone coverage puts defenders in charge of areas and route threats entering those areas. Good defenders react to receivers, but their assignments include depth, width and help.','A deep window can appear between underneath and deep defenders; a shallow window can appear if multiple zones expand after the same receiver.','Zone size is a tactical responsibility in Route Lab, not a magic radius in which all catches are forbidden.'],
  craft:['Locate the strongest crossing route and the linebacker’s current coverage zone.','Move the zone center or resize the radius to take away the route’s projected catch point.','Run another attempt and compare thrown target, spacing and whether the offense exploited the opposite side.'],
  observe:'Did a zone defender close the expected window, or did the QB correctly progress elsewhere?',terms:['Zone coverage','Cover 2','Cover 3','Pattern matching','Leverage'],
  question:'In zone coverage, what is the defender’s main organizing responsibility?',choices:['Track one specified player everywhere','Protect an area and react to threats','Never move from the initial position'],answer:1,explain:'Zone defenders have area responsibilities with different reaction and matching rules.'},
 {objective:'Combine front pressure, intermediate help and deep coverage with all eleven defenders.',
  theory:['A defensive call is an integrated structure: front/gap responsibilities, curl-flat and hook defenders, deep leverage and potential match rules. Eleven independent jobs can contradict one another.','Cover 2 traditionally uses two deep safeties; Cover 3 has three deep defenders; quarters uses four deep responsibilities and commonly match principles. Labels are broad families, not complete play calls.','The best shell for a concept depends on what the offense threatens, where the weakness lies and how pressure changes the QB’s time.'],
  craft:['Identify the rushers, underneath defenders and deep safeties in the preset.','Alter one coverage or rush role, then confirm all eleven remain in legal positions.','Test your assignment against a short pattern and a vertical concept; inspect which responsibility was compromised.'],
  observe:'Which position had to choose between a shallow receiver and an intermediate or vertical threat?',terms:['Cover 2','Cover 3','Quarters','Pattern matching','Gap integrity'],
  question:'Which is typically the distinguishing deep structure of Cover 3?',choices:['Three deep coverage defenders','No deep defender','Every defender rushing'],answer:0,explain:'The standard Cover 3 zone family uses three deep thirds with underneath defenders.'},
 {objective:'Plan a four-down defensive stand and adapt coverage after each offensive response.',
  theory:['A defense wins a stand by denying a new first down or forcing a turnover, not necessarily by making every play a sack. The acceptable gain changes with down and distance.','Avoid giving up one explosive conversion to chase an unrealistic negative play. Mix front integrity, underneath reactions and enough deep help to prevent a touchdown.','Treat replay as film study: identify which receiver was actually selected, why the QB rejected alternatives and how your assignments changed the pressure and passing lanes.'],
  craft:['Before each snap read the distance to gain and name the most dangerous receiving window.','Make a meaningful adjustment to coverage or rush, then use the event log to inspect the QB read and the stop.','Keep the offense behind the chains for four downs; reconsider the shell if a conversion resets the series.'],
  observe:'Did your scheme remove the primary read or merely force a safer checkdown? Was that sufficient on the current down?',terms:['Down and distance','Turnover on downs','Film review','Pre-snap read','Pass rush and blitz'],
  question:'What defines success for a four-down defensive stand?',choices:['Sack the quarterback on every snap','Prevent the offense from earning another first down','Make every pass incomplete'],answer:1,explain:'The defense can concede short gains so long as the offense does not reach the line to gain.'}
 ]
};
for(const side of ['offense','defense'])lessons[side].forEach((lesson,index)=>{lesson.clinic=clinics[side][index];});

// Ordered, repeatable counter-scout rotations. Early training may omit a physical
// snapper to isolate QB/receivers; full 11v11 retains ordinary legality.
const SCRIMMAGE_WAVES=[
 {id:'base',name:'SCOUT',brief:'First watch the base look: identify personnel, leverage, the ball, the free defender and your matchup. Build a specific answer.'},
 {id:'man',name:'MAN',brief:'Defenders track named receivers. Crossers, picks in space (without illegal contact) and route breaks can create separation.'},
 {id:'zone',name:'ZONE',brief:'Defenders protect grass instead of chasing a single receiver. Stress seams and overload a zone with two receiving threats.'},
 {id:'blitz',name:'BLITZ',brief:'One extra defender attacks the QB, leaving fewer underneath. Protect the free rusher or give the QB an immediate hot outlet.'}
];
const SCRIMMAGE_ROSTERS=[
 {off:['oC','oQB','oRB'],def:['dM']},
 {off:['oQB','oX','oSL'],def:['dM','dCB1','dCB2'],virtual:true},
 {off:['oC','oQB','oLT','oX','oSL'],def:['dM','dCB1','dLE','dW','dCB2']},
 {off:['oC','oQB','oLT','oLG','oX','oSL','oRB'],def:['dM','dCB1','dLE','dW','dCB2','dDT1','dS']},
 {off:null,def:null},{off:null,def:null}
];
function scrimmageSetup(lesson,side,wave=0){
 const index=lessons[side].indexOf(lesson);
 if(index<0)throw new Error('Unknown lesson');
 const group=SCRIMMAGE_ROSTERS[index],base=setup(lesson.off,lesson.def,11,11);
 const off=base.offense,def=base.defense;
 if(group.off){off.players=off.players.filter(p=>group.off.includes(p.id));off.training=true;off.trainingVirtualSnap=!!group.virtual;}
 if(group.def){def.players=def.players.filter(p=>group.def.includes(p.id));off.training=true;def.training=true;}
 off.name=lesson.off+' • '+SCRIMMAGE_WAVES[wave].name;
 def.name=lesson.def+' • '+SCRIMMAGE_WAVES[wave].name;
 // Clean all targets that disappear in reduced-personnel exercises.
 for(const p of off.players){if(p.blockTarget&&!def.players.some(q=>q.id===p.blockTarget))p.blockTarget='';}
 for(const p of def.players){if(p.coverTarget&&!off.players.some(q=>q.id===p.coverTarget))p.coverTarget='';}
 if(!off.players.some(p=>p.id===off.runnerId))off.runnerId='oQB';
 if(!off.players.some(p=>p.id===off.primaryTarget))off.primaryTarget=off.players.find(p=>p.job==='route')?.id||'oQB';
 const threat=off.players.filter(p=>p.job==='route');
 const defenders=def.players;
 if(wave===1){ // explicit man coverage: no disguised auto-targets
  const backs=defenders.filter(p=>['CB','LB','MLB','SS','FS','S','W'].some(t=>p.label.startsWith(t))||p.id==='dM');
  const targets=threat.length?threat:off.players.filter(p=>p.id===off.runnerId);
  backs.forEach((p,i)=>{if(targets.length){p.job='man';p.coverTarget=targets[i%targets.length].id;}else{p.job='runfit';p.fitX=off.runGapX||2;}});
 }else if(wave===2){
  defenders.forEach((p,i)=>{if(p.id==='dLE'||p.id==='dRE'||p.id.startsWith('dDT')){p.job='rush';p.coverTarget='';return;}
   p.job='zone';p.coverTarget='';p.zone={x:Math.max(-19,Math.min(19,p.x)),y:i%3===0?8:i%3===1?16:23,r:8,rY:7};});
 }else if(wave===3){
  const rusher=defenders.find(p=>p.id==='dM')||defenders[0];
  defenders.filter(p=>p.id==='dLE'||p.id==='dRE'||p.id.startsWith('dDT')).forEach(p=>{p.job='rush';p.coverTarget='';});
  if(rusher){rusher.job='blitz';rusher.coverTarget='';}
  for(const p of defenders){if(p.job==='man'&&!p.coverTarget){p.job='zone';p.zone={x:p.x,y:11,r:7,rY:8};}}
 }
 // Do not pre-solve a defender's assignment exercise when presenting its opponent.
 if(side==='defense' && index===0){const mlb=defenders.find(p=>p.id==='dM');if(mlb){mlb.job='runfit';mlb.coverTarget='';mlb.fitX=off.runGapX||2;}}
 if(side==='defense' && index===1){const cb=defenders.find(p=>p.id==='dCB1');if(cb&&cb.job==='man'&&cb.coverTarget==='oX'){cb.job='zone';cb.coverTarget='';cb.zone={x:cb.x,y:9,r:8,rY:8};}}
 if(side==='defense' && index>0 && index<4){
   // Defensive students also see a repeatable opposing attack rather than an arbitrary random call.
   if(wave===0){off.type='run';off.runnerId=off.players.some(p=>p.id==='oRB')?'oRB':'oQB';}
   else if(wave===1){off.type='pass';off.throwAt=2.0;}
   else if(wave===2){off.type='pass';off.throwAt=3.3;}
   else {off.type='pass';off.throwAt=1.85;}
 }
 if(off.type==='run'){
   const runner=off.players.find(p=>p.id===off.runnerId);
   if(runner){runner.job='carry';if(!runner.route?.length)runner.route=[{x:off.runGapX||2,y:4},{x:off.runGapX||2,y:18}];}
 }
 return {offense:off,defense:defenseSanitize(def,off),wave:SCRIMMAGE_WAVES[wave],roster:group};
}
function defenseSanitize(def,off){
 for(const p of def.players){if(p.coverTarget&&!off.players.some(q=>q.id===p.coverTarget)){p.coverTarget='';p.job='zone';p.zone={x:p.x,y:12,r:7,rY:8};}}
 return def;
}

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
root.RouteCampaign={lessons,setup,readProgress,changed,assess,SCRIMMAGE_WAVES,SCRIMMAGE_ROSTERS,scrimmageSetup};
if(typeof module!=='undefined'&&module.exports)module.exports=root.RouteCampaign;
})(typeof window!=='undefined'?window:globalThis);
