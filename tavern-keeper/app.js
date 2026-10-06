(()=>{
'use strict';
const C=window.TavernKeeperCore;
const $=id=>document.getElementById(id);
const SAVE_KEY='tavernKeeper.slice3.v1';

let roster=null,exp=null,activeHeroId=null,settled=false,speed=1,renderedLogs=0,saveClock=0;

function newGame(){
  roster=new C.TavernRoster({funds:30});
  exp=null; activeHeroId=null; settled=false; renderedLogs=0;
}
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,roster:roster.snapshot(),expedition:exp?exp.snapshot():null,activeHeroId:activeHeroId,settled:settled}));
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
function patronOrder(p){
  const parts=[];
  if(p.food)parts.push('food');
  if(p.drink)parts.push('drink');
  return parts.join(' + ');
}

function renderEconomy(){
  const t=roster.tavern;
  const projected=t.projectedGoldRate();
  const rolling=t.rollingGoldRate();
  $('funds').textContent=roster.funds.toFixed(1)+'g';
  $('tavernGps').textContent=projected.toFixed(2);
  $('projectedGps').textContent=projected.toFixed(2)+' g/s';
  $('rollingGps').textContent=rolling.toFixed(2)+' g/s';
  $('seatCount').textContent=t.active.length+'/'+t.seats;
  $('serviceLevel').textContent='Lv '+t.serviceLevel+' · '+t.serviceSlots()+' server'+(t.serviceSlots()===1?'':'s');
  $('servedCount').textContent=t.served;
  $('lostCount').textContent=t.lost;

  const unserved=t.active.filter(function(p){return !p.served;});
  const servingIds=new Set(unserved.slice(0,t.serviceSlots()).map(function(p){return p.id;}));
  $('seatedPatrons').innerHTML=t.active.length?t.active.map(function(p){
    const type=C.PATRON_TYPES[p.type]||C.PATRON_TYPES.laborer;
    let state='';
    if(p.served)state='Eating/drinking · '+Math.max(0,p.remainingStay).toFixed(0)+'s';
    else if(servingIds.has(p.id))state='Being served · '+Math.max(0,p.remainingService).toFixed(0)+'s';
    else state='Waiting for service';
    return '<div class="patron-card"><div><strong>'+type.name+'</strong><span>'+patronOrder(p)+'</span></div><small>'+state+'</small></div>';
  }).join(''):'<p class="empty">No one seated yet.</p>';

  $('waitingPatrons').innerHTML=t.queue.length?t.queue.map(function(p){
    const type=C.PATRON_TYPES[p.type]||C.PATRON_TYPES.laborer;
    return '<div class="patron-card"><div><strong>'+type.name+'</strong><span>'+patronOrder(p)+'</span></div></div>';
  }).join(''):'<p class="empty">No queue.</p>';

  $('serviceLog').innerHTML=t.log.length?t.log.slice().reverse().slice(0,8).map(function(e){
    return '<div class="'+e.type+'"><time>'+fmtTime(e.time)+'</time><span>'+e.text+'</span></div>';
  }).join(''):'<p class="empty">Open the doors and patrons will arrive.</p>';

  const defs=[
    {id:'seats',name:'Add Seating',level:t.seats+' seats',next:'+2 seats'},
    {id:'service',name:'Improve Service',level:'Lv '+t.serviceLevel,next:'faster / more servers'},
    {id:'kitchen',name:'Improve Kitchen',level:'Lv '+t.kitchenLevel,next:'higher food spend'},
    {id:'bar',name:'Improve Bar',level:'Lv '+t.barLevel,next:'higher drink spend'}
  ];
  $('tavernUpgrades').innerHTML=defs.map(function(d){
    const maxed=!t.canUpgrade(d.id);
    const cost=t.upgradeCost(d.id);
    return '<button class="upgrade-card" data-upgrade="'+d.id+'" '+(maxed||roster.funds<cost?'disabled':'')+'>'+
      '<strong>'+d.name+'</strong><span>'+d.level+'</span><small>'+(maxed?'MAX':cost+'g · '+d.next)+'</small></button>';
  }).join('');
  document.querySelectorAll('[data-upgrade]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const r=roster.upgradeTavern(btn.dataset.upgrade);
      if(r.ok){renderAll();saveGame();}
    });
  });
}

