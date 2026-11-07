(function(){
'use strict';
const C=window.GridironCore,P=window.GridironPlays,K=window.RouteCampaign,E=window.RouteEncyclopedia;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const W=1080,H=900,OX=540,OY=745,XS=18,YS=15;
const pos=(p)=>({x:OX+p.x*XS,y:OY-p.y*YS}), world=(x,y)=>({x:C.clamp((x-OX)/XS,-26.6,26.6),y:C.clamp((OY-y)/YS,-9.2,39.5)});
const offPresets=P.createOffensePresets(),defPresets=P.createDefensePresets();
const initCustom=()=>{try{let v=JSON.parse(localStorage.getItem('route-lab-custom-v1')||'{"offense":[],"defense":[]}');return v&&Array.isArray(v.offense)&&Array.isArray(v.defense)?v:{offense:[],defense:[]};}catch{return {offense:[],defense:[]};}};
const custom=initCustom();
let offensive=C.clone(offPresets[0]), defensive=C.clone(defPresets[0]);
let side='offense',selected='oSL',tool='select',drag=null,undo=[],redo=[],running=false,playback=null,frameIndex=0,lastFrameTime=0,raf=0,dirty=false,zoom=1;
let campaignDrillCleared=false,campaignQuizCleared=false,encyCategory='All',encySearch='';
let campaignWave=0,coachLayer='assignments';
let campaign=null,campaignBaseline=null,campaignProgress=K.readProgress({getItem:k=>{try{return localStorage.getItem(k);}catch{return null;}}}),campaignDrive=null,campaignSuccess=false,campaignAttempt=0;
const OFF_JOBS=['route','passblock','runblock','block','pull','carry','release','quarterback'], DEF_JOBS=['rush','blitz','man','zone','spy','contain','runfit','deep'];
const STAT_LABELS={speed:'Speed',acceleration:'Acceleration',agility:'Agility',strength:'Strength',blocking:'Blocking',coverage:'Coverage',tackling:'Tackling',hands:'Hands',awareness:'Awareness',throwAccuracy:'Passing accuracy',throwPower:'Arm strength'};
const routeKinds=['go','fade','slant','flat','out','in','dig','corner','post','curl','hitch','drag','wheel','seam','comeback','swing','angle','bubble','shallow'];
const sidePlay=()=>side==='offense'?offensive:defensive;
const selectedPlayer=()=>sidePlay().players.find(p=>p.id===selected);
const allOff=()=>[...offPresets,...custom.offense],allDef=()=>[...defPresets,...custom.defense];
function setCustom(){try{localStorage.setItem('route-lab-custom-v1',JSON.stringify(custom));}catch{}}
function checkpoint(){undo.push(JSON.stringify({offensive,defensive,side,selected}));if(undo.length>70)undo.shift();redo=[];}
function restore(str){const s=JSON.parse(str);offensive=s.offensive;defensive=s.defensive;side=s.side;selected=s.selected;dirty=true;setMode('select');invalidate();refresh(true);}
function history(dir){let from=dir==='undo'?undo:redo,to=dir==='undo'?redo:undo;if(!from.length)return;to.push(JSON.stringify({offensive,defensive,side,selected}));restore(from.pop());}
function invalidate(){running=false;playback=null;frameIndex=0;cancelAnimationFrame(raf);$('timeline').disabled=true;$('pauseBtn').disabled=true;$('stepBtn').disabled=true;$('rewindBtn').disabled=true;$('editBtn').disabled=true;$('clock').textContent='0.00s';$('duration').textContent='—';$('modeChip').textContent='EDIT MODE';$('viewLabel').textContent='DESIGN';$('resultMain').textContent='Ready for the snap';$('resultMeta').textContent='Run the matchup to see the tactical outcome.';$('eventLog').textContent='Simulation events will appear here.';}
function fillPresets(){
 function fill(el,arr,key){const prior=el.value;el.innerHTML=arr.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  const current=key==='offense'?offensive:defensive;
  el.value=arr.some(p=>p.id===current.id)?current.id:(arr.some(p=>p.id===prior)?prior:arr[0]?.id||'');}
 fill($('offPreset'),allOff(),'offense');fill($('defPreset'),allDef(),'defense');
}
function changePreset(which){if(campaign)return;const value=$(which==='offense'?'offPreset':'defPreset').value;const source=(which==='offense'?allOff():allDef()).find(p=>p.id===value);if(!source)return;
 checkpoint();if(which==='offense')offensive=C.clone(source);else defensive=C.clone(source);selected=(sidePlay().players[0]?.id||'');dirty=false;invalidate();refresh(true);}
function selectSide(s){if(campaign && s!==campaign.side)return;side=s;if(!sidePlay().players.some(p=>p.id===selected))selected=side==='offense'?'oSL':'dFS';
 $('sideTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.side===side));
 if(tool==='route'&&s==='defense')setMode('zone');else if(tool==='zone'&&s==='offense')setMode('route');
 refresh();}
const toolExplanations={select:'Drag a player to reposition, or tap one to edit assignments.',route:'Select an offensive player, then tap the field to add route waypoints. Drag a waypoint to refine.',assign:'Select a blocker or defender, then tap an opposing player to assign the matchup.',zone:'Select a defender, then tap the field to center the coverage zone.',motion:'Select one offensive backfield player, then tap its snap position. Motion toward the LOS is illegal.',gap:'Tap a field location to set the run gap or selected blocker’s gap.',pan:'Drag the field to move around while zoomed in. Use + / Fit / − above the field.'};
function setMode(m){tool=m;$('tools').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tool===m));$('toolHint').textContent={select:'Move players',route:'Draw path',assign:'Choose matchup',zone:'Place coverage',motion:'Set pre-snap motion',gap:'Mark the gap',pan:'Drag to pan'}[m];$('contextHelp').textContent=toolExplanations[m];$('fieldHint').textContent=toolExplanations[m];renderField();}
function validationUI(){const v=C.validate(offensive,defensive), el=$('validation');
  el.className='status'+(v.valid?'':' bad');
  el.innerHTML='<b>'+ (v.valid?(offensive.training?'✓ Training drill alignment':'✓ Legal snap formation'):'✕ Illegal play — '+v.errors.length+' issue'+(v.errors.length!==1?'s':''))+'</b>'+ 
    (v.errors.length?'<ul>'+v.errors.slice(0,6).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<small>'+(offensive.training?'Small-sided training drill • '+offensive.players.length+' vs '+defensive.players.length+' • full NFL formation rules begin at 11v11':v.lineCount+' on LOS • both teams have 11 • ready to test')+'</small>')+
    (v.warnings.length?'<small>Note: '+esc(v.warnings[0])+(v.warnings.length>1?' (+'+(v.warnings.length-1)+')':'')+'</small>':'');
  return v;
}
function svgPoint(e){const svg=$('field');const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse());}
function renderGrid(){let s=`<defs>
<pattern id="grass" patternUnits="userSpaceOnUse" width="90" height="150"><rect width="90" height="150" fill="#0c332e"/><path d="M0 0H90V75H0Z" fill="#10392f"/></pattern>
<pattern id="speckle" patternUnits="userSpaceOnUse" width="48" height="38"><circle cx="4" cy="7" r=".8" fill="#6ba899" opacity=".19"/><circle cx="31" cy="24" r=".7" fill="#64a08f" opacity=".17"/></pattern>
<marker id="arrowOff" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#52e3d4" stroke-width="1.45"/></marker>
<marker id="arrowHot" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#ffcf69" stroke-width="1.45"/></marker>
<marker id="arrowD" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#ff8772" stroke-width="1.45"/></marker></defs>`;
 s+=`<rect x="0" y="0" width="1080" height="900" fill="url(#grass)"/><rect x="0" y="0" width="1080" height="900" fill="url(#speckle)"/><rect x="59" y="146" width="962" height="747" stroke="#7aad9d" stroke-opacity=".50" stroke-width="3" fill="none"/>`;
 for(let y=-5;y<=40;y+=5){const py=pos({x:0,y}).y;if(py<120||py>893)continue;
  s+=`<path d="M60 ${py}H1020" stroke="${y===0?'#ffd187':'#9dbdb3'}" stroke-width="${y===0?4:1.65}" stroke-opacity="${y===0?.95:.35}" ${y===0?'stroke-dasharray="10 6"':''}/>`;
  if(y!==0 && y!==40){s+=`<text x="77" y="${py-7}" fill="#8db3a6" font-size="19" font-family="ui-monospace" font-weight="700" opacity=".65">${y+50}</text><text x="1002" y="${py-7}" text-anchor="end" fill="#8db3a6" font-size="19" font-family="ui-monospace" font-weight="700" opacity=".65">${y+50}</text>`;}
 }
 for(let y=-5;y<=38;y++){const py=pos({x:0,y}).y;if(py<149||py>892)continue;for(const x of [OX-13.75*XS,OX+13.75*XS])s+=`<path d="M${x-7} ${py}h14" stroke="#aacbc0" opacity=".48" stroke-width="1.4"/>`;}
 s+=`<rect x="60" y="145" width="960" height="50" fill="#162e38" opacity=".8"/><text x="540" y="177" text-anchor="middle" fill="#b8ddd3" font-family="ui-monospace" font-weight="700" letter-spacing="7" font-size="16" opacity=".7">DOWNFIELD ↑</text>`;
 s+=`<text x="540" y="${pos({x:0,y:0}).y-10}" text-anchor="middle" font-size="12" font-weight="800" letter-spacing="3" fill="#f9d597" opacity=".95">LINE OF SCRIMMAGE</text>`;
 return s;
}
function drawPlayer(p,team,at,carrier){const xy=pos(at||p),isD=team==='d',color=isD?'#ff8068':'#41ded0',highlight=(side===(isD?'defense':'offense')&&p.id===selected&&!playback),center={x:xy.x,y:xy.y};
 let s=`<g class="player" data-team="${team}" data-player="${esc(p.id)}" transform="translate(${center.x.toFixed(2)},${center.y.toFixed(2)})">`;
 if(highlight)s+=`<circle r="29" fill="${color}" opacity=".13"/><circle r="25" stroke="${color}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>`;
 if(carrier===p.id)s+=`<circle r="22" fill="#ffe1a2" opacity=".25"/>`;
 s+=`<circle r="20" fill="#062321" fill-opacity=".86" stroke="${color}" stroke-opacity=".28" stroke-width="1.2"/>`;
 if(isD)s+=`<path d="M-10-10L10 10M10-10L-10 10" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
 else s+=`<circle r="11.4" fill="none" stroke="${color}" stroke-width="4.6"/>`;
 if($('labelsToggle').checked)s+=`<text x="0" y="36" text-anchor="middle" fill="${color}" stroke="#092820" stroke-width="3" paint-order="stroke" font-size="13" font-family="ui-monospace,monospace" font-weight="800">${esc(p.label)}</text>`;
 if(p.hot&&!isD&&!playback)s+=`<circle cx="15" cy="-17" r="6.2" fill="#ffcf69"/><text x="15" y="-14" text-anchor="middle" font-weight="900" font-size="9" fill="#1c2b22">H</text>`;
 s+='</g>';return s;
}
function renderCoachLayer(live,offCoords,defCoords){
 if(coachLayer==='off')return '';
 const at=(p)=>pos((p.id.startsWith('d')?defCoords:offCoords).get(p.id)||p);
 const line=(a,b,color,dash='5 6')=>'<path d="M'+a.x+' '+a.y+'L'+b.x+' '+b.y+'" stroke="'+color+'" stroke-width="3" stroke-dasharray="'+dash+'" stroke-opacity=".83" fill="none"/>';
 const mark=(p,color,label)=>{const a=at(p);return '<circle cx="'+a.x+'" cy="'+a.y+'" r="32" fill="'+color+'" fill-opacity=".1" stroke="'+color+'" stroke-width="2"/><text x="'+(a.x+25)+'" y="'+(a.y-22)+'" fill="'+color+'" font-weight="800" font-size="13">'+esc(label)+'</text>';};
 let s='<g class="coaching-layer" pointer-events="none">';
 if(['assignments','coverage','matchups'].includes(coachLayer)){
  for(const p of defensive.players.filter(v=>v.job==='man'&&v.coverTarget)){const q=offensive.players.find(v=>v.id===p.coverTarget);if(q)s+=line(at(p),at(q),'#ff8f9a');}
 }
 if(['assignments','protection','matchups'].includes(coachLayer)){
  for(const p of offensive.players.filter(v=>['passblock','runblock','block','pull'].includes(v.job))){
   const q=defensive.players.find(v=>v.id===p.blockTarget);if(q)s+=line(at(p),at(q),'#64e7ce','8 5');else if(coachLayer==='protection')s+=mark(p,'#f6c37b','AUTO');
  }
 }
 if(['coverage','open-space'].includes(coachLayer)){
  for(const p of defensive.players.filter(v=>v.zone&&['zone','deep'].includes(v.job))){const z=pos(p.zone);s+='<ellipse cx="'+z.x+'" cy="'+z.y+'" rx="'+((p.zone.r||7)*XS)+'" ry="'+((p.zone.rY||p.zone.r||7)*YS)+'" fill="#ff6975" fill-opacity=".1" stroke="#ff9b9e" stroke-width="2" stroke-dasharray="7 6"/>';}
 }
 if(['pressure','protection'].includes(coachLayer)){
  const qb=offensive.players.find(p=>p.label==='QB');
  if(qb)for(const p of defensive.players.filter(v=>['rush','blitz','contain'].includes(v.job))){s+=line(at(p),at(qb),'#ffb369','9 5');s+=mark(p,'#ffa36e',p.job==='blitz'?'BLITZ':'RUSH');}
 }
 if(coachLayer==='run-fits'){
  const r=offensive.players.find(p=>p.id===offensive.runnerId)||offensive.players.find(p=>p.label==='QB');
  if(r)for(const p of defensive.players.filter(v=>['runfit','contain','spy'].includes(v.job))){s+=line(at(p),at(r),'#f8c76b');s+=mark(p,'#f8c76b',p.job.toUpperCase());}
  const gap=pos({x:offensive.runGapX||2,y:5});s+='<circle cx="'+gap.x+'" cy="'+gap.y+'" r="29" fill="#ffd37b" fill-opacity=".2" stroke="#ffd37b" stroke-dasharray="5 4"/>';
 }
 if(coachLayer==='matchups'){
  for(const p of defensive.players.filter(v=>v.job==='man'&&v.coverTarget)){const q=offensive.players.find(v=>v.id===p.coverTarget);if(!q)continue;const a=C.statsOf(q),b=C.statsOf(p),adv=Math.round((a.speed+a.agility-b.speed-b.coverage)/2);s+=mark(q,adv>7?'#6bebaf':adv< -7?'#ff8e96':'#ffe19b',(adv>=0?'+':'')+adv);}
 }
 if(coachLayer==='open-space'){
  const guards=defensive.players.filter(p=>['zone','man','deep'].includes(p.job));
  for(let y=5;y<=29;y+=6)for(let x=-21;x<=21;x+=7){
   const q={x,y};const nearby=guards.reduce((m,p)=>Math.min(m,C.dist(p.job==='zone'&&p.zone?p.zone:p,q)),99);
   if(nearby>8){const a=pos(q);s+='<circle cx="'+a.x+'" cy="'+a.y+'" r="28" fill="#69edbd" fill-opacity=".13" stroke="#69edbd" stroke-opacity=".3"/>';}
  }
 }
 return s+'</g>';
}

function renderField(){
 const svg=$('field');let s=renderGrid();const live=playback?.frames[frameIndex];const offCoords=new Map((live?.offense||[]).map(a=>[a.id,a]));const defCoords=new Map((live?.defense||[]).map(a=>[a.id,a]));
 const drawRoutes=$('routesToggle').checked&&!live;
 if(drawRoutes){for(const p of offensive.players){
   if((p.job==='route'||p.job==='carry'||p.job==='release'||p.job==='pull')&&p.route?.length){
     const co=p.hot?'#ffcc69':'#51decf',pts=[p,...p.route].map(pos),line=pts.map(q=>`${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ');
     s+=`<polyline points="${line}" fill="none" stroke="${co}" stroke-width="${p.hot?4:2.9}" opacity=".9" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${p.hot?'arrowHot':'arrowOff'})" ${p.job==='pull'?'stroke-dasharray="7 5"':''}/>`;
     if(tool==='route'&&side==='offense'&&p.id===selected)pts.slice(1).forEach((q,i)=>{s+=`<circle data-point="${i}" cx="${q.x}" cy="${q.y}" r="8" stroke="#f5f7d2" stroke-width="2" fill="#143a35"/>`;});
   }
   if(p.motion){const a=pos(p),b=pos({x:p.motion.toX,y:p.motion.toY});s+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" fill="none" stroke="#fdca75" stroke-width="2.5" stroke-dasharray="6 5" marker-end="url(#arrowHot)"/>`;}
   if(['passblock','runblock','block'].includes(p.job)){
    const target=defensive.players.find(v=>v.id===p.blockTarget);
    if(target){const a=pos(p),b=pos(target);s+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" fill="none" stroke="#41ded0" stroke-opacity=".55" stroke-width="2.2" stroke-dasharray="6 6"/>`;}
   }
 }}
 if(drawRoutes){
  if($('zonesToggle').checked)for(const p of defensive.players.filter(p=>p.job==='zone'&&p.zone)){
    const a=pos(p.zone);s+=`<ellipse cx="${a.x}" cy="${a.y}" rx="${(p.zone.r||7)*XS}" ry="${(p.zone.rY||p.zone.r||7)*YS}" fill="#ff8068" fill-opacity=".06" stroke="#ff8068" stroke-opacity=".42" stroke-width="2" stroke-dasharray="7 7"/>`;
  }
  for(const p of defensive.players.filter(p=>p.job==='man'&&p.coverTarget)){
   const m=offensive.players.find(q=>q.id===p.coverTarget);if(!m)continue;
   const a=pos(p),b=pos(m);s+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#ff8772" stroke-opacity=".7" stroke-width="2" stroke-dasharray="5 7"/>`;
  }
  if(['run','option'].includes(offensive.type)){let x=offensive.runGapX??2;let a=pos({x,y:0}),b=pos({x,y:5});s+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#ffcc69" stroke-width="4" marker-end="url(#arrowHot)"/><text x="${a.x+9}" y="${a.y-15}" fill="#ffcc69" font-size="15" font-weight="800">GAP</text>`;}
 }
 s+=renderCoachLayer(live,offCoords,defCoords);
 for(const p of defensive.players)s+=drawPlayer(p,'d',defCoords.get(p.id),live?.carrierId);
 for(const p of offensive.players)s+=drawPlayer(p,'o',offCoords.get(p.id),live?.carrierId);
 if(live?.ball){const b=pos(live.ball);s+=`<ellipse cx="${b.x}" cy="${b.y}" rx="7.5" ry="5.2" transform="rotate(-20 ${b.x} ${b.y})" fill="#ffcc69" stroke="#fff3c7" stroke-width="1.6"/><path d="M${b.x-3} ${b.y}h6" stroke="#734b2f" stroke-width="1.5"/>`;}
 svg.innerHTML=s;
 $('matchupTitle').innerHTML=esc(offensive.name)+' <span class="muted">vs.</span> '+esc(defensive.name);
 $('losLabel').textContent=String(offensive.yardLine??50);
}
function renderInspector(){const el=$('inspector'),p=selectedPlayer(),isO=side==='offense';if(!p){el.innerHTML='<h3>Select a player</h3>';return;}
 const select=(id,value,options)=>`<select data-field="${id}">${options.map(v=>{const [val,label]=Array.isArray(v)?v:[v,v];return `<option value="${esc(val)}" ${String(val)===String(value)?'selected':''}>${esc(label)}</option>`;}).join('')}</select>`;
 const field=(name,inner)=>`<div class="field-input"><label>${name}</label>${inner}</div>`;
 const input=(id,value,type='text',attrs='')=>`<input type="${type}" data-field="${id}" value="${esc(value??'')}" ${attrs}>`;
 const check=(id,checked,text)=>`<label><input type="checkbox" data-field="${id}" ${checked?'checked':''}>${text}</label>`;
 let html=`<section class="sec"><div class="section-title"><h3>Player inspector</h3><span class="micro">${isO?'OFFENSE · O':'DEFENSE · X'}</span></div><div class="inspector-title"><div class="player-badge ${isO?'':'def'}">${isO?'O':'X'}</div><div><b>${esc(p.label)} <span class="muted">#${esc(p.number)}</span></b><small>${esc(p.id)} • ${esc(p.job)}</small></div></div>
 <div class="two-fields">${field('Position label',input('label',p.label))}${field('Jersey #',input('number',p.number,'number','min="0" max="99"'))}</div>
 ${field('Assignment',select('job',p.job,(isO?OFF_JOBS:DEF_JOBS).map(x=>[x,x.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,s=>s.toUpperCase())])))}
 <div class="two-fields">${field('X • lateral',input('x',p.x.toFixed(1),'number','step="0.5" min="-26" max="26"'))}${field('Y • downfield',input('y',p.y.toFixed(1),'number','step="0.5"'))}</div>
 <div class="checks">${isO?check('onLine',p.onLine,'On line of scrimmage'):''}${isO?check('hot',p.hot,'Hot read'):''}</div>
 ${isO?'<div class="checks">'+check('reportedEligible',p.reportedEligible,'Reported eligible')+check('reportedIneligible',p.reportedIneligible,'Reported ineligible')+'</div>':''}
 <div class="two-fields">${field('Speed multiplier',input('speed',p.speed??1,'number','min="0.5" max="1.5" step="0.05"'))}${field('Power (0–1)',input('power',p.power??.68,'number','min="0" max="1" step="0.05"'))}</div>
 <details class="rating-editor" open><summary>PLAYER ATTRIBUTES • 1–99</summary><div class="rating-grid">${C.RATING_KEYS.map(k=>field(STAT_LABELS[k],input('stats.'+k,C.statsOf(p)[k],'number','min="1" max="99" step="1"'))).join('')}</div><p class="help">These scouting ratings affect gameplay, not just player labels. They are not NFL-calibrated.</p></details>
 </section>`;
 if(isO){
   if(['route','carry','release','pull'].includes(p.job))html+=`<section class="sec border-top"><div class="section-title"><h3>Route builder</h3><span class="micro">${p.route?.length||0} waypoints</span></div>
    ${field('Route template',select('pattern',p.pattern||'', [['','Custom / drawn'],...routeKinds.map(x=>[x,x[0].toUpperCase()+x.slice(1)])]))}
    <div class="two-fields">${field('Read order',input('read',p.read??3,'number','min="1" max="6"'))}${field('Target priority',select('primaryTarget',offensive.primaryTarget,offensive.players.filter(q=>!['LT','LG','C','RG','RT'].includes(q.label)).map(q=>[q.id,q.label])))} </div>
    <div class="row"><button data-action="routeTool">↗ Draw on field</button><button data-action="removeWaypoint">− Last point</button><button data-action="clearRoute">Clear</button></div><p class="help">Route points can be drawn, dragged and removed. Hot reads are preferred by the QB.</p></section>`;
   if(['passblock','runblock','block','pull'].includes(p.job))html+=`<section class="sec border-top"><div class="section-title"><h3>Blocking assignment</h3></div>${field('Assigned defender',select('blockTarget',p.blockTarget||'', [['','Auto / nearby threat'],...defensive.players.map(q=>[q.id,q.label+' #'+q.number])]))}
     ${field('Gap X coordinate',input('blockGapX',p.blockGapX??p.x,'number','min="-26" max="26" step="0.5"'))}<button data-action="assignTool">⇥ Pick defender on field</button></section>`;
   if(p.id===(offensive.snapToId||'oQB'))html+=`<section class="sec border-top"><div class="section-title"><h3>Quarterback / play logic</h3></div>${field('Play type',select('type',offensive.type,['pass','run','screen','playaction','option']))}
     <div class="two-fields">${field('Drop depth (yd)',input('qbDepth',offensive.qbDepth,'number','min="2" max="12" step="0.5"'))}${field('Earliest throw (s)',input('throwAt',offensive.throwAt,'number','min="1" max="7" step="0.1"'))}</div>${field('Snap receiver',select('snapToId',offensive.snapToId||'oQB',offensive.players.filter(q=>!q.onLine).map(q=>[q.id,q.label])))}${field('Ball carrier (run)',select('runnerId',offensive.runnerId,offensive.players.filter(q=>!q.onLine).map(q=>[q.id,q.label])))}
     <div class="checks">${check('allowScramble',offensive.allowScramble!==false,'QB scramble under pressure')}</div></section>`;
   if(p.id!==(offensive.snapToId||'oQB'))html+=`<section class="sec border-top"><div class="section-title"><h3>Motion &amp; action</h3></div>${p.motion?`<div class="two-fields">${field('At-snap X',input('motion.toX',p.motion.toX,'number','step="0.5"'))}${field('At-snap Y',input('motion.toY',p.motion.toY,'number','step="0.5"'))}</div>`:'<p class="help">No pre-snap motion assigned.</p>'}<div class="row"><button data-action="motionTool">Set motion</button><button data-action="clearMotion">Clear motion</button><button data-action="makeRunner">Ball carrier</button></div></section>`;
 }else{
   if(p.job==='man')html+=`<section class="sec border-top"><div class="section-title"><h3>Man coverage</h3></div>${field('Shadow receiver',select('coverTarget',p.coverTarget||'', [['','Auto matchup'],...offensive.players.map(q=>[q.id,q.label+' #'+q.number])]))}<button data-action="assignTool">⇥ Pick opponent on field</button></section>`;
   if(p.job==='zone')html+=`<section class="sec border-top"><div class="section-title"><h3>Coverage zone</h3></div><div class="two-fields">${field('Zone center X',input('zone.x',p.zone?.x??p.x,'number','step="0.5"'))}${field('Zone center Y',input('zone.y',p.zone?.y??p.y,'number','step="0.5"'))}</div><div class="two-fields">${field('Width (yards)',input('zone.r',p.zone?.r??7,'number','min="1" max="28" step="0.5"'))}${field('Depth (yards)',input('zone.rY',p.zone?.rY??7,'number','min="1" max="30" step="0.5"'))}</div><button data-action="zoneTool">◌ Place on field</button></section>`;
   if(p.job==='runfit')html+=`<section class="sec border-top">${field('Fit gap X',input('fitX',p.fitX??p.x,'number','step="0.5"'))}</section>`;
 }
 html+=`<section class="sec border-top"><div class="section-title"><h3>${isO?'Offensive':'Defensive'} roster</h3><span class="micro">${sidePlay().players.length} players</span></div><div class="assignment-list">${sidePlay().players.map(q=>`<button data-select="${esc(q.id)}" class="assignment ${isO?'':'def'} ${selected===q.id?'sel':''}"><span>${isO?'O':'X'}</span><strong>${esc(q.label)} <small>#${esc(q.number)}</small></strong><small>${esc(q.job)}</small></button>`).join('')}</div></section>`;
 el.innerHTML=html;
}
function refresh(presets=false){if(presets)fillPresets();validationUI();renderField();renderInspector();$('undoBtn').disabled=!undo.length;$('redoBtn').disabled=!redo.length;}
function fieldAction(p,wp){const sideMatch=side==='offense'?'o':'d';
 if(tool==='route'&&side==='offense'){
  if(!p || p.side==='d')return;
  checkpoint();p.job=p.job==='carry'?'carry':'route';p.route=p.route||[];p.route.push({x:C.clamp(wp.x,-26,26),y:Math.max(-8,wp.y)});p.pattern='';invalidate();refresh();return;
 }
 if(tool==='zone'&&side==='defense'){
  checkpoint();p.job='zone';p.zone={...(p.zone||{r:7,rY:7}),x:wp.x,y:wp.y};invalidate();refresh();return;
 }
 if(tool==='motion'&&side==='offense'){
  if(p.onLine){alert('Move this player off the line before assigning at-snap motion.');return;}
  checkpoint();p.motion={toX:wp.x,toY:wp.y};invalidate();refresh();return;
 }
 if(tool==='gap'&&side==='offense'){
  checkpoint();if(p&&['passblock','runblock','block','pull'].includes(p.job))p.blockGapX=wp.x;
  else offensive.runGapX=wp.x;invalidate();refresh();return;
 }
}
function bindEvents(){
 $('offPreset').addEventListener('change',()=>changePreset('offense'));
 $('defPreset').addEventListener('change',()=>changePreset('defense'));
 $('sideTabs').addEventListener('click',e=>{const b=e.target.closest('[data-side]');if(b)selectSide(b.dataset.side);});
 $('tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)setMode(b.dataset.tool);});
 $('undoBtn').onclick=()=>history('undo');$('redoBtn').onclick=()=>history('redo');
 $('routesToggle').onchange=renderField;$('zonesToggle').onchange=renderField;$('labelsToggle').onchange=renderField;
 $('helpBtn').onclick=()=>alert('ROUTE LAB: Select offense and defense from the playbooks. Switch edit side; drag O and X players on the field. Select a player to change its job in the inspector. Draw routes using the Route tool, select defenders for blocking/man coverage with Assign Target, place coverage zones, or set pre-snap motion. Illegal formations are flagged live. Run to simulate, pause, step and scrub replay. Save custom plays locally or export/import JSON. This is an evolving simulation, not a complete NFL officiating/physics engine.');
 $('runBtn').onclick=run;$('pauseBtn').onclick=togglePause;$('stepBtn').onclick=step;$('rewindBtn').onclick=rewind;$('editBtn').onclick=()=>{invalidate();refresh();};
 $('speedSelect').onchange=()=>{};$('timeline').addEventListener('input',()=>{running=false;frameIndex=+$('timeline').value;$('pauseBtn').textContent='▶ Play';renderFrame();});
 $('zoomIn').onclick=()=>setZoom(zoom+.5);$('zoomOut').onclick=()=>setZoom(zoom-.5);$('zoomFit').onclick=()=>setZoom(1);
 $('resetBtn').onclick=()=>{if(campaign){loadLesson(campaign.side,campaign.index);return;}const a=allOff().find(p=>p.id===$('offPreset').value),b=allDef().find(p=>p.id===$('defPreset').value);if(!a||!b)return;checkpoint();offensive=C.clone(a);defensive=C.clone(b);invalidate();refresh(true);};
 $('copyBtn').onclick=()=>{if(campaign)return;checkpoint();const play=sidePlay();play.id='draft-'+Date.now();play.name=play.name+' (copy)';dirty=true;invalidate();refresh();};
 $('saveBtn').onclick=()=>{if(campaign)return;
  const suggested=sidePlay().name.replace(/ \(copy\)$/,'')+' Custom';let name=prompt('Save the '+side+' play as:',suggested);if(!name?.trim())return;
  const target=side==='offense'?offensive:defensive;target.name=name.trim().slice(0,90);target.id='custom-'+side+'-'+Date.now();
  const list=custom[side];list.push(C.clone(target));setCustom();dirty=false;fillPresets();refresh();
 };
 $('exportBtn').onclick=()=>{const json=JSON.stringify({format:'route-lab-v1',offense:offensive,defense:defensive},null,2);const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='route-lab-matchup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
 $('importBtn').onclick=()=>{if(!campaign)$('importFile').click();};$('importFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;try{const text=await file.text();if(text.length>1_000_000)throw Error('File is too large.');
   const data=JSON.parse(text),a=data.offense,b=data.defense;
   if(!Array.isArray(a?.players)||!Array.isArray(b?.players)||a.players.length!==11||b.players.length!==11)throw Error('Expected an exported 11v11 matchup.');
   checkpoint();offensive=a;defensive=b;for(const pl of [...a.players,...b.players]){pl.label=String(pl.label??'P').slice(0,12);pl.id=String(pl.id??'').slice(0,40);pl.job=String(pl.job??'route').slice(0,30);}
   side='offense';selected=a.players[0].id;invalidate();refresh(true);
  }catch(err){alert('Import failed: '+err.message);}finally{$('importFile').value='';}
 };
 const svg=$('field');
 svg.addEventListener('pointerdown',e=>{
  if(playback)return;
  const pl=e.target.closest('[data-player]'); const node=e.target.closest('[data-point]');const pt=svgPoint(e);const wp=world(pt.x,pt.y);
  if(tool==='pan'||e.shiftKey){const shell=document.querySelector('.field-shell');drag={type:'pan',sx:e.clientX,sy:e.clientY,left:shell.scrollLeft,top:shell.scrollTop,moved:false};svg.setPointerCapture(e.pointerId);return;}
  if(node&&tool==='route'&&side==='offense'){
   const p=selectedPlayer();if(!p)return;drag={type:'waypoint',p,index:+node.dataset.point,old:JSON.stringify(p.route),moved:false};svg.setPointerCapture(e.pointerId);return;
  }
  if(pl){const team=pl.dataset.team,id=pl.dataset.player;const clicked=(team==='o'?offensive:defensive).players.find(p=>p.id===id);
    if(tool==='assign'&&selectedPlayer()&&team!==(side==='offense'?'o':'d')){
      const p=selectedPlayer();checkpoint();if(side==='offense'){p.blockTarget=id;p.job=['run','option'].includes(offensive.type)?'runblock':'passblock';p.route=[];}
      else {p.coverTarget=id;p.job='man';delete p.zone;}
      invalidate();refresh();return;
    }
    if(team===(side==='offense'?'o':'d')){
      selected=id;renderInspector();
      if(tool==='select'){drag={type:'player',p:clicked,start:{x:clicked.x,y:clicked.y,onLine:clicked.onLine},startPt:wp,moved:false};svg.setPointerCapture(e.pointerId);}
      renderField();return;
    }
    if(tool==='select'&&!campaign){selectSide(team==='o'?'offense':'defense');selected=id;renderInspector();renderField();return;}
    return;
  }
  fieldAction(selectedPlayer(),wp);
 });
 svg.addEventListener('pointermove',e=>{
  if(!drag)return;const pt=svgPoint(e),wp=world(pt.x,pt.y);
  if(drag.type==='pan'){const shell=document.querySelector('.field-shell');shell.scrollLeft=drag.left-(e.clientX-drag.sx);shell.scrollTop=drag.top-(e.clientY-drag.sy);drag.moved=true;return;}
  if(drag.type==='player'){
   const a=drag.p;const targetX=wp.x,targetY=side==='offense'?Math.min(.2,wp.y):Math.max(-.2,wp.y);
   if(Math.abs(a.x-targetX)>.04||Math.abs(a.y-targetY)>.04)drag.moved=true;
   a.x=Math.round(targetX*10)/10;a.y=Math.round(targetY*10)/10;
   if(side==='offense'){if(Math.abs(a.y)<.32){a.y=0;a.onLine=true;}else if(a.y<-.7)a.onLine=false;}
  }else if(drag.type==='waypoint'){
   drag.moved=true;drag.p.route[drag.index]={x:wp.x,y:wp.y};
  }
  renderField();
 });
 const stopDrag=()=>{if(!drag)return;const old=drag;drag=null;
  if(old.type==='pan')return;
  if(old.moved){const snap=JSON.parse(JSON.stringify({offensive,defensive,side,selected}));
   if(old.type==='player'){let p=sidePlay().players.find(p=>p.id===old.p.id);p.x=old.start.x;p.y=old.start.y;p.onLine=old.start.onLine;}
   else old.p.route=JSON.parse(old.old);
   checkpoint();offensive=snap.offensive;defensive=snap.defensive;dirty=true;invalidate();refresh();
  }else refresh();
 };
 svg.addEventListener('pointerup',stopDrag);svg.addEventListener('pointercancel',stopDrag);
 $('inspector').addEventListener('click',e=>{
  const pick=e.target.closest('[data-select]');if(pick){selected=pick.dataset.select;renderInspector();renderField();return;}
  const b=e.target.closest('[data-action]');if(!b)return;const p=selectedPlayer();if(!p)return;
  switch(b.dataset.action){
   case 'routeTool':setMode('route');break;case 'zoneTool':setMode('zone');break;
   case 'assignTool':setMode('assign');break;case 'motionTool':setMode('motion');break;
   case 'removeWaypoint':checkpoint();p.route?.pop();p.pattern='';invalidate();refresh();break;
   case 'clearRoute':checkpoint();p.route=[];p.pattern='';invalidate();refresh();break;
   case 'clearMotion':checkpoint();delete p.motion;invalidate();refresh();break;
   case 'makeRunner':checkpoint();offensive.runnerId=p.id;p.job='carry';if(offensive.type!=='run')offensive.type='run';invalidate();refresh();break;
  }
 });
 $('inspector').addEventListener('change',e=>{
  const input=e.target.closest('[data-field]');if(!input)return;const key=input.dataset.field;const p=selectedPlayer();if(!p)return;
  const val=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
  checkpoint();
  if(key==='pattern'){if(val){p.route=P.routeFrom(p,val);p.pattern=val;}}
  else if(['type','qbDepth','throwAt','runnerId','snapToId','allowScramble','primaryTarget'].includes(key)){offensive[key]=val;}
  else if(key.startsWith('stats.')){if(!p.stats)p.stats=C.statsOf(p);p.stats[key.split('.')[1]]=C.clamp(Math.round(val),1,99);}
  else if(key.startsWith('zone.')){if(!p.zone)p.zone={x:p.x,y:p.y,r:7,rY:7};p.zone[key.split('.')[1]]=val;}
  else if(key.startsWith('motion.')){if(!p.motion)p.motion={toX:p.x,toY:p.y};p.motion[key.split('.')[1]]=val;}
  else {p[key]=val;if(key==='onLine'){p.y=val?0:Math.min(-1,p.y);}if(key==='x')p.x=C.clamp(val,-26.5,26.5);
    if(key==='job' && val==='zone' && !p.zone)p.zone={x:p.x,y:p.y+5,r:7,rY:7};
    if(key==='job'&&val==='route'&&!p.route?.length)p.route=P.routeFrom(p,'go');
  }
  dirty=true;invalidate();refresh();
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('encyOverlay').hidden){closeEncyclopedia();return;}
  if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?'redo':'undo');}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();history('redo');}
  else if(e.code==='Space'){e.preventDefault();if(playback)togglePause();else run();}
  else if(e.key==='Escape')setMode('select');
 });
}
function setZoom(v){const shell=document.querySelector('.field-shell'), oldW=shell.scrollWidth,oldH=shell.scrollHeight;
 const cx=(shell.scrollLeft+shell.clientWidth/2)/Math.max(1,oldW),cy=(shell.scrollTop+shell.clientHeight/2)/Math.max(1,oldH);zoom=C.clamp(v,1,3.5);shell.classList.toggle('zoomed',zoom>1);$('field').style.width=(zoom*100)+'%';
 shell.scrollLeft=Math.max(0,cx*shell.scrollWidth-shell.clientWidth/2);shell.scrollTop=Math.max(0,cy*shell.scrollHeight-shell.clientHeight/2);
 $('zoomOut').disabled=zoom<=1;$('zoomIn').disabled=zoom>=3.5;
}
function run(){const validation=validationUI();if(!validation.valid){$('resultMain').textContent='Cannot run: illegal alignment';$('resultMeta').textContent=validation.errors[0]||'Fix highlighted validation issues.';return;}
 const seed=(Number($('seedInput').value)||71);if(campaign && campaignDrive)offensive.yardLine=campaignDrive.yardLine;const sim=C.simulate(offensive,defensive,seed);if(!sim.valid)return;
 $('seedInput').value=seed+1; // A new click is a new attempt; type an old seed to reproduce it exactly.
 if(campaign){campaignAttempt++;gradeCampaign(sim);}
 playback=sim;frameIndex=0;running=true;lastFrameTime=performance.now();$('timeline').disabled=false;$('timeline').max=sim.frames.length-1;$('timeline').value='0';
 $('pauseBtn').disabled=false;$('stepBtn').disabled=false;$('rewindBtn').disabled=false;$('editBtn').disabled=false;$('pauseBtn').textContent='Ⅱ Pause';
 $('duration').textContent=sim.result.seconds.toFixed(2)+'s';$('resultMain').textContent=sim.result.verdict;$('resultMeta').textContent=(sim.result.yards>=0?'+':'')+sim.result.yards.toFixed(1)+' yards • '+sim.result.seconds.toFixed(2)+' seconds • seed '+sim.result.seed;
 renderDecisions(sim);$('modeChip').textContent='SIMULATION';$('viewLabel').textContent='REPLAY';renderFrame();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
}
function renderFrame(){if(!playback)return;frameIndex=C.clamp(frameIndex,0,playback.frames.length-1);const f=playback.frames[frameIndex];
 $('timeline').value=frameIndex;$('clock').textContent=f.t.toFixed(2)+'s';$('eventLog').innerHTML=playback.events.filter(e=>e.t<=f.t+.05).map(e=>`<div><em>${e.t.toFixed(2)}s</em>${esc(e.text)}</div>`).join('')||'Waiting for snap.';
 renderField();
}
function tick(now){if(!running||!playback)return;const elapsed=Math.min(.2,(now-lastFrameTime)/1000)*Number($('speedSelect').value);lastFrameTime=now;
 const dt=.05;frameIndex=Math.min(playback.frames.length-1,frameIndex+Math.max(0,elapsed/dt));
 // Use fractional frames for accurate slow playback; rendering snaps to integer.
 const i=Math.floor(frameIndex);frameIndex=i===frameIndex?frameIndex:i+(frameIndex-i);
 const cached=frameIndex;frameIndex=Math.round(frameIndex);renderFrame();frameIndex=cached;
 if(frameIndex>=playback.frames.length-1){frameIndex=playback.frames.length-1;running=false;$('pauseBtn').textContent='▶ Replay';renderFrame();return;}
 raf=requestAnimationFrame(tick);
}
function togglePause(){if(!playback)return;running=!running;$('pauseBtn').textContent=running?'Ⅱ Pause':'▶ Play';lastFrameTime=performance.now();if(running){if(frameIndex>=playback.frames.length-1)frameIndex=0;raf=requestAnimationFrame(tick);}else cancelAnimationFrame(raf);}
function step(){if(!playback)return;running=false;cancelAnimationFrame(raf);frameIndex=Math.min(playback.frames.length-1,Math.floor(frameIndex)+1);$('pauseBtn').textContent='▶ Play';renderFrame();}
function rewind(){if(!playback)return;running=false;cancelAnimationFrame(raf);frameIndex=0;$('pauseBtn').textContent='▶ Play';renderFrame();}


