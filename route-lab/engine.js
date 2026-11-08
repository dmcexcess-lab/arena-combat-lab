/* Route Lab — deterministic 11-on-11 tactical simulation core. World units: yards.
   Standalone/no dependencies. Accuracy is an evolving model, not a certified football engine. */
(function(root){
'use strict';
const clone = v => JSON.parse(JSON.stringify(v));
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const point = (x,y) => ({x,y});
const linemen = new Set(['LT','LG','C','RG','RT','G','T']);
const defFront = new Set(['DE','DT','NT','EDGE','OLB','ILB','MLB','LB']);
function eligibleNumber(n) { n=Number(n); return Number.isInteger(n) && n>=0 && n<=99 && (n<=49 || (n>=80 && n<=89)); }
function validate(off,def){
  const errors=[],warnings=[];
  function err(msg){errors.push(msg)} function warn(msg){warnings.push(msg)}
  if(!off || !def) return {valid:false,errors:['Missing offensive or defensive play.'],warnings};
  if(!off.training && off.players.length!==11) err('Offense must have exactly 11 players (has '+off.players.length+').');
  if(off.training && (off.players.length<2||off.players.length>11)) err('Training offense must have 2–11 players.');
  if(!off.training && def.players.length!==11) err('Defense must have exactly 11 players (has '+def.players.length+').');
  if(off.training && (def.players.length<1||def.players.length>11)) err('Training defense must have 1–11 players.');
  for(const [side,p] of [['offense',off],['defense',def]]) {
    const ids=new Set();
    p.players.forEach(a=>{
      if(ids.has(a.id)) err('Duplicate '+side+' player ID '+a.id+'.'); ids.add(a.id);
      if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||Math.abs(a.x)>26.66) err(a.label+' is out of bounds.');
      if(side==='offense' && a.y>0.24) err(a.label+' is beyond the offensive side of the neutral zone.');
      if(side==='defense' && a.y<0.95) err(a.label+' is in the neutral zone / offside.');
      if(a.route && a.route.some(pt=>Math.abs(pt.x)>26.66)) err(a.label+' has a route leaving the field.');
    });
    for(let i=0;i<p.players.length;i++) for(let j=i+1;j<p.players.length;j++) {
      if(dist(p.players[i],p.players[j])<0.78) err('Overlapping '+side+' players: '+p.players[i].label+' and '+p.players[j].label+'.');
    }
  }
  const line=off.players.filter(p=>p.onLine).sort((a,b)=>a.x-b.x);
  if(!off.training && line.length<7) err('Illegal formation: at least seven offensive players must be on the line.');
  if(!off.training && line.length>10) err('Illegal formation: the snap receiver must be off the line.');
  line.forEach(p=> {if(Math.abs(p.y)>0.36) err(p.label+' marked on LOS but not positioned on it.');});
  off.players.filter(p=>!p.onLine).forEach(p=>{
    if(p.y>-.65) err(p.label+' is neither clearly on nor clearly behind the line.');
    if(!off.training&&!eligibleNumber(p.number)&&!p.reportedEligible)
      err(p.label+' in the backfield has an ineligible number and must report eligible.');
  });
  if(line.length>=2 && !off.training){
    const ends=[line[0],line[line.length-1]];
    ends.forEach(p=>{if(!eligibleNumber(p.number)&&!p.reportedEligible)err(p.label+' at end of line must have eligible number or report eligible.');});
    line.slice(1,-1).forEach(p=>{if(eligibleNumber(p.number)&&!p.reportedIneligible)err(p.label+' is an eligible-numbered interior lineman; must report ineligible.');});
    if(!off.training && (off.type==='pass'||off.type==='screen'||off.type==='playaction')) {
      const eligible=new Set([...ends.map(p=>p.id),...off.players.filter(p=>!p.onLine&&(eligibleNumber(p.number)||p.reportedEligible)).map(p=>p.id)]);
      off.players.filter(p=>p.job==='route'&&!eligible.has(p.id)).forEach(p=>err(p.label+' cannot run a receiving route (ineligible receiver).'));
    }
  }
  const centers=off.players.filter(p=>p.label==='C');
  if(!(off.training&&off.trainingVirtualSnap)&&(centers.length!==1||!centers[0].onLine||Math.abs(centers[0].x)>1.0)) err('One center (C) must be on the line at the snap.');
  const qb=off.players.find(p=>p.id===(off.snapToId||'oQB'))||off.players.find(p=>p.label==='QB');
  if(!qb) err('Offense needs a designated snap receiver.'); else if(qb.onLine||qb.y>=-.65)err('Snap receiver must be in the backfield.');
  const legalTargets=new Set(def.players.map(p=>p.id)), oTargets=new Set(off.players.map(p=>p.id));
  for(const p of off.players){
    if(p.reportedEligible&&p.reportedIneligible)err(p.label+' cannot report both eligible and ineligible.');
    if(p.blockTarget&&!legalTargets.has(p.blockTarget)) err(p.label+' has a missing blocking target.');
    if(p.motion){
      if(p.onLine)err(p.label+' cannot be in motion from the line at the snap.');
      if(p.motion.toY>p.y+0.05)err(p.label+' motion advances toward the line at the snap.');
      if(Math.abs(p.motion.toX)>26.66)err(p.label+' motion ends out of bounds.');
    }
    if((p.job==='passblock'||p.job==='runblock') && p.route && p.route.length) warn(p.label+' has route points but is assigned to block.');
    if(p.job==='route' && (!p.route || !p.route.length)) warn(p.label+' has no route points.');
  }
  if(off.players.filter(p=>p.motion).length>1)err('Only one player may be moving at the snap (multiple shifts not yet modeled).');
  for(const p of def.players){if(p.coverTarget&&!oTargets.has(p.coverTarget))err(p.label+' has a missing man-coverage assignment.');}
  if(['run','option'].includes(off.type) && !oTargets.has(off.runnerId))err('Run needs a designated ball carrier.');
  if(['run','option'].includes(off.type) && off.players.find(p=>p.id===off.runnerId)?.job!=='carry') warn('Ball carrier should use Carry assignment with a run path.');
  if(['pass','screen','playaction'].includes(off.type)) for(const p of off.players){if(linemen.has(p.label)&&p.job==='pull')warn(p.label+' is pulling on a pass; ineligible downfield restrictions may apply.');}
  return {valid:errors.length===0,errors,warnings,lineCount:line.length,eligible:off.training?off.players.filter(p=>p.job==='route').map(p=>p.id):line.length?[
    line[0].id,line[line.length-1].id,...off.players.filter(p=>!p.onLine&&(eligibleNumber(p.number)||p.reportedEligible)).map(p=>p.id)
  ]:[]};
}
function rng(seed){let a=(Number(seed)||1)>>>0; return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function nearest(pos,agents,filter=()=>true){let best=null,d=Infinity;for(const a of agents){if(!filter(a))continue;const v=dist(pos,a);if(v<d){best=a;d=v;}}return {agent:best,d};}
function move(agent,target,dt,speed,accel=15){
  if(!target) return;
  let dx=target.x-agent.x,dy=target.y-agent.y, d=Math.hypot(dx,dy);
  if(d<.16){agent.vx*=.5;agent.vy*=.5;return;}
  const ratings=statsOf(agent);
  const effort=1-(agent.fatigue||0)*.27;
  speed*=effort;
  let vx=dx/d*speed,vy=dy/d*speed;
  const oldSpeed=Math.hypot(agent.vx,agent.vy);
  const turn=oldSpeed>.15?clamp((agent.vx*dx+agent.vy*dy)/(oldSpeed*d),-1,1):1;
  const cut=agent.job==='route'?ratings.routeRunning:ratings.agility;
  const turnControl=clamp(.55+(ratings.agility+cut)/260, .56,1.25);
  const change=Math.min(1,accel*dt*(.48+ratings.acceleration/150)*(turn<.7?turnControl:1)/Math.max(speed,.5));
  agent.vx+=(vx-agent.vx)*change; agent.vy+=(vy-agent.vy)*change;
  let f=Math.min(1,d/Math.max(.01,Math.hypot(agent.vx,agent.vy)*dt));
  agent.x=clamp(agent.x+agent.vx*dt*f,-26.6,26.6); agent.y+=agent.vy*dt*f;
}
// Ratings are educational 1–99 scouting grades; they are not calibrated NFL tracking data.
const RATING_KEYS=['speed','acceleration','agility','stamina','strength','blocking','passRush','coverage','pursuit','tackling','hands','routeRunning','vision','awareness','throwAccuracy','throwPower'];
function defaultStats(player) {
 const p=player.label||'',o=player.id?.startsWith('o');
 const line=['LT','LG','C','RG','RT'].includes(p), pass=p==='QB', skill=['X','Z','SL','WR','TE','RB','HB','FB'].includes(p);
 const secondary=['CB','CB1','CB2','NB','FS','SS','S'].includes(p);
 const linebacker=['LB','MLB','OLB','ILB','W','M'].includes(p);
 const base={speed:line?56:pass?68:secondary?89:linebacker?77:skill?85:72,
 acceleration:line?62:pass?69:secondary?86:skill?84:76,agility:line?52:pass?72:secondary?86:skill?84:67,
 stamina:line?78:pass?80:secondary?82:skill?81:78,
 strength:line?90:linebacker?80:p==='TE'?72:['RB','HB','FB'].includes(p)?67:secondary||skill?58:pass?53:73,blocking:line?88:p==='TE'?72:skill?42:45,
 passRush:!o&&['DE','DT','NT','EDGE'].includes(p)?83:!o&&linebacker?68:42,coverage:secondary?88:linebacker?73:42,
 pursuit:secondary?85:linebacker?86:!o&&defFront.has(p)?78:55,
 tackling:secondary?77:linebacker?85:pass?36:70,
 hands:skill?86:secondary?72:pass?66:53,routeRunning:skill?82:48,vision:p==='RB'||p==='HB'?84:pass?74:67,
 awareness:pass?87:secondary?77:line?75:76,
 throwAccuracy:pass?85:38,throwPower:pass?87:38};
 if(o&&p==='RB'){base.speed=85;base.agility=86;}
 return base;
}
function statsOf(p){const defaults=defaultStats(p);const given=p.stats||{};return Object.fromEntries(RATING_KEYS.map(k=>[k,clamp(Number.isFinite(+given[k])?+given[k]:defaults[k],1,99)]));}
function speedOf(p){let ratings=statsOf(p);let mult=clamp(p.speed??1,.5,1.5)*(.72+ratings.speed/330);if(['X','Z','WR','SL','RB','HB','FB','CB','CB1','CB2','NB','FS','SS','S'].includes(p.label))return 7.8*mult;
  if(['QB'].includes(p.label))return 5.6*mult;
  if(['DE','DT','NT','EDGE'].includes(p.label))return 6.1*mult;
  if(['LB','MLB','OLB','ILB','W','M'].includes(p.label))return 7.0*mult;
  if(linemen.has(p.label))return 5.0*mult;
  if(p.label==='TE')return 6.5*mult;
  return 7.0*mult;}
function pickupCoverage(pos,defenders){return clamp((2.5-nearest(pos,defenders,a=>a.y>=-.5).d)/2.5,0,1);}
function openFieldTarget(runner,defenders,t,forward=1,blockers=[],plannedX=runner.x){
 const skill=statsOf(runner),look=3+skill.vision/20;
 if(t>=(runner.nextLaneAt??0)||runner.laneX===undefined){
  const stride=2.5+skill.vision/24;
  const options=[-1,-.5,0,.5,1].map(step=>{
   const x=clamp(runner.x+step*stride,-24.5,24.5);
   const probe={x,y:runner.y+forward*look};
   const threats=defenders.map(p=>({x:p.x+p.vx*.4,y:p.y+p.vy*.4}));
   const clearance=nearest(probe,threats).d;
   const immediate=nearest({x,y:runner.y+forward*2.5},threats).d;
   const danger=clamp((4-immediate)/4,0,1)*2.8;
   const shield=blockers.some(p=>(p.engaged||p.wasEngaged)&&dist(p,probe)<4.5)?1.25:0;
   const edge=Math.max(0,Math.abs(x)-22);
   return {x,score:Math.min(clearance,9)*.6+shield-danger-
     Math.abs(x-runner.x)*.23-Math.abs(x-plannedX)*.12-edge*1.6};
  });
  options.sort((a,b)=>b.score-a.score||Math.abs(a.x-runner.x)-Math.abs(b.x-runner.x));
  runner.laneX=options[0].x;
  runner.nextLaneAt=t+clamp(.65-skill.vision/220,.2,.65);
 }
 return {x:runner.laneX,y:runner.y+forward*12};
}
function pursuitTarget(defender,runner){
 const rating=statsOf(defender),lead=clamp(rating.pursuit/220,.1,.48);
 const far=clamp((dist(defender,runner)-5)/18,0,1);
 const outside=defender.x<runner.x?-1:1;
 const projectedY=runner.y+runner.vy*lead+far*1.1;
 const keepTop=['FS','SS','S'].includes(defender.label)&&defender.y>runner.y&&Math.abs(defender.x-runner.x)>1.8;
 return {x:clamp(runner.x+runner.vx*lead+outside*far*.55,-26.4,26.4),
   y:keepTop?Math.max(defender.y,projectedY):projectedY};
}
function simulate(off,def,seed=71){
 const v=validate(off,def); if(!v.valid)return {valid:false,validation:v,frames:[],events:[]};
 const rand=rng(seed), looseRand=rng(((Number(seed)||71)^0x8b21d5f3)>>>0), dt=.05, maxT=12;
 const o=clone(off.players).map(p=>({...p,side:'o',homeX:p.x,vx:0,vy:0,fatigue:clamp(Number(p.fatigue)||0,0,.8),tackleCooldown:0,routeIndex:0,engaged:false,speed:(p.speed??1)*(.96+rand()*.08)}));
 const d=clone(def.players).map(p=>({...p,side:'d',homeY:p.y,vx:0,vy:0,fatigue:clamp(Number(p.fatigue)||0,0,.8),tackleCooldown:0,engaged:false,speed:(p.speed??1)*(.94+rand()*.12)}));
 const byId=(id)=>o.find(p=>p.id===id), defenders=(id)=>d.find(p=>p.id===id);
 const qb=byId(off.snapToId||'oQB')||o.find(p=>p.label==='QB'), runner=byId(off.runnerId)||qb;
 let carrier=qb, state='live', ball={x:qb.x,y:qb.y,kind:'held'}, targetPass=null,flight=null, thrown=false, handoff=false, playOver=false, verdict='', yards=0, time=0, sack=false,returnStartY=null,catchTime=-1;
 let loose=null,looseResult=null,looseCount=0,lateralUsed=false,possessionChanged=false,interceptionY=null;
 const frames=[],events=[],decisions=[],specialMoves=[],contacts=[],blockContacts=new Set(); const log=(t,text)=>events.push({t:+t.toFixed(2),text});
 const isRun=['run','option'].includes(off.type),directRun=isRun&&runner===qb,allowLoose=off.enableLooseBall===true&&!off.training&&!off.trainingVirtualSnap;
 const eligible=new Set(off.training?o.filter(p=>p.job==='route').map(p=>p.id):v.eligible);
 const receivers=o.filter(p=>p.job==='route'&&eligible.has(p.id));
 let playDir=off.runGapX??2;
 if(directRun)handoff=true;
 log(0,'Snap — '+off.name+' vs '+def.name);
 if(directRun)log(0,'Direct snap to '+runner.label);
 function copyFrame(t){frames.push({t:+t.toFixed(2),offense:o.map(p=>({id:p.id,x:+p.x.toFixed(3),y:+p.y.toFixed(3),engaged:p.engaged,energy:+(1-p.fatigue).toFixed(3)})),defense:d.map(p=>({id:p.id,x:+p.x.toFixed(3),y:+p.y.toFixed(3),engaged:p.engaged,energy:+(1-p.fatigue).toFixed(3)})),ball:{...ball},carrierId:carrier?.id||null,phase:state,verdict});}
 function finish(msg,t,pos,kill=true){
  if(playOver)return;
  if(state==='return')yards=0;
  else yards=+((pos?.y??carrier?.y??0)).toFixed(1);
  if((msg.startsWith('Sack')||msg.startsWith('Tackle')||msg==='Out of bounds')&&
      pos?.y<=-(off.yardLine??50))msg='Safety — '+msg;
  verdict=msg;log(t,msg);playOver=kill;
 }
 function releaseLoose(kind,t,from,toward,source){
  if(looseCount)return false;
  looseCount++;state='loose';carrier=null;flight=null;thrown=true;
  const dx=clamp((toward?.x??from.x)-from.x,-8,8),dy=clamp((toward?.y??from.y-2)-from.y,-8,3);
  loose={kind,sourceId:source.id,sourceSide:source.side,originY:from.y,lastSide:source.side,
   vx:dx*1.7+(looseRand()-.5)*3,vy:dy*1.7-1-looseRand()*2,at:t};
  ball={x:from.x,y:from.y,kind:'loose'};
  log(t,source.label+(kind==='backwardPass'?' pitches a backward pass':' fumbles')+' — ball is live');
  return true;
 }
 function evade(r,opponents,t){
  if(t<(r.nextMoveAt??0))return;
  const threat=nearest(r,opponents,a=>a.tackleCooldown<=0&&!a.engaged);
  if(!threat.agent||threat.d>1.8||threat.d<.7)return;
  const a=statsOf(r),b=statsOf(threat.agent);
  const kind=a.strength>b.strength+13?'stiff arm':a.agility>=a.vision?'juke':'spin';
  const skill=kind==='stiff arm'?a.strength:kind==='juke'?a.agility:a.vision;
  const chance=clamp(.34+(skill-b.tackling)*.006+(a.awareness-b.awareness)*.0015,.16,.78);
  const success=rand()<chance;
  r.nextMoveAt=t+1.15;
  if(success){
   const side=r.x<=threat.agent.x?-1:1;
   if(kind==='juke'){r.x=clamp(r.x+side*.75,-26.4,26.4);threat.agent.vx*=.35;}
   else if(kind==='spin'){r.x=clamp(r.x+side*.4,-26.4,26.4);r.vy*=.78;}
   else {threat.agent.x=clamp(threat.agent.x-side*.65,-26.4,26.4);threat.agent.vy*=.45;}
   threat.agent.tackleCooldown=.5;
  }else r.vy*=.84;
  const item={t:+t.toFixed(2),playerId:r.id,player:r.label,defenderId:threat.agent.id,
   defender:threat.agent.label,move:kind,outcome:success?'beat defender':'contained'};
  specialMoves.push(item);
  log(t,r.label+' '+kind+(success?' beats ':' contained by ')+threat.agent.label);
 }
 // Animate one legal backfield player moving laterally/backward before snap.
 const moving=o.find(p=>p.motion);
 if(moving){
  const from={x:moving.x,y:moving.y},to={x:moving.motion.toX,y:moving.motion.toY};
  const shiftX=to.x-from.x,shiftY=to.y-from.y;
  for(let i=0;i<=16;i++){const alpha=i/16; moving.x=from.x+shiftX*alpha;moving.y=from.y+shiftY*alpha;
   ball={x:qb.x,y:qb.y,kind:'held'};copyFrame(-.8+alpha*.8);}
  if(moving.route) moving.route=moving.route.map(w=>({x:clamp(w.x+shiftX,-26.5,26.5),y:w.y+shiftY}));
  log(-.8,'Motion: '+moving.label+' shifts before the snap');
 } else copyFrame(0);
 for(let step=1;step<=maxT/dt && !playOver;step++){
  time=step*dt; const t=time;
  for(const p of [...o,...d]){p.wasEngaged=p.engaged;p.engaged=false;p.supportBlock=false;}
  // Route pursuit with waypoints. A hot route is a read priority, not a speed boost.
  for(const p of o){
    if(state==='loose'){move(p,ball,dt,speedOf(p)*(.76+statsOf(p).awareness/420),18);continue;}
    if(state==='return'){
      move(p,pursuitTarget(p,carrier),dt,speedOf(p)*.9,15);
      continue;
    }
    if(p.id===qb.id)continue;
    if(state==='runafter'&&p===carrier)continue;
    if(state==='runafter'&&['route','release'].includes(p.job)&&dist(p,carrier)<8){
      const help=nearest(p,d,a=>dist(a,carrier)<7);
      if(help.agent&&help.d<5){p.supportBlock=true;p.supportTarget=help.agent.id;
        move(p,{x:help.agent.x,y:help.agent.y-.8},dt,speedOf(p)*.75,14);continue;}
    }
    if(p.job==='route'||p.job==='release'||(p.route?.length && !['passblock','runblock','pull','carry','block'].includes(p.job))){
      const pts=p.route||[];
      if(!pts.length)continue;
      const dest=pts[Math.min(p.routeIndex,pts.length-1)];
      if(dist(p,dest)<.65 && p.routeIndex<pts.length-1)p.routeIndex++;
      const target=pts[Math.min(p.routeIndex,pts.length-1)];
      move(p,target,dt,speedOf(p),17);
    }else if(p.job==='pull'){
      const loc=p.route?.[Math.min(p.routeIndex,p.route.length-1)]||{x:playDir,y:2};
      if(dist(p,loc)<.6&&p.routeIndex<(p.route?.length||1)-1)p.routeIndex++;
      move(p,loc,dt,5.1);
    }else if(p.job==='carry'){
      if(p!==runner){move(p,p.route?.[0]||{x:p.x,y:p.y+2},dt,speedOf(p)*.5,12);continue;}
      if(isRun && !handoff){const first=p.route?.[0]||{x:0,y:-4};move(p,{x:first.x,y:Math.min(-4,first.y)},dt,speedOf(p)*.78,18);}
      if(isRun && handoff){let goal= p.route?.[Math.min(p.routeIndex,p.route.length-1)]||{x:playDir,y:35};
        if((dist(p,goal)<.8||p.y>=goal.y-.4)&&p.routeIndex<(p.route?.length||1)-1){
          p.routeIndex++;goal=p.route[p.routeIndex];
        }
        if(p.routeIndex===(p.route?.length||1)-1&&p.y>=goal.y-.7)
          goal={x:goal.x,y:p.y+12};
        if(p.y>-2){
          const lane=openFieldTarget(p,d,t,1,o,goal.x);
          if(Math.abs(lane.x-goal.x)>2.4&&!p.loggedLane){
            log(t,p.label+' reads an open lane');p.loggedLane=true;
          }
          goal={x:goal.x*.55+lane.x*.45,y:goal.y};
        }
        const ahead=nearest(p,d,a=>a.y>p.y-.4&&a.y<p.y+5&&Math.abs(a.x-p.x)<3.5);
        if(ahead.agent){const avoid=clamp((5-ahead.d)/5,0,1)*(statsOf(p).vision/99)*1.8;
          goal={x:clamp(goal.x+(p.x<=ahead.agent.x?-avoid:avoid),-26.5,26.5),y:goal.y};}
        move(p,goal,dt,speedOf(p),18);
      } else if(!handoff){move(p,{x:p.x*.96,y:-4.9},dt,2.5,8);}
    }else if(p.job==='passblock'||p.job==='runblock'||p.job==='block'){
      let target=defenders(p.blockTarget);
      if(!target){
        const zone={x:p.blockGapX??p.x, y:isRun?2.7:1.5};
        target=nearest(zone,d,a=>a.job==='rush'||a.job==='blitz'||a.job==='contain'||(isRun&&a.y<5)).agent;
      }
      if(target){
        const desired={x:target.x,y:target.y-(isRun?.7:1.15)};
        if(!isRun && desired.y>.55) desired.y=.55;
        move(p,desired,dt,speedOf(p)*.55,18);
      }
    }
  }
  // QB drops, holds, or scrambles once pressure arrives.
  if(!isRun&&state!=='loose'){
    const rush=nearest(qb,d,a=>['rush','blitz','contain'].includes(a.job));
    let pressure=rush.d<2.65+statsOf(qb).awareness/55;
    const reactAt=.85+clamp((95-statsOf(qb).awareness)/120,0,.7);
    const mustEscape=pressure&&t>reactAt&&off.allowScramble!==false;
    if(!thrown && t<Math.max(1.0,off.qbDropTime??1.15)&&!mustEscape)move(qb,{x:off.qbDrift??0,y:-(off.qbDepth??6.8)},dt,5.0);
    else if(!thrown){
      if(mustEscape){
        if(qb.escapeX===undefined){
          const lanes=[-4,0,4].map(x=>({x,space:nearest({x:qb.x+x,y:qb.y+1.5},d,a=>['rush','blitz','contain'].includes(a.job)).d}));
          lanes.sort((a,b)=>b.space-a.space);
          qb.escapeX=clamp(qb.x+lanes[0].x,-22,22);
          log(t,'QB senses pressure and '+(lanes[0].x===0?'climbs pocket':lanes[0].x<0?'escapes left':'escapes right'));
        }
        move(qb,{x:qb.escapeX,y:qb.y+2},dt,5.4);
      }else{move(qb,{x:qb.x,y:qb.y},dt,0);}
    }
  }else if(directRun){const path=qb.route||[];let target=path[Math.min(qb.routeIndex,path.length-1)]||{x:playDir,y:20};
    if((dist(qb,target)<.8||qb.y>=target.y-.4)&&qb.routeIndex<path.length-1){qb.routeIndex++;target=path[qb.routeIndex];}
    if(qb.routeIndex===path.length-1&&qb.y>=target.y-.7)target={x:target.x,y:qb.y+12};
    if(qb.y>-2)target={x:openFieldTarget(qb,d,t,1,o,target.x).x*.45+target.x*.55,y:target.y};
    move(qb,target,dt,speedOf(qb),18);
  }else if(!handoff){move(qb,{x:runner.x*.3,y:-4.8},dt,2.4);}
  // Match-zone defenders share route ownership: one defender carries each
  // receiver in overlapping zones, selected by proximity and rated awareness.
  const zonePairs=[];
  for(const zdef of d.filter(p=>p.job==='zone'&&p.zoneTechnique==='match')){
    const z=zdef.zone||{x:zdef.x,y:zdef.y,r:5};
    for(const receiver of receivers){
      const inArea=Math.abs(receiver.x-z.x)<=(z.r||6)&&Math.abs(receiver.y-z.y)<=(z.rY||z.r||6);
      const range=(z.r||7)*1.2,separation=dist(zdef,receiver);
      if(inArea&&separation<range)zonePairs.push({defender:zdef,receiver,score:separation-statsOf(zdef).awareness*.006});
    }
  }
  zonePairs.sort((a,b)=>a.score-b.score||String(a.defender.id).localeCompare(String(b.defender.id))||String(a.receiver.id).localeCompare(String(b.receiver.id)));
  const zoneMatchLeads=new Map(),claimedZoneDefenders=new Set(),claimedRoutes=new Set();
  for(const pair of zonePairs){
    if(claimedZoneDefenders.has(pair.defender.id)||claimedRoutes.has(pair.receiver.id))continue;
    zoneMatchLeads.set(pair.defender.id,pair.receiver);
    claimedZoneDefenders.add(pair.defender.id);claimedRoutes.add(pair.receiver.id);
  }
  // Defensive assignments: rush, man, match-zone, spy, and contain.
  for(const p of d){
    if(state==='loose'){move(p,ball,dt,speedOf(p)*(.79+statsOf(p).pursuit/380),18);continue;}
    if(state==='return'){
      if(p!==carrier){
        const pursuer=nearest(p,o,a=>dist(a,carrier)<9);
        if(pursuer.agent&&dist(p,carrier)<12)
          move(p,{x:pursuer.agent.x,y:pursuer.agent.y+.7},dt,speedOf(p)*.68);
      }
      continue;
    }
    if(state==='runafter'){
      const rating=statsOf(p);
      if(t<catchTime+clamp((82-rating.awareness)/300,0,.18))continue;
      move(p,pursuitTarget(p,carrier),dt,
        speedOf(p)*(1.06+rating.pursuit/330),21);
      continue;
    }
    if(state==='air'&&flight){
      const projected=flight.to,range=dist(p,projected);
      if(range<13&&['man','zone','deep','runfit','spy'].includes(p.job)){
        const rating=statsOf(p),readDelay=clamp(.52-rating.awareness*.0038,.14,.52);
        if(t-flight.t0>=readDelay){
          move(p,{x:projected.x,y:projected.y+clamp((p.y-projected.y)*.15,-.8,.8)},dt,
            speedOf(p)*clamp(.82+rating.awareness/390+rating.coverage/480,.9,1.25),18);continue;
        }
      }
    }
    if(isRun&&handoff&&carrier.y>1){
      const rating=statsOf(p);
      move(p,pursuitTarget(p,carrier),dt,speedOf(p)*(.98+rating.pursuit/390),19);
      continue;
    }
    if(p.job==='rush'||p.job==='blitz'){
      const engageRun=isRun&&t>.22;const attack=engageRun?(handoff?carrier:{x:playDir,y:-.7}):qb;
      move(p,attack,dt,speedOf(p)*(p.job==='blitz'?1.03:.85)*(.82+statsOf(p).passRush/440),15);
    }
    else if(p.job==='contain'){
      const edge={x:p.x<0?-6.8:6.8,y:Math.max(0,qb.y+.2)};
      move(p,(carrier!==qb&&handoff)?carrier:edge,dt,speedOf(p)*.78);
    }else if(p.job==='man'){
      let m=byId(p.coverTarget)||nearest(p,o,a=>a.job==='route').agent;
      if(m){
        const rated=statsOf(p),target=statsOf(m);
        const reacting=carrier===m?1:clamp((rated.awareness+rated.coverage*.7-target.routeRunning*.38)/135,.25,1.05);
        p.readX=(p.readX??m.x)+(m.x-(p.readX??m.x))*Math.min(1,dt*reacting*5);
        p.readY=(p.readY??m.y)+(m.y-(p.readY??m.y))*Math.min(1,dt*reacting*5);
        const lead=carrier===m?rated.pursuit/250:(rated.awareness+rated.coverage)/360;
        const targetY=carrier===m?p.readY+m.vy*lead:
          p.label.startsWith('CB')&&m.onLine?Math.max(p.homeY-1.5,p.readY+m.vy*lead+1):
          p.readY+m.vy*lead-.8;
        const receiverSide=(m.homeX??m.x)<=0?1:-1;
        const leverageX=p.leverage==='inside'?receiverSide*.85:p.leverage==='outside'?-receiverSide*.85:0;
        const trailY=p.leverage==='trail'?-1.35:0;
        const coveragePace=carrier===m?.74+rated.coverage/470:.84+rated.coverage/430;
        move(p,{x:p.readX+m.vx*lead+leverageX,y:targetY+trailY},dt,speedOf(p)*coveragePace);
      }
    }else if(p.job==='zone'){
      const z=p.zone||{x:p.x,y:p.y,r:5};
      const threats=receivers.filter(r=>dist(r,z)<(z.r||7)*1.6);
      const nearestThreat=nearest(z,threats);
      let lead=p.zoneTechnique==='match'?zoneMatchLeads.get(p.id)||null:
        nearestThreat.agent&&nearestThreat.d<(z.r||7)*1.2?nearestThreat.agent:null;
      if(handoff&&t>.75&&dist(p,carrier)<12)lead=carrier;
      const pursuit=lead===carrier?statsOf(p).pursuit/260:0;
      const inAssignedArea=lead&&Math.abs(lead.x-z.x)<=(z.r||6)&&Math.abs(lead.y-z.y)<=(z.rY||z.r||6);
      if(p.zoneTechnique==='match'&&inAssignedArea){
        const rating=statsOf(p),response=clamp((rating.awareness+rating.coverage*.65)/150,.3,1);
        const anticipation=clamp(.4+response*.35,.45,.8);
        move(p,{x:lead.x+lead.vx*anticipation,y:lead.y+lead.vy*anticipation},dt,speedOf(p)*clamp(.92+rating.coverage/380+rating.awareness/500,.98,1.32));
      }else if(p.zoneTechnique==='match'&&!handoff){
        // Match coverage carries routes only while they remain in the assignment;
        // once they leave, recover the landmark instead of chasing them to its edge.
        p.zoneReadX=undefined;p.zoneReadY=undefined;
        move(p,z,dt,speedOf(p)*.92);
      }else{
        // Preserve landmark and threat-closing behavior for spot-drop. Once a
        // runner is established, both responses pursue the live carrier.
        const aim=lead?{x:clamp(lead.x+lead.vx*pursuit,z.x-(z.r||6),z.x+(z.r||6)),y:clamp(lead.y+lead.vy*pursuit+.2,z.y-(z.rY||z.r||6),z.y+(z.rY||z.r||6))}:z;
        move(p,aim,dt,speedOf(p)*.85);
      }
    }else if(p.job==='spy'){const watch=carrier||qb;move(p,{x:watch.x,y:clamp(watch.y+3,2,12)},dt,speedOf(p)*.65);}
    else if(p.job==='runfit'){const lead=statsOf(p).pursuit/260;move(p,handoff?{x:carrier.x+carrier.vx*lead,y:carrier.y+carrier.vy*lead}:{x:p.fitX??playDir,y:1.4},dt,speedOf(p)*.9);}
    else if(p.job==='deep')move(p,{x:p.zone?.x??p.x,y:p.zone?.y??18},dt,speedOf(p)*.7);
  }
  // Blocking contacts: delay / deflect rushers; the pressure model uses assignments and matchups.
  for(const blocker of state==='loose'?[]:o.filter(p=>p.supportBlock||['passblock','runblock','block','pull'].includes(p.job))){
    let enemy=defenders(blocker.supportBlock?blocker.supportTarget:blocker.blockTarget);
    if(!enemy)enemy=nearest(blocker,d,a=>blocker.supportBlock?dist(a,carrier)<7:
      ['rush','blitz','contain','runfit'].includes(a.job)&&(!a.engaged||isRun)).agent;
    if(enemy&&dist(blocker,enemy)<2.15){
      blocker.engaged=enemy.engaged=true;
      const pair=blocker.id+':'+enemy.id;
      if(!blockContacts.has(pair)){blockContacts.add(pair);contacts.push({t:+t.toFixed(2),kind:'block',offenseId:blocker.id,defenseId:enemy.id,relativeSpeed:+Math.hypot(blocker.vx-enemy.vx,blocker.vy-enemy.vy).toFixed(2),support:!!blocker.supportBlock,offenseY:+blocker.y.toFixed(2),defenseY:+enemy.y.toFixed(2),defenseVy:+enemy.vy.toFixed(2)});}
      const block=statsOf(blocker),rush=statsOf(enemy);
      const power=(blocker.power??.72)*(.55+block.blocking/155)*(.7+block.strength/300)*(1-blocker.fatigue*.24);
      const defense=(enemy.power??.66)*(.48+rush.strength/260+rush.passRush/310)*(1-enemy.fatigue*.22);
      const advantage=clamp(power/(power+defense),.22,.78);
      // Friction: linemen redirect toward pocket; running assignments can create a lane.
      enemy.x+=(enemy.x-blocker.x)*dt*advantage*(isRun?1.7:1.2);
      enemy.y+=dt*advantage*(isRun?4.8:3.0);
      enemy.vx*=1-advantage*.30;enemy.vy*=1-advantage*.52;
      blocker.vy-=dt*(1-advantage)*rush.passRush/65;
      if(!isRun && enemy.y<-.25)enemy.y=-.25;
    }
  }
  // Handoff after QB meets RB; option currently uses preselected runner (not adaptive read).
  if(isRun && !handoff && t>=.65 && state!=='loose'){
   handoff=true;
   const muff=clamp(.003+(82-statsOf(qb).hands)*.00025+(82-statsOf(runner).hands)*.0003,.002,.035);
   if(allowLoose&&looseRand()<muff)releaseLoose('fumble',t,{x:(qb.x+runner.x)/2,y:(qb.y+runner.y)/2},runner,qb);
   else{carrier=runner;ball={x:runner.x,y:runner.y,kind:'held'};log(t,'Handoff to '+runner.label);}
  }
  if(!isRun&&!thrown&&state!=='loose'){
    // A defensive rusher close to QB before release gets a sack.
    const rush=nearest(qb,d,a=>['rush','blitz','contain','spy'].includes(a.job));
    if(t>.35 && rush.d<.94 && !(rush.agent?.engaged&&rand()<.78)){
      sack=true;
      const strip=clamp(.012+(statsOf(rush.agent).passRush-statsOf(qb).awareness)*.0005,.003,.065);
      if(allowLoose&&looseRand()<strip)releaseLoose('fumble',t,qb,{x:qb.x+(rush.agent.x-qb.x)*.4,y:qb.y-2},qb);
      else{carrier=qb;finish('Sack ('+Math.abs(qb.y).toFixed(1)+' yd loss)',t,qb);}
    }
    const ready=t>=Math.max(1.15,off.qbDropTime??1.15);
    if(!playOver&&ready&&receivers.length){
      // Evaluate the RECEIVER AT BALL ARRIVAL, not just at the current frame.
      // Each candidate carries a coverage, trajectory, urgency and risk estimate.
      const rushDistance=rush.d;
      const desperate=rushDistance<3.1;
      const maxWait=off.throwAt??3.2;
      const clockPressure=clamp((t-maxWait+.6)/.8,0,1);
      const firstDown=Number.isFinite(off.toGain)?off.toGain:10;
      const graded=receivers.map(r=>{
        const ballSpeed=20+statsOf(qb).throwPower*.1;
        let travel=Math.max(.25,dist(qb,r)/ballSpeed);
        let predict={x:r.x,y:r.y};
        const lead=clamp(.7+statsOf(qb).awareness/300,.7,1);
        for(let i=0;i<2;i++){
          predict={x:clamp(r.x+r.vx*travel*lead,-26.5,26.5),y:r.y+r.vy*travel*lead};
          travel=Math.max(.25,dist(qb,predict)/ballSpeed);
        }
        const forecast=d.map(a=>({...a,x:a.x+a.vx*travel*.7,y:a.y+a.vy*travel*.7}));
        const closest=nearest(predict,forecast,a=>!['rush','blitz'].includes(a.job));
        const man=forecast.filter(a=>a.job==='man'&&a.coverTarget===r.id);
        const shadow=man.length?nearest(predict,man).d:99;
        // Defender can arrive on the throwing lane before the football.
        const lane=d.filter(a=>!['rush','blitz'].includes(a.job)).reduce((risk,player)=>{
          const dx=predict.x-qb.x,dy=predict.y-qb.y,mag=dx*dx+dy*dy;
          if(mag<.1)return risk;
          const along=clamp(((player.x-qb.x)*dx+(player.y-qb.y)*dy)/mag,0,1);
          const projected={x:qb.x+dx*along,y:qb.y+dy*along};
          return Math.max(risk,along>.08&&along<.93?clamp((2.6-dist(player,projected))/2.6,0,1):0);
        },0);
        const cushion=Math.min(closest.d,shadow+1);
        const separation=clamp((cushion-1.2)/4.2+(statsOf(r).agility-75)/560,0,1);
        const depth=clamp(predict.y,0,30);
        const risk=clamp((1-separation)*.50+lane*.43+Math.max(0,depth-20)*.008,0,1);
        const perceivedRisk=clamp(risk+(statsOf(qb).awareness-70)*.0025,0,1);
        const conversion=depth>=firstDown?1:0;
        const timing=clamp(1-Math.abs(t-(r.read||3)*.42-.55)/3.7,.1,1);
        // Pocket urgency makes open hot outlets more valuable than deeper contested throws.
        const urgency=desperate||clockPressure>.55;
        const value=separation*2.65-perceivedRisk*1.75+Math.min(depth,24)*.044+conversion*.36+timing*.20+
          (r.hot&&urgency?.84:0)+(r.id===off.primaryTarget?.10:0)-
          (urgency?Math.max(0,depth-12)*.055:0)+
          (rand()-.5)*(.9-statsOf(qb).awareness*.005);
        return {r,predict,risk,separation,lane,depth,score:value,open:cushion};
      }).filter(a=>a.predict.y>-.2).sort((a,b)=>b.score-a.score);
      // Softmax within a credible read window. A different seed can produce a
      // different defensible choice while clear, low-risk winners stay favored.
      const viable=graded.filter(a=>a.score>=graded[0]?.score-1.25&&a.risk<.82);
      const weights=viable.map(a=>Math.exp((a.score-graded[0].score)*1.15));
      let roll=rand()*weights.reduce((a,b)=>a+b,0),best=viable[0]||graded[0];
      for(let j=0;j<viable.length;j++){roll-=weights[j];if(roll<=0){best=viable[j];break;}}
      if(best&&(best.separation>.33||desperate||t>=maxWait)){
        // A high-risk throw is sometimes worse than throwing away or scrambling.
        const unsafe=best.risk>.72;
        if(unsafe && (desperate||t>=maxWait) && rand()<.44){
          if(off.allowScramble!==false&&rushDistance>1.6&&t<maxWait+1){
            log(t,'QB rejects covered reads and extends the play');
          }else{
            thrown=true;carrier=null;state='dead';
            decisions.push({t:+t.toFixed(2),action:'throwaway',reason:'No acceptable window; pressure and interception risk',candidates:graded.map(a=>({target:a.r.label,score:+a.score.toFixed(2),separation:+a.separation.toFixed(2),risk:+a.risk.toFixed(2)}))});
            finish('Throwaway — incomplete pass',t,point(0,0));
          }
        }else{
          const pick=best,r=pick.r;
          const aim={x:pick.predict.x,y:pick.predict.y};
          const accuracy=clamp(.66+statsOf(qb).throwAccuracy*.0031-dist(qb,aim)*.005-pick.risk*.15-(desperate?.16:0),.24,.98);
          if(rand()>accuracy){aim.x+=(rand()-.5)*7;aim.y+=(rand()-.5)*5;}
          const duration=Math.max(.2,dist(qb,aim)/(20+statsOf(qb).throwPower*.1));
          targetPass=r;flight={from:{x:qb.x,y:qb.y},to:aim,t0:t,duration};
          thrown=true;carrier=null;state='air';
          const why=desperate?'pressure/hot answer':pick.separation>.65?'separation':'timing/window';
          decisions.push({t:+t.toFixed(2),action:'pass',targetId:r.id,target:r.label,reason:why,pressure:+rushDistance.toFixed(1),candidates:graded.map(a=>({target:a.r.label,score:+a.score.toFixed(2),separation:+a.separation.toFixed(2),risk:+a.risk.toFixed(2),depth:+a.depth.toFixed(1)}))});
          log(t,'QB reads '+graded.slice(0,3).map(a=>a.r.label+' '+a.score.toFixed(1)).join(' / '));
          log(t,'Pass aimed at '+r.label+' — '+why+(r.hot?' (hot)':''));
        }
      }

    }
  }
  if(thrown&&flight){
    const pct=clamp((t-flight.t0)/flight.duration,0,1);
    ball={x:flight.from.x+(flight.to.x-flight.from.x)*pct,y:flight.from.y+(flight.to.y-flight.from.y)*pct,kind:'air'};
    if(pct>=1){
      const closeD=nearest(ball,d,a=>a.y>=-.5), receiverDist=dist(ball,targetPass);
      const contest=clamp((3.3-closeD.d)/2.3,0,1);
      const defenderSkill=closeD.agent?statsOf(closeD.agent):null;
      const disruption=clamp(contest*(.18+(defenderSkill?.coverage||0)*.004+(defenderSkill?.awareness||0)*.0015)+
        (receiverDist>1.65?.18:0)+(closeD.d<receiverDist?.12:0),0,.88);
      if(Math.abs(ball.x)>=26.66||ball.y>110-(off.yardLine??50)){
        finish('Incomplete pass — out of bounds',t,point(0,0));
      }else if(closeD.d<3.3 && rand()<disruption){
        const ballSkills=statsOf(closeD.agent),interceptionChance=clamp(.04+ballSkills.hands*.0024+ballSkills.awareness*.0013+ballSkills.coverage*.0007,.08,.4);
        const catchWindow=clamp((1.7-closeD.d)/.9,0,1);
        if(closeD.d<1.7&&rand()<interceptionChance*catchWindow){carrier=closeD.agent;state='return';returnStartY=carrier.y;interceptionY=carrier.y;possessionChanged=true;flight=null;
          ball={x:carrier.x,y:carrier.y,kind:'held-d'};log(t,'Interception by '+carrier.label+' — return is live');}
        else finish('Pass broken up by '+closeD.agent.label,t,point(0,0));
      } else if(receiverDist<=2.3 && rand()<clamp(.70+statsOf(targetPass).hands*.0030-pickupCoverage(ball,d)*.11,.5,.985)){carrier=targetPass;state='runafter';catchTime=t;ball={x:carrier.x,y:carrier.y,kind:'held'};flight=null;log(t,'Completed to '+carrier.label);}
      else finish('Incomplete pass',t,point(0,0));
    }
  }
  if(carrier&&carrier.side==='o'&&!lateralUsed&&off.lateralToId&&t>=clamp(Number(off.lateralAt)||1.5,.7,9)){
    lateralUsed=true;
    const mate=byId(off.lateralToId);
    if(mate&&mate!==carrier&&mate.y<=carrier.y-.3&&dist(mate,carrier)<18)
      releaseLoose('backwardPass',t,carrier,mate,carrier);
    else log(t,'Backward-pass option held — no teammate behind the ball');
  }
  if(state==='loose'&&loose){
    ball.x+=loose.vx*dt;ball.y+=loose.vy*dt;
    loose.vx*=.972;loose.vy*=.972;
    const ownGoal=-(off.yardLine??50),farGoal=100-(off.yardLine??50);
    if(Math.abs(ball.x)>=26.66||ball.y<=ownGoal-10||ball.y>=farGoal+10){
      looseResult={kind:loose.kind,sourceSide:loose.sourceSide,sourceId:loose.sourceId,
       originY:loose.originY,outY:ball.y,outX:ball.x,dead:'out'};
      finish(loose.kind==='backwardPass'?'Backward pass out of bounds':'Fumble out of bounds',t,ball);
    }else{
      // The ball must leave the passer's hands before anyone can recover it.
      // Give a pitch time to travel; its passer can still pursue a failed pitch.
      const looseAge=t-loose.at;
      const candidates=looseAge<.15?[]:[...o,...d]
        .filter(p=>dist(p,ball)<1.28&&(p.id!==loose.sourceId||looseAge>=.35))
        .sort((a,b)=>dist(a,ball)-dist(b,ball));
      for(const p of candidates){
        const skill=statsOf(p),chance=clamp(.18+skill.hands*.003+skill.awareness*.0018-(dist(p,ball)-.4)*.18,.22,.74);
        if(looseRand()>=chance)continue;
        carrier=p;state=p.side==='d'?'return':'runafter';catchTime=t;returnStartY=p.side==='d'?p.y:null;
        if(p.side!==loose.sourceSide)possessionChanged=true;
        looseResult={kind:loose.kind,sourceSide:loose.sourceSide,sourceId:loose.sourceId,
         originY:loose.originY,recoverySide:p.side,recoveryId:p.id,recoveryY:p.y,dead:'recovered'};
        ball={x:p.x,y:p.y,kind:p.side==='d'?'held-d':'held'};
        log(t,p.label+' recovers the '+(loose.kind==='backwardPass'?'backward pass':'fumble')+' for '+(p.side==='d'?'defense':'offense'));
        if(p.y<=ownGoal||p.y>=farGoal)finish('Recovery in end zone',t,p);
        break;
      }
      if(!carrier&&t-loose.at>3.5){
        looseResult={kind:loose.kind,sourceSide:loose.sourceSide,sourceId:loose.sourceId,
         originY:loose.originY,outY:ball.y,outX:ball.x,dead:'unrecovered'};
        finish('Loose ball dead at spot',t,ball);
      }
    }
  }
  if(carrier){
    if(state==='return'){
      move(carrier,openFieldTarget(carrier,o,t,-1),dt,speedOf(carrier),18);
      evade(carrier,o,t);
      const tackler=nearest(carrier,o);
      if(tackler.d<1.05&&tackler.agent?.tackleCooldown<=0){
        contacts.push({t:+t.toFixed(2),kind:'return tackle',offenseId:tackler.agent.id,defenseId:carrier.id,relativeSpeed:+Math.hypot(tackler.agent.vx-carrier.vx,tackler.agent.vy-carrier.vy).toFixed(2)});
        const a=statsOf(tackler.agent),b=statsOf(carrier);
        const success=clamp(.54+(a.tackling-70)*.005+(a.strength-b.strength)*.0018-
          (b.agility-70)*.0025,.24,.95);
        tackler.agent.tackleCooldown=.65;
        if(rand()<success){
          const strip=clamp(.008+(a.tackling-b.hands)*.00045+carrier.fatigue*.035,.003,.055);
          if(allowLoose&&!looseCount&&looseRand()<strip)releaseLoose('fumble',t,carrier,{x:carrier.x+(looseRand()-.5)*3,y:carrier.y-2},carrier);
          else finish((looseResult?'Recovery':'Interception')+' return tackled by '+tackler.agent.label,t,carrier);
        }
        else log(t,'Missed return tackle by '+tackler.agent.label);
      }
      if(carrier&&Math.abs(carrier.x)>=26.5)finish('Interception return out of bounds',t,carrier);
      if(carrier&&carrier.y<=-(off.yardLine??50))finish('Interception return touchdown',t,carrier);
    }
    if(carrier&&state==='runafter'){
      move(carrier,openFieldTarget(carrier,d,t,1,o),dt,speedOf(carrier)*(t-catchTime<.35?.82:1),18);
    }
    if(carrier)ball={x:carrier.x,y:carrier.y,kind:carrier.side==='d'?'held-d':'held'};
    if(carrier&&((isRun&&handoff)||(state==='runafter'))){
      evade(carrier,d,t);
      const near=nearest(carrier,d,a=>!a.engaged&&a.tackleCooldown<=0);
      if(near.d<1.3 && t>.8){
        const tackler=near.agent, a=statsOf(tackler),b=statsOf(carrier);
        contacts.push({t:+t.toFixed(2),kind:'tackle',offenseId:carrier.id,defenseId:tackler.id,relativeSpeed:+Math.hypot(tackler.vx-carrier.vx,tackler.vy-carrier.vy).toFixed(2),contactY:+carrier.y.toFixed(2)});
        const momentum=clamp((Math.hypot(tackler.vx-carrier.vx,tackler.vy-carrier.vy)-3)/12,0,1);
        const success=clamp(.62+(a.tackling-70)*.005+(a.strength-b.strength)*.0018+
          momentum*.08-(b.agility-70)*.0025-(b.vision-70)*.0014-
          tackler.fatigue*.13+carrier.fatigue*.08,.24,.95);
        tackler.tackleCooldown=.65;
        if(rand()<success){
          const strip=clamp(.009+(a.tackling-b.hands)*.0005+momentum*.025+carrier.fatigue*.04,.003,.07);
          if(allowLoose&&!looseCount&&looseRand()<strip)releaseLoose('fumble',t,carrier,{x:carrier.x+(looseRand()-.5)*3,y:carrier.y-2},carrier);
          else finish('Tackle by '+tackler.label,t,carrier);
        }
        else {tackler.vx*=.35;tackler.vy*=.35;log(t,'Missed tackle by '+tackler.label);}
      }
      if(carrier&&Math.abs(carrier.x)>=26.5)finish('Out of bounds',t,carrier);
      const toGoal=100-(off.yardLine??50);
      if(carrier&&carrier.y>=toGoal)finish('Touchdown',t,carrier);
    }
  }
  for(const p of [...o,...d]){
    const rating=statsOf(p).stamina;
    const effort=clamp(Math.hypot(p.vx,p.vy)/Math.max(1,speedOf(p)),0,1.5);
    p.fatigue=clamp(p.fatigue+dt*(.006+effort*.018+(p.engaged?.026:0))*(1.45-rating/180),0,.8);
    p.tackleCooldown=Math.max(0,(p.tackleCooldown||0)-dt);
  }
  if(!playOver&&t>=11.95){
    if(state==='loose'&&loose)looseResult={kind:loose.kind,sourceSide:loose.sourceSide,sourceId:loose.sourceId,originY:loose.originY,outY:ball.y,outX:ball.x,dead:'unrecovered'};
    finish(state==='return'?(looseResult?'Recovery return — play duration limit':'Interception return — play duration limit'):'Whistle — play duration limit',t,carrier||ball);
  }
  copyFrame(t);
 }
 if(!playOver&&frames.length)finish(state==='return'?'Interception return ended':'Play ended',time,carrier||point(0,0));
 const participation=[...o,...d].map(p=>{
  let travelled=0,engaged=0,previous=null;
  for(const f of frames){const at=(p.side==='o'?f.offense:f.defense).find(x=>x.id===p.id);
   if(previous&&f.t>=0)travelled+=dist(at,previous);
   if(at.engaged&&f.t>=0)engaged+=dt;
   previous=at;}
  return {id:p.id,label:p.label,side:p.side,assignment:p.job,
   yardsMoved:+travelled.toFixed(1),contactSeconds:+engaged.toFixed(2),fatigue:+p.fatigue.toFixed(4)};
 });
 return {valid:true,validation:v,frames,events,decisions,specialMoves,contacts,participation,result:{verdict,yards,seconds:+time.toFixed(2),seed,offense:off.name,defense:def.name,sack,
  possession:carrier?.side==='d'||!carrier&&looseResult?.sourceSide==='d'?'defense':'offense',
  possessionChanged,interceptionY,deadBallY:+(ball?.y??carrier?.y??0).toFixed(2),loose:looseResult,
  returnYards:returnStartY===null?0:+(returnStartY-(carrier?.y??returnStartY)).toFixed(1)}};
}
const api={validate,simulate,eligibleNumber,clone,clamp,dist,statsOf,defaultStats,RATING_KEYS};
root.GridironCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
