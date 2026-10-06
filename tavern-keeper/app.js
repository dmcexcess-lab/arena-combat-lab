(()=>{
'use strict';
const C=window.TavernKeeperCore;
const $=id=>document.getElementById(id);
const SAVE_KEY='tavernKeeper.slice3.v1';

let roster=null,expeditions=null,renderedLogs={},saveClock=0;

function newGame(){
  roster=new C.TavernRoster({funds:30});
  expeditions=new C.ExpeditionManager();
  renderedLogs={};
}
function saveGame(){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({version:3,roster:roster.snapshot(),expeditions:expeditions.snapshot()}));
    $('saveState').textContent='Saved';
  }catch(_){$('saveState').textContent='Unavailable';}
}
function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw){newGame();return;}
    const data=JSON.parse(raw);
    roster=C.TavernRoster.fromSnapshot(data.roster);
    if(data.expeditions){
      expeditions=C.ExpeditionManager.fromSnapshot(data.expeditions);
    }else if(data.expedition){
      const legacyId='exp_1';
      expeditions=C.ExpeditionManager.fromSnapshot({
        version:1,nextId:2,selectedId:legacyId,
        entries:[{id:legacyId,heroId:data.activeHeroId||data.expedition.hero?.id,speed:1,settled:!!data.settled,settlement:null,expedition:data.expedition}]
      });
    }else expeditions=new C.ExpeditionManager();
    settleResolved();
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
function gearConditionText(hero,slot){
  const itemId=hero?.equipment?.[slot];
  if(!itemId)return 'None';
  const d=C.normalizeDurability(hero.gearDurability?.[slot]);
  return (C.EQUIPMENT[itemId]?.name||itemId)+' · '+Math.round(d)+'% '+C.durabilityCondition(d);
}
function repairLabel(itemId,durability,prefix){
  const q=C.repairQuote(itemId,durability);
  if(!q||q.missing<=0)return prefix+' · maintained';
  return prefix+' · '+q.gold+'g'+(q.scrapIron?' + '+q.scrapIron+' iron':'')+' · '+q.minutes+'m';
}
function objectiveStateText(exp){
  const o=exp.objectiveState||{};
  if(exp.contract.kind==='Hunt')return 'Wolves '+(o.quarryKills||0)+'/'+(o.killTarget||0)+(o.lairCleared?' · den cleared':'');
  if(exp.contract.kind==='Extermination')return 'Vermin '+(o.verminKills||0)+'/'+(o.killTarget||0)+(o.nestCleared?' · nest destroyed':'');
  if(exp.contract.kind==='Escort')return 'Caravan '+Math.round(o.caravanIntegrity==null?100:o.caravanIntegrity)+'% · '+(o.checkpoints||0)+' checkpoints';
  if(exp.contract.kind==='Delve')return (o.discoveries||0)+' discoveries · '+(o.minersRescued||0)+'/'+(o.rescueMax||0)+' miners';
  if(exp.contract.kind==='Boss Hunt'){
    const pct=Math.round(Math.min(100,(o.bossDamage||0)/Math.max(1,o.bossMaxHp||1)*100));
    return 'Boss '+pct+'% damage'+(o.bossKilled?' · killed':'');
  }
  return 'No objective state';
}
function chipList(items,empty){
  empty=empty||'None';
  return items&&items.length?items.map(function(x){return '<span>'+x+'</span>';}).join(''):'<span class="muted">'+empty+'</span>';
}
function setBar(id,value){$(id).style.width=Math.max(0,Math.min(100,value))+'%';}
function selected(){return roster.getHero();}
function focusedEntry(){return expeditions?expeditions.get():null;}
function expeditionLocked(heroId){
  const id=heroId||(selected()?selected().id:null);
  return !!(id&&expeditions&&expeditions.hasHero(id));
}
function settleResolved(){
  if(!expeditions)return 0;
  let count=0;
  for(const entry of expeditions.entries){
    if(entry.expedition.state==='deployed'||entry.settled)continue;
    const hero=roster.getHero(entry.heroId);
    if(!hero){entry.settled=true;continue;}
    const settlement=roster.settle(entry.heroId,entry.expedition,entry.id);
    if(settlement.ok){expeditions.markSettled(entry.id,settlement);count++;}
  }
  return count;
}
function selectAvailableHero(){
  const current=selected();
  if(current&&!expeditionLocked(current.id))return current;
  const next=roster.aliveHeroes().find(function(h){return !expeditionLocked(h.id);});
  if(next)roster.selectHero(next.id);
  return next||null;
}
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

