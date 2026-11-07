/* Route Lab game state, officiating, and seeded special teams. Yard coordinates run home goal (0) to away goal (100). */
(function(root){
'use strict';
const C=root.GridironCore||require('./engine.js');
const P=root.GridironPlays||require('./plays.js');
const other=t=>t==='home'?'away':'home', dir=t=>t==='home'?1:-1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const copy=C.clone;
const FIRST=['Caleb','Marcus','Jalen','Darius','Eli','Andre','Noah','Micah','Isaiah','Jordan','Trey','Devin','Miles','Quinn','Tyler','Cameron'];
const LAST=['Brooks','Carter','Reed','Lewis','Morgan','Hayes','Walker','King','Hill','Moore','Bennett','Cole','Grant','Price','Davis','Foster'];
function random(seed){let x=(Number(seed)||1)>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function roster(seed){const rand=random(seed),units={offense:P.createOffensePresets()[0].players,defense:[...P.createDefensePresets()[0].players,{id:'dNB',label:'NB',number:34},{id:'dNT',label:'NT',number:92},{id:'dOLB',label:'OLB',number:56}]};const out={};for(const team of ['home','away']){
 const depth={};for(const unit of ['offense','defense'])depth[unit]=units[unit].map(p=>({slot:p.id,label:p.label,starter:0,players:[0,1].map((_,i)=>{
  const base=C.statsOf(p),talent=Math.round((rand()-.5)*20)+(i?Math.round((rand()-.5)*10)-5:0);
  const stats=Object.fromEntries(C.RATING_KEYS.map(k=>[k,clamp(Math.round(base[k]+talent*.55+(rand()-.5)*17),1,99)]));
  const baseNumber=Number(p.number),line=['LT','LG','C','RG','RT'].includes(p.label),backup=unit==='offense'?(line?50+(baseNumber+13)%30:p.label==='TE'?80+(baseNumber+3)%10:p.label==='QB'?1+(baseNumber+8)%19:1+(baseNumber+17)%48):(baseNumber+40)%100;
  return {name:FIRST[Math.floor(rand()*FIRST.length)]+' '+LAST[Math.floor(rand()*LAST.length)],number:i?backup:baseNumber,stats};
 })}));
 depth.special=['K','P','KR'].map((label,j)=>({slot:label,label,starter:0,players:[0,1].map((_,i)=>({name:FIRST[Math.floor(rand()*FIRST.length)]+' '+LAST[Math.floor(rand()*LAST.length)],number:1+j*12+i*40,stats:{power:clamp(Math.round(78+(rand()-.5)*28-i*4),35,99),accuracy:clamp(Math.round(78+(rand()-.5)*28-i*4),35,99),hang:clamp(Math.round(78+(rand()-.5)*28-i*4),35,99),speed:clamp(Math.round(82+(rand()-.5)*24-i*4),35,99),vision:clamp(Math.round(81+(rand()-.5)*24-i*4),35,99),agility:clamp(Math.round(82+(rand()-.5)*24-i*4),35,99)}}))}));
 const numbers=(unit,label)=>{
  const low=Array.from({length:50},(_,n)=>n),line=Array.from({length:30},(_,n)=>50+n),high=Array.from({length:10},(_,n)=>90+n),receivers=Array.from({length:10},(_,n)=>80+n);
  if(unit==='special')return label==='KR'?[...low,...receivers]:[...low,...high];
  if(unit==='offense')return ['LT','LG','C','RG','RT'].includes(label)?line:label==='QB'?low.slice(0,20):[...low,...receivers];
  if(['DE','DT','NT'].includes(label))return [...line,...high];
  if(['LB','MLB','OLB'].includes(label))return [...low,...line.slice(0,10),...high];
  return low;
 };
 const used=new Set();for(const index of [0,1])for(const unit of ['offense','defense','special'])for(const slot of depth[unit]){
  const person=slot.players[index],pool=numbers(unit,slot.label);
  if(used.has(person.number)||!pool.includes(person.number))person.number=pool.find(n=>!used.has(n));
  used.add(person.number);
 }
 out[team]={depth,coverage:clamp(Math.round(75+(rand()-.5)*26),45,95),returnBlocking:clamp(Math.round(75+(rand()-.5)*26),45,95)};
 }return out;}
function selected(slot){return slot.players[slot.starter]||slot.players[0];}
function syncSpecialists(s){if(!s.teams)return s;for(const team of ['home','away']){const t=s.teams[team],get=key=>selected(t.depth.special.find(v=>v.slot===key)).stats;s.specialists[team]={kicker:{power:get('K').power,accuracy:get('K').accuracy},punter:{power:get('P').power,hang:get('P').hang},returner:{speed:get('KR').speed,vision:get('KR').vision,agility:get('KR').agility},coverage:t.coverage,returnBlocking:t.returnBlocking};}return s;}
function setStarter(s,team,unit,slot,index){const row=s.teams?.[team]?.depth?.[unit]?.find(v=>v.slot===slot);if(!row||!row.players[index])return false;row.starter=index;if(unit==='special')syncSpecialists(s);return true;}
function dressPlay(s,play,team,unit){const dressed=copy(play);const slots=s.teams?.[team]?.depth?.[unit];if(!slots)return dressed;for(const p of dressed.players){const byId=slots.find(v=>v.slot===p.id),row=byId?.label===p.label?byId:(slots.find(v=>v.label===p.label)||byId);if(row){const person=selected(row);p.number=person.number;p.stats=copy(person.stats);p.rosterName=person.name;}}return dressed;}
function createExhibition(seed=1){const s=createGame();s.rosterSeed=(Number(seed)||1)>>>0;s.teams=roster(s.rosterSeed);syncSpecialists(s);s.phase='coinflip';s.clock=900;s.log=['Referee: captains at midfield for the opening coin toss.'];s.coin=null;return s;}
function flipCoin(s,call,face,choice='receive'){if(s.phase!=='coinflip')return null;const called=call==='tails'?'tails':'heads',landed=face==='tails'?'tails':'heads',winner=called===landed?'home':'away';s.coin={called,landed,winner,choice:winner==='home'&&choice==='defer'?'defer':'receive'};s.kicking=winner==='home'&&choice!=='defer'?'away':'home';s.openingKick=s.kicking;s.phase='kickoff';s.ball=s.kicking==='home'?35:65;s.log.push(`Referee: ${landed.toUpperCase()}. ${winner.toUpperCase()} wins the toss${winner==='home'&&choice==='defer'?' and defers':''}. ${s.kicking.toUpperCase()} kicks.`);return s.coin;}
function jumpTo(s,{quarter=1,clock=900,team='home',ball=50,down=1,toGain=10,homeScore=0,awayScore=0,phase='scrimmage'}={}){if(!s.teams)return false;s.quarter=clamp(Math.round(Number(quarter)||1),1,5);s.clock=clamp(Math.round(Number.isFinite(Number(clock))?Number(clock):900),0,s.quarter===5?600:900);s.score={home:clamp(Math.round(Number(homeScore)||0),0,999),away:clamp(Math.round(Number(awayScore)||0),0,999)};s.timeouts={home:s.quarter===5?2:3,away:s.quarter===5?2:3};s.pendingPeriodEnd=false;setSpot(s,team==='away'?'away':'home',clamp(Number(ball)||50,1,99),down,toGain);if(phase==='kickoff'){s.phase='kickoff';s.kicking=s.possession;s.ball=s.kicking==='home'?35:65;}else if(phase==='try'){s.phase='try';s.ball=s.possession==='home'?98:2;}s.clockRunning=false;s.log.push(`Referee: exhibition jump to Q${s.quarter} ${String(Math.floor(s.clock/60)).padStart(2,'0')}:${String(s.clock%60).padStart(2,'0')}.`);return true;}
function createGame(){return {specialists:{home:{kicker:{power:86,accuracy:84},punter:{power:83,hang:82},returner:{speed:87,vision:81,agility:86},coverage:78,returnBlocking:77},away:{kicker:{power:83,accuracy:82},punter:{power:81,hang:84},returner:{speed:85,vision:84,agility:82},coverage:80,returnBlocking:79}},otSeen:{home:false,away:false},challenges:{home:{used:0,won:0},away:{used:0,won:0}},quarter:1,clock:900,score:{home:0,away:0},timeouts:{home:3,away:3},possession:'home',ball:35,down:1,toGain:10,phase:'kickoff',kicking:'away',openingKick:'away',playClock:40,clockRunning:false,plays:0,log:['Referee: opening kickoff.']};}
function spotText(s){const own=s.possession==='home'?s.ball:100-s.ball;return own<50?`${s.possession.toUpperCase()} ${Math.round(own)}`:own>50?`${other(s.possession).toUpperCase()} ${Math.round(100-own)}`:'50';}
function periodEnd(s){if(s.clock>0)return; if(s.quarter===4){if(s.score.home===s.score.away){s.quarter=5;s.clock=600;s.timeouts={home:2,away:2};s.phase='kickoff';s.kicking=s.plays%2?'home':'away';s.clockRunning=false;s.log.push('Referee: tied after regulation. Coin toss; 10-minute overtime, both teams get a possession.');}else{s.phase='final';s.clock=0;s.log.push('Referee: end of regulation. Final score.');}return;}if(s.quarter===5){s.phase='final';s.clock=0;s.log.push('Referee: end of overtime. Final score.');return;}
 if(s.quarter===2){s.quarter=3;s.clock=900;s.timeouts={home:3,away:3};s.phase='kickoff';s.kicking=other(s.openingKick);s.clockRunning=false;s.log.push('Referee: halftime. Second-half kickoff.');return;}
 s.quarter++;s.clock=900;s.clockRunning=false;s.log.push(`Referee: start of quarter ${s.quarter}.`);
}
function drain(s,seconds){let n=Math.max(0,Math.ceil(seconds));while(n>0&&s.phase!=='final'){let step=Math.min(n,s.clock);s.clock-=step;n-=step;if(s.clock===0){periodEnd(s);if(s.phase==='kickoff'||s.phase==='final')break;}}}
function newSeries(s,team,ball){s.possession=team;if(s.quarter===5)s.otSeen[team]=true;s.ball=clamp(ball,1,99);s.down=1;s.toGain=Math.min(10,Math.max(1,team==='home'?100-s.ball:s.ball));s.phase='scrimmage';s.playClock=40;s.clockRunning=false;}
function timeout(s,team){if(s.phase==='final'||s.timeouts[team]<=0||s.phase==='try')return false;s.timeouts[team]--;s.clockRunning=false;s.playClock=25;s.log.push(`Referee: ${team.toUpperCase()} timeout. ${s.timeouts[team]} remaining this half.`);return true;}
function flag(state,side,name,yards=5){const s=copy(state);if(s.phase!=='scrimmage')return {state:s,accepted:false,call:'No scrimmage foul available'};const n=clamp(Math.round(yards),1,15),off=s.possession;if(side==='offense'){s.ball=clamp(s.ball-dir(off)*n,1,99);s.toGain+=n;}else if(side==='defense'){s.ball=clamp(s.ball+dir(off)*n,1,99);s.toGain-=n;if(s.toGain<=0){s.down=1;s.toGain=Math.min(10,Math.max(1,off==='home'?100-s.ball:s.ball));}}else return {state:s,accepted:false,call:'Unknown foul side'};s.clockRunning=false;s.playClock=25;const call=`${name} on ${side} — ${n} yards, ${s.down} & ${Math.ceil(s.toGain)} at ${spotText(s)}`;s.log.push('Referee: flag — '+call+'.');return {state:s,accepted:true,call};}
function setSpot(s,team,ball,down=1,toGain=10){if(s.phase==='final')return false;newSeries(s,team,ball);s.down=clamp(Math.round(down),1,4);s.toGain=clamp(Number(toGain)||10,1,Math.max(1,team==='home'?100-s.ball:s.ball));s.log.push(`Referee: custom start, ${s.down} and ${s.toGain} at ${spotText(s)}.`);return true;}
function preSnap(s,huddle=25){if(s.phase==='final')return {ok:false,call:'Game over'};if(s.phase==='try'||s.phase==='kickoff'||s.phase==='safetyKick')return {ok:true};const n=clamp(Number(huddle)||0,0,60);if(s.clockRunning){if((s.quarter===2||s.quarter===4)&&s.clock>120&&n>=s.clock-120){s.clock=120;s.clockRunning=false;s.log.push('Referee: two-minute warning.');return {ok:false,call:'Two-minute warning'};}const q=s.quarter;drain(s,n);if(s.quarter!==q)return {ok:false,call:'Period ended before the snap'};}if(s.phase!=='scrimmage')return {ok:false,call:'Period ended before the snap'};if(n>s.playClock){s.ball=clamp(s.ball-dir(s.possession)*5,1,99);s.toGain+=5;s.playClock=40;s.clockRunning=false;const call='Delay of game — 5 yards, repeat down';s.log.push('Referee: '+call+'.');return {ok:false,call};}s.playClock=40;return {ok:true};}
function huddleSeconds(s){return Math.max(0,Math.min((s.playClock||40)-2,27+((s.rosterSeed||71)+s.plays*17+s.down*3)%9));}
function snapOffside(def,seed){const rand=random((Number(seed)||1)^0x65a4b3f1);for(const p of def?.players||[]){if(!['rush','blitz'].includes(p.job)||p.y<.95||p.y>1.65)continue;const skill=C.statsOf(p),step=.45+rand()*.45,risk=.002+(99-skill.awareness)*.00007+skill.passRush*.00005;if(p.y-step<.95&&rand()<risk)return {player:p.label,step:+step.toFixed(2)};}return null;}
function passInterference(off,def,sim){const throwRead=sim?.decisions?.find(d=>d.action==='pass'&&d.targetId);if(!throwRead||!sim.frames?.length)return null;const target=off?.players?.find(p=>p.id===throwRead.targetId);if(!target)return null;let contacts=0,at=null,actor=null,when=null;for(const f of sim.frames){if(f.t<throwRead.t+.08||f.phase!=='air')continue;const r=f.offense?.find(p=>p.id===target.id);if(!r||r.y<=1)continue;const ball=f.ball;if(!ball||Math.hypot(ball.x-r.x,ball.y-r.y)<2.2)continue;for(const d of f.defense||[]){const source=def?.players?.find(p=>p.id===d.id);if(!source||!['man','zone','deep'].includes(source.job))continue;if(Math.hypot(d.x-r.x,d.y-r.y)<.62){contacts++;at=r.y;actor=source;when=f.t;break;}}if(contacts>=3)break;}return contacts>=3?{side:'defense',code:'DPI',name:'Defensive pass interference',spotY:at,target:target.label,player:actor?.rosterName||actor?.label||'defender',playerId:actor?.id,time:when,evidence:`${actor?.label||'Defender'} contacts ${target.label} while the pass is airborne at +${at.toFixed(1)} yd`}:null;}
function liveFouls(off,def,sim){
 if(!sim?.frames?.length)return [];
 const fouls=[],rand=random((Number(sim.result.seed)||1)^0x9e3779b9),held=new Map(),contact=new Map();
 const snap=sim.frames.filter(f=>f.t>=0),throwAt=sim.decisions?.find(d=>d.action==='pass')?.t??Infinity;
 for(const f of snap){
  for(const b of f.offense||[]){const source=off.players.find(p=>p.id===b.id);if(!source||!['passblock','runblock','block','pull'].includes(source.job)||!b.engaged)continue;
   const d=(f.defense||[]).filter(v=>v.engaged).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];if(!d||Math.hypot(d.x-b.x,d.y-b.y)>2.15)continue;
   const key=b.id+':'+d.id,prior=held.get(key)||{n:0,last:-1};prior.n=f.t-prior.last<.06?prior.n+1:1;prior.last=f.t;held.set(key,prior);
   if(prior.n===9&&fouls.every(v=>v.code!=='OH')){const defender=def.players.find(p=>p.id===d.id),bs=C.statsOf(source),ds=C.statsOf(defender);
    const pressure=ds.passRush+ds.strength-bs.blocking-bs.strength;
    if(pressure>5&&rand()<clamp(.025+pressure*.0015,.02,.18))fouls.push({side:'offense',code:'OH',name:'Offensive holding',yards:10,spotY:b.y,time:f.t,playerId:b.id,player:source.rosterName||source.label,evidence:`${source.label} keeps ${defender?.label||'rusher'} engaged for ${(prior.n*.05).toFixed(2)}s at ${b.y.toFixed(1)} yd as the rusher breaks through`});
   }
  }
  const qb=f.offense?.find(p=>p.id===off.snapToId);if(off.type!=='pass'||!qb||Math.abs(qb.x)>8||f.t>=throwAt||f.phase==='runafter'||f.phase==='loose'||f.phase==='return')continue;
  for(const r of f.offense||[]){const receiver=off.players.find(p=>p.id===r.id);if(!receiver||!['route','release'].includes(receiver.job)||r.y<=5)continue;
   for(const d of f.defense||[]){const defender=def.players.find(p=>p.id===d.id);if(!defender||!['man','zone','deep'].includes(defender.job)||Math.hypot(d.x-r.x,d.y-r.y)>.68)continue;
    const key=d.id+':'+r.id,prior=contact.get(key)||{n:0,last:-1};prior.n=f.t-prior.last<.06?prior.n+1:1;prior.last=f.t;contact.set(key,prior);
    if(prior.n===5&&fouls.every(v=>v.code!=='ICT')&&rand()<clamp(.035+(C.statsOf(receiver).routeRunning-C.statsOf(defender).coverage)*.001,.015,.11))
     fouls.push({side:'defense',code:'ICT',name:'Illegal contact',yards:5,automaticFirst:true,spotY:r.y,time:f.t,playerId:d.id,player:defender.rosterName||defender.label,evidence:`${defender.label} impedes ${receiver.label} beyond five yards before the QB releases the pass`});
   }
  }
 }
 const dpi=passInterference(off,def,sim);if(dpi)fouls.push(dpi);
 return fouls.sort((a,b)=>a.time-b.time);
}
function enforceLive(state,base,foul){const s=copy(state),off=state.possession; s.clock=base.state.quarter===state.quarter?base.state.clock:0;s.plays=base.state.plays;s.playClock=25;s.clockRunning=false;
 const previousOwn=off==='home'?state.ball:100-state.ball,goalDistance=100-previousOwn;
 if(foul.code==='DPI'){
  const target=state.ball+dir(off)*Math.max(1,foul.spotY);
  s.ball=clamp(target,1,99);
  if(foul.spotY>=goalDistance)s.ball=state.ball+dir(off)*(previousOwn>=98?goalDistance/2:goalDistance-1);
 }else if(foul.side==='offense')s.ball=clamp(state.ball-dir(off)*Math.min(foul.yards,previousOwn/2),.5,99.5);
 else s.ball=clamp(state.ball+dir(off)*Math.min(foul.yards,goalDistance/2),.5,99.5);
 const gain=(s.ball-state.ball)*dir(off);
 if(foul.side==='offense'){s.toGain=state.toGain-gain;}
 else if(foul.automaticFirst||foul.code==='DPI'||gain>=state.toGain){s.down=1;s.toGain=Math.min(10,Math.max(.5,off==='home'?100-s.ball:s.ball));}
 else s.toGain=state.toGain-gain;
 const call=`${foul.name} on ${foul.player} (${foul.code}) at ${foul.time.toFixed(2)}s, ${foul.code==='DPI'?'spot foul':foul.yards+' yards'}${foul.side==='defense'?', automatic first down':''}; ${s.down} & ${Math.ceil(s.toGain)} at ${spotText(s)}`;
 s.log.push('Referee: flag — '+call+'.');return {state:s,call};
}
function resolveLiveFouls(state,base,fouls){if(!fouls.length)return base;
 const offense=fouls.filter(f=>f.side==='offense'),defense=fouls.filter(f=>f.side==='defense');
 if(offense.length&&defense.length){const s=copy(state);s.clock=base.state.quarter===state.quarter?base.state.clock:0;s.plays=base.state.plays;s.clockRunning=false;s.playClock=25;const call=`Offsetting live-ball fouls: ${offense[0].code} on ${offense[0].player} and ${defense[0].code} on ${defense[0].player}; replay ${state.down} & ${Math.ceil(state.toGain)} at ${spotText(s)}`;s.log.push('Referee: '+call+'.');return {state:s,call,accepted:true,fouls,offsetting:true};}
 const foul=(offense.length?offense:defense).sort((a,b)=>a.time-b.time)[0],enforced=enforceLive(state,base,foul),declined={state:copy(base.state),call:`${foul.code} declined — ${base.call}`};declined.state.log.push('Referee: '+foul.code+' declined.');
 const benefit=foul.side==='offense'?'defense':'offense',beneficiary=benefit==='offense'?state.possession:other(state.possession);
 const preferDecline=base.state.score[beneficiary]>state.score[beneficiary]||benefit==='defense'&&base.state.possession===beneficiary;
 const defaultChoice=preferDecline?'decline':'accept',choice=preferDecline?declined:enforced;
 return {...choice,accepted:true,foul,fouls,choices:{accept:enforced,decline:declined},defaultChoice};
}
function reviewSpot(ruling,team){if(!ruling?.review||ruling.review.done)return {ok:false,call:'No reviewable spot is pending'};const review=ruling.review,called=ruling.state;
 const booth=review.booth,record=called.challenges?.[team]||{used:0,won:0};if(!booth&&(called.timeouts[team]<=0||record.used>=2+(record.won>0?1:0)))return {ok:false,call:'Challenge unavailable: timeout or challenge limit reached'};
 const clear=Math.abs(review.exactSpot-review.calledSpot)>=.15,changed=clear&&(review.exactState.down!==called.down||review.exactState.possession!==called.possession);
 const s=copy(changed?review.exactState:called);s.challenges??={home:{used:0,won:0},away:{used:0,won:0}};if(!booth){s.challenges[team].used++;if(changed)s.challenges[team].won++;else{s.timeouts[team]--;s.clockRunning=false;}}
 const call=`${booth?'Replay official':'Coach '+team.toUpperCase()+' challenge'}: ${changed?`spot overturned to ${review.exactSpot.toFixed(2)} yd; ${review.exactState.down===1?'first down':'short of the line to gain'}`:`ruling stands at ${review.calledSpot.toFixed(2)} yd${booth?'':' — timeout charged'}`}`;
 s.log.push('Referee: '+call+'.');review.done=true;return {ok:true,changed,state:s,call};
}
function otCheck(s,endedTeam){if(s.quarter===5&&endedTeam&&s.otSeen.home&&s.otSeen.away&&s.score.home!==s.score.away){s.phase='final';s.clockRunning=false;s.log.push('Referee: both teams possessed the ball; overtime winner decided.');}}
function score(s,team,points,reason){s.score[team]+=points;s.log.push(`Referee: ${reason}. ${team.toUpperCase()} +${points}. Score ${s.score.home}–${s.score.away}.`);}
function settleLoose(state,s,r,wasTry,expired,twoMinute){
 const l=r.loose,off=state.possession,def=other(off),yardsFromOwn=off==='home'?state.ball:100-state.ball,localGoal=-yardsFromOwn,farGoal=100-yardsFromOwn;
 const at=y=>state.ball+dir(off)*y,afterTwo=(state.quarter===2||state.quarter===4)&&state.clock<=120;
 const sideTeam=side=>side==='d'?def:off,point=Number.isFinite(r.deadBallY)?r.deadBallY:(l.outY??l.recoveryY??l.originY);
 const restricted=l.dead==='recovered'&&l.recoverySide===l.sourceSide&&l.recoveryId!==l.sourceId&&
  (afterTwo||wasTry||(state.down===4&&l.sourceSide==='o'));
 const y=restricted?(l.sourceSide==='o'?Math.min(l.originY,l.recoveryY):Math.max(l.originY,l.recoveryY)):point;
 const owner=y<=localGoal?off:y>=farGoal?def:l.dead==='out'&&l.originY<=localGoal?off:l.dead==='out'&&l.originY>=farGoal?def:null;
 let call='',endedTeam=null,runoff=0;
 if(wasTry){
  const good=l.dead==='recovered'&&l.recoverySide==='o'&&y>=farGoal;
  if(good)score(s,off,2,'Two-point conversion after loose-ball recovery');
  call=good?'Two-point conversion good after recovery':'Try ends after loose ball — no points';
  s.phase='kickoff';s.kicking=off;s.clockRunning=false;
 }else if(owner){
  const source=sideTeam(l.sourceSide),receiver=l.dead==='recovered'?sideTeam(l.recoverySide):null;
  if(receiver&&receiver!==owner){
   score(s,receiver,6,'Loose-ball recovery touchdown');s.possession=receiver;s.phase='try';s.ball=receiver==='home'?98:2;s.clockRunning=false;
   call=`${l.kind==='backwardPass'?'Backward pass':'Fumble'} recovered for ${receiver.toUpperCase()} touchdown`;
  }else if(source===owner){
   score(s,other(owner),2,'Loose ball dead in own end zone');s.phase='safetyKick';s.kicking=owner;s.clockRunning=false;
   call=`Safety — ${other(owner).toUpperCase()} scores 2 after ${l.kind==='backwardPass'?'backward pass':'fumble'}`;endedTeam=owner;
  }else{
   newSeries(s,owner,owner==='home'?20:80);
   call=`${l.kind==='backwardPass'?'Backward pass':'Fumble'} touchback — ${owner.toUpperCase()} 20`;endedTeam=other(owner);
  }
 }else{
  let winner=l.dead==='recovered'?sideTeam(l.recoverySide):sideTeam(l.sourceSide);
  let spot=y;
  if(l.dead!=='recovered'&&l.kind==='fumble'){
   const forward=l.sourceSide==='o'?l.outY>l.originY:l.outY<l.originY;
   if(forward)spot=l.originY;
  }
  let global=clamp(at(spot),1,99);
  const latePass=l.kind==='backwardPass'&&l.dead!=='recovered'&&afterTwo&&l.sourceSide==='o';
  if(latePass){global=clamp(global-dir(off)*5,1,99);if(state.clockRunning){runoff=10;s.clock=Math.max(0,s.clock-runoff);}}
  if(winner!==off||l.sourceSide==='d'){
   newSeries(s,winner,global);endedTeam=other(winner);
   call=`${l.kind==='backwardPass'?'Backward pass':'Fumble'} — ${winner.toUpperCase()} ball at ${spotText(s)}`;
  }else{
   s.ball=global;
   const target=state.ball+dir(off)*state.toGain;
   s.toGain=(target-global)*dir(off);
   if(s.toGain<=0&&!latePass){s.down=1;s.toGain=Math.min(10,Math.max(1,off==='home'?100-s.ball:s.ball));call=`First down after ${l.kind==='backwardPass'?'backward pass':'fumble'} at ${spotText(s)}`;}
   else if(s.down===4){newSeries(s,def,global);endedTeam=off;call=`Turnover on downs after ${l.kind==='backwardPass'?'backward pass':'fumble'} — ${def.toUpperCase()} ball at ${spotText(s)}`;}
   else{s.down++;s.toGain=Math.max(1,s.toGain);call=`${l.kind==='backwardPass'?'Backward pass':'Fumble'} ${restricted?'teammate recovery stopped at earlier spot':l.dead==='recovered'?'recovered':'out of bounds'}${latePass?' — loss of down and 5 yards'+(runoff?', 10-second runoff':''):''}; ${s.down} & ${Math.ceil(s.toGain)} at ${spotText(s)}`;}
   s.clockRunning=l.dead==='recovered'&&!restricted;
  }
  if(l.dead!=='recovered')s.clockRunning=false;
 }
 s.log.push('Referee: '+call+'.');
 if(twoMinute&&!expired){s.clockRunning=false;s.log.push('Referee: two-minute warning.');}
 if(expired||s.clock===0){if(s.phase==='try')s.pendingPeriodEnd=true;else periodEnd(s);}
 otCheck(s,endedTeam);
 return {state:s,call,accepted:true,loose:l};
}
function finishScrimmage(state,sim,huddle=25,plays=null,options={}){const s=copy(state);if(s.phase!=='scrimmage'&&s.phase!=='try')return {state:s,call:'No scrimmage snap available',accepted:false};const prep=preSnap(s,huddle);if(!prep.ok)return {state:s,call:prep.call,accepted:false};if(!sim?.valid)return {state:s,call:'Illegal formation — snap disallowed',accepted:false};const early=plays&&s.phase==='scrimmage'?snapOffside(plays.defense,sim.result.seed):null;if(early){const ruled=flag(s,'defense',`Offside — ${early.player} anticipated the snap (${early.step} yd)`,5);return {state:ruled.state,call:ruled.call,accepted:false,foul:early};}if(plays&&!options.noFouls&&s.phase==='scrimmage'){
  const fouls=liveFouls(plays.offense,plays.defense,sim);
  const raw=Number(sim.result.deadBallY),near=!sim.result.loose&&sim.result.possession!=='defense'&&Number.isFinite(raw)&&
   !/Incomplete|Touchdown|Safety|Interception|Out of bounds|out of bounds/.test(sim.result.verdict||'')&&Math.abs(raw-state.toGain)<.8;
  const calledSpot=near?Math.round(raw*2)/2:raw;
  const marked=near?{...sim,result:{...sim.result,yards:calledSpot,deadBallY:calledSpot}}:sim;
  let base=finishScrimmage(state,marked,huddle,plays,{noFouls:true});
  if(near){
   const inches=Math.round(Math.abs(state.toGain-calledSpot)*36),short=calledSpot<state.toGain;
   const measure=`Chain crew: ${inches} inches ${short?'short of':'beyond'} the line to gain; on-field spot +${calledSpot.toFixed(2)} yd`;
   base.state.log.push(measure);
   base.call+=' · '+measure;
   if(Math.abs(raw-calledSpot)>.001){
    const exact=finishScrimmage(state,sim,huddle,plays,{noFouls:true});
    const booth=state.quarter===5||[2,4].includes(state.quarter)&&state.clock<=120||state.down===4&&base.state.possession!==state.possession;
    base.review={exactState:exact.state,exactSpot:raw,calledSpot,booth,done:false};
    if(booth){const decision=reviewSpot(base,state.possession);if(decision.ok){base.state=decision.state;base.call=decision.call;}}
   }
  }
  return resolveLiveFouls(state,base,fouls);
 }
 const wasTry=s.phase==='try',team=s.possession,op=other(team),r=sim.result;s.clock=Math.max(0,s.clock-Math.ceil(r.seconds));const expired=s.clock===0,twoMinute=(s.quarter===2||s.quarter===4)&&state.clock>120&&s.clock<=120;s.plays++;const v=r.verdict||'',advance=dir(team)*(Number(r.yards)||0);let call='',endedTeam=null;
 if(r.loose)return settleLoose(state,s,r,wasTry,expired,twoMinute);
 if(wasTry){if(v.startsWith('Touchdown')){score(s,team,2,'Two-point conversion');call='Two-point conversion good';}else call='Two-point conversion failed';s.phase='kickoff';s.kicking=team;s.clockRunning=false;s.log.push('Referee: try complete; kickoff follows.');if(expired||s.pendingPeriodEnd){s.pendingPeriodEnd=false;periodEnd(s);}otCheck(s,team);return {state:s,call,accepted:true};}
 if(v.startsWith('Safety')){score(s,op,2,'Safety');s.phase='safetyKick';s.kicking=team;s.clockRunning=false;call='Safety — '+op.toUpperCase()+' scores 2';endedTeam=team;}
 else if(v==='Interception return touchdown'){score(s,op,6,'Interception return touchdown');s.possession=op;s.phase='try';s.ball=op==='home'?98:2;s.clockRunning=false;call='Defensive touchdown';}
 else if(r.possession==='defense'){
  const finalLocal=Number.isFinite(r.deadBallY)?r.deadBallY:Number(sim.frames?.at(-1)?.ball?.y),pick=Number(r.interceptionY),defGoal=100-(team==='home'?state.ball:100-state.ball);
  if(finalLocal>=defGoal&&pick>=defGoal){newSeries(s,op,op==='home'?20:80);call=`Interception in end zone — ${op.toUpperCase()} touchback at the 20`;}
  else if(finalLocal>=defGoal&&pick>=defGoal-5){newSeries(s,op,state.ball+dir(team)*pick);call=`Interception momentum exception — ${op.toUpperCase()} ball at ${spotText(s)}`;}
  else if(finalLocal>=defGoal){score(s,team,2,'Interceptor carried ball into own end zone');s.phase='safetyKick';s.kicking=op;s.clockRunning=false;call=`Safety — ${team.toUpperCase()} scores 2`;}
  else{const at=Number.isFinite(finalLocal)?state.ball+dir(team)*finalLocal:state.ball+advance-dir(team)*(r.returnYards||0);newSeries(s,op,at);call=`Interception — ${op.toUpperCase()} ball at ${spotText(s)}`;}
  endedTeam=team;
 }
 else if(v.startsWith('Touchdown')||state.ball+advance>=100&&team==='home'||state.ball+advance<=0&&team==='away'){score(s,team,6,'Touchdown');s.phase='try';s.ball=team==='home'?98:2;s.clockRunning=false;call='Touchdown — choose extra point or two';}
 else {s.ball=clamp(state.ball+advance,1,99);s.toGain-=Number(r.yards)||0;if(s.toGain<=0){s.down=1;s.toGain=Math.min(10,Math.max(1,team==='home'?100-s.ball:s.ball));call=`First down at ${spotText(s)}`;}else if(s.down===4){newSeries(s,op,s.ball);endedTeam=team;call=`Turnover on downs — ${op.toUpperCase()} ball at ${spotText(s)}`;}else{s.down++;call=`${s.down} & ${Math.ceil(s.toGain)} at ${spotText(s)}`;}s.clockRunning=!/Incomplete|broken up|Out of bounds|out of bounds/.test(v);}
 s.log.push('Referee: '+call+'.');if(twoMinute&&!expired){s.clockRunning=false;s.log.push('Referee: two-minute warning.');}if(expired){if(s.phase==='try')s.pendingPeriodEnd=true;else periodEnd(s);}otCheck(s,endedTeam);return {state:s,call,accepted:true};}
function kick(state,kind,seed=71,choice='auto'){
 const s=copy(state),free=['kickoff','safetyKick','onside'].includes(kind),team=free?s.kicking:s.possession,receive=other(team);
 if(kind==='kickoff'&&s.phase!=='kickoff'||kind==='onside'&&s.phase!=='kickoff'||kind==='safetyKick'&&s.phase!=='safetyKick'||kind==='punt'&&s.phase!=='scrimmage'||kind==='fieldGoal'&&s.phase!=='scrimmage'||kind==='extraPoint'&&s.phase!=='try')
  return {state:s,call:'Kick unavailable in this situation',accepted:false};
 const rand=random(seed),squad=s.specialists[team],recv=s.specialists[receive],from=s.ball;
 const punt=kind==='punt',goalKick=kind==='fieldGoal'||kind==='extraPoint',onside=kind==='onside',safety=kind==='safetyKick';
 const baseKickLine=team==='home'?(safety?20:35):(safety?80:65);
 const kickStart=free?baseKickLine-dir(team)*(s.freeKickBack||0):from;
 const kick={kind,team,receive,from,kickStart,kickYards:0,landing:null,returnYards:0,touchback:false,made:false,move:'',contacts:0,coveragePlayers:11,returnBlockers:10,frames:[],events:[],alignment:null,decision:'',recovery:null,blocked:false};
 let elapsed=0,ball={yard:kickStart,lane:0,phase:'ready'},players=[];
 const own=t=>t==='home'?0:100,goal=t=>t==='home'?100:0,along=(t,n)=>own(t)+dir(t)*n;
 const snap=()=>kick.frames.push({t:+elapsed.toFixed(2),ball:{yard:+ball.yard.toFixed(2),lane:+ball.lane.toFixed(2),phase:ball.phase},players:players.map(p=>({id:p.id,team:p.team,role:p.role,yard:+p.yard.toFixed(2),lane:+p.lane.toFixed(2)}))});
 const event=text=>kick.events.push({t:+elapsed.toFixed(2),text});
 const shift=(p,targetY,targetX,seconds,speed)=>{const dy=targetY-p.yard,dx=targetX-p.lane,d=Math.hypot(dy,dx)||1,step=Math.min(d,seconds*speed);p.yard+=dy/d*step;p.lane=clamp(p.lane+dx/d*step,-26.4,26.4);};
 const near=(p,list)=>list.reduce((best,q)=>{const d=Math.hypot(p.yard-q.yard,p.lane-q.lane);return d<best.d?{p:q,d}:best},{p:null,d:Infinity});
 const kickoff=kind==='kickoff'||safety;
 if(kickoff){
  const coverLine=along(receive,40+(s.freeKickBack||0)),receiveLine=along(receive,35);
  const lanes=[-23,-20,-14,-10,-5,5,10,14,20,23];
  players=lanes.map((lane,i)=>({id:'K'+i,team,role:'coverage',yard:coverLine,lane,speed:5.0+squad.coverage*.026+rand()*.7,power:squad.coverage}));
  players.push({id:'KICKER',team,role:'kicker',yard:kickStart,lane:0,speed:4.6+squad.coverage*.02,power:squad.coverage});
  const setup=[[-23,35],[-12,35],[0,35],[12,35],[23,35],[-19,32],[-8,32],[8,32],[19,32]];
  players.push(...setup.map(([lane,y],i)=>({id:'B'+i,team:receive,role:'blocker',yard:along(receive,y),lane,speed:4.3+recv.returnBlocking*.027+rand()*.7,power:recv.returnBlocking})));
  players.push({id:'B9',team:receive,role:'blocker',yard:along(receive,18),lane:-8,speed:4.5+recv.returnBlocking*.024,power:recv.returnBlocking});
  players.push({id:'KR',team:receive,role:'returner',yard:along(receive,10),lane:0,speed:5+recv.returner.speed*.039,power:recv.returner.agility});
  kick.alignment={kickingLine:coverLine,receivingLine:receiveLine,setup:9,onLine:5,deep:2,lockedUntilLanding:true,legal:true};
 }else if(onside){
  const lanes=[-23,-20,-14,-10,-5,5,10,14,20,23];
  players=lanes.map((lane,i)=>({id:'K'+i,team,role:'coverage',yard:kickStart,lane,speed:5+squad.coverage*.027+rand()*.7,power:squad.coverage}));
  players.push({id:'KICKER',team,role:'kicker',yard:kickStart,lane:0,speed:4.6+squad.coverage*.02,power:squad.coverage});
  players.push(...lanes.map((lane,i)=>({id:'B'+i,team:receive,role:'blocker',yard:kickStart+dir(team)*(i<9?10:27),lane,speed:4.5+recv.returnBlocking*.027+rand()*.7,power:recv.returnBlocking})));
  players.push({id:'KR',team:receive,role:'returner',yard:kickStart+dir(team)*27,lane:0,speed:5+recv.returner.speed*.039,power:recv.returner.agility});
  kick.alignment={kickingLine:kickStart,receivingLine:kickStart+dir(team)*10,setup:9,onLine:9,deep:2,lockedUntilLanding:false,legal:true};
 }else{
  const coverageLanes=[-22,-18,-13,-9,-5,0,5,9,13,18,22];
  players=coverageLanes.map((lane,i)=>({id:'K'+i,team,role:i===5?(punt?'punter':'kicker'):'coverage',yard:from-dir(team)*(i===5?(punt?12:7):i%3===0?2:0),lane,speed:4.7+squad.coverage*.03+rand()*.8,power:squad.coverage}));
  const receiveLanes=[-22,-18,-13,-9,-5,5,9,13,18,22];
  players.push(...receiveLanes.map((lane,i)=>({id:'B'+i,team:receive,role:'blocker',yard:from+dir(team)*(i<5?3:12),lane,speed:4.5+recv.returnBlocking*.029+rand()*.8,power:recv.returnBlocking})));
  players.push({id:'KR',team:receive,role:'returner',yard:from+dir(team)*(punt?43:12),lane:0,speed:5+recv.returner.speed*.039,power:recv.returner.agility});
 }
 snap();
 let call='',endedTeam=null,runSeconds=0;
 if(kickoff){
  const depth=p=>(p.yard-own(receive))*dir(receive),kicking=players.filter(p=>p.team===team),receiving=players.filter(p=>p.team===receive);
  const coverage=kicking.filter(p=>p.role==='coverage'),setup=receiving.filter(p=>depth(p)>=30&&depth(p)<=35),onLine=setup.filter(p=>Math.abs(depth(p)-35)<.01);
  const legal=coverage.length===10&&coverage.every(p=>Math.abs(p.yard-kick.alignment.kickingLine)<.01)&&setup.length>=9&&onLine.length>=5&&setup.length-onLine.length<=4&&receiving.length===11;
  kick.alignment={...kick.alignment,setup:setup.length,onLine:onLine.length,deep:receiving.length-setup.length,legal};
  if(!legal){return {state:s,call:'Kickoff alignment invalid — correct formation before kick',accepted:false,kick};}
  const movementRisk=clamp((90-squad.coverage)*.0005,0,.018);
  if(rand()<movementRisk){
   elapsed=.2;coverage[0].yard+=dir(team)*.8;ball.phase='ready';snap();event('K0 moves early before landing');
   s.freeKickBack=(s.freeKickBack||0)+5;s.ball=baseKickLine-dir(team)*s.freeKickBack;
   call='Illegal kickoff formation — K0 moved early; five yards, rekick';s.log.push('Referee: flag — '+call+'.');
   kick.alignment.legal=false;kick.events.push({t:elapsed,text:'Referee: '+call});
   return {state:s,call,accepted:true,kick};
  }
 }
 function receiveAt(y,reason){newSeries(s,receive,clamp(y,1,99));call=reason+' — '+receive.toUpperCase()+' ball at '+spotText(s);endedTeam=team;}
 function touchdown(t,reason){const points=kind==='extraPoint'?2:6;score(s,t,points,reason);s.possession=t;s.phase=kind==='extraPoint'?'kickoff':'try';s.kicking=kind==='extraPoint'?team:s.kicking;s.ball=kind==='extraPoint'?(team==='home'?35:65):(t==='home'?98:2);s.clockRunning=false;call=reason+' — '+t.toUpperCase()+(points===2?' two-point try return':' touchdown');endedTeam=other(t);}
 function returnBall(carrier,ownerTeam,start){
  const direction=dir(ownerTeam),end=goal(ownerTeam),enemies=()=>players.filter(p=>p.team!==ownerTeam),helpers=()=>players.filter(p=>p.team===ownerTeam&&p!==carrier),carrierRatings=ownerTeam===receive?recv.returner:{agility:squad.coverage,vision:squad.coverage};
  let contactCooldown=0,lastMove=-2;const returnStartTime=elapsed;ball={yard:start,lane:carrier.lane,phase:'return'};carrier.yard=start;event(ownerTeam.toUpperCase()+' return begins');
  for(let step=0;step<170;step++){
   elapsed+=.1;contactCooldown=Math.max(0,contactCooldown-.1);
   const defenders=enemies(),blockers=helpers();
   for(const p of blockers){const threat=near(p,defenders);if(threat.p)shift(p,threat.p.yard-dir(ownerTeam)*.5,threat.p.lane,.1,p.speed*.8);}
   for(const p of defenders){const shield=near(p,blockers),blocked=shield.d<1.5&&rand()<clamp(.28+(shield.p.power-p.power)*.005,.12,.55);
    shift(p,carrier.yard+direction*clamp(Math.abs(carrier.yard-p.yard)*.13,0,2),carrier.lane,.1,p.speed*(blocked?.37:1));}
   const ahead=defenders.filter(p=>(p.yard-carrier.yard)*direction>-2&&(p.yard-carrier.yard)*direction<12);
   const lanes=[-20,-10,0,10,20].map(x=>({x,space:ahead.reduce((n,p)=>Math.min(n,Math.hypot((p.yard-carrier.yard)*.55,p.lane-x)),20)}));
   lanes.sort((a,b)=>b.space-a.space-Math.abs(a.x-carrier.lane)*.018+Math.abs(b.x-carrier.lane)*.018);
   const target=lanes[0].x;
   shift(carrier,carrier.yard+direction*11,target,.1,carrier.speed);
   ball.yard=carrier.yard;ball.lane=carrier.lane;
   const tackler=near(carrier,defenders);
   if(tackler.d<1.12&&contactCooldown===0){kick.contacts++;contactCooldown=.48;
    const evade=clamp(.22+(carrierRatings.agility-tackler.p.power)*.003+(carrierRatings.vision-75)*.001,.08,.53);
    if(rand()>evade){event('Tackle by '+tackler.p.id+' at '+Math.round(carrier.yard));kick.move='tackled';snap();break;}
    kick.move=carrierRatings.agility>82?'juke':'cut';carrier.lane=clamp(carrier.lane+(carrier.lane<=tackler.p.lane?-1:1)*1.4,-25,25);
    if(elapsed-lastMove>1){event(carrier.id+' '+kick.move+' escapes '+tackler.p.id);lastMove=elapsed;}
   }
   if(step%2===0)snap();
   if((carrier.yard-end)*direction>=0){carrier.yard=end;ball.yard=end;snap();break;}
   if(Math.abs(carrier.lane)>=26.3){event('Returner steps out of bounds');snap();break;}
  }
  kick.returnYards=Math.max(0,Math.round((carrier.yard-start)*direction));runSeconds=Math.max(runSeconds,Math.ceil(free?elapsed-returnStartTime:elapsed));
  if((carrier.yard-end)*direction>=0){touchdown(ownerTeam,kind==='punt'?'Punt return':kind==='kickoff'||kind==='safetyKick'?'Kick return':'Blocked-kick return');event(call);}
  else if(ownerTeam===receive&&free&&!onside&&(carrier.yard-own(receive))*dir(receive)<=0){kick.touchback=true;const ownSpot=(kick.landing-own(receive))*dir(receive)<=0?35:20;receiveAt(along(receive,ownSpot),'Returner downed in own end zone — touchback');s.clockRunning=false;}
  else{newSeries(s,ownerTeam,clamp(carrier.yard,1,99));call=`${kind==='punt'?'Punt':goalKick?'Blocked kick':'Kickoff'} ${kick.kickYards} yd, ${ownerTeam.toUpperCase()} return ${kick.returnYards} yd (${kick.move||'lane read'}) to ${spotText(s)}`;endedTeam=other(ownerTeam);s.clockRunning=true;}
 }
 function scramble(y,kindOfLoose,canAdvance){
  ball={yard:clamp(y,-10,110),lane:(rand()-.5)*7,phase:'loose'};event(kindOfLoose+' — loose ball');
  let winner=null;
  for(let step=0;step<40&&!winner;step++){
   elapsed+=.1;ball.yard=clamp(ball.yard+(rand()-.5)*.45,-9,109);ball.lane=clamp(ball.lane+(rand()-.5)*.6,-25,25);
   for(const p of players){const awareness=p.team===receive?recv.returner.vision:squad.coverage;shift(p,ball.yard,ball.lane,.1,p.speed*(.7+awareness/330));}
   const candidates=players.map(p=>({p,d:Math.hypot(p.yard-ball.yard,p.lane-ball.lane)})).filter(v=>v.d<1.25).sort((a,b)=>a.d-b.d);
   for(const v of candidates){if(rand()<clamp(.33+(v.p.team===receive?recv.returner.vision:squad.coverage)*.003,.35,.7)){winner=v.p;break;}}
   if(step%2===0)snap();
  }
  if(!winner)winner=near(ball,players).p;
  kick.recovery={team:winner.team,player:winner.id,yard:+ball.yard.toFixed(1),kind:kindOfLoose};event(winner.id+' recovers for '+winner.team.toUpperCase());
  if(winner.team===team&&!canAdvance){newSeries(s,team,clamp(ball.yard,1,99));call=`${kindOfLoose} — ${team.toUpperCase()} recovery at ${spotText(s)}; ball dead`;endedTeam=receive;s.clockRunning=false;return;}
  if(winner.team===receive&&kick.fairSignaled&&kindOfLoose==='Muffed fair catch'){
   receiveAt(ball.yard,'Muffed fair catch recovered by receiving team');s.clockRunning=false;return;
  }
  if(winner.team===team&&canAdvance&&ball.yard===goal(team)){
   touchdown(team,'Blocked-kick recovery');return;
  }
  returnBall(winner,winner.team,ball.yard);
 }
 // Scrimmage-kick rushers and protectors move before the kick. Pressure at
 // the kicker, rather than a standalone dice roll, creates a block chance.
 let rushNear=99,blockerId=null;
 if(goalKick||punt){
  const kicker=players.find(p=>p.role==='kicker'||p.role==='punter');
  const rushers=players.filter(p=>p.team===receive&&Number(p.id.slice(1))<5);
  const protectors=players.filter(p=>p.team===team&&p!==kicker&&Number(p.id.slice(1))<5);
  const rushTime=punt?1.3:.85;
  for(let step=0;step<Math.ceil(rushTime/.1);step++){
   elapsed+=.1;
   for(const p of rushers){const guard=near(p,protectors);shift(p,kicker.yard,kicker.lane,.1,p.speed*(guard.d<1.7?.42:1));}
   for(const p of protectors){const threat=near(p,rushers);if(threat.p)shift(p,threat.p.yard,threat.p.lane,.1,p.speed*.62);}
   if(step%2===0)snap();
  }
  const threat=near(kicker,rushers);rushNear=threat.d;blockerId=threat.p?.id||null;
 }
 // A blocked scrimmage kick remains live behind the line; the recovering side can advance.
 if(goalKick||punt){
  const pressure=clamp(.003+Math.max(0,7-rushNear)*.012+(recv.coverage-squad.coverage)*.0006,.003,.095);
  if(rand()<pressure){
   kick.blocked=true;kick.blocker=blockerId;event((punt?'Punt':kind==='fieldGoal'?'Field goal':'Try kick')+' blocked by '+blockerId+' near the kicker');
   const blockAt=from-dir(team)*(1+rand()*5);ball={yard:blockAt,lane:(rand()-.5)*10,phase:'blocked'};snap();
   scramble(blockAt,'Blocked '+(punt?'punt':'kick'),true);
   if(kind==='extraPoint'){
    if(!call.includes('two-point try return'))call='Extra point blocked — no points';
    s.phase='kickoff';s.kicking=team;s.ball=team==='home'?35:65;s.clockRunning=false;
   }else if(s.phase==='scrimmage'&&s.possession===team){
    const needed=(s.ball-from)*dir(team)>=state.toGain;
    if(!needed){if(state.down===4)receiveAt(s.ball,'Blocked kick recovered behind line; turnover on downs');else{s.down=state.down+1;s.toGain=state.toGain-(s.ball-from)*dir(team);call=`Blocked kick recovered by ${team.toUpperCase()}; ${s.down} & ${Math.ceil(s.toGain)} at ${spotText(s)}`;}}
   }
   runSeconds=Math.max(runSeconds,5);
  }
 }
 if(!kick.blocked&&goalKick){
  const distance=kind==='extraPoint'?33:Math.round((team==='home'?100-from:from)+17);
  kick.kickYards=distance;elapsed+=1.7;ball={yard:goal(team),lane:0,phase:'flight'};snap();
  const chance=kind==='extraPoint'?clamp(.52+squad.kicker.accuracy*.005,0,.99):clamp(.44+squad.kicker.accuracy*.005-Math.max(0,distance-38)*.019-Math.max(0,distance-(25+squad.kicker.power*.4))*.012,.05,.98);
  kick.made=rand()<chance;
  if(kind==='extraPoint'){if(kick.made)score(s,team,1,'Extra point');call=kick.made?'Extra point good':'Extra point no good';s.phase='kickoff';s.kicking=team;s.ball=team==='home'?35:65;s.clockRunning=false;}
  else if(kick.made){score(s,team,3,`${distance}-yard field goal`);call=`Field goal good from ${distance}`;s.phase='kickoff';s.kicking=team;s.ball=team==='home'?35:65;s.clockRunning=false;}
  else{const kickSpot=from-dir(team)*7,own20=receive==='home'?20:80;receiveAt(receive==='home'?Math.max(20,kickSpot):Math.min(80,kickSpot),`${distance}-yard field goal missed`);}
  runSeconds=5;
 }
 if(!goalKick&&!kick.blocked){
  kick.kickYards=onside?10+Math.floor(rand()*5):Math.round((punt?29+squad.punter.power*.19:safety?52+squad.kicker.power*.14:47+squad.kicker.power*.15)+(rand()-.5)*(punt?14:16));
  kick.landing=kickStart+dir(team)*kick.kickYards;const landing=kick.landing,receivingDepth=(landing-own(receive))*dir(receive),inEnd=receivingDepth<=0;
  const flight=punt?3.1:onside?1.1:2.2,flightStart=elapsed;
  for(let i=1;i<=Math.ceil(flight/.2);i++){
   elapsed=flightStart+Math.min(flight,i*.2);const progress=(elapsed-flightStart)/flight;ball={yard:kickStart+(landing-kickStart)*progress,lane:0,phase:'flight'};
   if(kickoff){for(const p of players){if(p.role==='returner'||p.id==='B9')shift(p,landing,p.lane,.2,p.speed*.65);}}
   else{for(const p of players){if(p.role==='coverage')shift(p,landing,p.lane,.2,p.speed*.85);if(p.role==='returner')shift(p,landing,p.lane,.2,p.speed*.65);}}
   snap();
  }
  ball={yard:landing,lane:0,phase:'landing'};event(`${onside?'Onside kick':punt?'Punt':'Kickoff'} lands at ${Math.round(landing)}`);snap();
  if(onside){
   scramble(landing,'Onside kick',false);
   if(kick.recovery?.team===team){call=`Declared onside kick ${kick.kickYards} yd — ${team.toUpperCase()} recovers at ${spotText(s)}`;s.clockRunning=false;}
   runSeconds=Math.max(3,Math.ceil(elapsed));
  }else if(!punt&&receivingDepth>20){
   const standard=kickStart+dir(team)*(safety?30:25),award=receive==='home'?Math.max(landing,standard):Math.min(landing,standard);
   receiveAt(award,'Kickoff short of landing zone — receiving team elects favorable spot');kick.decision='short kick';s.clockRunning=false;runSeconds=0;
  }else if(inEnd&&punt){kick.touchback=true;receiveAt(along(receive,20),'Punt touchback');s.clockRunning=false;runSeconds=Math.ceil(elapsed);}
  else if(inEnd&&receivingDepth<-10){kick.touchback=true;receiveAt(along(receive,kickStart===50?20:35),'Kickoff through end zone — touchback');s.clockRunning=false;runSeconds=0;}
  else{
   const returner=players.find(p=>p.id==='KR'),fair=choice==='fairCatch'||choice==='auto'&&punt&&recv.returner.vision>=78&&rand()<.16;
   kick.fairSignaled=fair;
   const touchback=inEnd&&!punt&&rand()<.48;
   if(touchback){kick.touchback=true;receiveAt(along(receive,kickStart===50?20:35),'Kickoff downed in end zone — touchback');s.clockRunning=false;runSeconds=0;}
   else{
    const farFromCatch=Math.hypot(returner.yard-landing,returner.lane)>2.2;
    const muff=farFromCatch||rand()<clamp(.025+(90-recv.returner.vision)*.001+(fair?.012:.02),.012,.095);
    if(fair)event('KR signals fair catch before ball arrives');
    if(muff){event(farFromCatch?'Kick falls beyond returner':'KR muffs the kick');scramble(landing,fair?'Muffed fair catch':'Muffed kick',false);runSeconds=Math.max(6,Math.ceil(elapsed));}
    else if(fair){kick.decision='fair catch';ball={yard:landing,lane:0,phase:'fairCatch'};snap();receiveAt(inEnd?along(receive,20):landing,'Fair catch');s.clockRunning=false;runSeconds=punt?Math.ceil(elapsed):0;}
    else{event('KR fields the kick');returnBall(returner,receive,landing);}
   }
  }
 }
 kick.decision=kick.decision||choice;kick.move=kick.move||kick.decision;
 if(runSeconds&&kind!=='extraPoint')s.clock=Math.max(0,s.clock-runSeconds);
 if(free)s.freeKickBack=0;
 s.plays++;s.log.push('Referee: '+call+'.');
 if(s.clock===0&&kind!=='extraPoint'){if(s.phase==='try')s.pendingPeriodEnd=true;else periodEnd(s);}
 if(kind==='extraPoint'&&s.pendingPeriodEnd){s.pendingPeriodEnd=false;periodEnd(s);}
 otCheck(s,endedTeam||(['punt','fieldGoal','extraPoint'].includes(kind)?team:null));
 kick.events.push({t:+elapsed.toFixed(2),text:'Referee: '+call});
 return {state:s,call,accepted:true,kick};
}
function autoPick(state,offenses,defenses){const s=state,d=s.toGain,own=s.possession==='home'?s.ball:100-s.ball,sequence=s.plays+(s.rosterSeed||0),short=d<=3,long=d>=8,red=own>=80;let wants=s.phase==='try'?['Inside Zone']:short?['Inside Zone','Power Right','RPO Glance']:long?['Slant / Flat','Shotgun Mesh','Trips Flood','Four Verticals']:red?['Power Right','Inside Zone','Slant / Flat']:['Outside Zone Left','Inside Zone','Play Action Cross','HB Screen'];if(s.down>=3&&long)wants=['Shotgun Mesh','Trips Flood','Slant / Flat','Four Verticals'];const want=s.down<=2&&!red&&sequence%17===0?'Pitch Back':wants[sequence%wants.length],defWants=long?['Nickel Cover 3','4–3 Cover 2','Quarters Match']:short?['4–3 Cover 2','3–4 Cover 3','Goal Line 6–2']:['4–3 Cover 2','Cover 1 Man','Nickel Cover 3'];const off=offenses.find(p=>p.name===want)||offenses[0],def=defenses.find(p=>p.name===defWants[(sequence+Math.round(d))%defWants.length])||defenses[0];return {offense:off?.id,defense:def?.id};}
const api={createGame,createExhibition,roster,setStarter,dressPlay,syncSpecialists,flipCoin,jumpTo,huddleSeconds,passInterference,liveFouls,reviewSpot,spotText,timeout,flag,setSpot,preSnap,finishScrimmage,kick,autoPick};root.RouteGame=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
