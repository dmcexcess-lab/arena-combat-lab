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
  off.players.filter(p=>!p.onLine).forEach(p=>{if(p.y>-.65) err(p.label+' is neither clearly on nor clearly behind the line.');});
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
  if(centers.length!==1||!centers[0].onLine||Math.abs(centers[0].x)>1.0) err('One center (C) must be on the line at the snap.');
  const qb=off.players.find(p=>p.id===(off.snapToId||'oQB'))||off.players.find(p=>p.label==='QB');
  if(!qb) err('Offense needs a designated snap receiver.'); else if(qb.onLine||qb.y>=-.65)err('Snap receiver must be in the backfield.');
  const legalTargets=new Set(def.players.map(p=>p.id)), oTargets=new Set(off.players.map(p=>p.id));
  for(const p of off.players){
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
  let vx=dx/d*speed,vy=dy/d*speed;
  let change=Math.min(1,accel*dt/Math.max(speed,.5));
  agent.vx+=(vx-agent.vx)*change; agent.vy+=(vy-agent.vy)*change;
  let f=Math.min(1,d/Math.max(.01,Math.hypot(agent.vx,agent.vy)*dt));
  agent.x=clamp(agent.x+agent.vx*dt*f,-26.6,26.6); agent.y+=agent.vy*dt*f;
}
function speedOf(p){let mult=clamp(p.speed??1,.5,1.5);if(['WR','SL','RB','HB','FB','CB','FS','SS','S'].includes(p.label))return 7.8*mult;
  if(['QB'].includes(p.label))return 5.6*mult;
  if(defFront.has(p.label))return 6.1*mult;
  if(linemen.has(p.label)||p.label==='TE')return 5.0*mult;
  return 7.0*mult;}