function renderMerchants(){
  const m=roster.merchants;
  const draw=C.merchantQuality(roster.tavern);
  $('merchantDraw').textContent='Quality '+draw;
  if(!m.active){
    $('merchantStatus').textContent='ON THE ROAD';
    $('merchantName').textContent='No merchant present';
    $('merchantQuality').textContent='—';
    $('merchantTimer').textContent=Math.ceil(m.nextArrival)+'s';
    $('merchantNote').textContent='Next merchant due in about '+Math.ceil(m.nextArrival)+'s. Better-developed taverns attract higher-quality stock.';
    $('merchantOffers').innerHTML='<p class="empty">No offers until a merchant arrives.</p>';
  }else{
    const visit=m.active;
    $('merchantStatus').textContent='TRADING';
    $('merchantName').textContent=visit.name;
    $('merchantQuality').textContent='Quality '+visit.quality;
    $('merchantTimer').textContent=Math.max(0,Math.ceil(visit.remaining))+'s';
    $('merchantNote').textContent='Finite visit stock. Purchased goods enter the same shared stash used by crafting and hero loadouts.';
    $('merchantOffers').innerHTML=visit.offers.map(function(o){
      let detail='';
      if(o.type==='material')detail='Raw material';
      else{
        const item=C.EQUIPMENT[o.id];
        if(item.slot==='weapon')detail='Weapon · damage '+item.damage;
        else if(item.slot==='armor')detail='Armor · defense '+item.defense;
        else detail='Consumable · heal '+(item.heal||0);
      }
      const sold=o.quantity<=0;
      const affordable=roster.funds>=o.unitPrice;
      return '<div class="merchant-offer '+(sold?'sold':'')+'"><div><strong>'+o.name+'</strong><span>×'+o.quantity+'</span></div>'+
        '<small>'+detail+' · '+o.unitPrice+'g each</small>'+
        '<button data-buy="'+o.key+'" '+(sold||!affordable?'disabled':'')+'>'+(sold?'Sold out':'Buy 1')+'</button></div>';
    }).join('');
  }

  $('merchantLog').innerHTML=m.log.length?m.log.slice().reverse().slice(0,7).map(function(e){
    return '<div class="'+e.type+'"><time>'+fmtTime(e.time)+'</time><span>'+e.text+'</span></div>';
  }).join(''):'<p class="empty">No merchant visits yet.</p>';

  document.querySelectorAll('[data-buy]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const r=roster.purchaseMerchantOffer(btn.dataset.buy,1);
      if(r.ok){renderAll();saveGame();}
    });
  });
}

