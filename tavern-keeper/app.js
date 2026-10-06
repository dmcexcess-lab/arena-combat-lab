(()=>{
'use strict';
const C=window.TavernKeeperCore;
const $=id=>document.getElementById(id);
const SAVE_KEY='tavernKeeper.slice3.v1';

let roster=null,exp=null,activeHeroId=null,settled=false,speed=1,renderedLogs=0;

function newGame(){
  roster=new C.TavernRoster({funds:30});
  exp=null; activeHeroId=null; settled=false; renderedLogs=0;
}
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,roster:roster.snapshot(),expedition:exp?exp.snapshot():null,activeHeroId:activeHeroId,settled:settled}));
    $('saveState').textContent='Saved';
  }catch(_){$('saveState').textContent='Unavailable';}
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw){newGame();return;}
    const data=JSON.parse(raw);
    roster=C.TavernRoster.fromSnapshot(data.roster);
    exp=data.expedition?C.Expedition.fromSnapshot(data.expedition,{debug:true}):null;
    activeHeroId=data.activeHeroId||null;
    settled=!!data.settled;
    if(exp&&exp.state!=='deployed'&&!settled&&activeHeroId&&roster.getHero(activeHeroId)){
      settled=roster.settle(activeHeroId,exp).ok;
    }
  }catch(_){newGame();}
}
function fmtTime(s){
  s=Math.floor(s);
  return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}
function fmtPrepTime(m){
  m=Math.round(m);
  return m<60?m+'m':Math.floor(m/60)+'h '+(m%60)+'m';
}
function injuryText(hero){
  if(!hero||!hero.injuries||!hero.injuries.length)return 'None';
  return hero.injuries.map(function(i){
    return (C.INJURY_TYPES[i.type]?C.INJURY_TYPES[i.type].name:i.type)+(i.severity>1?' ×'+i.severity:'');
  }).join(', ');
}
function chipList(items,empty){
  empty=empty||'None';
  return items&&items.length?items.map(function(x){return '<span>'+x+'</span>';}).join(''):'<span class="muted">'+empty+'</span>';
}
function setBar(id,value){$(id).style.width=Math.max(0,Math.min(100,value))+'%';}
function selected(){return roster.getHero();}
function expeditionLocked(){return !!(exp&&exp.state==='deployed');}

function renderRoster(){
  const heroes=roster.aliveHeroes();
  $('rosterCount').textContent=heroes.length+' alive';
  if(heroes.length){
    $('heroRoster').innerHTML=heroes.map(function(h){
      return '<button class="roster-card '+(h.id===roster.selectedHeroId?'selected':'')+'" data-hero="'+h.id+'" '+(expeditionLocked()?'disabled':'')+'>'+
        '<div><strong>'+h.name+'</strong><span>Rank '+h.career.rank+'</span></div>'+
        '<small>'+C.threatAssessment(h)+' · '+Math.round(h.health)+' HP · '+h.career.contracts+' contracts</small>'+
        '<em>'+(h.titles.length?h.titles[h.titles.length-1]:h.traits.slice(0,2).join(' · '))+'</em></button>';
    }).join('');
  }else{
    $('heroRoster').innerHTML='<p class="empty">No living heroes remain.</p>';
  }
  document.querySelectorAll('[data-hero]').forEach(function(btn){
    btn.addEventListener('click',function(){
      if(expeditionLocked())return;
      roster.selectHero(btn.dataset.hero);
      renderAll();
      saveGame();
    });
  });
  if(roster.fallen.length){
    $('fallenRoster').innerHTML=roster.fallen.slice().reverse().map(function(f){
      return '<div class="fallen-card"><div><strong>'+f.hero.name+'</strong><span>Rank '+f.hero.career.rank+'</span></div>'+
        '<small>'+f.hero.career.contracts+' contracts · '+f.hero.career.kills+' kills · died at '+f.deathRecord.progress+'%</small></div>';
    }).join('');
  }else{
    $('fallenRoster').innerHTML='<p class="empty">No fallen heroes.</p>';
  }
}

