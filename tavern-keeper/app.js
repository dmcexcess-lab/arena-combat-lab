(()=>{
'use strict';
const C=window.TavernKeeperCore;
const $=id=>document.getElementById(id);
let home=new C.PreparationState({hero:C.makePreset('prepared'),funds:18});
let exp=null,speed=1,renderedLogs=0,settled=false;

function fmtTime(s){s=Math.floor(s);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function fmtPrepTime(m){m=Math.round(m);return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`;}
function injuryText(hero){if(!hero.injuries?.length)return 'None';return hero.injuries.map(i=>`${C.INJURY_TYPES[i.type]?.name||i.type}${i.severity>1?` ×${i.severity}`:''}`).join(', ');}
function chipList(items,empty='None'){return items?.length?items.map(x=>`<span>${x}</span>`).join(''):`<span class="muted">${empty}</span>`;}
function setBar(id,value){$(id).style.width=`${Math.max(0,Math.min(100,value))}%`;}

function renderPrepActions(){
  $('prepActions').innerHTML=Object.values(C.PREPARATION_ACTIONS).map(a=>`<button class="prep-action" data-prep="${a.id}"><strong>${a.name}</strong><span>${a.cost}g · ${a.minutes}m</span><small>${a.description}</small></button>`).join('');
  document.querySelectorAll('[data-prep]').forEach(btn=>btn.addEventListener('click',()=>{const r=home.apply(btn.dataset.prep);if(!r.ok)home.log.push({name:`Could not ${C.PREPARATION_ACTIONS[btn.dataset.prep]?.name||'prepare'}`,reason:r.reason});renderHome();}));
}

function renderHome(){
  const h=home.hero; C.deriveMoodlets(h);
  $('funds').textContent=`${home.funds.toFixed(1)}g`; $('prepTime').textContent=fmtPrepTime(home.prepMinutes);
  $('risk').textContent=C.threatAssessment(h); $('homeHealth').textContent=`${Math.round(h.health)}/${h.maxHealth}`; $('homeHunger').textContent=Math.round(h.hunger); $('homeFatigue').textContent=Math.round(h.fatigue); $('homeMorale').textContent=Math.round(h.morale);
  setBar('homeHealthBar',h.health/h.maxHealth*100); setBar('homeHungerBar',h.hunger); setBar('homeFatigueBar',h.fatigue); setBar('homeMoraleBar',h.morale);
  $('homeMoodlets').innerHTML=chipList(h.moodlets); $('injuries').innerHTML=chipList((h.injuries||[]).map(i=>`${C.INJURY_TYPES[i.type]?.name||i.type}${i.severity>1?` ×${i.severity}`:''}`));
  $('potions').textContent=h.supplies.healing_potion||0; $('weapon').value=h.equipment.weapon||'wood_axe'; $('armor').value=h.equipment.armor||'';
  $('heroCard').innerHTML=`<div><strong>${h.name}</strong><span>${h.alive?'Available':'DEAD'}</span></div><p>${Object.entries(h.stats).map(([k,v])=>`${k[0].toUpperCase()+k.slice(1)} ${v}`).join(' · ')}</p><small>${h.traits.join(' · ')} · Readiness ${C.readinessScore(h).toFixed(0)}</small>`;
  document.querySelectorAll('[data-prep]').forEach(btn=>{btn.disabled=!home.can(btn.dataset.prep);});
  $('deploy').disabled=!h.alive || (exp&&exp.state==='deployed');
  $('prepLog').innerHTML=home.log.slice(-6).reverse().map(e=>e.action==='settle'?`<div><strong>Expedition settled</strong><span>+${e.banked.toFixed(1)}g · ${e.outcome}</span></div>`:`<div><strong>${e.name||'Preparation'}</strong><span>${e.reason||((e.cost!=null)?`-${e.cost}g · ${e.minutes}m`:'')}</span></div>`).join('');
}

function renderExpedition(){
  if(!exp)return; const h=exp.hero,loc=exp.contract.locations[exp.locationId];
  $('status').textContent=exp.state.toUpperCase(); $('hp').textContent=`${Math.round(h.health)}/${h.maxHealth}`; $('gps').textContent=exp.goldRate.toFixed(2); $('gold').textContent=exp.gold.toFixed(1); $('progress').textContent=`${Math.round(exp.objectiveProgress)}%`;
  $('location').textContent=loc?.name||'Resolved'; $('moodlets').textContent=h.moodlets.join(', ')||'None'; $('fieldInjuries').textContent=injuryText(h); $('fieldPotions').textContent=h.supplies.healing_potion||0;
  setBar('hpBar',h.health/h.maxHealth*100); setBar('fatigueBar',h.fatigue); setBar('hungerBar',h.hunger); setBar('moraleBar',h.morale);
  if(exp.log.length!==renderedLogs){$('log').innerHTML=exp.log.map(e=>`<div class="event ${e.type}"><time>${fmtTime(e.time)}</time>${e.text}${e.reasons?.length?`<span class="reasons">Why: ${e.reasons.join(' · ')}</span>`:''}</div>`).join('');$('log').scrollTop=$('log').scrollHeight;renderedLogs=exp.log.length;}
  const d=exp.decisionDebug.at(-1); $('debug').textContent=d?JSON.stringify(d,null,2):'No decision yet.';
  if(exp.state!=='deployed')settleAndRender();
}

function settleAndRender(){
  if(!exp||exp.state==='deployed')return;
  if(!settled){const result=home.settle(exp);settled=result.ok;}
  const s=exp.summary(), mats=Object.entries(s.materials).map(([k,v])=>`<span>${v} ${C.MATERIAL_NAMES[k]}${v>1?'s':''}</span>`).join('')||'<span>None</span>';
  $('summaryBody').innerHTML=`<h3>${s.contract}</h3><p><strong>Result: ${s.outcome.toUpperCase()}</strong> — ${s.reason||''}</p><div class="summary-grid"><div>Time<br><strong>${fmtTime(s.time)}</strong></div><div>Areas<br><strong>${s.areasExplored}/${s.totalAreas}</strong></div><div>Enemies<br><strong>${s.enemiesDefeated}</strong></div><div>Progress<br><strong>${s.objectiveProgress}%</strong></div><div>Peak income<br><strong>${s.peakGoldRate.toFixed(2)} g/s</strong></div><div>Total gold<br><strong>${s.totalGold.toFixed(1)}</strong></div><div>Hero<br><strong>${s.heroAlive?'Alive':'Dead'}</strong></div><div>Injuries<br><strong>${s.injuries.length}</strong></div></div><h3>Recovered Materials</h3><div class="materials">${mats}</div><p class="banked">Expedition proceeds are banked at the tavern. Current funds: ${home.funds.toFixed(1)}g.</p>`;
  $('returnHome').disabled=false; renderHome();
}

function startExpedition(){
  if(!home.hero.alive)return; home.setLoadout($('weapon').value,$('armor').value||null); exp=new C.Expedition({hero:home.hero,seed:+$('seed').value||1,debug:true}); renderedLogs=0; settled=false; $('log').innerHTML=''; $('debug').textContent=''; $('summaryBody').innerHTML='<p>Expedition in progress…</p>'; $('returnHome').disabled=true; renderHome(); renderExpedition();
}

function freshHero(){home=new C.PreparationState({hero:C.makePreset('prepared'),funds:18});exp=null;settled=false;renderedLogs=0;$('status').textContent='READY';$('log').innerHTML='';$('debug').textContent='';$('summaryBody').innerHTML='<p>Fresh test hero ready.</p>';$('returnHome').disabled=true;renderHome();}

renderPrepActions(); renderHome();
$('weapon').addEventListener('change',()=>{home.setLoadout($('weapon').value,$('armor').value||null);renderHome();}); $('armor').addEventListener('change',()=>{home.setLoadout($('weapon').value,$('armor').value||null);renderHome();});
$('deploy').addEventListener('click',startExpedition); $('freshHero').addEventListener('click',freshHero); $('returnHome').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'smooth'});renderHome();});
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{speed=+b.dataset.speed;document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));}));
$('step').addEventListener('click',()=>{if(exp?.state==='deployed'){exp.tick(1);renderExpedition();}});
setInterval(()=>{if(!exp||exp.state!=='deployed'||speed===0)return;for(let i=0;i<speed;i++)exp.tick(1);renderExpedition();},250);
})();