function renderCrafting(){
  const materialIds=Object.keys(C.MATERIAL_NAMES);
  $('materialStash').innerHTML=materialIds.map(function(id){
    return '<div><span>'+C.MATERIAL_NAMES[id]+'</span><strong>'+roster.materialCount(id)+'</strong></div>';
  }).join('');

  const stockIds=Object.keys(roster.inventory).filter(function(id){return roster.itemCount(id)>0&&C.EQUIPMENT[id];});
  if(stockIds.length){
    $('itemStock').innerHTML=stockIds.map(function(id){
      const item=C.EQUIPMENT[id],count=roster.itemCount(id);
      let stat='';
      if(item.slot==='weapon')stat='Damage '+item.damage;
      else if(item.slot==='armor')stat='Defense '+item.defense;
      else if(item.kind==='potion')stat='Heal '+item.heal;
      else if(item.kind==='bandage')stat='Heal '+item.heal+' · treats injury';
      const h=selected();
      let action='';
      if(item.slot==='weapon'||item.slot==='armor'){
        action='<button data-equip="'+id+'" '+(!h||expeditionLocked()?'disabled':'')+'>Equip</button>';
      }else if(item.slot==='consumable'){
        action='<button data-give="'+id+'" '+(!h||expeditionLocked()?'disabled':'')+'>Give</button>';
      }
      return '<div class="stock-card"><div><strong>'+item.name+'</strong><span>×'+count+'</span></div><small>'+stat+'</small>'+action+'</div>';
    }).join('');
  }else{
    $('itemStock').innerHTML='<p class="empty">No stored items yet.</p>';
  }

  $('recipeList').innerHTML=Object.values(C.CRAFT_RECIPES).map(function(r){
    const mats=Object.entries(r.materials).map(function(kv){
      const have=roster.materialCount(kv[0]);
      return '<span class="'+(have>=kv[1]?'ok':'short')+'">'+C.MATERIAL_NAMES[kv[0]]+' '+have+'/'+kv[1]+'</span>';
    }).join('');
    return '<div class="recipe-card"><div><strong>'+r.name+'</strong><span>'+r.category+'</span></div><p>'+r.description+'</p><div class="recipe-mats">'+mats+'</div><small>'+r.minutes+' prep min · makes '+r.outputCount+'</small><button data-craft="'+r.id+'" '+(!roster.canCraft(r.id)?'disabled':'')+'>Craft</button></div>';
  }).join('');

  $('craftLog').innerHTML=roster.craftHistory.length?roster.craftHistory.slice().reverse().slice(0,6).map(function(e){
    return '<div><strong>'+e.name+'</strong><span>made '+e.made+' · '+e.minutes+'m</span></div>';
  }).join(''):'<p class="empty">No crafting yet.</p>';

  document.querySelectorAll('[data-craft]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const r=roster.craft(btn.dataset.craft);
      if(r.ok){renderAll();saveGame();}
    });
  });
  document.querySelectorAll('[data-equip]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const h=selected(); if(!h)return;
      const r=roster.equipInventoryItem(h.id,btn.dataset.equip);
      if(r.ok){renderAll();saveGame();}
    });
  });
  document.querySelectorAll('[data-give]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const h=selected(); if(!h)return;
      const r=roster.giveConsumable(h.id,btn.dataset.give,1);
      if(r.ok){renderAll();saveGame();}
    });
  });
}

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
    $('heroRoster').innerHTML='<p class="empty">No living heroes remain. The tavern still earns.</p>';
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
    ['homeHealth','homeHunger','homeFatigue','homeMorale','careerRank','careerXp','careerContracts','careerSuccesses','potions','bandages','currentWeapon','currentArmor'].forEach(function(id){$(id).textContent='—';});
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
  $('bandages').textContent=h.supplies.field_bandage||0;
  $('currentWeapon').textContent=(C.EQUIPMENT[h.equipment.weapon]||C.EQUIPMENT.wood_axe).name;
  $('currentArmor').textContent=h.equipment.armor?(C.EQUIPMENT[h.equipment.armor]?.name||h.equipment.armor):'None';
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
    '<div>Peak hero income<br><strong>'+s.peakGoldRate.toFixed(2)+' g/s</strong></div><div>Hero gold<br><strong>'+s.totalGold.toFixed(1)+'</strong></div>'+
    '<div>Hero<br><strong>'+(s.heroAlive?'Alive':'Dead')+'</strong></div><div>Injuries<br><strong>'+s.injuries.length+'</strong></div></div>'+
    progression+'<h3>Recovered Materials</h3><div class="materials">'+mats+'</div><p class="banked">Current tavern funds: '+roster.funds.toFixed(1)+'g. Tavern service continued while this contract ran.</p>';
  $('returnHome').disabled=false;
  renderEconomy(); renderMerchants(); renderCrafting(); renderRoster(); renderHome(); renderHistoryLog();
  saveGame();
}

function startExpedition(){
  const h=selected();
  if(!h||expeditionLocked())return;
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
function renderAll(){renderEconomy();renderMerchants();renderCrafting();renderRoster();renderHome();renderHistoryLog();renderExpedition();}

loadGame();
renderPrepActions();
renderAll();
if(exp&&exp.state!=='deployed')settleAndRender();

$('deploy').addEventListener('click',startExpedition);
$('returnHome').addEventListener('click',closeReport);
$('newTavern').addEventListener('click',function(){localStorage.removeItem(SAVE_KEY);newGame();$('summaryBody').innerHTML='<p>New tavern started.</p>';renderAll();saveGame();});
document.querySelectorAll('[data-speed]').forEach(function(b){b.addEventListener('click',function(){speed=+b.dataset.speed;document.querySelectorAll('[data-speed]').forEach(function(x){x.classList.toggle('active',x===b);});});});
$('step').addEventListener('click',function(){if(exp&&exp.state==='deployed'){exp.tick(1);renderExpedition();saveGame();}});

setInterval(function(){
  const earned=roster.tickTavern(0.25);
  if(exp&&exp.state==='deployed'&&speed>0){
    for(let i=0;i<speed;i++)exp.tick(1);
    renderExpedition();
  }
  renderEconomy();
  renderMerchants();
  if(earned>0)renderHome();
  saveClock+=0.25;
  if(saveClock>=1){saveClock=0;saveGame();}
},250);
})();