function renderPrepActions(){
  $('prepActions').innerHTML=Object.values(C.PREPARATION_ACTIONS).map(function(a){
    return '<button class="prep-action" data-prep="'+a.id+'"><strong>'+a.name+'</strong><span>'+a.cost+'g · '+a.minutes+'m</span><small>'+a.description+'</small></button>';
  }).join('');
  document.querySelectorAll('[data-prep]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const h=selected();
      if(!h||expeditionLocked())return;
      const r=roster.prepare(h.id,btn.dataset.prep);
      if(!r.ok)roster.history.push({heroId:h.id,heroName:h.name,outcome:'prep blocked',note:r.reason});
      renderAll();
      saveGame();
    });
  });
}

function renderHome(){
  $('funds').textContent=roster.funds.toFixed(1)+'g';
  $('prepTime').textContent=fmtPrepTime(roster.prepMinutes);
  const h=selected();
  if(!h){
    $('risk').textContent='—';
    $('heroCard').innerHTML='<p class="empty">No living hero selected.</p>';
    ['homeHealth','homeHunger','homeFatigue','homeMorale','careerRank','careerXp','careerContracts','careerSuccesses','potions'].forEach(function(id){$(id).textContent='—';});
    ['homeHealthBar','homeHungerBar','homeFatigueBar','homeMoraleBar'].forEach(function(id){setBar(id,0);});
    $('homeMoodlets').innerHTML=chipList([]);
    $('injuries').innerHTML=chipList([]);
    $('skills').innerHTML=chipList([]);
    $('titles').innerHTML=chipList([]);
    $('careerHistory').innerHTML='<p class="empty">No career history.</p>';
    $('deploy').disabled=true;
    document.querySelectorAll('[data-prep]').forEach(function(b){b.disabled=true;});
    return;
  }
  C.deriveMoodlets(h);
  $('risk').textContent=C.threatAssessment(h);
  $('homeHealth').textContent=Math.round(h.health)+'/'+h.maxHealth;
  $('homeHunger').textContent=Math.round(h.hunger);
  $('homeFatigue').textContent=Math.round(h.fatigue);
  $('homeMorale').textContent=Math.round(h.morale);
  setBar('homeHealthBar',h.health/h.maxHealth*100);
  setBar('homeHungerBar',h.hunger);
  setBar('homeFatigueBar',h.fatigue);
  setBar('homeMoraleBar',h.morale);
  $('homeMoodlets').innerHTML=chipList(h.moodlets);
  $('injuries').innerHTML=chipList((h.injuries||[]).map(function(i){return (C.INJURY_TYPES[i.type]?C.INJURY_TYPES[i.type].name:i.type)+(i.severity>1?' ×'+i.severity:'');}));
  $('careerRank').textContent=h.career.rank;
  $('careerXp').textContent=Math.round(h.career.xp);
  $('careerContracts').textContent=h.career.contracts;
  $('careerSuccesses').textContent=h.career.successes;
  $('skills').innerHTML=chipList(['Melee '+h.career.skills.melee.toFixed(1),'Ranged '+h.career.skills.ranged.toFixed(1),'Survival '+h.career.skills.survival.toFixed(1)]);
  $('titles').innerHTML=chipList(h.titles,'No titles yet');
  $('potions').textContent=h.supplies.healing_potion||0;
  $('weapon').value=h.equipment.weapon||'wood_axe';
  $('armor').value=h.equipment.armor||'';
  $('heroCard').innerHTML='<div><strong>'+h.name+'</strong><span>Rank '+h.career.rank+'</span></div>'+
    '<p>'+Object.entries(h.stats).map(function(kv){return kv[0][0].toUpperCase()+kv[0].slice(1)+' '+kv[1];}).join(' · ')+'</p>'+
    '<small>'+h.traits.join(' · ')+' · Readiness '+C.readinessScore(h).toFixed(0)+'</small>';
  if(h.history.length){
    $('careerHistory').innerHTML=h.history.slice().reverse().slice(0,8).map(function(r){
      let extra='';
      if(r.rankAfter>r.rankBefore)extra+='Rank '+r.rankBefore+' → '+r.rankAfter+'. ';
      if(r.traitsEarned&&r.traitsEarned.length)extra+='Trait: '+r.traitsEarned.join(', ')+'. ';
      if(r.titlesEarned&&r.titlesEarned.length)extra+='Title: '+r.titlesEarned.join(', ')+'.';
      return '<div><strong>#'+r.number+' '+r.outcome.toUpperCase()+'</strong><span>'+r.progress+'% · '+r.kills+' kills · +'+r.xpGained+' XP</span><small>'+extra+'</small></div>';
    }).join('');
  }else{
    $('careerHistory').innerHTML='<p class="empty">No contracts completed yet.</p>';
  }
  document.querySelectorAll('[data-prep]').forEach(function(btn){btn.disabled=expeditionLocked()||!roster.canPrepare(h.id,btn.dataset.prep);});
  $('deploy').disabled=expeditionLocked()||!h.alive;
  $('weapon').disabled=expeditionLocked();
  $('armor').disabled=expeditionLocked();
}

