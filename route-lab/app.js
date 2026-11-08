(function(){
'use strict';
const C=window.GridironCore,P=window.GridironPlays,K=window.RouteCampaign,E=window.RouteEncyclopedia,G=window.RouteGame;
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const W=1080,H=900,OX=540,OY=745,XS=18,YS=15;
const pos=(p)=>({x:OX+p.x*XS,y:OY-p.y*YS}), world=(x,y)=>({x:C.clamp((x-OX)/XS,-26.6,26.6),y:C.clamp((OY-y)/YS,-9.2,39.5)});
const offPresets=P.createOffensePresets(),pitchBack=P.createPitchBack(),goalLinePower=P.createGoalLinePower(),defPresets=P.createDefensePresets();
const initCustom=()=>{try{let v=JSON.parse(localStorage.getItem('route-lab-custom-v1')||'{"offense":[],"defense":[]}');return v&&Array.isArray(v.offense)&&Array.isArray(v.defense)?v:{offense:[],defense:[]};}catch{return {offense:[],defense:[]};}};
const custom=initCustom();
let offensive=C.clone(offPresets[0]), defensive=C.clone(defPresets[0]);
let side='offense',selected='oSL',tool='select',drag=null,undo=[],redo=[],running=false,playback=null,frameIndex=0,lastFrameTime=0,raf=0,dirty=false,zoom=1;
let campaignDrillCleared=false,campaignQuizCleared=false,encyCategory='All',encySearch='';
let campaignWave=0,coachLayer='assignments';
let gameMode='menu',gameState=G.createGame(),pendingState=null,pendingRuling=null,playStartState=null,lastKick=null,kickFrame=0,kickTimer=null,manualOverride=false,stagedCpuKick=null,coinFace='heads',coinReady=false;
let profile=(()=>{try{const p=JSON.parse(localStorage.getItem('route-lab-profile-v1')||'null');return p&&['heads','tails'].includes(p.call)&&/^#[0-9a-f]{6}$/i.test(p.color)?p:null;}catch{return null;}})();
let campaign=null,campaignBaseline=null,campaignProgress=K.readProgress({getItem:k=>{try{return localStorage.getItem(k);}catch{return null;}}}),campaignDrive=null,campaignSuccess=false,campaignAttempt=0;
const OFF_JOBS=['route','passblock','runblock','block','pull','carry','release','quarterback'], DEF_JOBS=['rush','blitz','man','zone','spy','contain','runfit','deep'];
const STAT_LABELS={speed:'Speed',acceleration:'Acceleration',agility:'Agility',stamina:'Stamina',strength:'Strength',blocking:'Blocking',passRush:'Pass rush',coverage:'Coverage',pursuit:'Pursuit',tackling:'Tackling',hands:'Hands',routeRunning:'Route running',vision:'Runner vision',awareness:'Awareness',throwAccuracy:'Passing accuracy',throwPower:'Arm strength'};
const routeKinds=['go','fade','slant','flat','out','in','dig','corner','post','curl','hitch','drag','wheel','seam','comeback','swing','angle','bubble','shallow'];
const sidePlay=()=>side==='offense'?offensive:defensive;
const selectedPlayer=()=>sidePlay().players.find(p=>p.id===selected);
const allOff=()=>[...offPresets,pitchBack,goalLinePower,...custom.offense],allDef=()=>[...defPresets,...custom.defense];
function setCustom(){try{localStorage.setItem('route-lab-custom-v1',JSON.stringify(custom));}catch{}}
function saveExhibition(){if(!gameState.teams||campaign||gameState.phase==='coinflip')return;try{localStorage.setItem('route-lab-exhibition-v1',JSON.stringify({version:1,gameState,pendingState,pendingRuling,offensive,defensive,lastKick,seed:Number($('seedInput').value)||71}));$('menuLoad').disabled=false;$('loadGameBtn').disabled=false;}catch{}}
function showPane(name){$('startOverlay').hidden=false;document.body.classList.add('start-open');for(const pane of ['menu','profile','coin','depth','jump','campaign'])$('pane-'+pane).hidden=pane!==name;}
function hidePane(){$('startOverlay').hidden=true;document.body.classList.remove('start-open');}
function paintUniform(){document.documentElement.style.setProperty('--home-uniform',profile?.color||'#41ded0');}
function awayUniform(){const c=profile?.color||'#41ded0',r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16);return r>150&&g<170?'#41ded0':'#ff8068';}
function newSeed(){const a=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(a);else a[0]=Math.floor(Math.random()*4294967296);return a[0]||1;}
function beginFree(){if(!profile){showPane('profile');return;}const seed=newSeed();gameMode='free';campaign=null;campaignDrive=null;campaignBaseline=null;campaignSuccess=false;gameState=G.createExhibition(seed);pendingState=null;pendingRuling=null;playStartState=null;lastKick=null;manualOverride=false;coinReady=false;coinFace=(newSeed()&1)?'heads':'tails';offensive=C.clone(offPresets[0]);defensive=C.clone(defPresets[0]);side='offense';selected='oSL';undo=[];redo=[];invalidate();modeCampaignUI();renderSpecialists();autoNext();refresh(true);$('coinResult').textContent='Coin in the air…';$('coinCallText').textContent=profile.call.toUpperCase();$('coinToken').textContent='?';$('coinToken').classList.remove('flipping');void $('coinToken').offsetWidth;$('coinToken').classList.add('flipping');$('coinActions').hidden=true;showPane('coin');setTimeout(()=>{if(gameState.phase!=='coinflip'||gameMode!=='free')return;coinReady=true;$('coinToken').classList.remove('flipping');$('coinToken').textContent=coinFace==='heads'?'H':'T';const won=coinFace===profile.call;$('coinResult').textContent=`${coinFace.toUpperCase()} · ${won?'HOME wins':'AWAY wins'} the toss`;$('coinChoiceLabel').hidden=!won;$('coinChoice').value='receive';$('coinActions').hidden=false;},1300);}
function finishCoin(kickoffNow=false){if(!coinReady||gameState.phase!=='coinflip')return false;G.flipCoin(gameState,profile.call,coinFace,$('coinChoice').value);hidePane();renderSpecialists();autoNext();refresh(true);$('officialCall').textContent=gameState.log.at(-1);saveExhibition();if(kickoffNow)doKick('kickoff');return true;}
function renderDepth(){const team=(pendingState||gameState).teams?.home;if(!team)return;const labels={offense:'Offense · O',defense:'Defense · X',special:'Special teams'},keys=slot=>slot==='QB'?['throwAccuracy','throwPower','awareness']:['LT','LG','C','RG','RT'].includes(slot)?['blocking','strength','awareness']:['X','Z','SL','TE','RB'].includes(slot)?['speed','hands','routeRunning','vision']:['CB','FS','SS','NB'].includes(slot)?['coverage','speed','awareness']:['DE','DT','NT'].includes(slot)?['passRush','strength','pursuit']:['coverage','pursuit','tackling'],specialFit=(slot,p)=>slot==='KR'?`Speed ${p.stats.speed} · Vision ${p.stats.vision}`:slot==='K'?`Power ${p.stats.power} · Accuracy ${p.stats.accuracy}`:`Power ${p.stats.power} · Hang ${p.stats.hang}`;$('depthKickoff').textContent=gameState.phase==='coinflip'?'Done · kickoff':'Done · return to game';$('depthRows').innerHTML=Object.entries(labels).map(([unit,title])=>`<section><h3>${title}</h3><div class="depth-grid">${team.depth[unit].map(slot=>`<label class="depth-row"><b>${esc(slot.label)}</b><select data-unit="${unit}" data-slot="${esc(slot.slot)}">${slot.players.map((p,i)=>`<option value="${i}" ${slot.starter===i?'selected':''} ${p.outForGame||p.unavailableUntilPlay>(pendingState||gameState).plays?'disabled':''}>${esc(p.name)} #${p.number} · ${unit==='special'?specialFit(slot.label,p):('Fit '+Math.round(keys(slot.label).reduce((a,k)=>a+p.stats[k],0)/keys(slot.label).length))}${p.outForGame?' · OUT':p.unavailableUntilPlay>(pendingState||gameState).plays?' · evaluation':''}</option>`).join('')}</select></label>`).join('')}</div></section>`).join('');}
function loadExhibition(){try{const d=JSON.parse(localStorage.getItem('route-lab-exhibition-v1')||'null');if(d?.version!==1||!d.gameState?.teams?.home||!d.gameState?.teams?.away||!Array.isArray(d.offensive?.players)||!Array.isArray(d.defensive?.players))return false;gameMode='free';campaign=null;gameState=d.gameState;pendingState=d.pendingState||null;pendingRuling=d.pendingRuling||null;playStartState=null;offensive=d.offensive;defensive=d.defensive;lastKick=d.lastKick||null;kickFrame=lastKick?.frames?.length?lastKick.frames.length-1:0;manualOverride=false;stagedCpuKick=pendingState?null:G.cpuFourthDownKick(gameState,false);side='offense';selected=offensive.players[0]?.id||'';$('seedInput').value=d.seed||71;invalidate();modeCampaignUI();renderSpecialists();refresh(true);hidePane();$('officialCall').textContent=stagedCpuKick?'CPU selects '+(stagedCpuKick==='fieldGoal'?'field goal':'punt')+'; press Run play to execute.':pendingRuling?'Referee: '+pendingRuling.call:(gameState.log.at(-1)||'Referee: game resumed.');return true;}catch{return false;}}
function checkpoint(){manualOverride=true;stagedCpuKick=null;undo.push(JSON.stringify({offensive,defensive,side,selected}));if(undo.length>70)undo.shift();redo=[];}
function restore(str){const s=JSON.parse(str);offensive=s.offensive;defensive=s.defensive;side=s.side;selected=s.selected;dirty=true;setMode('select');invalidate();refresh(true);}
function history(dir){let from=dir==='undo'?undo:redo,to=dir==='undo'?redo:undo;if(!from.length)return;to.push(JSON.stringify({offensive,defensive,side,selected}));restore(from.pop());}
function invalidate(){running=false;playback=null;frameIndex=0;cancelAnimationFrame(raf);$('timeline').disabled=true;$('pauseBtn').disabled=true;$('stepBtn').disabled=true;$('rewindBtn').disabled=true;$('editBtn').disabled=true;$('clock').textContent='0.00s';$('duration').textContent='—';$('modeChip').textContent='EDIT MODE';$('viewLabel').textContent='DESIGN';$('resultMain').textContent='Ready for the snap';$('resultMeta').textContent='Run the matchup to see the tactical outcome.';$('moveReport').textContent='';$('eventLog').textContent='Simulation events will appear here.';}
function fillPresets(){
 function fill(el,arr,key){const prior=el.value;el.innerHTML=arr.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  const current=key==='offense'?offensive:defensive;
  el.value=arr.some(p=>p.id===current.id)?current.id:(arr.some(p=>p.id===prior)?prior:arr[0]?.id||'');}
 fill($('offPreset'),allOff(),'offense');fill($('defPreset'),allDef(),'defense');
 updateCallContext();
 $('lateralTarget').innerHTML='<option value="">None</option>'+offensive.players.filter(p=>p.id!==offensive.runnerId).map(p=>`<option value="${esc(p.id)}">${esc(p.label)} #${esc(p.number)}</option>`).join('');
 $('lateralTarget').value=offensive.lateralToId||'';$('lateralAt').value=String(offensive.lateralAt??1.7);
}
function updateCallContext(){const el=$('playCallContext');if(!el)return;const s=pendingState||gameState;if(gameMode!=='free'||!s?.teams||!['scrimmage','try'].includes(s.phase)){el.textContent='Choose a play for this matchup.';return;}const toEnd=s.possession==='home'?100-s.ball:s.ball,zone=toEnd<=2?'GOAL LINE':toEnd<=10?'GOAL TO GO':toEnd<=20?'RED ZONE':toEnd<=40?'OPEN FIELD':'BACKED UP';el.innerHTML=`<b>${zone}</b> · ${s.phase==='try'?'TRY':`${s.down}${s.down===1?'st':s.down===2?'nd':s.down===3?'rd':'th'} & ${Math.ceil(s.toGain)}`} · ${Math.ceil(toEnd)} yd to end zone<br><small>CPU suggestion is staged. Change either selector to override, then press Run play.</small>`;}
function changePreset(which){if(campaign)return;const value=$(which==='offense'?'offPreset':'defPreset').value;const source=(which==='offense'?allOff():allDef()).find(p=>p.id===value);if(!source)return;
 checkpoint();const team=which==='offense'?gameState.possession:(gameState.possession==='home'?'away':'home');if(which==='offense')offensive=G.dressPlay(gameState,source,team,'offense');else defensive=G.dressPlay(gameState,source,team,'defense');selected=(sidePlay().players[0]?.id||'');dirty=false;invalidate();refresh(true);saveExhibition();}
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
function renderSpecialists(){
 const el=$('specialistEditor');if(!el)return;
 el.innerHTML='<div class="specialist-grid">'+['home','away'].flatMap(team=>[['kicker',['power','accuracy']],['punter',['power','hang']],['returner',['speed','vision','agility']],['unit',['coverage','returnBlocking']]].map(([unit,ratings])=>'<div class="specialist-card"><strong>'+team.toUpperCase()+' '+unit.toUpperCase()+'</strong>'+ratings.map(r=>'<label>'+r+' <input type="number" min="1" max="99" data-team="'+team+'" data-unit="'+unit+'" data-rating="'+r+'" value="'+(unit==='unit'?gameState.specialists[team][r]:gameState.specialists[team][unit][r])+'"></label>').join('')+'</div>')).join('')+'</div>';
}
function stopKickReplay(){if(kickTimer){clearInterval(kickTimer);kickTimer=null;}$('kickReplayBtn').textContent='▶ Kick replay';}
function playKickReplay(){if(!lastKick?.frames?.length)return;if(kickTimer){stopKickReplay();return;}if(kickFrame>=lastKick.frames.length-1)kickFrame=0;$('kickReplayBtn').textContent='Ⅱ Pause kick';kickTimer=setInterval(()=>{if(!lastKick?.frames?.length){stopKickReplay();return;}kickFrame=Math.min(lastKick.frames.length-1,kickFrame+1);renderOverview();if(kickFrame>=lastKick.frames.length-1)stopKickReplay();},75);renderOverview();}
function replayInProgress(){return !!(playback&&playStartState&&playback.frames?.length&&frameIndex<playback.frames.length-1);}
function renderOverview(){
 const el=$('fullField');if(!el)return;const s=pendingState||gameState;let ball=s.ball;if(replayInProgress()){const liveBall=playback.frames[Math.min(Math.round(frameIndex),playback.frames.length-1)]?.ball;if(Number.isFinite(liveBall?.y))ball=C.clamp(playStartState.ball+(playStartState.possession==='home'?1:-1)*liveBall.y,0,100);}let out='<rect x="0" y="0" width="1200" height="270" fill="#0b3b31"/><rect x="0" y="0" width="100" height="270" fill="#173147"/><rect x="1100" y="0" width="100" height="270" fill="#4d2a32"/><rect x="100" y="15" width="1000" height="240" fill="#145943" stroke="#cce7dc" stroke-width="3"/>';
 for(let y=0;y<=100;y+=5){const x=100+y*10;out+=`<path d="M${x} 15V255" stroke="#d4e8df" stroke-opacity="${y%10===0?.5:.23}" stroke-width="${y%10===0?2:1}"/>`;if(y>0&&y<100&&y%10===0)out+=`<text x="${x}" y="135" text-anchor="middle" fill="#d3eee4" font-size="22" font-weight="800">${y<=50?y:100-y}</text>`;}
 out+='<text x="50" y="143" text-anchor="middle" fill="#a8ddf3" font-size="17" font-weight="900" transform="rotate(-90 50 143)">HOME END ZONE</text><text x="1150" y="143" text-anchor="middle" fill="#ffd1c7" font-size="17" font-weight="900" transform="rotate(90 1150 143)">AWAY END ZONE</text>';
 if(lastKick?.frames?.length){
  const frames=lastKick.frames,f=frames[Math.min(kickFrame,frames.length-1)];
  if(lastKick.alignment?.lockedUntilLanding){const receive=lastKick.receive,lo=receive==='home'?100:900;out+=`<rect x="${lo}" y="17" width="200" height="235" fill="#ffd58a" opacity=".11"/><text x="${lo+100}" y="32" text-anchor="middle" fill="#ffe2aa" font-size="11" font-weight="800">LANDING ZONE</text>`;}
  const travel=frames.slice(0,Math.min(kickFrame+1,frames.length)).filter(v=>v.ball.phase==='flight');
  if(travel.length>1)out+=`<polyline points="${travel.map(v=>`${100+v.ball.yard*10},${135+v.ball.lane*3.7}`).join(' ')}" fill="none" stroke="#ffcf69" stroke-width="3" stroke-dasharray="5 4"/>`;
  const returned=frames.slice(0,Math.min(kickFrame+1,frames.length)).filter(v=>v.ball.phase==='return');
  if(returned.length>1)out+=`<polyline points="${returned.map(v=>`${100+v.ball.yard*10},${135+v.ball.lane*3.7}`).join(' ')}" fill="none" stroke="#9be9ff" stroke-width="3"/>`;
  for(const p of f.players){const x=100+p.yard*10,y=135+p.lane*3.7,color=p.team==='home'?(profile?.color||'#41ded0'):awayUniform(),radius=p.role==='returner'?8:5;out+=`<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="#071d22" stroke-width="2"><title>${p.team.toUpperCase()} ${p.id} ${p.role}</title></circle>`;}
  out+=`<circle cx="${100+f.ball.yard*10}" cy="${135+f.ball.lane*3.7}" r="6" fill="#ffe399" stroke="#493410" stroke-width="2"/>`;
  $('kickTimeline').disabled=false;$('kickReplayBtn').disabled=false;$('kickTimeline').max=frames.length-1;$('kickTimeline').value=kickFrame;$('kickFrameLabel').textContent=`${f.t.toFixed(2)}s · ${f.ball.phase} · 22 players`;
 }else{$('kickTimeline').disabled=true;$('kickReplayBtn').disabled=true;$('kickTimeline').value=0;$('kickFrameLabel').textContent='No kick replay';}
 const marker=100+ball*10;const situation=replayInProgress()?playStartState:(pendingState&&playStartState?playStartState:s);if(situation.phase==='scrimmage'){const los=100+situation.ball*10,dir=situation.possession==='home'?1:-1,gain=100+C.clamp(situation.ball+dir*Math.min(situation.toGain,situation.possession==='home'?100-situation.ball:situation.ball),0,100)*10;out+=`<path d="M${los} 15V255" stroke="#ffcf69" stroke-width="5"/><text x="${los}" y="30" text-anchor="middle" fill="#ffe4a9" font-size="11" font-weight="900">LINE OF SCRIMMAGE</text><path d="M${gain} 15V255" stroke="#6de4d0" stroke-width="4" stroke-dasharray="8 5"/><text x="${gain}" y="245" text-anchor="middle" fill="#b3fff0" font-size="11" font-weight="900">LINE TO GAIN</text>`;}else out+=`<path d="M${marker} 15V255" stroke="#ffcf69" stroke-width="5"/>`;out+=`<circle cx="${marker}" cy="44" r="14" fill="#ffe19c" stroke="#5c3d16" stroke-width="3"/><text x="${marker}" y="219" text-anchor="middle" fill="#fff2bb" font-size="17" font-weight="900">${s.possession.toUpperCase()} ${s.down}&${Math.ceil(s.toGain)}</text>`;
 if(pendingState&&playStartState?.phase==='scrimmage'){const next=100+pendingState.ball*10;out+=`<path d="M${next} 15V255" stroke="#a4f4e0" stroke-width="4"/><text x="${next}" y="65" text-anchor="middle" fill="#c8fff0" font-size="12" font-weight="800">RULING</text>`;}
 el.innerHTML=out;
 $('gameScore').textContent=`HOME ${s.score.home} · AWAY ${s.score.away}`;$('gameClock').textContent=s.phase==='final'?'FINAL':`Q${s.quarter} ${String(Math.floor(s.clock/60)).padStart(2,'0')}:${String(s.clock%60).padStart(2,'0')}`;
 const liveSituationSpot=replayInProgress()?G.spotText({...s,ball}):G.spotText(s);$('gameSituation').textContent=s.phase==='scrimmage'?`${s.down} & ${Math.ceil(s.toGain)} · ${liveSituationSpot} · ${s.possession.toUpperCase()} ball`:s.phase.toUpperCase();
 $('gameTimeouts').textContent=`TO HOME ${s.timeouts.home} / AWAY ${s.timeouts.away}`;
 $('gameBook').innerHTML=(pendingState?pendingState.log:s.log).slice().reverse().map(x=>'<div>'+esc(x)+'</div>').join('');
 const choice=pendingRuling?.choices,review=pendingRuling?.review;
 $('officiatingChoice').hidden=!pendingState||!choice;
 $('penaltyAcceptBtn').disabled=!choice||!pendingState;
 $('penaltyDeclineBtn').disabled=!choice||!pendingState;
 $('penaltyEvidence').textContent=choice?pendingRuling.fouls.map(f=>`${f.code} · ${f.player} · ${f.time.toFixed(2)}s · ${f.evidence}`).join(' | '):'';
 for(const team of ['home','away']){const b=$(team+'ChallengeBtn'),record=pendingState?.challenges?.[team]||{used:0,won:0};b.disabled=!pendingState||!review||review.done||review.booth||pendingState.timeouts[team]<=0||record.used>=2+(record.won>0?1:0);}
 $('reviewEvidence').textContent=review&&!review.done?`On-field spot +${review.calledSpot.toFixed(2)} yd · replay frame +${review.exactSpot.toFixed(2)} yd · line to gain +${gameState.toGain.toFixed(2)} yd${review.booth?' · booth review':''}`:'';
 $('downLabel').textContent=s.phase==='scrimmage'?`${s.down} & ${Math.ceil(s.toGain)}`:s.phase.toUpperCase();$('nextBtn').textContent=['kickoff','safetyKick'].includes(s.phase)?'Kick off →':s.phase==='try'?'Kick try →':'Next play →';
 $('continueBtn').disabled=!pendingState||!!campaign||running;$('nextBtn').hidden=s.phase==='scrimmage'||s.phase==='final'||s.phase==='coinflip';$('nextBtn').disabled=!!campaign||running||s.phase==='final'||s.phase==='coinflip';$('advancePrompt').hidden=!pendingState||!!campaign||running||replayInProgress()||s.phase==='final';$('runBtn').disabled=!campaign&&(!!pendingState||!['scrimmage','try'].includes(s.phase));$('timeoutHomeBtn').disabled=!!campaign||s.phase==='final'||(s.timeouts.home===0||!!pendingState);$('timeoutAwayBtn').disabled=!!campaign||s.phase==='final'||(s.timeouts.away===0||!!pendingState);$('startSpotBtn').disabled=!!campaign||gameMode!=='free';$('spotYard').disabled=gameMode!=='free';$('spotTeam').disabled=gameMode!=='free';$('spotDown').disabled=gameMode!=='free';$('spotGain').disabled=gameMode!=='free';
 for(const id of ['kickoffBtn','onsideBtn','puntBtn','fieldGoalBtn','extraPointBtn','twoPointBtn'])$(id).disabled=!!campaign||s.phase==='final'||(id==='kickoffBtn'&&!['kickoff','safetyKick'].includes(s.phase))||(id==='onsideBtn'&&s.phase!=='kickoff')||(id==='puntBtn'&&s.phase!=='scrimmage')||(id==='fieldGoalBtn'&&s.phase!=='scrimmage')||((id==='extraPointBtn'||id==='twoPointBtn')&&s.phase!=='try');
}
function autoNext(){const pick=G.autoPick(gameState,allOff(),allDef());const o=allOff().find(p=>p.id===pick.offense),d=allDef().find(p=>p.id===pick.defense);if(o)offensive=G.dressPlay(gameState,o,gameState.possession,'offense');if(d)defensive=G.dressPlay(gameState,d,gameState.possession==='home'?'away':'home','defense');offensive.yardLine=gameState.possession==='home'?gameState.ball:100-gameState.ball;stagedCpuKick=G.cpuFourthDownKick(gameState,false);selected=sidePlay().players[0]?.id||'';manualOverride=false;fillPresets();}
function continueGame(){if(!pendingState)return null;const reset=G.resetToLine(pendingState);gameState=reset.state;pendingState=null;pendingRuling=null;playStartState=null;lastKick=null;invalidate();autoNext();refresh(true);$('officialCall').textContent=stagedCpuKick?'CPU selects '+(stagedCpuKick==='fieldGoal'?'field goal':'punt')+'; press Run play to execute.':reset.call?'Referee: '+reset.call:gameState.log.at(-1)||'Referee: ball ready for play.';saveExhibition();return reset;}
function choosePenalty(choice){if(!pendingRuling?.choices?.[choice]||!pendingState)return;const picked=pendingRuling.choices[choice];pendingState=picked.state;gameState=picked.state;pendingRuling.state=picked.state;pendingRuling.call=picked.call;pendingRuling.defaultChoice=choice;$('officialCall').textContent='Referee: '+picked.call;$('resultMain').textContent=picked.call;renderOverview();saveExhibition();}
function challengePending(team){if(!pendingRuling?.review||!pendingState)return;const decided=G.reviewSpot(pendingRuling,team);if(!decided.ok){$('officialCall').textContent='Referee: '+decided.call;return;}pendingState=decided.state;gameState=decided.state;pendingRuling.state=decided.state;pendingRuling.call=decided.call;$('officialCall').textContent='Referee: '+decided.call;$('resultMain').textContent=decided.call;renderOverview();saveExhibition();}
function startAtSpot(){if(campaign||gameMode!=='free')return;const yard=Number($('spotYard').value);if(!Number.isFinite(yard)||yard<1||yard>99){$('officialCall').textContent='Referee: choose a yard line from 1 to 99.';return;}pendingState=null;pendingRuling=null;playStartState=null;lastKick=null;G.setSpot(gameState,$('spotTeam').value,yard,Number($('spotDown').value),Number($('spotGain').value));invalidate();autoNext();refresh(true);$('officialCall').textContent=gameState.log.at(-1);saveExhibition();}
function doKick(kind){
 if(campaign)return;
 if(pendingState){$('officialCall').textContent='Referee: set the next play before the kick.';return;}
 const seed=Number($('seedInput').value)||71,choice=$('kickChoice').value;
 const result=G.kick(gameState,kind,seed,choice);
 if(!result.accepted){gameState=result.state;invalidate();autoNext();refresh(true);$('officialCall').textContent='Referee: '+result.call;saveExhibition();return;}
 stopKickReplay();gameState=result.state;pendingState=null;pendingRuling=null;playStartState=null;lastKick=result.kick;kickFrame=0;
 $('kickChoice').value='auto';$('seedInput').value=seed+1;
 invalidate();autoNext();refresh(true);
 $('resultMain').textContent=result.call;
 $('resultMeta').textContent=`Special teams · ${kind} · seed ${seed}`;
 const kr=result.kick,team=gameState.specialists[kr.team],recv=gameState.specialists[kr.receive];
 const rated=kind==='punt'?`P ${team.punter.power} power / ${team.punter.hang} hang`:`K ${team.kicker.power} power / ${team.kicker.accuracy} accuracy`;
 const alignment=kr.alignment?.lockedUntilLanding?` · dynamic alignment: ${kr.alignment.setup} in setup zone, ${kr.alignment.onLine} on restraining line, ${kr.alignment.deep} deep; coverage locked until landing`:
  kr.alignment?` · declared onside alignment: ${kr.alignment.setup} receivers set`:'';
 const details=`<div>22 players over ${kr.frames.length} replay frames · ${kr.contacts} return contacts${kr.recovery?' · '+esc(kr.recovery.player)+' recovered for '+kr.recovery.team.toUpperCase():''}${kr.blocked?' · blocked kick':''}${kr.decision==='fair catch'?' · fair catch':''}${kr.decision==='fair catch awarded'?' · fair catch awarded after interference':''}${kr.decision==='short kick'?' · landing-zone enforcement':''}${kr.decision==='kickoff out of bounds'?' · kickoff out of bounds':''}${kr.decision==='field-goal miss returned'?' · short missed field goal fielded and returned':''}</div>`+
  (kr.spotOptions?`<div>Receiver options: ${kr.spotOptions.map(o=>`${esc(o.name)} at field yard ${o.yard.toFixed(1)}`).join(' · ')}</div>`:'')+
  (kr.penalty?`<div><b>${kr.penalty.code==='KOB'?'OFFICIAL RULING':'OFFICIAL FLAG'}</b> · ${esc(kr.penalty.code)} ${esc(kr.penalty.player)} at ${kr.penalty.time.toFixed(1)}s, field yard ${kr.penalty.spot.toFixed(1)}${kr.penalty.code==='KOB'?`; receiver elects ${esc(kr.penalty.chosen)} at field yard ${kr.penalty.award.toFixed(1)}`:'; 15-yard enforcement'} — ${esc(kr.penalty.evidence)}</div>`:'');
 $('moveReport').innerHTML='<b>SPECIAL TEAMS EXECUTION</b> · '+rated+alignment+details;
 $('eventLog').innerHTML=kr.events.map(e=>`<div><em>${e.t.toFixed(2)}s</em> ${esc(e.text)}</div>`).join('');
 $('officialCall').textContent='Referee: '+result.call;
 saveExhibition();playKickReplay();
}
function nextPlay(){if(campaign||gameState.phase==='coinflip'||gameState.phase==='final')return;if(pendingState)return continueGame();if(gameState.phase==='kickoff'||gameState.phase==='safetyKick')return doKick(gameState.phase);if(gameState.phase==='try')return doKick('extraPoint');if(gameState.phase==='scrimmage')return run();}
function renderGrid(){const gridState=replayInProgress()?playStartState:(pendingState&&playStartState?playStartState:(pendingState||gameState)),yard=campaign?(offensive.yardLine??50):(gridState.possession==='home'?gridState.ball:100-gridState.ball);let s=`<defs>
<pattern id="grass" patternUnits="userSpaceOnUse" width="90" height="150"><rect width="90" height="150" fill="#0c332e"/><path d="M0 0H90V75H0Z" fill="#10392f"/></pattern>
<pattern id="speckle" patternUnits="userSpaceOnUse" width="48" height="38"><circle cx="4" cy="7" r=".8" fill="#6ba899" opacity=".19"/><circle cx="31" cy="24" r=".7" fill="#64a08f" opacity=".17"/></pattern>
<marker id="arrowOff" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#52e3d4" stroke-width="1.45"/></marker>
<marker id="arrowHot" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#ffcf69" stroke-width="1.45"/></marker>
<marker id="arrowD" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#ff8772" stroke-width="1.45"/></marker></defs>`;
 s+=`<rect x="0" y="0" width="1080" height="900" fill="url(#grass)"/><rect x="0" y="0" width="1080" height="900" fill="url(#speckle)"/><rect x="59" y="146" width="962" height="747" stroke="#7aad9d" stroke-opacity=".50" stroke-width="3" fill="none"/>`;
 for(let y=-5;y<=40;y+=5){const py=pos({x:0,y}).y;if(py<120||py>893)continue;
  s+=`<path d="M60 ${py}H1020" stroke="${y===0?'#ffd187':'#9dbdb3'}" stroke-width="${y===0?4:1.65}" stroke-opacity="${y===0?.95:.35}" ${y===0?'stroke-dasharray="10 6"':''}/>`;
  if(y!==0 && y!==40){s+=`<text x="77" y="${py-7}" fill="#8db3a6" font-size="19" font-family="ui-monospace" font-weight="700" opacity=".65">${Math.max(0,Math.min(100,yard+y))}</text><text x="1002" y="${py-7}" text-anchor="end" fill="#8db3a6" font-size="19" font-family="ui-monospace" font-weight="700" opacity=".65">${Math.max(0,Math.min(100,yard+y))}</text>`;}
 }
 for(let y=-5;y<=38;y++){const py=pos({x:0,y}).y;if(py<149||py>892)continue;for(const x of [OX-13.75*XS,OX+13.75*XS])s+=`<path d="M${x-7} ${py}h14" stroke="#aacbc0" opacity=".48" stroke-width="1.4"/>`;}
 s+=`<rect x="60" y="145" width="960" height="50" fill="#162e38" opacity=".8"/><text x="540" y="177" text-anchor="middle" fill="#b8ddd3" font-family="ui-monospace" font-weight="700" letter-spacing="7" font-size="16" opacity=".7">DOWNFIELD ↑</text>`;
 const losState=gridState;s+=`<text x="540" y="${pos({x:0,y:0}).y-10}" text-anchor="middle" font-size="12" font-weight="800" letter-spacing="3" fill="#f9d597" opacity=".95">LINE OF SCRIMMAGE · ${campaign?Math.round(offensive.yardLine??50):esc(G.spotText(losState))}</text>`;
 if(gridState.phase==='scrimmage'){const gainY=Math.min(gridState.toGain,100-yard),gainPos=pos({x:0,y:gainY});if(gainPos.y>=146&&gainPos.y<=893)s+=`<path d="M60 ${gainPos.y}H1020" stroke="#6de4d0" stroke-width="4" stroke-dasharray="14 7"/><rect x="399" y="${gainPos.y-13}" width="282" height="20" rx="6" fill="#082a28" stroke="#6de4d0"/><text x="540" y="${gainPos.y+2}" text-anchor="middle" font-size="11" font-weight="900" letter-spacing="1.5" fill="#aaffef">LINE TO GAIN · ${Math.ceil(gridState.toGain)} YD</text>`;}
 if(!campaign&&!replayInProgress()){const b=pos({x:1.45,y:-.1});s+=`<g pointer-events="none" aria-label="Ball at ${esc(G.spotText(gridState))}"><ellipse cx="${b.x}" cy="${b.y}" rx="10" ry="6.2" transform="rotate(-20 ${b.x} ${b.y})" fill="#ffcf69" stroke="#fff0bd" stroke-width="1.8"/><path d="M${b.x-4} ${b.y}h8" stroke="#704a24" stroke-width="1.5"/></g>`;}
 for(const [label,x,y] of [['R',-23,-6],['U',22,-4],['DJ',-23,18],['LJ',23,18],['FJ',-23,30],['SJ',23,30],['BJ',0,35]]){const a=pos({x,y});if(a.y<145||a.y>890)continue;s+=`<g pointer-events="none" transform="translate(${a.x},${a.y})"><rect x="-12" y="-12" width="24" height="24" rx="4" fill="#e5e6dd" stroke="#172124" stroke-width="2"/><text x="0" y="4" text-anchor="middle" font-size="10" font-weight="900" fill="#172124">${label}</text></g>`;}
 return s;
}
function drawPlayer(p,team,at,carrier){const xy=pos(at||p),isD=team==='d',homeOnSide=!campaign&&gameState.possession===(isD?'away':'home'),color=campaign?(isD?'#ff8068':'#41ded0'):(homeOnSide?(profile?.color||'#41ded0'):awayUniform()),ink=(parseInt(color.slice(1,3),16)*.299+parseInt(color.slice(3,5),16)*.587+parseInt(color.slice(5,7),16)*.114)>145?'#071b20':'#f8fffc',highlight=(side===(isD?'defense':'offense')&&p.id===selected&&!playback),center={x:xy.x,y:xy.y};
 let s=`<g class="player" data-team="${team}" data-player="${esc(p.id)}" transform="translate(${center.x.toFixed(2)},${center.y.toFixed(2)})">`;
 if(highlight)s+=`<circle r="29" fill="${color}" opacity=".13"/><circle r="25" stroke="${color}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>`;
 if(carrier===p.id)s+=`<circle r="22" fill="#ffe1a2" opacity=".25"/>`;
 s+=`<circle r="20" fill="${color}" fill-opacity=".92" stroke="#e8fff8" stroke-opacity=".65" stroke-width="1.2"/>`;
 if(isD)s+=`<path d="M-10-10L10 10M10-10L-10 10" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`;
 else s+=`<circle r="11.4" fill="none" stroke="${ink}" stroke-width="4.6"/>`;
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
 renderOverview();
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
 if(replayInProgress()&&live?.ball){const b=pos(live.ball);if(live.ball.kind==='loose')s+=`<circle cx="${b.x}" cy="${b.y}" r="16" fill="#ffb369" fill-opacity=".13" stroke="#ffb369" stroke-width="2" stroke-dasharray="4 3"/>`;s+=`<ellipse cx="${b.x}" cy="${b.y}" rx="7.5" ry="5.2" transform="rotate(-20 ${b.x} ${b.y})" fill="#ffcc69" stroke="#fff3c7" stroke-width="1.6"/><path d="M${b.x-3} ${b.y}h6" stroke="#734b2f" stroke-width="1.5"/>`;}
 svg.innerHTML=s;
 $('matchupTitle').innerHTML=esc(offensive.name)+' <span class="muted">vs.</span> '+esc(defensive.name);
 const shown=replayInProgress()?(()=>{const b=playback.frames[Math.min(Math.round(frameIndex),playback.frames.length-1)]?.ball;return Number.isFinite(b?.y)?{...playStartState,ball:C.clamp(playStartState.ball+(playStartState.possession==='home'?1:-1)*b.y,0,100)}:pendingState||gameState;})():(pendingState||gameState);$('losLabel').textContent=campaign?String(offensive.yardLine??50):'BALL AT '+G.spotText(shown);
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
 <details class="rating-editor" open><summary>PLAYER ATTRIBUTES • 1–99</summary><div class="rating-grid">${C.RATING_KEYS.map(k=>field(STAT_LABELS[k],input('stats.'+k,C.statsOf(p)[k],'number','min="1" max="99" step="1"'))).join('')}</div><p class="help">These ratings change gameplay. On defense, awareness shortens the read delay on a pass in flight; coverage contests the catch, while hands helps turn a close breakup into an interception. Grades are not NFL-calibrated.</p></details>
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
   if(p.job==='man')html+=`<section class="sec border-top"><div class="section-title"><h3>Man coverage</h3></div>${field('Shadow receiver',select('coverTarget',p.coverTarget||'', [['','Auto matchup'],...offensive.players.map(q=>[q.id,q.label+' #'+q.number])]))}${field('Coverage technique',select('leverage',p.leverage||'inside',[['inside','Shade inside'],['outside','Shade outside'],['trail','Trail the route'],['balanced','Balanced / match path'],['press','Press at the line']]))}<p class="help">Leverage changes the defender’s target landmark as the receiver releases. Press creates a rating-based release contest in the first five yards; it does not model extended downfield contact.</p><button data-action="assignTool">⇥ Pick opponent on field</button></section>`;
   if(p.job==='zone')html+=`<section class="sec border-top"><div class="section-title"><h3>Coverage zone</h3></div><div class="two-fields">${field('Zone center X',input('zone.x',p.zone?.x??p.x,'number','step="0.5"'))}${field('Zone center Y',input('zone.y',p.zone?.y??p.y,'number','step="0.5"'))}</div><div class="two-fields">${field('Width (yards)',input('zone.r',p.zone?.r??7,'number','min="1" max="28" step="0.5"'))}${field('Depth (yards)',input('zone.rY',p.zone?.rY??7,'number','min="1" max="30" step="0.5"'))}</div>${field('Route response',select('zoneTechnique',p.zoneTechnique||'spot',[['spot','Spot-drop · protect landmark'],['match','Match route inside zone']]))}<p class="help">Match carries a receiver within this zone and returns to the landmark after the route leaves. In overlapping match zones, one defender carries each route; the nearest defender with better awareness gets priority.</p><button data-action="zoneTool">◌ Place on field</button></section>`;
   if(p.job==='runfit')html+=`<section class="sec border-top">${field('Fit gap X',input('fitX',p.fitX??p.x,'number','step="0.5"'))}</section>`;
 }
 html+=`<section class="sec border-top"><div class="section-title"><h3>${isO?'Offensive':'Defensive'} roster</h3><span class="micro">${sidePlay().players.length} players</span></div><div class="assignment-list">${sidePlay().players.map(q=>`<button data-select="${esc(q.id)}" class="assignment ${isO?'':'def'} ${selected===q.id?'sel':''}"><span>${isO?'O':'X'}</span><strong>${esc(q.label)} <small>#${esc(q.number)}</small></strong><small>${esc(q.job)}</small></button>`).join('')}</div></section>`;
 el.innerHTML=html;
}
function refresh(presets=false){if(presets)fillPresets();validationUI();renderField();renderInspector();$('undoBtn').disabled=!undo.length;$('redoBtn').disabled=!redo.length;saveExhibition();}
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
 $('lateralTarget').addEventListener('change',e=>{if(campaign)return;checkpoint();offensive.lateralToId=e.target.value||null;invalidate();refresh();});
 $('lateralAt').addEventListener('change',e=>{if(campaign)return;checkpoint();offensive.lateralAt=C.clamp(Number(e.target.value)||1.7,.7,9);e.target.value=offensive.lateralAt;invalidate();refresh();});
 $('sideTabs').addEventListener('click',e=>{const b=e.target.closest('[data-side]');if(b)selectSide(b.dataset.side);});
 $('tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b)setMode(b.dataset.tool);});
 $('undoBtn').onclick=()=>history('undo');$('redoBtn').onclick=()=>history('redo');
 $('routesToggle').onchange=renderField;$('zonesToggle').onchange=renderField;$('labelsToggle').onchange=renderField;
 $('helpBtn').onclick=()=>alert('ROUTE LAB: Select offense and defense from the playbooks. Switch edit side; drag O and X players on the field. Select a player to change its job in the inspector. Draw routes using the Route tool, select defenders for blocking/man coverage with Assign Target, place coverage zones, or set pre-snap motion. Illegal formations are flagged live. Run to simulate, pause, step and scrub replay. Save custom plays locally or export/import JSON. This is an evolving simulation, not a complete NFL officiating/physics engine.');
 $('runBtn').onclick=run;$('pauseBtn').onclick=togglePause;$('stepBtn').onclick=step;$('rewindBtn').onclick=rewind;$('editBtn').onclick=()=>{invalidate();refresh();};
 $('speedSelect').onchange=()=>{};$('timeline').addEventListener('input',()=>{running=false;frameIndex=+$('timeline').value;$('pauseBtn').textContent='▶ Play';renderFrame();});
 $('zoomIn').onclick=()=>setZoom(zoom+.5);$('zoomOut').onclick=()=>setZoom(zoom-.5);$('zoomFit').onclick=()=>setZoom(1);
 $('resetBtn').onclick=()=>{if(campaign){loadLesson(campaign.side,campaign.index);return;}const a=allOff().find(p=>p.id===$('offPreset').value),b=allDef().find(p=>p.id===$('defPreset').value);if(!a||!b)return;checkpoint();offensive=G.dressPlay(gameState,a,gameState.possession,'offense');defensive=G.dressPlay(gameState,b,gameState.possession==='home'?'away':'home','defense');invalidate();refresh(true);};
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
   checkpoint();offensive=a;defensive=b;for(const pl of [...a.players,...b.players]){pl.label=String(pl.label??'P').slice(0,12);pl.id=String(pl.id??'').slice(0,40);pl.job=String(pl.job??'route').slice(0,30);}offensive=G.dressPlay(gameState,offensive,gameState.possession,'offense');defensive=G.dressPlay(gameState,defensive,gameState.possession==='home'?'away':'home','defense');
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
function run(){if(running)return;if(!campaign&&!pendingState&&stagedCpuKick&&!manualOverride)return doKick(stagedCpuKick);const validation=validationUI();if(!validation.valid){$('resultMain').textContent='No snap — alignment needs attention';$('resultMeta').textContent=validation.errors[0]||'Correct the highlighted alignment before the snap.';$('officialCall').textContent='Referee: no snap. Fix the alignment; game position and clock are unchanged.';renderOverview();return;}
 if(!campaign){if(pendingState){$('officialCall').textContent='Referee: continue from the last play before the next snap.';return;}if(!['scrimmage','try'].includes(gameState.phase)){$('officialCall').textContent='Referee: select the required kick.';return;}offensive.yardLine=gameState.possession==='home'?gameState.ball:100-gameState.ball;offensive.toGain=gameState.toGain;offensive.enableLooseBall=true;}
 const seed=(Number($('seedInput').value)||71);if(campaign && campaignDrive){offensive.yardLine=campaignDrive.yardLine;offensive.toGain=campaignDrive.toGain;}const sim=C.simulate(offensive,defensive,seed);if(!sim.valid){if(sim.diagnostic){$('resultMain').textContent='Simulation stopped — no play result recorded';$('resultMeta').textContent=sim.diagnostic.message+' Time '+sim.diagnostic.time.toFixed(2)+'s; possession '+(sim.diagnostic.carrierId||'unassigned')+'.';$('officialCall').textContent='Referee: engine diagnostic; game state unchanged.';}return;}if(!campaign)lastKick=null;
 let gameRuling=null;if(!campaign){const startState=C.clone(gameState),settled=G.finishScrimmage(gameState,sim,G.huddleSeconds(gameState),{offense:offensive,defense:defensive});if(!settled.accepted){gameState=settled.state;pendingState=null;pendingRuling=settled;const reset=G.resetToLine(gameState);gameState=reset.state;autoNext();refresh(true);$('officialCall').textContent='Referee: '+settled.call+'. No snap; CPU has staged a fresh call for the replay down.';$('resultMain').textContent=settled.call;$('resultMeta').textContent='Pre-snap foul · no live play. New O/X calls are staged; press Run play when ready.';renderOverview();saveExhibition();return;}pendingState=settled.state;gameState=settled.state;playStartState=startState;pendingRuling=settled;gameRuling=settled;$('officialCall').textContent='Referee: '+settled.call;renderOverview();saveExhibition();}
 $('seedInput').value=seed+1; // A new click is a new attempt; type an old seed to reproduce it exactly.
 if(campaign){campaignAttempt++;gradeCampaign(sim);}
 if(gameRuling?.fouls?.length){for(const f of gameRuling.fouls)sim.events.push({t:f.time,text:`OFFICIAL FLAG ${f.code}: ${f.player} at +${f.spotY.toFixed(1)} yd — ${f.evidence}`});}
 if(gameRuling?.injuries?.length){for(const injury of gameRuling.injuries)sim.events.push({t:injury.at,text:`MEDICAL TIMEOUT: ${injury.name} (${injury.label}) after ${injury.mechanism}; ${injury.status==='out'?'out for game':'evaluation and substitution'}`});}
 sim.events.sort((a,b)=>a.t-b.t);
 playback=sim;frameIndex=0;running=true;lastFrameTime=performance.now();$('timeline').disabled=false;$('timeline').max=sim.frames.length-1;$('timeline').value='0';
 $('pauseBtn').disabled=false;$('stepBtn').disabled=false;$('rewindBtn').disabled=false;$('editBtn').disabled=false;$('pauseBtn').textContent='Ⅱ Pause';
 $('duration').textContent=sim.result.seconds.toFixed(2)+'s';$('resultMain').textContent=gameRuling?.fouls?.length||gameRuling?.loose||gameRuling?.review?gameRuling.call:sim.result.verdict;$('resultMeta').textContent=(gameRuling?.fouls?.length?'Flag on live play · ':gameRuling?.loose?'Live loose-ball ruling · ':((sim.result.yards>=0?'+':'')+sim.result.yards.toFixed(1)+' offense yards'+(sim.result.possession==='defense'?' • '+sim.result.returnYards.toFixed(1)+' return yards':'')+' · '))+sim.result.seconds.toFixed(2)+' seconds • seed '+sim.result.seed;
 const active=sim.participation.filter(p=>p.yardsMoved>.5).length;
 $('moveReport').innerHTML='<b>ON-FIELD EXECUTION</b> · '+active+'/'+sim.participation.length+' players moved'+
  '<div><b>SPECIAL MOVES</b> · '+(sim.specialMoves.length?sim.specialMoves.map(m=>esc(m.t.toFixed(2)+'s '+m.player+' '+m.move+' vs '+m.defender+' — '+m.outcome)).join('<br>'):'none attempted on this snap')+'</div>'+
  (sim.result.loose?'<div><b>LOOSE BALL</b> · '+esc(sim.result.loose.kind==='backwardPass'?'Backward pass':'Fumble')+'; '+esc(gameRuling?.call||sim.result.verdict)+'</div>':'')+
  (gameRuling?.fouls?.length?'<div><b>OFFICIALS</b> · '+gameRuling.fouls.map(f=>esc(`${f.code} ${f.player} at ${f.time.toFixed(2)}s, +${f.spotY.toFixed(1)} yd — ${f.evidence}`)).join('<br>')+'</div>':'')+
  (gameRuling?.injuries?.length?'<div><b>MEDICAL / SUBSTITUTIONS</b> · '+gameRuling.injuries.map(i=>esc(`${i.at.toFixed(2)}s ${i.name} (${i.team.toUpperCase()} ${i.label}) — ${i.mechanism}; ${i.status==='out'?'out for game':i.status==='limited'?'at least five downs':'at least one down'}`)).join('<br>')+'</div>':'');
 renderDecisions(sim);$('modeChip').textContent='SIMULATION';$('viewLabel').textContent='REPLAY';renderFrame();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);saveExhibition();
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
 if(!sim.decisions?.length){slot.innerHTML='<p>No recorded player read on this snap.</p>';return;}
 slot.innerHTML=sim.decisions.map(dec=>{
  if(dec.action==='handoff')return `<div class="decision-card"><b>${esc(dec.t)}s: QB to ${esc(dec.runner||dec.toId)}</b><p>Exchange secured at ${esc(dec.exchangeDistance)} yd; runner takes control.</p></div>`;
  if(dec.action==='handoff-missed')return `<div class="decision-card"><b>${esc(dec.t)}s: Mesh missed</b><p>${esc(dec.reason)}. QB keeps the ball.</p></div>`;
  if(dec.action==='run-read')return `<div class="decision-card"><b>${esc(dec.t)}s: ${esc(dec.runner)} ${esc(dec.choice==='press'?'presses':dec.choice==='cut'?'cuts':'bounces')} ${esc(dec.direction)}</b><p>${esc(dec.reason)}. Called track x ${esc(dec.plannedX)} → chosen x ${esc(dec.chosenX)}.</p></div>`;
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
 const banner=$('campaignBanner');banner.hidden=!campaign;$('gamePanel').hidden=!!campaign;
 document.body.classList.toggle('campaign-on',!!campaign);
 $('offPreset').disabled=!!campaign;$('defPreset').disabled=!!campaign;$('lateralTarget').disabled=!!campaign;$('lateralAt').disabled=!!campaign;
 for(const id of ['saveBtn','importBtn','copyBtn','exportBtn'])$(id).disabled=!!campaign;
 $('sideTabs').querySelectorAll('[data-side]').forEach(b=>{b.disabled=!!campaign&&b.dataset.side!==campaign.side;b.classList.toggle('active',b.dataset.side===side);});
 $('resetBtn').textContent=campaign?'↶ Restart lesson':'Reset play';
 $('campaignOffBtn').classList.toggle('active',campaign?.side==='offense');$('campaignDefBtn').classList.toggle('active',campaign?.side==='defense');$('campaignFreeBtn').classList.toggle('active',!campaign&&gameMode==='free');$('fullGameBtn').classList.toggle('active',!campaign&&gameMode==='game');
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
function launchCampaign(which){if(which==='free'||which==='game'){beginFree();return;}
 hidePane();gameMode='campaign';loadLesson(which,Math.min(campaignProgress[which],K.lessons[which].length-1));}
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
 const gain=r.yards,verdict=r.verdict;
 if(campaign.side==='offense'){
  if(verdict.startsWith('Touchdown')){markDrillComplete();return;}
  if(r.possession==='defense'||verdict.startsWith('Safety')){d.down=1;d.toGain=10;d.yardLine=80;d.snaps=0;$('campaignFeedback').textContent=(verdict.startsWith('Safety')?'Safety':'Turnover')+'! Drive restarted at the 20. Edit and try again.';}
  else {const spot=K.advanceSeries(d,gain);d.yardLine=spot.yardLine;d.toGain=spot.toGain;if(spot.converted){d.down=1;d.toGain=Math.min(10,100-d.yardLine);$('campaignFeedback').textContent='First down! Call the next play.';}else if(d.down>=4){d.down=1;d.toGain=10;d.yardLine=80;d.snaps=0;$('campaignFeedback').textContent='Turnover on downs. New drive at the 20.';}else{d.down++;$('campaignFeedback').textContent=(gain>=0?'+':'')+gain.toFixed(1)+' yards. Keep moving toward the end zone.';}}
 }else{
  if(r.possession==='defense'||verdict.startsWith('Safety')){markDrillComplete();return;}
  if(verdict.startsWith('Touchdown')||gain>=d.toGain){d.down=1;d.toGain=10;d.yardLine=50;d.snaps=0;$('campaignFeedback').textContent='They converted. Reset the stand, adjust your defense, and try again.';}
  else if(d.down>=4){markDrillComplete();return;}
  else {const spot=K.advanceSeries(d,gain);d.down++;d.toGain=spot.toGain;d.yardLine=spot.yardLine;$('campaignFeedback').textContent='Stop '+d.snaps+' recorded. '+(4-d.down+1)+' more downs to defend.';}
 }
 $('campaignScore').textContent=campaignDriveText();
}
$('campaignOffBtn').onclick=()=>launchCampaign('offense');
$('campaignDefBtn').onclick=()=>launchCampaign('defense');
$('campaignFreeBtn').onclick=()=>launchCampaign('free');
$('fullGameBtn').onclick=()=>launchCampaign('game');
$('newGameBtn').onclick=beginFree;
$('nextBtn').onclick=nextPlay;
$('advancePlayBtn').onclick=continueGame;
$('continueBtn').onclick=continueGame;
$('startSpotBtn').onclick=startAtSpot;
$('depthBtn').onclick=()=>{renderDepth();showPane('depth');};
$('menuBtn').onclick=()=>showPane('menu');
$('loadGameBtn').onclick=loadExhibition;
$('menuFree').onclick=beginFree;$('menuCampaign').onclick=()=>showPane('campaign');$('menuLoad').onclick=loadExhibition;$('menuCaptain').onclick=()=>{$('profileCall').value=profile?.call||'heads';$('profileColor').value=profile?.color||'#41ded0';showPane('profile');};
$('menuOffense').onclick=()=>launchCampaign('offense');$('menuDefense').onclick=()=>launchCampaign('defense');
document.querySelectorAll('[data-start-back]').forEach(b=>b.onclick=()=>showPane(b.dataset.startBack));
$('profileSave').onclick=()=>{profile={call:$('profileCall').value==='tails'?'tails':'heads',color:$('profileColor').value};try{localStorage.setItem('route-lab-profile-v1',JSON.stringify(profile));}catch{}paintUniform();beginFree();};
$('coinKickoff').onclick=()=>finishCoin(true);$('coinDepth').onclick=()=>{renderDepth();showPane('depth');};$('coinJump').onclick=()=>showPane('jump');
$('depthRows').onchange=e=>{const el=e.target;if(!el.matches('[data-slot]'))return;if(G.setStarter(pendingState||gameState,'home',el.dataset.unit,el.dataset.slot,Number(el.value))){if(pendingState)G.setStarter(gameState,'home',el.dataset.unit,el.dataset.slot,Number(el.value));else autoNext();refresh(true);renderDepth();saveExhibition();}};
$('depthKickoff').onclick=()=>{if(gameState.phase==='coinflip')finishCoin(true);else{hidePane();saveExhibition();}};
$('depthBack').onclick=()=>gameState.phase==='coinflip'?showPane('coin'):hidePane();
$('jumpBack').onclick=()=>showPane('coin');
$('jumpStart').onclick=()=>{if(!finishCoin())return;const q=Number($('jumpQuarter').value),max=q===5?600:900,clock=C.clamp((Number($('jumpMin').value)||0)*60+(Number($('jumpSec').value)||0),0,max);G.jumpTo(gameState,{quarter:q,clock,phase:$('jumpPhase').value,team:$('jumpTeam').value,ball:Number($('jumpBall').value),down:Number($('jumpDown').value),toGain:Number($('jumpGain').value),homeScore:Number($('jumpHomeScore').value),awayScore:Number($('jumpAwayScore').value)});pendingState=null;pendingRuling=null;playStartState=null;lastKick=null;invalidate();autoNext();refresh(true);$('officialCall').textContent=gameState.log.at(-1);saveExhibition();};
$('specialistEditor').onchange=e=>{const el=e.target;if(!el.matches('[data-rating]'))return;const value=C.clamp(Math.round(Number(el.value)||1),1,99);el.value=value;const write=s=>{const team=s.specialists[el.dataset.team];if(el.dataset.unit==='unit'){team[el.dataset.rating]=value;if(s.teams)s.teams[el.dataset.team][el.dataset.rating]=value;}else{team[el.dataset.unit][el.dataset.rating]=value;const key={kicker:'K',punter:'P',returner:'KR'}[el.dataset.unit],row=s.teams?.[el.dataset.team]?.depth?.special?.find(v=>v.slot===key);if(row)row.players[row.starter].stats[el.dataset.rating]=value;}};write(gameState);if(pendingState)write(pendingState);saveExhibition();};
$('fullField').onclick=e=>{if(campaign||gameMode!=='free')return;const rect=e.currentTarget.getBoundingClientRect(),yard=C.clamp(Math.round(((e.clientX-rect.left)/rect.width*1200-100)/10),1,99);$('spotYard').value=yard;startAtSpot();};
$('kickReplayBtn').onclick=playKickReplay;
$('kickTimeline').oninput=e=>{stopKickReplay();kickFrame=Number(e.target.value)||0;renderOverview();};
$('timeoutHomeBtn').onclick=()=>{if(G.timeout(gameState,'home')){$('officialCall').textContent=gameState.log.at(-1);renderOverview();saveExhibition();}};
$('penaltyAcceptBtn').onclick=()=>choosePenalty('accept');$('penaltyDeclineBtn').onclick=()=>choosePenalty('decline');$('homeChallengeBtn').onclick=()=>challengePending('home');$('awayChallengeBtn').onclick=()=>challengePending('away');
$('timeoutAwayBtn').onclick=()=>{if(G.timeout(gameState,'away')){$('officialCall').textContent=gameState.log.at(-1);renderOverview();saveExhibition();}};
$('kickoffBtn').onclick=()=>doKick(gameState.phase==='safetyKick'?'safetyKick':'kickoff');
$('onsideBtn').onclick=()=>doKick('onside');
$('puntBtn').onclick=()=>doKick('punt');$('fieldGoalBtn').onclick=()=>doKick('fieldGoal');$('extraPointBtn').onclick=()=>doKick('extraPoint');
$('twoPointBtn').onclick=()=>{$('officialCall').textContent='Referee: choose an offensive play, then Run play for the two-point try.';};
$('campaignRestartBtn').onclick=()=>{if(campaign)loadLesson(campaign.side,campaign.index);};
$('campaignNextBtn').onclick=()=>{if(!campaignSuccess)return;const side=campaign.side,i=campaign.index+1;if(i<K.lessons[side].length)loadLesson(side,i);else launchCampaign('free');};
$('campaignStageList').onclick=e=>{const b=e.target.closest('[data-stage]');if(b&&campaign)loadLesson(campaign.side,+b.dataset.stage);};
$('coachLayer').addEventListener('change',e=>{coachLayer=e.target.value;renderField();});
bindEncyclopedia();bindEvents();paintUniform();renderSpecialists();fillPresets();autoNext();refresh();modeCampaignUI();showPane('menu');try{const has=!!localStorage.getItem('route-lab-exhibition-v1');$('menuLoad').disabled=!has;$('loadGameBtn').disabled=!has;}catch{$('menuLoad').disabled=true;$('loadGameBtn').disabled=true;}document.getElementById('startupFallback')?.remove();

})();