function renderApplicants(){
  const r=roster.recruitment;
  const draw=C.applicantQuality(roster.tavern);
  $('applicantDraw').textContent='Quality '+draw;
  if(!r.active){
    $('applicantStatus').textContent='WAITING';
    $('applicantName').textContent='No applicant present';
    $('applicantQuality').textContent='—';
    $('applicantCost').textContent='—';
    $('applicantTimer').textContent=Math.ceil(r.nextArrival)+'s';
    $('applicantBody').innerHTML='<p class="empty">Next applicant expected in about '+Math.ceil(r.nextArrival)+'s. Tavern development improves applicant quality.</p>';
    $('recruitApplicant').disabled=true;
  }else{
    const a=r.active,h=a.hero;
    const weapon=C.EQUIPMENT[h.equipment.weapon]||C.EQUIPMENT.wood_axe;
    const armor=h.equipment.armor?(C.EQUIPMENT[h.equipment.armor]||null):null;
    $('applicantStatus').textContent='LOOKING FOR WORK';
    $('applicantName').textContent=h.name;
    $('applicantQuality').textContent='Quality '+a.quality;
    $('applicantCost').textContent=a.cost+'g';
    $('applicantTimer').textContent=Math.max(0,Math.ceil(a.remaining))+'s';
    $('applicantBody').innerHTML=
      '<div class="applicant-card">'+
        '<div class="applicant-stats">'+Object.entries(h.stats).map(function(kv){return '<div><span>'+kv[0]+'</span><strong>'+kv[1]+'</strong></div>';}).join('')+'</div>'+
        '<div class="applicant-details">'+
          '<p><strong>Traits:</strong> '+h.traits.join(' · ')+'</p>'+
          '<p><strong>Condition:</strong> '+Math.round(h.health)+' HP · Hunger '+Math.round(h.hunger)+' · Fatigue '+Math.round(h.fatigue)+' · Morale '+Math.round(h.morale)+'</p>'+
          '<p><strong>Gear:</strong> '+weapon.name+' · '+(armor?armor.name:'No armor')+(h.supplies.healing_potion?' · Healing Potion':'')+'</p>'+
          '<p><strong>Readiness:</strong> '+C.readinessScore(h).toFixed(0)+' · '+C.threatAssessment(h,roster.getContract())+' for '+roster.getContract().name+'</p>'+
        '</div>'+
      '</div>';
    $('recruitApplicant').disabled=roster.funds<a.cost;
  }

  $('applicantLog').innerHTML=r.log.length?r.log.slice().reverse().slice(0,7).map(function(e){
    return '<div class="'+e.type+'"><time>'+fmtTime(e.time)+'</time><span>'+e.text+'</span></div>';
  }).join(''):'<p class="empty">No applicants have visited yet.</p>';
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
        const ds=roster.stockDurabilities(id);
        stat+=' · '+ds.map(function(d){return Math.round(d)+'%';}).join(', ');
        const worst=ds.length?Math.min.apply(null,ds):100;
        action='<button data-equip="'+id+'" '+(!h||expeditionLocked()?'disabled':'')+'>Equip best</button>'+
          '<button data-repair-stock="'+id+'" '+(worst>=100||expeditionLocked()?'disabled':'')+'>'+repairLabel(id,worst,'Repair worst')+'</button>';
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
  $('repairLog').innerHTML=roster.repairHistory.length?roster.repairHistory.slice().reverse().slice(0,6).map(function(e){
    return '<div><strong>'+e.name+'</strong><span>'+Math.round(e.before)+'% → 100% · '+e.gold+'g'+(e.scrapIron?' + '+e.scrapIron+' iron':'')+'</span></div>';
  }).join(''):'<p class="empty">No maintenance yet.</p>';

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
  document.querySelectorAll('[data-repair-stock]').forEach(function(btn){
    btn.addEventListener('click',function(){
      const r=roster.repairStoredGear(btn.dataset.repairStock);
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

function renderContractBoard(){
  const h=selected();
  const selectedContract=roster.getContract();
  $('selectedContractName').textContent=selectedContract.name;
  $('selectedContractThreat').textContent='Threat '+selectedContract.threat;
  $('selectedContractObjective').textContent=selectedContract.objective;
  $('selectedContractRisk').textContent=h
    ? C.threatAssessment(h,selectedContract)+' for '+h.name+' · '+selectedContract.kind+' · income ×'+selectedContract.incomeMult.toFixed(2)
    : selectedContract.kind+' · income ×'+selectedContract.incomeMult.toFixed(2)+' · select a living hero for risk assessment';

  $('contractBoard').innerHTML=C.CONTRACT_ORDER.map(function(id){
    const c=C.CONTRACTS[id];
    const assessment=h?C.threatAssessment(h,c):'No hero selected';
    const mats=c.materialProfile.map(function(mat){return C.MATERIAL_NAMES[mat]||mat;}).join(' · ');
    return '<button class="board-contract '+(id===roster.selectedContractId?'selected':'')+'" data-contract="'+id+'">'+
      '<div><strong>'+c.name+'</strong><span>Threat '+c.threat+'</span></div>'+
      '<em>'+c.kind+' · '+assessment+'</em>'+
      '<p>'+c.brief+'</p>'+
      '<small>Objectives: '+c.subObjectives.join(' · ')+'</small>'+
      '<small>Income ×'+c.incomeMult.toFixed(2)+' · '+mats+'</small></button>';
  }).join('');

  document.querySelectorAll('[data-contract]').forEach(function(btn){
    btn.addEventListener('click',function(){
      roster.selectContract(btn.dataset.contract);
      renderAll();
      saveGame();
    });
  });
}

function renderRoster(){
  const heroes=roster.aliveHeroes();
  $('rosterCount').textContent=heroes.length+' alive · '+expeditions.activeEntries().length+' deployed';
  if(heroes.length){
    $('heroRoster').innerHTML=heroes.map(function(h){
      const deployed=expeditionLocked(h.id);
      return '<button class="roster-card '+(h.id===roster.selectedHeroId?'selected':'')+(deployed?' deployed':'')+'" data-hero="'+h.id+'" '+(deployed?'disabled':'')+'>'+
        '<div><strong>'+h.name+'</strong><span>'+(deployed?'DEPLOYED':'Rank '+h.career.rank)+'</span></div>'+
        '<small>'+C.threatAssessment(h,roster.getContract())+' · '+Math.round(h.health)+' HP · '+h.career.contracts+' contracts</small>'+
        '<em>'+(h.titles.length?h.titles[h.titles.length-1]:h.traits.slice(0,2).join(' · '))+'</em></button>';
    }).join('');
  }else{
    $('heroRoster').innerHTML='<p class="empty">No living heroes remain. The tavern still earns.</p>';
  }
  document.querySelectorAll('[data-hero]').forEach(function(btn){
    btn.addEventListener('click',function(){
      if(expeditionLocked(btn.dataset.hero))return;
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
      if(!h||expeditionLocked(h.id))return;
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
    ['homeHealth','homeHunger','homeFatigue','homeMorale','careerRank','careerXp','careerContracts','careerSuccesses','potions','bandages','currentWeapon','currentArmor'].forEach(function(id){$(id).textContent='—';}); $('repairWeapon').disabled=true; $('repairArmor').disabled=true;
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
  $('risk').textContent=C.threatAssessment(h,roster.getContract());
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
  $('currentWeapon').textContent=gearConditionText(h,'weapon');
  $('currentArmor').textContent=gearConditionText(h,'armor');
  const wq=C.repairQuote(h.equipment.weapon,h.gearDurability.weapon);
  const aq=h.equipment.armor?C.repairQuote(h.equipment.armor,h.gearDurability.armor):null;
  $('repairWeapon').textContent=repairLabel(h.equipment.weapon,h.gearDurability.weapon,'Repair Weapon');
  $('repairArmor').textContent=h.equipment.armor?repairLabel(h.equipment.armor,h.gearDurability.armor,'Repair Armor'):'No Armor';
  $('repairWeapon').disabled=expeditionLocked(h.id)||!wq||wq.missing<=0||roster.funds<wq.gold||roster.materialCount('scrap_iron')<wq.scrapIron;
  $('repairArmor').disabled=expeditionLocked(h.id)||!aq||aq.missing<=0||roster.funds<aq.gold||roster.materialCount('scrap_iron')<aq.scrapIron;
  $('heroCard').innerHTML='<div><strong>'+h.name+'</strong><span>Rank '+h.career.rank+'</span></div>'+
    '<p>'+Object.entries(h.stats).map(function(kv){return kv[0][0].toUpperCase()+kv[0].slice(1)+' '+kv[1];}).join(' · ')+'</p>'+
    '<small>'+h.traits.join(' · ')+' · Readiness '+C.readinessScore(h).toFixed(0)+(h.recruitment?' · Recruited Q'+h.recruitment.quality:' · Founding hero')+'</small>';

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

  document.querySelectorAll('[data-prep]').forEach(function(btn){btn.disabled=expeditionLocked(h.id)||!roster.canPrepare(h.id,btn.dataset.prep);});
  $('deploy').disabled=expeditionLocked(h.id)||!h.alive;
}

function renderHistoryLog(){
  $('prepLog').innerHTML=roster.history.slice(-6).reverse().map(function(e){
    const right=e.progress!=null?e.progress+'% · '+(e.kills||0)+' kills':(e.note||'');
    return '<div><strong>'+(e.heroName||'Tavern')+' — '+(e.outcome||e.name||'event')+'</strong><span>'+right+'</span></div>';
  }).join('');
}

function renderExpeditionTabs(){
  const entries=expeditions.entries;
  const active=expeditions.activeEntries().length;
  $('expeditionCount').textContent=active+' ACTIVE · '+entries.length+' TOTAL';
  if(!entries.length){
    $('expeditionTabs').innerHTML='<p class="empty">No expeditions yet.</p>';
    return;
  }
  $('expeditionTabs').innerHTML=entries.map(function(entry){
    const e=entry.expedition,h=e.hero;
    const state=e.state==='deployed'?(entry.speed===0?'PAUSED':'ACTIVE ×'+entry.speed):e.state.toUpperCase();
    return '<button class="expedition-tab '+(entry.id===expeditions.selectedId?'selected':'')+' '+e.state+'" data-expedition="'+entry.id+'">'+
      '<div><strong>'+h.name+'</strong><span>'+state+'</span></div>'+
      '<small>'+e.contract.name+' · score '+Math.round(e.objectiveScore||0)+'/100 · '+e.gold.toFixed(1)+'g</small></button>';
  }).join('');
  document.querySelectorAll('[data-expedition]').forEach(function(btn){
    btn.addEventListener('click',function(){
      expeditions.select(btn.dataset.expedition);
      renderExpedition();
      saveGame();
    });
  });
}

function renderSummary(entry){
  if(!entry){
    $('summaryBody').innerHTML='<p>Select a hero, prepare them, then deploy.</p>';
    $('returnHome').disabled=true;
    return;
  }
  const exp=entry.expedition;
  if(exp.state==='deployed'){
    $('summaryBody').innerHTML='<p><strong>'+exp.hero.name+'</strong> is currently running '+exp.contract.name+'. Select another expedition above to inspect it.</p>';
    $('returnHome').disabled=true;
    return;
  }
  const s=exp.summary(),settlement=entry.settlement;
  const mats=Object.entries(s.materials).map(function(kv){return '<span>'+kv[1]+' '+C.MATERIAL_NAMES[kv[0]]+(kv[1]>1?'s':'')+'</span>';}).join('')||'<span>None</span>';
  let progression='',gearResult='';
  if(s.gearOutcome){
    const rec=s.gearOutcome.recovered.map(function(g){return g.name+' '+Math.round(g.durability)+'%';}).join(', ')||'None';
    const lost=s.gearOutcome.lost.map(function(g){return g.name;}).join(', ')||'None';
    gearResult='<h3>Death Gear Resolution</h3><p><strong>Recovered:</strong> '+rec+'<br><strong>Lost:</strong> '+lost+'<br><small>Recovery requires at least '+s.gearOutcome.threshold+'% objective progress; recovered gear returns damaged.</small></p>';
  }
  if(settlement&&settlement.record){
    const r=settlement.record;
    progression='<p class="progression"><strong>Career:</strong> +'+r.xpGained+' XP · rank '+r.rankBefore+' → '+r.rankAfter+
      (r.traitsEarned.length?' · new trait: '+r.traitsEarned.join(', '):'')+
      (r.titlesEarned.length?' · new title: '+r.titlesEarned.join(', '):'')+'</p>';
  }
  const objectiveEvents=(s.objectiveEvents||[]).map(function(e){return '<div><strong>'+e.label+'</strong><span>+'+e.points+' score · +'+e.bonus.toFixed(2)+'g</span></div>';}).join('')||'<p class="empty">No sub-objectives completed.</p>';
  $('summaryBody').innerHTML='<h3>'+s.contract+'</h3><p><strong>Result: '+s.outcome.toUpperCase()+'</strong> — '+(s.reason||'')+'</p>'+
    '<div class="summary-grid"><div>Time<br><strong>'+fmtTime(s.time)+'</strong></div><div>Areas<br><strong>'+s.areasExplored+'/'+s.totalAreas+'</strong></div>'+
    '<div>Enemies<br><strong>'+s.enemiesDefeated+'</strong></div><div>Route progress<br><strong>'+s.objectiveProgress+'%</strong></div>'+
    '<div>Objective score<br><strong>'+s.objectiveScore+'/'+s.objectiveMax+'</strong></div><div>Objective bonus<br><strong>'+s.objectiveBonusGold.toFixed(2)+'g</strong></div>'+
    '<div>Peak hero income<br><strong>'+s.peakGoldRate.toFixed(2)+' g/s</strong></div><div>Hero gold<br><strong>'+s.totalGold.toFixed(1)+'</strong></div>'+
    '<div>Hero<br><strong>'+(s.heroAlive?'Alive':'Dead')+'</strong></div><div>Injuries<br><strong>'+s.injuries.length+'</strong></div></div>'+
    '<h3>Objective Scorecard</h3><div class="objective-events">'+objectiveEvents+'</div>'+
    progression+gearResult+'<h3>Recovered Materials</h3><div class="materials">'+mats+'</div><p class="banked">Current tavern funds: '+roster.funds.toFixed(1)+'g. Objective bonuses and performance pay earned before failure remain banked.</p>';
  $('returnHome').disabled=!entry.settled;
}

function renderExpedition(){
  renderExpeditionTabs();
  const entry=focusedEntry();
  if(!entry){
    $('status').textContent='READY';
    $('activeHeroBanner').textContent='No active expedition.';
    ['hp','gps','gold','progress','location','moodlets','fieldInjuries','fieldPotions','fieldWeapon','fieldArmor','fieldObjectiveScore','fieldObjectiveState'].forEach(function(id){$(id).textContent='—';});
    ['hpBar','fatigueBar','hungerBar','moraleBar'].forEach(function(id){setBar(id,0);});
    $('log').innerHTML='<p class="empty">No expedition selected.</p>';
    $('debug').textContent='No decision yet.';
    document.querySelectorAll('[data-speed]').forEach(function(b){b.disabled=true;b.classList.remove('active');});
    $('step').disabled=true;
    renderSummary(null);
    return;
  }
  const exp=entry.expedition,h=exp.hero,loc=exp.contract.locations[exp.locationId];
  $('activeHeroBanner').textContent=h.name+' · '+exp.contract.name+' · Threat '+exp.contract.threat+' · career rank '+h.career.rank+' · seed '+exp.seed;
  $('status').textContent=exp.state.toUpperCase();
  $('hp').textContent=Math.round(h.health)+'/'+h.maxHealth;
  $('gps').textContent=exp.goldRate.toFixed(2);
  $('gold').textContent=exp.gold.toFixed(1);
  $('progress').textContent=Math.round(exp.objectiveProgress)+'%';
  $('location').textContent=loc?loc.name:'Resolved';
  $('moodlets').textContent=h.moodlets.join(', ')||'None';
  $('fieldInjuries').textContent=injuryText(h);
  $('fieldPotions').textContent=h.supplies.healing_potion||0;
  $('fieldWeapon').textContent=gearConditionText(h,'weapon');
  $('fieldArmor').textContent=gearConditionText(h,'armor');
  $('fieldObjectiveScore').textContent=Math.round(exp.objectiveScore||0)+'/'+(exp.objectiveMax||100)+' · +'+(exp.objectiveBonusGold||0).toFixed(2)+'g';
  $('fieldObjectiveState').textContent=objectiveStateText(exp);
  setBar('hpBar',h.health/h.maxHealth*100);
  setBar('fatigueBar',h.fatigue);
  setBar('hungerBar',h.hunger);
  setBar('moraleBar',h.morale);
  const shown=renderedLogs[entry.id]||0;
  if(exp.log.length!==shown){
    $('log').innerHTML=exp.log.map(function(e){
      return '<div class="event '+e.type+'"><time>'+fmtTime(e.time)+'</time>'+e.text+(e.reasons&&e.reasons.length?'<span class="reasons">Why: '+e.reasons.join(' · ')+'</span>':'')+'</div>';
    }).join('');
    $('log').scrollTop=$('log').scrollHeight;
    renderedLogs[entry.id]=exp.log.length;
  }
  const d=exp.decisionDebug.length?exp.decisionDebug[exp.decisionDebug.length-1]:null;
  $('debug').textContent=d?JSON.stringify(d,null,2):'No decision yet.';
  document.querySelectorAll('[data-speed]').forEach(function(b){
    b.disabled=exp.state!=='deployed';
    b.classList.toggle('active',exp.state==='deployed'&&+b.dataset.speed===entry.speed);
  });
  $('step').disabled=exp.state!=='deployed';
  renderSummary(entry);
}

function startExpedition(){
  const h=selected();
  if(!h||expeditionLocked(h.id))return;
  const result=expeditions.deploy({hero:h,seed:+$('seed').value||1,contract:roster.getContract(),speed:1});
  if(!result.ok)return;
  renderedLogs[result.entry.id]=0;
  selectAvailableHero();
  renderAll();
  saveGame();
}

function closeReport(){
  const entry=focusedEntry();
  if(!entry||entry.expedition.state==='deployed'||!entry.settled)return;
  delete renderedLogs[entry.id];
  expeditions.close(entry.id);
  renderAll();
  saveGame();
}
function renderAll(){
  settleResolved();
  renderEconomy();renderMerchants();renderApplicants();renderCrafting();renderContractBoard();renderRoster();renderHome();renderHistoryLog();renderExpedition();
}

loadGame();
renderPrepActions();
renderAll();

$('repairWeapon').addEventListener('click',function(){const h=selected();if(h&&!expeditionLocked(h.id)){const r=roster.repairEquippedGear(h.id,'weapon');if(r.ok){renderAll();saveGame();}}});
$('repairArmor').addEventListener('click',function(){const h=selected();if(h&&!expeditionLocked(h.id)){const r=roster.repairEquippedGear(h.id,'armor');if(r.ok){renderAll();saveGame();}}});
$('recruitApplicant').addEventListener('click',function(){
  const r=roster.recruitApplicant();
  if(r.ok){renderAll();saveGame();}
});
$('deploy').addEventListener('click',startExpedition);
$('returnHome').addEventListener('click',closeReport);
$('newTavern').addEventListener('click',function(){localStorage.removeItem(SAVE_KEY);newGame();$('summaryBody').innerHTML='<p>New tavern started.</p>';renderAll();saveGame();});
document.querySelectorAll('[data-speed]').forEach(function(b){
  b.addEventListener('click',function(){
    const entry=focusedEntry();
    if(entry&&entry.expedition.state==='deployed'&&expeditions.setSpeed(entry.id,+b.dataset.speed)){renderExpedition();saveGame();}
  });
});
$('step').addEventListener('click',function(){
  const entry=focusedEntry();
  if(entry&&entry.expedition.state==='deployed'){
    entry.expedition.tick(1);
    const settledCount=settleResolved();
    if(settledCount)selectAvailableHero();
    renderAll();saveGame();
  }
});

setInterval(function(){
  const earned=roster.tickTavern(0.25);
  expeditions.tickAll();
  const settledCount=settleResolved();
  if(settledCount)selectAvailableHero();
  renderEconomy();
  renderMerchants();
  renderApplicants();
  renderExpedition();
  if(settledCount){renderCrafting();renderContractBoard();renderRoster();renderHome();renderHistoryLog();}
  else if(earned>0)renderHome();
  saveClock+=0.25;
  if(saveClock>=1){saveClock=0;saveGame();}
},250);
})();