function renderHistoryLog(){
  $('prepLog').innerHTML=roster.history.slice(-6).reverse().map(function(e){
    const right=e.progress!=null?e.progress+'% · '+(e.kills||0)+' kills':(e.note||'');
    return '<div><strong>'+(e.heroName||'Tavern')+' — '+(e.outcome||e.name||'event')+'</strong><span>'+right+'</span></div>';
  }).join('');
}

function renderExpedition(){
  if(!exp){
    $('status').textContent='READY';
    $('activeHeroBanner').textContent='No active expedition.';
    return;
  }
  const h=exp.hero;
  const loc=exp.contract.locations[exp.locationId];
  $('activeHeroBanner').textContent=h.name+' · career rank '+h.career.rank+' · seed '+exp.seed;
  $('status').textContent=exp.state.toUpperCase();
  $('hp').textContent=Math.round(h.health)+'/'+h.maxHealth;
  $('gps').textContent=exp.goldRate.toFixed(2);
  $('gold').textContent=exp.gold.toFixed(1);
  $('progress').textContent=Math.round(exp.objectiveProgress)+'%';
  $('location').textContent=loc?loc.name:'Resolved';
  $('moodlets').textContent=h.moodlets.join(', ')||'None';
  $('fieldInjuries').textContent=injuryText(h);
  $('fieldPotions').textContent=h.supplies.healing_potion||0;
  setBar('hpBar',h.health/h.maxHealth*100);
  setBar('fatigueBar',h.fatigue);
  setBar('hungerBar',h.hunger);
  setBar('moraleBar',h.morale);
  if(exp.log.length!==renderedLogs){
    $('log').innerHTML=exp.log.map(function(e){
      return '<div class="event '+e.type+'"><time>'+fmtTime(e.time)+'</time>'+e.text+(e.reasons&&e.reasons.length?'<span class="reasons">Why: '+e.reasons.join(' · ')+'</span>':'')+'</div>';
    }).join('');
    $('log').scrollTop=$('log').scrollHeight;
    renderedLogs=exp.log.length;
  }
  const d=exp.decisionDebug.length?exp.decisionDebug[exp.decisionDebug.length-1]:null;
  $('debug').textContent=d?JSON.stringify(d,null,2):'No decision yet.';
  if(exp.state!=='deployed')settleAndRender();
}