function simulate(off,def,seed=71){
 const v=validate(off,def); if(!v.valid)return {valid:false,validation:v,frames:[],events:[]};
 const rand=rng(seed), dt=.05, maxT=12;
 const o=clone(off.players).map(p=>({...p,side:'o',vx:0,vy:0,routeIndex:0,engaged:false}));
 const d=clone(def.players).map(p=>({...p,side:'d',vx:0,vy:0,engaged:false}));
 const byId=(id)=>o.find(p=>p.id===id), defenders=(id)=>d.find(p=>p.id===id);
 const qb=byId(off.snapToId||'oQB')||o.find(p=>p.label==='QB'), runner=byId(off.runnerId)||qb;
 let carrier=qb, state='live', ball={x:qb.x,y:qb.y,kind:'held'}, targetPass=null,flight=null, thrown=false, handoff=false, playOver=false, verdict='', yards=0, time=0, sack=false;
 const frames=[],events=[]; const log=(t,text)=>events.push({t:+t.toFixed(2),text});
 const isRun=['run','option'].includes(off.type),directRun=isRun&&runner===qb;
 const eligible=new Set(off.training?o.filter(p=>p.job==='route').map(p=>p.id):v.eligible);
 const receivers=o.filter(p=>p.job==='route'&&eligible.has(p.id));
 let playDir=off.runGapX??2;
 if(directRun)handoff=true;
 log(0,'Snap — '+off.name+' vs '+def.name);
 if(directRun)log(0,'Direct snap to '+runner.label);
 function copyFrame(t){frames.push({t:+t.toFixed(2),offense:o.map(p=>({id:p.id,x:+p.x.toFixed(3),y:+p.y.toFixed(3),engaged:p.engaged})),defense:d.map(p=>({id:p.id,x:+p.x.toFixed(3),y:+p.y.toFixed(3),engaged:p.engaged})),ball:{...ball},carrierId:carrier?.id||null,phase:state,verdict});}
 function finish(msg,t,pos,kill=true){if(playOver)return; verdict=msg;yards=+((pos?.y??carrier?.y??0)).toFixed(1);log(t,msg);playOver=kill;}
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
  for(const p of [...o,...d])p.engaged=false;
  // Route pursuit with waypoints. A hot route is a read priority, not a speed boost.
  for(const p of o){
    if(p.id===qb.id)continue;
    if(p.job==='route'||p.job==='release'||(p.route?.length && !['passblock','runblock','pull'].includes(p.job))){
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
      if(isRun && !handoff){const first=p.route?.[0]||{x:0,y:-4};move(p,{x:first.x,y:Math.min(-4,first.y)},dt,5.8,18);}
      if(isRun && handoff){let goal= p.route?.[Math.min(p.routeIndex,p.route.length-1)]||{x:playDir,y:35};
        if(dist(p,goal)<.7&&p.routeIndex<(p.route?.length||1)-1)p.routeIndex++;
        move(p,goal,dt,7.3,18);
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
  if(!isRun){
    const rush=nearest(qb,d,a=>['rush','blitz','contain'].includes(a.job));
    let pressure=rush.d<2.9;
    if(!thrown && t<Math.max(1.0,off.qbDropTime??1.15))move(qb,{x:off.qbDrift??0,y:-(off.qbDepth??6.8)},dt,5.0);
    else if(!thrown){
      if(pressure && t>1.1 && off.allowScramble!==false){
        const s=qb.x<0?1:-1;move(qb,{x:qb.x+s*4.2,y:qb.y+2},dt,5.4);
      }else{move(qb,{x:qb.x,y:qb.y},dt,0);}
    }
  }else if(directRun){const path=qb.route||[];let target=path[Math.min(qb.routeIndex,path.length-1)]||{x:playDir,y:20};
    if(dist(qb,target)<.7&&qb.routeIndex<path.length-1)qb.routeIndex++;
    move(qb,target,dt,speedOf(qb),18);
  }else if(!handoff){move(qb,{x:runner.x*.3,y:-4.8},dt,2.4);}
  // Defensive assignments: rush, man, match-zone, spy, and contain.
  for(const p of d){
    if(p.job==='rush'||p.job==='blitz'){
      const engageRun=isRun&&t>.22;const attack=engageRun?(handoff?carrier:{x:playDir,y:-.7}):qb;
      move(p,attack,dt,speedOf(p)*(p.job==='blitz'?1.03:.85),15);
    }
    else if(p.job==='contain'){
      const edge={x:p.x<0?-6.8:6.8,y:Math.max(0,qb.y+.2)};
      move(p,(carrier!==qb&&handoff)?carrier:edge,dt,speedOf(p)*.78);
    }else if(p.job==='man'){
      let m=byId(p.coverTarget)||nearest(p,o,a=>a.job==='route').agent;
      if(m){const direction=carrier===m?0:-.8;move(p,{x:m.x,y:m.y+direction},dt,speedOf(p)*.92);}
    }else if(p.job==='zone'){
      const z=p.zone||{x:p.x,y:p.y,r:5};
      const threats=receivers.filter(r=>dist(r,z)<(z.r||7)*1.6);
      const nearestThreat=nearest(z,threats);
      let lead=nearestThreat.agent&&nearestThreat.d<(z.r||7)*1.2?nearestThreat.agent:null;
      if(handoff&&t>.75&&dist(p,carrier)<12)lead=carrier;
      const aim=lead?{x:clamp(lead.x,z.x-(z.r||6),z.x+(z.r||6)),y:clamp(lead.y+.2,z.y-(z.rY||z.r||6),z.y+(z.rY||z.r||6))}:z;
      move(p,aim,dt,speedOf(p)*.85);
    }else if(p.job==='spy'){const watch=carrier||qb;move(p,{x:watch.x,y:clamp(watch.y+3,2,12)},dt,speedOf(p)*.65);}
    else if(p.job==='runfit')move(p,handoff?carrier:{x:p.fitX??playDir,y:1.4},dt,speedOf(p)*.9);
    else if(p.job==='deep')move(p,{x:p.zone?.x??p.x,y:p.zone?.y??18},dt,speedOf(p)*.7);
  }
  // Blocking contacts: delay / deflect rushers; the pressure model uses assignments and matchups.
  for(const blocker of o.filter(p=>['passblock','runblock','block','pull'].includes(p.job))){
    let enemy=defenders(blocker.blockTarget);
    if(!enemy)enemy=nearest(blocker,d,a=>['rush','blitz','contain','runfit'].includes(a.job)&&(!a.engaged||isRun)).agent;
    if(enemy&&dist(blocker,enemy)<2.15){
      blocker.engaged=enemy.engaged=true;
      const power=(blocker.power??.72), defense=(enemy.power??.66);
      const advantage=clamp(power/(power+defense),.35,.7);
      // Friction: linemen redirect toward pocket; running assignments can create a lane.
      enemy.x+=(enemy.x-blocker.x)*dt*advantage*(isRun?1.7:1.2);
      enemy.y+=dt*advantage*(isRun?4.8:3.0);
      enemy.vx*=1-advantage*.30;enemy.vy*=1-advantage*.52;
      if(!isRun && enemy.y<-.25)enemy.y=-.25;
    }
  }
  // Handoff after QB meets RB; option currently uses preselected runner (not adaptive read).
  if(isRun && !handoff && t>=.65){handoff=true;carrier=runner;ball={x:runner.x,y:runner.y,kind:'held'};log(t,'Handoff to '+runner.label);}
  if(!isRun&&!thrown){
    // A defensive rusher close to QB before release gets a sack.
    const rush=nearest(qb,d,a=>['rush','blitz','contain','spy'].includes(a.job));
    if(t>.35 && rush.d<.94 && !(rush.agent?.engaged&&rand()<.78)){
      sack=true;carrier=qb;finish('Sack ('+Math.abs(qb.y).toFixed(1)+' yd loss)',t,qb);
    }
    const ready=t>=Math.max(1.15,off.qbDropTime??1.15);
    if(!playOver&&ready&&receivers.length){
      const scored=receivers.map(r=>{
        const cover=nearest(r,d,a=>!['rush','blitz'].includes(a.job));
        const progress=r.y;const open=cover.d;
        return {r,score:open*.8+Math.min(progress,18)*.04-(r.read||3)*.16+(r.hot?1.1:0)+(r.id===off.primaryTarget?.7:0),open};
      }).filter(s=>s.r.y>-.2).sort((a,b)=>b.score-a.score);
      const maxWait=off.throwAt??3.2;
      if(scored.length&&(scored[0].open>=2.4||t>=maxWait)){
        const pick=scored[0],r=pick.r;
        let approximate=Math.max(.35,dist(qb,r)/25);
        let aim={x:clamp(r.x+r.vx*approximate*.60,-26.5,26.5),y:r.y+r.vy*approximate*.60};
        let accuracy=clamp(.92 - dist(qb,r)*.005 - (rush.d<2.6?.25:0),.37,.96);
        if(rand()>accuracy){aim.x+= (rand()-.5)*7;aim.y+=(rand()-.5)*5;}
        const duration=Math.max(.2,dist(qb,aim)/28);
        targetPass=r;flight={from:{x:qb.x,y:qb.y},to:aim,t0:t,duration};
        thrown=true;carrier=null;state='air';log(t,'Pass aimed at '+r.label+(r.hot?' (hot)':''));
      }
    }
  }
  if(thrown&&flight){
    const pct=clamp((t-flight.t0)/flight.duration,0,1);
    ball={x:flight.from.x+(flight.to.x-flight.from.x)*pct,y:flight.from.y+(flight.to.y-flight.from.y)*pct,kind:'air'};
    if(pct>=1){
      const closeD=nearest(ball,d,a=>a.y>=-.5), receiverDist=dist(ball,targetPass);
      if(closeD.d<1.25 && (closeD.d<receiverDist+.4 || rand()<.27)){
        if(rand()<.31&&closeD.d<.8){carrier=closeD.agent;ball={x:carrier.x,y:carrier.y,kind:'held-d'};finish('Interception by '+carrier.label,t,carrier);}
        else finish('Pass broken up by '+closeD.agent.label,t,point(0,0));
      } else if(receiverDist<=2.3){carrier=targetPass;state='runafter';ball={x:carrier.x,y:carrier.y,kind:'held'};flight=null;log(t,'Completed to '+carrier.label);}
      else finish('Incomplete pass',t,point(0,0));
    }
  }
  if(carrier){
    if(carrier!==qb && !isRun && state==='runafter'){
      const gap=nearest(carrier,d);const open=carrier.x<0?-23:23;
      const dest=gap.d<4?{x:clamp(carrier.x+ (carrier.x<0?-2:2),-24,24),y:carrier.y+15}:{x:carrier.x,y:carrier.y+20};
      move(carrier,dest,dt,speedOf(carrier)*.97,18);
    }
    ball={x:carrier.x,y:carrier.y,kind:carrier.side==='d'?'held-d':'held'};
    if((isRun&&handoff)||(state==='runafter')){
      const near=nearest(carrier,d);
      if(near.d<.99 && !near.agent?.engaged && t>.8){finish('Tackle by '+near.agent.label,t,carrier);}
      if(Math.abs(carrier.x)>=26.5)finish('Out of bounds',t,carrier);
      const toGoal=100-(off.yardLine??50);
      if(carrier.y>=toGoal)finish('Touchdown',t,carrier);
    }
  }
  if(!playOver&&t>=11.95)finish('Whistle — play duration limit',t,carrier||point(0,0));
  copyFrame(t);
 }
 if(!playOver&&frames.length)finish('Play ended',time,carrier||point(0,0));
 return {valid:true,validation:v,frames,events,result:{verdict,yards,seconds:+time.toFixed(2),seed,offense:off.name,defense:def.name,sack}};
}
const api={validate,simulate,eligibleNumber,clone,clamp,dist};
root.GridironCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