function renderDecisions(sim){
 const slot=$('decisionLog');if(!slot)return;
 if(!sim.decisions?.length){slot.innerHTML='<p>No QB passing decision on this snap (run, sack, or no viable release).</p>';return;}
 slot.innerHTML=sim.decisions.map(dec=>{
  if(dec.action==='throwaway')return `<div class="decision-card"><b>${esc(dec.t)}s: QB threw away</b><p>${esc(dec.reason)}</p></div>`;
  return `<div class="decision-card"><div><b>${esc(dec.t)}s: ${esc(dec.target)}</b> <span>${esc(dec.reason)} · nearest rusher ${esc(dec.pressure)} yd</span></div><div class="decision-table">${dec.candidates.map((r,i)=>`<div class="decision-row ${r.target===dec.target?'picked':''}"><b>${esc(r.target)}</b><span>Read ${i+1}</span><span>Separation ${Math.round(r.separation*100)}%</span><span>Risk ${Math.round(r.risk*100)}%</span><span>Value ${esc(r.score)}</span></div>`).join('')}</div><small>Scores are simplified tactical estimates used by the simulator, not real NFL quarterback ratings.</small></div>`;
 }).join('');
}
function renderClinic(lesson){
 const info=lesson.clinic;if(!info){$('clinicPanel').innerHTML='';return;}
 const link=term=>`<button class="term-link" data-term="${esc(term)}">${esc(term)} ↗</button>`;
 $('clinicPanel').innerHTML=`<details class="coach-manual" open><summary>COACH'S CLINIC — learning objective, tactics & film study</summary>
 <div class="coach-content"><h3>Learning objective</h3><p>${esc(info.objective)}</p><h3>The breakdown</h3>${info.theory.map(p=>`<p>${esc(p)}</p>`).join('')}
 <h3>Design workshop</h3><ol>${info.craft.map(t=>`<li>${esc(t)}</li>`).join('')}</ol><h3>What to study on replay</h3><p>${esc(info.observe)}</p>
 <div class="coach-references"><strong>Look up:</strong> ${info.terms.map(link).join('')}</div></div></details>
 <div class="coach-quiz"><h3>COACHING CHECK ${campaignQuizCleared?'✓':''}</h3><p>${esc(info.question)}</p><div class="quiz-options">${info.choices.map((choice,i)=>`<button data-answer="${i}" ${campaignQuizCleared?'disabled':''}>${String.fromCharCode(65+i)}. ${esc(choice)}</button>`).join('')}</div><p class="quiz-feedback" id="quizFeedback">${campaignQuizCleared?'Correct — knowledge check completed.':'Choose an answer to confirm the principle before finishing the lesson.'}</p></div>`;
}
function bindEncyclopedia(){
 $('encyBtn').onclick=()=>openEncyclopedia();$('encyClose').onclick=closeEncyclopedia;
 $('encyOverlay').addEventListener('click',e=>{if(e.target===$('encyOverlay'))closeEncyclopedia();});
 $('encySearch').addEventListener('input',e=>{encySearch=e.target.value;renderEncyclopedia();});
 $('encyCategories').onclick=e=>{const btn=e.target.closest('[data-category]');if(!btn)return;encyCategory=btn.dataset.category;renderEncyclopedia();};
 $('encyResults').onclick=e=>{const btn=e.target.closest('[data-entry]');if(!btn)return;renderEncyclopediaEntry(btn.dataset.entry);};
 $('clinicPanel').onclick=e=>{
  const term=e.target.closest('[data-term]');if(term){openEncyclopedia(term.dataset.term);return;}
  const answer=e.target.closest('[data-answer]');if(!answer||!campaign||campaignQuizCleared)return;
  const c=K.lessons[campaign.side][campaign.index].clinic;
  if(+answer.dataset.answer===c.answer){campaignQuizCleared=true;renderClinic(K.lessons[campaign.side][campaign.index]);$('quizFeedback').textContent='Correct. '+c.explain;
    if(campaignDrillCleared&&!campaignSuccess)grantLesson();
  }else{$('quizFeedback').textContent='Not quite. '+c.explain+' Review the breakdown and try again.';}
 };
}
function openEncyclopedia(term){
 $('encyOverlay').hidden=false;document.body.classList.add('ency-open');
 if(term){encySearch='';encyCategory='All';$('encySearch').value='';}
 renderEncyclopedia();
 if(term){const found=E.byTitle(term);if(found)renderEncyclopediaEntry(found.id);}
 $('encySearch').focus();
}
function closeEncyclopedia(){$('encyOverlay').hidden=true;document.body.classList.remove('ency-open');}
function renderEncyclopedia(){
 const cats=['All',...new Set(E.entries.map(e=>e.category))];
 $('encyCategories').innerHTML=cats.map(c=>`<button data-category="${esc(c)}" class="${c===encyCategory?'active':''}">${esc(c)}</button>`).join('');
 const q=encySearch.toLowerCase().trim();const found=E.entries.filter(e=>(encyCategory==='All'||e.category===encyCategory)&&(!q||[e.title,e.category,e.description,...e.tags].join(' ').toLowerCase().includes(q)));
 $('encyCount').textContent=found.length+' of '+E.entries.length+' entries';
 $('encyResults').innerHTML=found.length?found.map(e=>`<button class="ency-result" data-entry="${e.id}"><span>${esc(e.category)}</span><b>${esc(e.title)}</b><small>${esc(e.description.slice(0,104))}…</small></button>`).join(''):'<p>No matching terms. Try another formation, assignment or rule.</p>';
 if(found.length)renderEncyclopediaEntry(found[0].id);else $('encyArticle').innerHTML='';
}
function renderEncyclopediaEntry(id){
 const e=E.entries.find(x=>x.id===id);if(!e)return;
 $('encyResults').querySelectorAll('[data-entry]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.entry===id));
 $('encyArticle').innerHTML=`<span class="eyebrow">${esc(e.category)}</span><h2>${esc(e.title)}</h2><p>${esc(e.description)}</p><h3>Try it in Route Lab</h3><p>${esc(e.practice)}</p><div class="ency-tags">${e.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><p class="ency-authority">Educational coaching reference. The official NFL rulebook controls detailed legality and enforcement.</p><a href="https://operations.nfl.com/rules-officiating/2026-nfl-rulebook/" target="_blank" rel="noopener noreferrer">Official 2026 NFL rulebook ↗</a>`;
}

function safeProgress(){try{localStorage.setItem('route-lab-campaign-v1',JSON.stringify(campaignProgress));}catch{}}
function modeCampaignUI(){
 const banner=$('campaignBanner');banner.hidden=!campaign;
 document.body.classList.toggle('campaign-on',!!campaign);
 $('offPreset').disabled=!!campaign;$('defPreset').disabled=!!campaign;
 for(const id of ['saveBtn','importBtn','copyBtn','exportBtn'])$(id).disabled=!!campaign;
 $('sideTabs').querySelectorAll('[data-side]').forEach(b=>{b.disabled=!!campaign&&b.dataset.side!==campaign.side;b.classList.toggle('active',b.dataset.side===side);});
 $('resetBtn').textContent=campaign?'↶ Restart lesson':'Reset play';
 $('campaignOffBtn').classList.toggle('active',campaign?.side==='offense');$('campaignDefBtn').classList.toggle('active',campaign?.side==='defense');$('campaignFreeBtn').classList.toggle('active',!campaign);
 if(!campaign){$('campaignStageList').innerHTML='';$('clinicPanel').innerHTML='';$('scrimmageScout').innerHTML='';return;}
 const lesson=K.lessons[campaign.side][campaign.index],progress=campaignProgress[campaign.side];
 $('campaignKicker').textContent=(campaign.side==='offense'?'OFFENSIVE':'DEFENSIVE')+' CAMPAIGN • LESSON '+(campaign.index+1)+' / '+K.lessons[campaign.side].length;
 $('campaignTitle').textContent=lesson.title;$('campaignRole').textContent=lesson.role;
 $('campaignDetail').textContent=lesson.detail;$('campaignTask').textContent=lesson.task;$('campaignHint').textContent=lesson.hint;
 $('campaignNextBtn').disabled=!campaignSuccess;$('campaignNextBtn').textContent=campaign.index===K.lessons[campaign.side].length-1?'Finish campaign →':'Next lesson →';
 $('campaignStageList').innerHTML=K.lessons[campaign.side].map((l,i)=>`<button data-stage="${i}" ${i>progress?'disabled':''} class="campaign-stage ${i===campaign.index?'current':''}" title="${esc(l.title)}">${i<progress?'✓':i+1}</button>`).join('');
 $('campaignScore').textContent=campaignDrive?campaignDriveText():(campaignSuccess?'LESSON COMPLETE':'TRAINING FIELD');
 const w=K.SCRIMMAGE_WAVES[campaignWave],wName=lesson.drive?'FULL DRIVE':w.name;
 $('campaignKicker').textContent+=' • '+wName+' • '+offensive.players.length+'v'+defensive.players.length;
 const missionOne=campaign.side==='offense'&&campaign.index===0;
 const missionOneLook=[
  'Baseline: one MLB protects a central area and reacts to the run. Observe the fit before changing the RB path.',
  'Same 3v1 run with the MLB shadowing the RB. Watch how pursuit changes when the defender follows the carrier.',
  'Same backfield against an area assignment. Read where the MLB zone meets the RB lane.',
  'The MLB attacks the backfield as a blitzer. Scout the pressure, then test a changed RB path against it.'
 ];
 $('campaignTask').textContent=missionOne&&campaignWave>0?'Scout the '+wName+' look, then edit the RB path and gain at least 2 yards.':lesson.task+(lesson.drive?'':' Beat this '+wName+' opponent before it rotates to the next defense.');
 $('campaignHint').textContent=missionOne&&campaignWave>0?'Run once to observe the same matchup context against this new assignment. Then select RB, draw a different path, and compare the yards and contact point.':lesson.hint;
 const brief=missionOne?missionOneLook[campaignWave]:w.brief;
 $('scrimmageScout').innerHTML=lesson.drive?'<b>FULL-SQUAD CHALLENGE</b><p>Analyze each defense and build the response that moves the ball or prevents a conversion.</p>':'<b>'+esc(wName)+' • '+offensive.players.length+'v'+defensive.players.length+'</b><p>'+esc(brief)+'</p><small>Rotation '+(campaignWave+1)+' / '+K.SCRIMMAGE_WAVES.length+' · scout → man → zone → blitz</small>'+(missionOne?renderMissionOneBoard():'' );
 renderClinic(lesson);
 $('campaignFeedback').textContent=campaignSuccess?'Objective cleared. Advance when ready.':'Edit your play and run the simulation to test your idea.';
}
function renderMissionOneBoard(){
 const off=offensive.players,def=defensive.players;
 const describe=(p,side)=>{
  const target=(side==='offense'?def:off).find(q=>q.id===(side==='offense'?p.blockTarget:p.coverTarget));
  if(p.job==='quarterback')return 'Receives the snap and executes the handoff decision.';
  if(p.job==='carry')return 'Carries the ball along the drawn run path.';
  if(['runblock','passblock','block','pull'].includes(p.job))return target?'Blocks '+target.label+'.':'Blocks the nearest available threat.';
  if(p.job==='man')return target?'Man responsibility: '+target.label+'.':'Man coverage with no named target.';
  if(p.job==='zone')return 'Protects the area near ('+Number(p.zone?.x||0).toFixed(0)+', '+Number(p.zone?.y||0).toFixed(0)+') and reacts to threats.';
  if(p.job==='runfit')return 'Fits the run near x='+Number(p.fitX??0).toFixed(0)+' and pursues the carrier.';
  if(p.job==='rush'||p.job==='blitz')return p.job==='blitz'?'Adds pressure as a blitzer.':'Rushes the quarterback or ball carrier.';
  if(p.job==='route')return 'Runs the assigned route to stress coverage.';
  return 'Assignment: '+p.job+'.';
 };
 const rows=[...off.map(p=>['O',p,describe(p,'offense')]),...def.map(p=>['D',p,describe(p,'defense')])];
 return '<div style="margin-top:9px;padding:9px;border:1px solid #31514e;border-radius:8px;background:#071b20"><b>Mission One assignment scout</b><ul style="margin:6px 0;padding-left:19px;line-height:1.5">'+rows.map(([team,p,text])=>'<li><b>'+team+' · '+esc(p.label)+'</b> — '+esc(text)+'</li>').join('')+'</ul><small>Intended matchup: trace the RB’s lane against the lone MLB. Run the unchanged play first, then redraw only the RB path and compare the result.</small></div>';
}
function campaignDriveText(){if(!campaignDrive)return '';const d=campaignDrive;return (campaign.side==='offense'?'DRIVE':'DEFENSIVE STAND')+' • '+d.down+' & '+Math.max(1,Math.ceil(d.toGain))+' • BALL AT '+d.yardLine.toFixed(1)+' • '+d.snaps+' SNAPS';}
function loadLesson(campaignSide,index){
 if(!K.lessons[campaignSide]||index<0||index>=K.lessons[campaignSide].length||index>campaignProgress[campaignSide])return;
 const lesson=K.lessons[campaignSide][index];campaignWave=0;const setup=K.scrimmageSetup(lesson,campaignSide,0);if(lesson.drive)setup.offense.yardLine=campaignSide==='offense'?80:50;
 invalidate();offensive=setup.offense;defensive=setup.defense;campaign={side:campaignSide,index};side=campaignSide;selected=sidePlay().players[0]?.id||'';campaignBaseline=C.clone({offense:offensive,defense:defensive});
 campaignDrillCleared=false;campaignQuizCleared=false;campaignDrive=lesson.drive?{yardLine:campaignSide==='offense'?80:50,down:1,toGain:10,snaps:0}:null;campaignAttempt=0;campaignSuccess=false;undo=[];redo=[];dirty=false;
 $('seedInput').value=lesson.seed;setMode('select');modeCampaignUI();refresh(true);
}
function launchCampaign(which){if(which==='free'){campaign=null;campaignDrive=null;campaignBaseline=null;campaignSuccess=false;invalidate();offensive=C.clone(offPresets[0]);defensive=C.clone(defPresets[0]);side='offense';selected='oSL';undo=[];redo=[];modeCampaignUI();refresh(true);return;}
 loadLesson(which,Math.min(campaignProgress[which],K.lessons[which].length-1));}
function markDrillComplete(){campaignDrillCleared=true;if(campaignQuizCleared)grantLesson();else {$('campaignFeedback').textContent='Field objective completed. Answer the coaching check correctly to finish this lesson.';}}
function grantLesson(){
 const lesson=K.lessons[campaign.side][campaign.index];
 if(!lesson.drive && campaignWave<K.SCRIMMAGE_WAVES.length-1){
  campaignWave++;const fresh=K.scrimmageSetup(lesson,campaign.side,campaignWave);
  invalidate();offensive=fresh.offense;defensive=fresh.defense;campaignBaseline=C.clone({offense:offensive,defense:defensive});
  campaignDrillCleared=false;campaignAttempt=0;campaignSuccess=false;undo=[];redo=[];selected=sidePlay().players[0]?.id||'';
  $('seedInput').value=lesson.seed+campaignWave*131;modeCampaignUI();refresh(true);
  $('campaignFeedback').textContent='Opponent rotated to '+fresh.wave.name+'. Read the look, craft a counterplay, and run it.';return;
 }
 campaignSuccess=true;const side=campaign.side,idx=campaign.index;
 if(campaignProgress[side]===idx){campaignProgress[side]=idx+1;safeProgress();}
 modeCampaignUI();$('campaignFeedback').textContent='✓ Objective cleared. '+(idx===K.lessons[side].length-1?'Campaign complete! Return to Free play or replay lessons.':'Choose Next lesson to advance.');
 $('campaignNextBtn').disabled=false;
}
function gradeCampaign(sim){
 if(!campaign||campaignSuccess)return;const lesson=K.lessons[campaign.side][campaign.index];
 const objective=K.objectiveForWave(lesson,campaign.side,campaignWave);
 const check=K.assess(objective,campaignBaseline,offensive,defensive,sim);
 if(campaignWave>0 && !K.changed(campaignBaseline,{offense:offensive,defense:defensive},objective,campaign.side)){
  $('campaignFeedback').textContent='Edit an assignment, route or alignment for this specific opponent before running again.';return;
 }
 if(!check.pass && !(lesson.drive && K.changed(campaignBaseline,{offense:offensive,defense:defensive},lesson,campaign.side))){$('campaignFeedback').textContent='Not yet: '+check.message;return;}
 if(!lesson.drive){if(check.pass)markDrillComplete();else $('campaignFeedback').textContent='Try again: '+check.message;return;}
 const d=campaignDrive,r=sim.result;d.snaps++;
 const gain=Math.max(0,r.yards);const verdict=r.verdict;
 if(campaign.side==='offense'){
  if(verdict.startsWith('Touchdown')){markDrillComplete();return;}
  if(verdict.includes('Interception')){d.down=1;d.toGain=10;d.yardLine=80;d.snaps=0;$('campaignFeedback').textContent='Interception! Drive restarted at the 20. Edit and try again.';}
  else {d.yardLine=Math.min(99,d.yardLine+gain);d.toGain-=gain;if(d.toGain<=0){d.down=1;d.toGain=Math.min(10,100-d.yardLine);$('campaignFeedback').textContent='First down! Call the next play.';}else if(d.down>=4){d.down=1;d.toGain=10;d.yardLine=80;d.snaps=0;$('campaignFeedback').textContent='Turnover on downs. New drive at the 20.';}else{d.down++;$('campaignFeedback').textContent='+'+gain.toFixed(1)+' yards. Keep moving toward the end zone.';}}
 }else{
  if(verdict.startsWith('Touchdown')||gain>=d.toGain){d.down=1;d.toGain=10;d.yardLine=50;d.snaps=0;$('campaignFeedback').textContent='They converted. Reset the stand, adjust your defense, and try again.';}
  else if(d.down>=4){markDrillComplete();return;}
  else {d.down++;d.toGain-=gain;d.yardLine+=gain;$('campaignFeedback').textContent='Stop '+d.snaps+' recorded. '+(4-d.down+1)+' more downs to defend.';}
 }
 $('campaignScore').textContent=campaignDriveText();
}
$('campaignOffBtn').onclick=()=>launchCampaign('offense');
$('campaignDefBtn').onclick=()=>launchCampaign('defense');
$('campaignFreeBtn').onclick=()=>launchCampaign('free');
$('campaignRestartBtn').onclick=()=>{if(campaign)loadLesson(campaign.side,campaign.index);};
$('campaignNextBtn').onclick=()=>{if(!campaignSuccess)return;const side=campaign.side,i=campaign.index+1;if(i<K.lessons[side].length)loadLesson(side,i);else launchCampaign('free');};
$('campaignStageList').onclick=e=>{const b=e.target.closest('[data-stage]');if(b&&campaign)loadLesson(campaign.side,+b.dataset.stage);};
$('coachLayer').addEventListener('change',e=>{coachLayer=e.target.value;renderField();});
bindEncyclopedia();bindEvents();fillPresets();refresh();modeCampaignUI();document.getElementById('startupFallback')?.remove();

})();