function settleAndRender(){
  if(!exp||exp.state==='deployed')return;
  let settlement=null;
  if(!settled&&activeHeroId){
    settlement=roster.settle(activeHeroId,exp);
    settled=settlement.ok;
  }
  const s=exp.summary();
  const mats=Object.entries(s.materials).map(function(kv){return '<span>'+kv[1]+' '+C.MATERIAL_NAMES[kv[0]]+(kv[1]>1?'s':'')+'</span>';}).join('')||'<span>None</span>';
  let progression='';
  if(settlement&&settlement.record){
    const r=settlement.record;
    progression='<p class="progression"><strong>Career:</strong> +'+r.xpGained+' XP · rank '+r.rankBefore+' → '+r.rankAfter+
      (r.traitsEarned.length?' · new trait: '+r.traitsEarned.join(', '):'')+
      (r.titlesEarned.length?' · new title: '+r.titlesEarned.join(', '):'')+'</p>';
  }
  $('summaryBody').innerHTML='<h3>'+s.contract+'</h3><p><strong>Result: '+s.outcome.toUpperCase()+'</strong> — '+(s.reason||'')+'</p>'+
    '<div class="summary-grid"><div>Time<br><strong>'+fmtTime(s.time)+'</strong></div><div>Areas<br><strong>'+s.areasExplored+'/'+s.totalAreas+'</strong></div>'+
    '<div>Enemies<br><strong>'+s.enemiesDefeated+'</strong></div><div>Progress<br><strong>'+s.objectiveProgress+'%</strong></div>'+
    '<div>Peak income<br><strong>'+s.peakGoldRate.toFixed(2)+' g/s</strong></div><div>Total gold<br><strong>'+s.totalGold.toFixed(1)+'</strong></div>'+
    '<div>Hero<br><strong>'+(s.heroAlive?'Alive':'Dead')+'</strong></div><div>Injuries<br><strong>'+s.injuries.length+'</strong></div></div>'+
    progression+'<h3>Recovered Materials</h3><div class="materials">'+mats+'</div><p class="banked">Current tavern funds: '+roster.funds.toFixed(1)+'g.</p>';
  $('returnHome').disabled=false;
  renderRoster(); renderHome(); renderHistoryLog();
  saveGame();
}

function startExpedition(){
  const h=selected();
  if(!h||expeditionLocked())return;
  roster.setLoadout(h.id,$('weapon').value,$('armor').value||null);
  exp=roster.startExpedition(h.id,+$('seed').value||1);
  if(!exp)return;
  activeHeroId=h.id; renderedLogs=0; settled=false;
  $('log').innerHTML=''; $('debug').textContent='';
  $('summaryBody').innerHTML='<p>Expedition in progress…</p>';
  $('returnHome').disabled=true;
  renderAll();
  saveGame();
}

function closeReport(){
  exp=null; activeHeroId=null; settled=false; renderedLogs=0;
  $('log').innerHTML=''; $('debug').textContent='';
  $('summaryBody').innerHTML='<p>Select a hero, prepare them, then deploy.</p>';
  $('returnHome').disabled=true;
  renderAll();
  saveGame();
}
function renderAll(){renderRoster();renderHome();renderHistoryLog();renderExpedition();}

loadGame();
renderPrepActions();
renderAll();
if(exp&&exp.state!=='deployed')settleAndRender();

$('weapon').addEventListener('change',function(){const h=selected();if(h&&!expeditionLocked()){roster.setLoadout(h.id,$('weapon').value,$('armor').value||null);renderAll();saveGame();}});
$('armor').addEventListener('change',function(){const h=selected();if(h&&!expeditionLocked()){roster.setLoadout(h.id,$('weapon').value,$('armor').value||null);renderAll();saveGame();}});
$('deploy').addEventListener('click',startExpedition);
$('returnHome').addEventListener('click',closeReport);
$('newTavern').addEventListener('click',function(){localStorage.removeItem(SAVE_KEY);newGame();$('summaryBody').innerHTML='<p>New tavern started.</p>';renderAll();saveGame();});
document.querySelectorAll('[data-speed]').forEach(function(b){b.addEventListener('click',function(){speed=+b.dataset.speed;document.querySelectorAll('[data-speed]').forEach(function(x){x.classList.toggle('active',x===b);});});});
$('step').addEventListener('click',function(){if(exp&&exp.state==='deployed'){exp.tick(1);renderExpedition();saveGame();}});
setInterval(function(){if(!exp||exp.state!=='deployed'||speed===0)return;for(let i=0;i<speed;i++)exp.tick(1);renderExpedition();saveGame();},250);
})();
