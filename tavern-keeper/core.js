(function(root, factory){
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TavernKeeperCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';

  class RNG {
    constructor(seed=123456789){ this.state = (seed >>> 0) || 1; }
    nextU32(){
      let x = this.state;
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      this.state = x >>> 0;
      return this.state;
    }
    float(){ return this.nextU32() / 4294967296; }
    range(min,max){ return min + (max-min)*this.float(); }
    int(min,max){ return Math.floor(this.range(min,max+1)); }
    chance(p){ return this.float() < p; }
    pick(arr){ return arr[Math.floor(this.float()*arr.length)]; }
  }

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const clone=v=>JSON.parse(JSON.stringify(v));

  const EQUIPMENT = {
    rusty_sword:{id:'rusty_sword',name:'Rusty Sword',slot:'weapon',kind:'melee',damage:7,range:0,defense:0,weight:1},
    hunting_bow:{id:'hunting_bow',name:'Hunting Bow',slot:'weapon',kind:'ranged',damage:6,range:1,defense:0,weight:1},
    wood_axe:{id:'wood_axe',name:'Wood Axe',slot:'weapon',kind:'melee',damage:5,range:0,defense:0,weight:1},
    padded_armor:{id:'padded_armor',name:'Padded Armor',slot:'armor',kind:'armor',damage:0,range:0,defense:2,weight:2},
    leather_armor:{id:'leather_armor',name:'Leather Armor',slot:'armor',kind:'armor',damage:0,range:0,defense:3,weight:2},
    healing_potion:{id:'healing_potion',name:'Healing Potion',slot:'consumable',kind:'potion',heal:28,crafted:true},
    field_bandage:{id:'field_bandage',name:'Field Bandage',slot:'consumable',kind:'bandage',heal:14,injuryRelief:1,crafted:true},
    scrap_spear:{id:'scrap_spear',name:'Scrap Spear',slot:'weapon',kind:'melee',damage:9,range:0,defense:0,weight:1,crafted:true},
    plated_vest:{id:'plated_vest',name:'Plated Vest',slot:'armor',kind:'armor',damage:0,range:0,defense:4,weight:3,crafted:true},
    steel_sword:{id:'steel_sword',name:'Steel Sword',slot:'weapon',kind:'melee',damage:10,range:0,defense:0,weight:2,merchant:true},
    chain_mail:{id:'chain_mail',name:'Chain Mail',slot:'armor',kind:'armor',damage:0,range:0,defense:5,weight:4,merchant:true}
  };

  const CRAFT_RECIPES = {
    scrap_spear:{id:'scrap_spear',name:'Scrap Spear',category:'weapon',output:'scrap_spear',outputCount:1,minutes:45,materials:{scrap_iron:3,rat_tail:1},description:'A stronger melee weapon built from recovered metal and tough binding.'},
    plated_vest:{id:'plated_vest',name:'Plated Vest',category:'armor',output:'plated_vest',outputCount:1,minutes:55,materials:{scrap_iron:3,rat_tail:2},description:'Improvised plates reinforce a travel vest for better protection.'},
    healing_potion:{id:'healing_potion',name:'Healing Potion',category:'consumable',output:'healing_potion',outputCount:1,minutes:30,materials:{medicinal_herb:2,strange_gland:1},description:'A strong emergency potion heroes can use autonomously in combat.'},
    field_bandage:{id:'field_bandage',name:'Field Bandages',category:'consumable',output:'field_bandage',outputCount:2,minutes:20,materials:{medicinal_herb:2,rat_tail:1},description:'Two compact dressings for moderate wounds and lingering injuries.'}
  };

  const INJURY_TYPES = {
    sprain:{id:'sprain',name:'Sprain',readinessPenalty:5,attackPenalty:0.04,retreatPressure:4},
    bruised_ribs:{id:'bruised_ribs',name:'Bruised Ribs',readinessPenalty:7,attackPenalty:0.06,retreatPressure:5},
    deep_bite:{id:'deep_bite',name:'Deep Bite',readinessPenalty:9,attackPenalty:0.08,retreatPressure:7}
  };

  const PREP_EFFECTS = {
    hearty_meal:{id:'hearty_meal',name:'Hearty Meal',duration:180,hungerRateMult:0.55,attackBonus:0.05,readinessBonus:5},
    good_sleep:{id:'good_sleep',name:'Good Sleep',duration:240,fatigueRateMult:0.55,attackBonus:0.03,readinessBonus:6},
    patched_up:{id:'patched_up',name:'Patched Up',duration:150,retreatRelief:4,readinessBonus:3}
  };

  const PREPARATION_ACTIONS = {
    simple_meal:{id:'simple_meal',name:'Simple Meal',cost:2,minutes:20,description:'Cheap food. Strong hunger recovery.',apply(h){h.hunger=clamp(h.hunger-36,0,100);h.morale=clamp(h.morale+3,0,100);}},
    hearty_meal:{id:'hearty_meal',name:'Hearty Meal',cost:5,minutes:35,description:'Deep hunger recovery plus a contract-long food buff.',apply(h){h.hunger=clamp(h.hunger-62,0,100);h.morale=clamp(h.morale+8,0,100);setPrepEffect(h,'hearty_meal');}},
    nap:{id:'nap',name:'Nap',cost:1,minutes:60,description:'Fast fatigue recovery with a little healing.',apply(h){h.fatigue=clamp(h.fatigue-32,0,100);h.health=clamp(h.health+5,0,h.maxHealth);h.morale=clamp(h.morale+2,0,100);}},
    common_room:{id:'common_room',name:'Unwind',cost:3,minutes:90,description:'Spend time in the common room to restore morale.',apply(h){h.morale=clamp(h.morale+28,0,100);h.fatigue=clamp(h.fatigue-6,0,100);}},
    full_rest:{id:'full_rest',name:'Full Rest',cost:3,minutes:360,description:'Major fatigue and health recovery; time makes the hero hungrier.',apply(h){h.fatigue=clamp(h.fatigue-78,0,100);h.health=clamp(h.health+18,0,h.maxHealth);h.morale=clamp(h.morale+7,0,100);setPrepEffect(h,'good_sleep');}},
    first_aid:{id:'first_aid',name:'First Aid',cost:4,minutes:30,description:'Restore health and reduce one injury by one severity.',apply(h){h.health=clamp(h.health+18,0,h.maxHealth);reduceWorstInjury(h,1);setPrepEffect(h,'patched_up');}},
    physician:{id:'physician',name:'Physician',cost:12,minutes:90,description:'Expensive treatment: major healing and removes the worst injury.',apply(h){h.health=clamp(h.health+38,0,h.maxHealth);removeWorstInjury(h);setPrepEffect(h,'patched_up');}}
  };

  const CONTRACT = {
    id:'greymill_rats',
    name:'Rats Below Greymill',
    threat:2,
    objective:'Clear the infestation beneath Greymill.',
    start:'entrance',
    locations:{
      entrance:{id:'entrance',name:'Mill Entrance',progress:8,next:['cellar'],encounter:null,materials:[['scrap_iron',0.35]]},
      cellar:{id:'cellar',name:'Storage Cellar',progress:18,next:['pantry','flooded'],encounter:{enemy:'giant_rat',count:[2,3]},materials:[['rat_tail',0.6],['medicinal_herb',0.25]]},
      pantry:{id:'pantry',name:'Collapsed Pantry',progress:16,next:['nest'],optional:true,risk:0.35,reward:0.8,encounter:{enemy:'giant_rat',count:[1,2]},materials:[['medicinal_herb',0.7],['scrap_iron',0.45]]},
      flooded:{id:'flooded',name:'Flooded Passage',progress:14,next:['nest'],optional:true,risk:0.2,reward:0.45,encounter:null,materials:[['medicinal_herb',0.35]]},
      nest:{id:'nest',name:'Rat Nest',progress:28,next:['old_shaft','resolution'],encounter:{enemy:'dire_rat',count:[2,3]},materials:[['rat_tail',0.9],['strange_gland',0.25]]},
      old_shaft:{id:'old_shaft',name:'Old Smuggler Shaft',progress:16,next:['resolution'],optional:true,risk:0.85,reward:1.4,encounter:{enemy:'dire_rat',count:[2,4]},materials:[['strange_gland',0.7],['scrap_iron',0.8]]},
      resolution:{id:'resolution',name:'Cleared Mill',progress:0,next:[],encounter:null,materials:[]}
    }
  };

  const ENEMIES = {
    giant_rat:{id:'giant_rat',name:'Giant Rat',hp:15,damage:[3,7],accuracy:0.67,defense:0,xp:1,danger:0.18},
    dire_rat:{id:'dire_rat',name:'Dire Rat',hp:25,damage:[5,10],accuracy:0.72,defense:1,xp:2,danger:0.35}
  };

  const MATERIAL_NAMES={rat_tail:'Rat Tail',medicinal_herb:'Medicinal Herb',scrap_iron:'Scrap Iron',strange_gland:'Strange Gland'};

  function normalizeCareer(career={}){
    const c=career||{};
    return {
      xp:Number(c.xp)||0,
      rank:Math.max(1,Number(c.rank)||1),
      skills:{
        melee:clamp(Number(c.skills?.melee)||0,0,10),
        ranged:clamp(Number(c.skills?.ranged)||0,0,10),
        survival:clamp(Number(c.skills?.survival)||0,0,10)
      },
      contracts:Number(c.contracts)||0,
      successes:Number(c.successes)||0,
      retreats:Number(c.retreats)||0,
      kills:Number(c.kills)||0,
      totalGold:Number(c.totalGold)||0,
      bestProgress:Number(c.bestProgress)||0,
      injuriesSuffered:Number(c.injuriesSuffered)||0
    };
  }
  function rankFromXp(xp){ return Math.max(1,Math.min(20,1+Math.floor(Math.sqrt(Math.max(0,xp)/45)))); }
  function ensureProgression(hero){
    hero.career=normalizeCareer(hero.career);
    hero.career.rank=rankFromXp(hero.career.xp);
    hero.history=clone(hero.history||[]);
    hero.titles=clone(hero.titles||[]);
    return hero;
  }
  function addUnique(arr,value){ if(value&&!arr.includes(value))arr.push(value); }
  function updateCareerIdentity(hero){
    const c=hero.career;
    if(c.contracts>=3)addUnique(hero.traits,'Veteran');
    if(c.retreats>=2)addUnique(hero.traits,'Survivor');
    if(c.successes>=3)addUnique(hero.traits,'Battle Hardened');
    if(c.kills>=10)addUnique(hero.traits,'Ratbane');
    if(c.contracts>=3)addUnique(hero.titles,'Road Regular');
    if(c.successes>=3)addUnique(hero.titles,'Greymill Veteran');
    if(c.kills>=10)addUnique(hero.titles,'Ratcatcher');
    if(c.injuriesSuffered>=3)addUnique(hero.titles,'Scarred Survivor');
  }
  function applyCareerProgress(hero,expedition){
    ensureProgression(hero);
    const c=hero.career, rankBefore=c.rank;
    const oldTraits=hero.traits.slice(), oldTitles=hero.titles.slice();
    const weaponKind=weapon(hero).kind;
    const xpGained=Math.max(1,Math.round(expedition.objectiveProgress*0.24 + expedition.enemiesDefeated*4 + expedition.areasExplored.length*2 + (expedition.state==='success'?24:0) + (expedition.state==='retreat'?5:0)));
    const skillGains={melee:0,ranged:0,survival:0};
    skillGains.survival=Math.min(1.1,expedition.areasExplored.length*0.08 + (hero.alive?0.25:0) + expedition.objectiveProgress*0.002);
    if(weaponKind==='ranged')skillGains.ranged=Math.min(1.25,expedition.enemiesDefeated*0.16 + expedition.areasExplored.length*0.04);
    else skillGains.melee=Math.min(1.25,expedition.enemiesDefeated*0.16 + expedition.areasExplored.length*0.04);
    c.xp+=xpGained;
    c.contracts+=1;
    if(expedition.state==='success')c.successes+=1;
    if(expedition.state==='retreat')c.retreats+=1;
    c.kills+=expedition.enemiesDefeated;
    c.totalGold+=expedition.gold;
    c.bestProgress=Math.max(c.bestProgress,Math.round(expedition.objectiveProgress));
    c.injuriesSuffered+=expedition.injuriesSuffered||0;
    for(const [k,v] of Object.entries(skillGains))c.skills[k]=clamp(c.skills[k]+v,0,10);
    c.rank=rankFromXp(c.xp);
    updateCareerIdentity(hero);
    const record={
      number:c.contracts,contractId:expedition.contract.id,contractName:expedition.contract.name,
      outcome:expedition.state,seed:expedition.seed,progress:Math.round(expedition.objectiveProgress),
      kills:expedition.enemiesDefeated,gold:Number(expedition.gold.toFixed(2)),peakGoldRate:Number(expedition.peakGoldRate.toFixed(2)),
      xpGained,rankBefore,rankAfter:c.rank,skillGains,
      injuriesAfter:clone(hero.injuries),traitsEarned:hero.traits.filter(x=>!oldTraits.includes(x)),titlesEarned:hero.titles.filter(x=>!oldTitles.includes(x))
    };
    hero.history.push(record);
    if(hero.history.length>30)hero.history=hero.history.slice(-30);
    return record;
  }

  function heroTemplate(overrides={}){
    const base={
      id:'edrin', name:'Edrin Vale', alive:true,
      stats:{might:5,finesse:5,endurance:5,wits:5,resolve:5},
      maxHealth:100, health:100, hunger:20, fatigue:15, morale:65,
      traits:['Cautious','Resourceful'],
      equipment:{weapon:'rusty_sword',armor:'padded_armor'},
      supplies:{healing_potion:1,field_bandage:0},
      moodlets:[], injuries:[], prepEffects:[], career:normalizeCareer(), history:[], titles:[],
    };
    const h=JSON.parse(JSON.stringify(base));
    Object.assign(h,overrides);
    if(overrides.stats) h.stats=Object.assign(base.stats,overrides.stats);
    if(overrides.equipment) h.equipment=Object.assign(base.equipment,overrides.equipment);
    if(overrides.supplies) h.supplies=Object.assign(base.supplies,overrides.supplies);
    h.traits=clone(overrides.traits||h.traits||[]);
    h.injuries=clone(overrides.injuries||h.injuries||[]);
    h.prepEffects=clone(overrides.prepEffects||h.prepEffects||[]);
    h.health=clamp(h.health,0,h.maxHealth);
    ensureProgression(h);
    deriveMoodlets(h);
    return h;
  }

  function effectActive(hero,id){ return (hero.prepEffects||[]).some(e=>e.id===id&&e.remaining>0); }
  function setPrepEffect(hero,id){
    if(!hero.prepEffects)hero.prepEffects=[];
    const def=PREP_EFFECTS[id];
    if(!def)return;
    const existing=hero.prepEffects.find(e=>e.id===id);
    if(existing)existing.remaining=def.duration;
    else hero.prepEffects.push({id,remaining:def.duration});
  }
  function tickPrepEffects(hero,dt){
    if(!hero.prepEffects)return;
    for(const e of hero.prepEffects)e.remaining=Math.max(0,e.remaining-dt);
    hero.prepEffects=hero.prepEffects.filter(e=>e.remaining>0);
  }
  function totalInjurySeverity(hero){ return (hero.injuries||[]).reduce((n,i)=>n+(i.severity||1),0); }
  function injuryPenalty(hero,key){ return (hero.injuries||[]).reduce((n,i)=>n+(INJURY_TYPES[i.type]?.[key]||0)*(i.severity||1),0); }
  function worstInjury(hero){ return (hero.injuries||[]).slice().sort((a,b)=>(b.severity||1)-(a.severity||1))[0]||null; }
  function reduceWorstInjury(hero,amount=1){
    const i=worstInjury(hero);
    if(!i)return false;
    i.severity=Math.max(0,(i.severity||1)-amount);
    if(i.severity<=0)hero.injuries=hero.injuries.filter(x=>x!==i);
    return true;
  }
  function removeWorstInjury(hero){
    const i=worstInjury(hero);
    if(!i)return false;
    hero.injuries=hero.injuries.filter(x=>x!==i);
    return true;
  }
  function addInjury(hero,type,severity=1){
    if(!hero.injuries)hero.injuries=[];
    const existing=hero.injuries.find(i=>i.type===type);
    if(existing)existing.severity=clamp(existing.severity+severity,1,3);
    else hero.injuries.push({type,severity:clamp(severity,1,3)});
    deriveMoodlets(hero);
  }

  function deriveMoodlets(hero){
    const m=[];
    if(hero.hunger<=30) m.push('Well Fed');
    if(hero.hunger>=70) m.push('Hungry');
    if(hero.fatigue<=25) m.push('Rested');
    if(hero.fatigue>=70) m.push('Tired');
    if(hero.morale>=72) m.push('Confident');
    if(hero.morale<=30) m.push('Afraid');
    if(hero.health<=55) m.push('Injured');
    if(totalInjurySeverity(hero)>0) m.push('Lingering Injury');
    for(const e of hero.prepEffects||[]){
      if(e.remaining>0&&PREP_EFFECTS[e.id])m.push(PREP_EFFECTS[e.id].name);
    }
    hero.moodlets=m;
    return m;
  }

  function gearPower(hero){
    const w=EQUIPMENT[hero.equipment.weapon]||EQUIPMENT.wood_axe;
    const a=EQUIPMENT[hero.equipment.armor]||{defense:0};
    return (w.damage||0)*1.3 + (a.defense||0)*3 + (hero.supplies.healing_potion||0)*4 + (hero.supplies.field_bandage||0)*1.5;
  }

  function readinessScore(hero){
    deriveMoodlets(hero);
    const s=hero.stats;
    let score=(s.might+s.finesse+s.endurance+s.wits+s.resolve)*1.6 + gearPower(hero);
    score += (hero.health/hero.maxHealth)*18;
    score += (100-hero.fatigue)*0.12;
    score += (100-hero.hunger)*0.08;
    score += hero.morale*0.08;
    if(hero.moodlets.includes('Confident'))score+=5;
    if(hero.moodlets.includes('Afraid'))score-=8;
    if(hero.moodlets.includes('Hungry'))score-=7;
    if(hero.moodlets.includes('Tired'))score-=9;
    score-=injuryPenalty(hero,'readinessPenalty');
    for(const e of hero.prepEffects||[]){
      if(e.remaining>0)score+=PREP_EFFECTS[e.id]?.readinessBonus||0;
    }
    const skill=weapon(hero).kind==='ranged'?hero.career.skills.ranged:hero.career.skills.melee;
    score+=skill*1.2 + hero.career.skills.survival*0.7;
    if(trait(hero,'Veteran'))score+=3;
    if(trait(hero,'Battle Hardened'))score+=3;
    return score;
  }

  function threatAssessment(hero, contract=CONTRACT){
    const ratio=readinessScore(hero)/(42 + contract.threat*22);
    if(ratio>=1.55)return 'Comfortable';
    if(ratio>=1.18)return 'Reasonable';
    if(ratio>=0.9)return 'Risky';
    if(ratio>=0.68)return 'Extremely Dangerous';
    return 'Likely Fatal';
  }

  function trait(hero,t){ return hero.traits.includes(t); }
  function effectiveDefense(hero){
    const armor=EQUIPMENT[hero.equipment.armor];
    return (armor?.defense||0) + Math.floor(hero.stats.endurance/4) - Math.floor(totalInjurySeverity(hero)/2);
  }
  function weapon(hero){ return EQUIPMENT[hero.equipment.weapon] || EQUIPMENT.wood_axe; }

  class PreparationState {
    constructor({hero=makePreset('prepared'),funds=18,materials={},prepMinutes=0}={}){
      this.hero=heroTemplate(hero);
      this.funds=funds;
      this.materials=clone(materials);
      this.prepMinutes=prepMinutes;
      this.log=[];
      this.settledExpeditions=new Set();
    }
    advanceTime(minutes){
      this.prepMinutes+=minutes;
      this.hero.hunger=clamp(this.hero.hunger+minutes*0.02,0,100);
      this.hero.morale=clamp(this.hero.morale-minutes*0.002,0,100);
      deriveMoodlets(this.hero);
    }
    can(actionId){
      const a=PREPARATION_ACTIONS[actionId];
      if(!a||!this.hero.alive||this.funds<a.cost)return false;
      return a.canApply?a.canApply(this.hero):true;
    }
    apply(actionId){
      const a=PREPARATION_ACTIONS[actionId];
      if(!a)return{ok:false,reason:'unknown action'};
      if(!this.hero.alive)return{ok:false,reason:'hero is dead'};
      if(this.funds<a.cost)return{ok:false,reason:'insufficient funds'};
      if(a.canApply&&!a.canApply(this.hero))return{ok:false,reason:'not needed'};
      const before={funds:this.funds,health:this.hero.health,hunger:this.hero.hunger,fatigue:this.hero.fatigue,morale:this.hero.morale,injuries:totalInjurySeverity(this.hero)};
      this.funds-=a.cost;
      this.advanceTime(a.minutes);
      a.apply(this.hero);
      deriveMoodlets(this.hero);
      const event={action:actionId,name:a.name,cost:a.cost,minutes:a.minutes,before,after:{funds:this.funds,health:this.hero.health,hunger:this.hero.hunger,fatigue:this.hero.fatigue,morale:this.hero.morale,injuries:totalInjurySeverity(this.hero)}};
      this.log.push(event);
      return{ok:true,event};
    }
    setLoadout(weaponId,armorId){
      if(weaponId&&EQUIPMENT[weaponId]?.slot==='weapon')this.hero.equipment.weapon=weaponId;
      this.hero.equipment.armor=armorId&&EQUIPMENT[armorId]?.slot==='armor'?armorId:null;
      deriveMoodlets(this.hero);
    }
    settle(expedition){
      const key=`${expedition.seed}:${expedition.elapsed}:${expedition.state}`;
      if(this.settledExpeditions.has(key))return{ok:false,reason:'already settled',banked:0};
      this.settledExpeditions.add(key);
      const banked=expedition.gold;
      this.funds+=banked;
      for(const [id,count] of Object.entries(expedition.materials))this.materials[id]=(this.materials[id]||0)+count;
      this.hero=heroTemplate(expedition.hero);
      this.hero.prepEffects=[];
      deriveMoodlets(this.hero);
      this.log.push({action:'settle',name:'Expedition settled',banked,outcome:expedition.state});
      return{ok:true,banked,heroAlive:this.hero.alive};
    }
    snapshot(){return{hero:clone(this.hero),funds:this.funds,materials:clone(this.materials),prepMinutes:this.prepMinutes,log:clone(this.log)};}
  }

  class Expedition {
    constructor({hero=heroTemplate(),seed=1,contract=CONTRACT,debug=false}={}){
      this.rng=new RNG(seed); this.seed=seed; this.hero=heroTemplate(hero); this.contract=contract; this.debug=debug;
      deriveMoodlets(this.hero);
      this.state='deployed'; this.locationId=contract.start; this.elapsed=0; this.goldRate=0.05; this.peakGoldRate=this.goldRate; this.gold=0;
      this.enemiesDefeated=0; this.areasExplored=[]; this.objectiveProgress=0; this.materials={}; this.log=[]; this.decisionDebug=[]; this.injuriesSuffered=0;
      this.currentCombat=null; this.retreatReason=null; this.lastDecision=null; this._entered=false; this._resolution=null;
      this.addLog(`Deployed to ${contract.name}.`, 'system');
    }
    addLog(text,type='event',reasons=[]){ this.log.push({time:this.elapsed,text,type,reasons}); if(this.log.length>250)this.log.shift(); }
    addMaterial(id,count=1){ this.materials[id]=(this.materials[id]||0)+count; }
    bumpRate(amount,reason){ const before=this.goldRate; this.goldRate=clamp(this.goldRate+amount,0,50); this.peakGoldRate=Math.max(this.peakGoldRate,this.goldRate); if(Math.abs(this.goldRate-before)>=0.009)this.addLog(`Performance ${before.toFixed(2)} → ${this.goldRate.toFixed(2)} gold/sec — ${reason}.`,'income'); }
    updateNeeds(dt){
      const hungerMult=effectActive(this.hero,'hearty_meal')?PREP_EFFECTS.hearty_meal.hungerRateMult:1;
      const fatigueMult=effectActive(this.hero,'good_sleep')?PREP_EFFECTS.good_sleep.fatigueRateMult:1;
      this.hero.hunger=clamp(this.hero.hunger+dt*0.11*hungerMult,0,100);
      this.hero.fatigue=clamp(this.hero.fatigue+dt*0.095*fatigueMult,0,100);
      if(this.hero.hunger>80) this.hero.morale=clamp(this.hero.morale-dt*0.025,0,100);
      if(this.hero.fatigue>85) this.hero.morale=clamp(this.hero.morale-dt*0.03,0,100);
      tickPrepEffects(this.hero,dt);
      deriveMoodlets(this.hero);
    }
    utility(action,ctx={}){
      const h=this.hero, moods=h.moodlets, health=h.health/h.maxHealth;
      let u=0,reasons=[];
      const add=(v,r)=>{u+=v;if(r)reasons.push({value:v,reason:r});};
      if(action==='continue'){
        add(34,'primary objective ahead'); add(h.stats.resolve*2,'resolve');
        add((health-0.5)*35,health>0.65?'healthy':'injured');
        add((50-h.fatigue)*0.22,h.fatigue<45?'rested':'fatigue');
        if(moods.includes('Confident'))add(15,'confident');
        if(moods.includes('Afraid'))add(-22,'afraid');
        if(trait(h,'Brave'))add(20,'brave'); if(trait(h,'Cautious'))add(-7,'cautious'); if(trait(h,'Veteran'))add(5,'veteran'); if(trait(h,'Battle Hardened'))add(5,'battle hardened'); add(-injuryPenalty(h,'retreatPressure')*(trait(h,'Brave')?0.35:1),'lingering injury');
      } else if(action==='retreat'){
        add((1-health)*70,health<0.5?'low health':'health stable');
        add(Math.max(0,h.fatigue-50)*0.6,h.fatigue>50?'fatigue':null);
        add(Math.max(0,h.hunger-65)*0.45,h.hunger>65?'hungry':null);
        add(Math.max(0,45-h.morale)*0.6,h.morale<45?'low morale':null);
        if(h.supplies.healing_potion<=0)add(9,'no healing potion');
        if(trait(h,'Cautious'))add(14,'cautious'); if(trait(h,'Brave'))add(-18,'brave'); if(trait(h,'Veteran'))add(-3,'veteran'); if(trait(h,'Battle Hardened'))add(-4,'battle hardened'); if(trait(h,'Survivor'))add(6,'survivor');
        if(moods.includes('Afraid'))add(18,'afraid');
        add(injuryPenalty(h,'retreatPressure')*(trait(h,'Brave')?0.3:1),'lingering injury');
        if(effectActive(h,'patched_up'))add(-PREP_EFFECTS.patched_up.retreatRelief,'fresh treatment');
      } else if(action==='optional'){
        add((ctx.reward||0)*28,'valuable opportunity'); add(-(ctx.risk||0)*28,'danger');
        add((health-0.55)*28,health>0.65?'healthy':'injured'); add((55-h.fatigue)*0.15,h.fatigue<55?'rested':'fatigue');
        if(trait(h,'Greedy'))add(18,'greedy'); if(trait(h,'Cautious'))add(-14,'cautious'); if(trait(h,'Brave'))add(8,'brave'); if(moods.includes('Confident'))add(10,'confident'); add(-injuryPenalty(h,'retreatPressure')*0.7,'lingering injury');
      } else if(action==='heal'){
        add((1-health)*100,health<0.65?'wounded':'not badly hurt');
        add(h.supplies.healing_potion>0?18:-999,h.supplies.healing_potion>0?'potion available':'no potion');
        if(trait(h,'Resourceful'))add(8,'resourceful');
      } else if(action==='bandage'){
        add((1-health)*72,health<0.72?'wounded':'not badly hurt');
        add(h.supplies.field_bandage>0?15:-999,h.supplies.field_bandage>0?'bandage available':'no bandage');
        if(totalInjurySeverity(h)>0)add(12,'lingering injury');
        if(trait(h,'Resourceful'))add(5,'resourceful');
      } else if(action==='fight'){
        add(42,'enemy blocks path'); add(health*20,'current health'); add(h.stats.might+h.stats.finesse,'combat ability');
        if(trait(h,'Brave'))add(16,'brave'); if(trait(h,'Cautious'))add(-6,'cautious'); if(trait(h,'Veteran'))add(4,'veteran'); if(trait(h,'Battle Hardened'))add(5,'battle hardened'); add(-injuryPenalty(h,'retreatPressure')*0.6,'lingering injury');
      } else if(action==='maintain_distance'){
        const w=weapon(h); add(w.kind==='ranged'?32:-20,w.kind==='ranged'?'ranged weapon':'no ranged weapon'); add(h.stats.finesse*2,'finesse');
      }
      return {score:u,reasons:reasons.sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,4).map(x=>x.reason)};
    }
    choose(actions,ctx={}){
      const scored=actions.map(a=>({action:a,...this.utility(a,ctx[a]||ctx)}));
      scored.forEach(x=>x.score += this.rng.range(-3.5,3.5));
      scored.sort((a,b)=>b.score-a.score);
      this.decisionDebug.push({time:this.elapsed,scored:JSON.parse(JSON.stringify(scored))}); if(this.decisionDebug.length>100)this.decisionDebug.shift();
      this.lastDecision=scored[0]; return scored[0];
    }
    enterLocation(){
      const loc=this.contract.locations[this.locationId];
      if(!this.areasExplored.includes(loc.id)){
        this.areasExplored.push(loc.id); this.objectiveProgress=clamp(this.objectiveProgress+loc.progress,0,100);
        this.addLog(`Entered ${loc.name}.`,'location'); this.bumpRate(0.06+loc.progress*0.004,'exploration progress');
        for(const [mat,p] of loc.materials){ if(this.rng.chance(p)){ const c=this.rng.chance(0.25)?2:1; this.addMaterial(mat,c); this.addLog(`Recovered ${c} ${MATERIAL_NAMES[mat]}${c>1?'s':''}.`,'loot'); this.bumpRate(0.035*c,'useful materials discovered'); } }
      }
      if(loc.encounter){
        const count=this.rng.int(loc.encounter.count[0],loc.encounter.count[1]);
        this.startCombat(loc.encounter.enemy,count); return;
      }
      this._entered=true;
    }
    startCombat(enemyId,count){
      const spec=ENEMIES[enemyId];
      this.currentCombat={enemyId,enemies:Array.from({length:count},()=>({hp:spec.hp,maxHp:spec.hp})),round:0,distance:1};
      this.addLog(`${this.hero.name} spotted ${count} ${spec.name}${count>1?'s':''}.`,'combat');
      const d=this.choose(['fight','retreat']);
      this.addLog(`${this.hero.name} chose to ${d.action}.`,'decision',d.reasons);
      if(d.action==='retreat' && this.canRetreat()){ this.finish('retreat','avoided combat'); }
    }
    canRetreat(){ return this.objectiveProgress>5; }
    maybeInjury(damage,spec){
      if(damage<5||this.hero.health<=0||this.hero.injuries.length>=3)return;
      const chance=clamp(0.035+damage*0.008+spec.danger*0.08,0.04,0.22);
      if(this.rng.chance(chance)){
        const type=this.rng.pick(Object.keys(INJURY_TYPES));
        const severity=damage>=9?2:1;
        addInjury(this.hero,type,severity); this.injuriesSuffered+=severity;
        this.addLog(`${this.hero.name} suffered ${INJURY_TYPES[type].name}${severity>1?' (severe)':''}.`,'injury');
      }
    }
    combatRound(){
      const c=this.currentCombat;if(!c||this.state!=='deployed')return;
      const spec=ENEMIES[c.enemyId],h=this.hero,w=weapon(h); c.round++;
      deriveMoodlets(h);
      if(h.health<=68 && h.supplies.field_bandage>0 && (h.supplies.healing_potion<=0 || h.health>45)){
        const bandage=this.choose(['bandage','fight']);
        if(bandage.action==='bandage'){
          const item=EQUIPMENT.field_bandage; h.supplies.field_bandage--; const before=h.health;
          h.health=clamp(h.health+item.heal+Math.floor(h.stats.wits/2),0,h.maxHealth);
          if(item.injuryRelief)reduceWorstInjury(h,item.injuryRelief);
          this.addLog(`${h.name} used a field bandage (${Math.round(before)} → ${Math.round(h.health)} HP).`,'decision',bandage.reasons);
          this.bumpRate(0.01,'field treatment');
          return;
        }
      }
      if(h.health<=48 && h.supplies.healing_potion>0){
        const heal=this.choose(['heal','fight']);
        if(heal.action==='heal'){
          const item=EQUIPMENT.healing_potion; h.supplies.healing_potion--; const before=h.health; h.health=clamp(h.health+item.heal+h.stats.wits,0,h.maxHealth);
          this.addLog(`${h.name} used a healing potion (${Math.round(before)} → ${Math.round(h.health)} HP).`,'decision',heal.reasons); this.bumpRate(0.015,'resourceful recovery');
          return;
        }
      }
      if(h.health<=32 && this.canRetreat()){
        const rr=this.choose(['retreat','fight']);
        if(rr.action==='retreat') { this.addLog(`${h.name} broke off the fight.`,'decision',rr.reasons); this.finish('retreat','combat retreat'); return; }
      }
      const style=w.kind==='ranged'?this.choose(['maintain_distance','fight']):{action:'fight',reasons:['melee weapon']};
      const target=c.enemies.find(e=>e.hp>0);
      if(target){
        const careerSkill=w.kind==='ranged'?h.career.skills.ranged:h.career.skills.melee;
        const base=(w.damage + h.stats.might*0.8 + (w.kind==='ranged'?h.stats.finesse*0.7:h.stats.finesse*0.25) + careerSkill*0.5) * (trait(h,'Ratbane')?1.08:1);
        const cond=(100-h.fatigue)*0.0025 + (100-h.hunger)*0.0015;
        let mood=(h.moodlets.includes('Confident')?0.12:0)+(h.moodlets.includes('Afraid')?-0.12:0)+(h.moodlets.includes('Tired')?-0.1:0);
        if(effectActive(h,'hearty_meal'))mood+=PREP_EFFECTS.hearty_meal.attackBonus;
        if(effectActive(h,'good_sleep'))mood+=PREP_EFFECTS.good_sleep.attackBonus;
        const injuryMult=clamp(1-injuryPenalty(h,'attackPenalty'),0.65,1);
        const hitChance=clamp(0.62+h.stats.finesse*0.025 + careerSkill*0.012 + (w.kind==='ranged'?0.06:0)+mood-injuryPenalty(h,'attackPenalty')*0.35,0.25,0.96);
        if(this.rng.chance(hitChance)){
          const dmg=Math.max(1,Math.round(base*this.rng.range(0.82,1.18)*(1+cond+mood)*injuryMult-spec.defense)); target.hp-=dmg; this.addLog(`${h.name} hit ${spec.name} for ${dmg}.`,'combat');
          if(target.hp<=0){this.enemiesDefeated++;this.addLog(`${h.name} killed ${spec.name}.`,'combat');this.bumpRate(0.08+spec.xp*0.035,'enemy defeated');}
        } else this.addLog(`${h.name} missed ${spec.name}.`,'combat');
      }
      const living=c.enemies.filter(e=>e.hp>0);
      if(living.length===0){this.currentCombat=null;this._entered=true;this.hero.morale=clamp(this.hero.morale+4,0,100);deriveMoodlets(h);return;}
      for(const enemy of living){
        let acc=spec.accuracy - h.stats.finesse*0.015;
        if(w.kind==='ranged' && style.action==='maintain_distance')acc-=0.16;
        if(this.rng.chance(clamp(acc,0.2,0.92))){
          const dmg=Math.max(1,Math.round(this.rng.range(spec.damage[0],spec.damage[1])-effectiveDefense(h)*0.6)); h.health-=dmg; this.addLog(`${spec.name} wounded ${h.name} for ${dmg}.`,'combat'); this.maybeInjury(dmg,spec);
          if(h.health<=0){h.health=0;h.alive=false;deriveMoodlets(h);this.finish('death',`killed by ${spec.name}`);return;}
        }
      }
      h.fatigue=clamp(h.fatigue+1.7,0,100);h.hunger=clamp(h.hunger+0.5,0,100);deriveMoodlets(h);
    }
    chooseNext(){
      const loc=this.contract.locations[this.locationId];
      if(loc.id==='resolution'){ this.finish('success','primary objective completed'); return; }
      if(loc.next.length===0){this.finish('success','contract route completed');return;}
      if(loc.next.length===1){ this.locationId=loc.next[0];this._entered=false;return; }
      const nexts=loc.next.map(id=>this.contract.locations[id]);
      const optional=nexts.find(n=>n.optional);
      if(optional){
        const dec=this.choose(['optional','continue'],{optional:{risk:optional.risk,reward:optional.reward}});
        if(dec.action==='optional'){
          this.addLog(`${this.hero.name} chose ${optional.name}.`,'decision',dec.reasons);
          this.locationId=optional.id;this._entered=false;return;
        }
      }
      const normal=nexts.find(n=>!n.optional) || nexts[nexts.length-1]; this.locationId=normal.id; this._entered=false;
    }
    tick(dt=1){
      if(this.state!=='deployed')return;
      dt=clamp(dt,0.05,3);
      this.elapsed+=dt; this.gold+=this.goldRate*dt; this.updateNeeds(dt);
      if(this.hero.health<=0){this.finish('death','fatal injuries');return;}
      if(this.hero.fatigue>92 || this.hero.hunger>94 || this.hero.morale<12){
        const d=this.choose(['retreat','continue']);
        if(d.action==='retreat'&&this.canRetreat()){this.addLog(`${this.hero.name} decided to retreat.`,'decision',d.reasons);this.finish('retreat','condition collapse');return;}
      }
      if(this.currentCombat){this.combatRound();return;}
      if(!this._entered){this.enterLocation();return;}
      this.chooseNext();
    }
    finish(kind,reason){
      if(this.state!=='deployed')return;
      this.state=kind; this.retreatReason=reason; const finalRate=this.goldRate; this.goldRate=0;
      if(kind==='success'){this.objectiveProgress=100;this.hero.morale=clamp(this.hero.morale+10,0,100);this.addLog(`Contract completed. ${this.hero.name} returns alive.`,'result');}
      else if(kind==='retreat'){this.addLog(`Contract failed — ${this.hero.name} retreated (${reason}).`,'result');}
      else {this.hero.alive=false;this.addLog(`Contract failed — ${this.hero.name} died (${reason}).`,'result');}
      deriveMoodlets(this.hero);
      this._resolution={kind,reason,finalRate,summary:this.summary()};
    }
    summary(){
      return {contract:this.contract.name,outcome:this.state,reason:this.retreatReason,time:this.elapsed,enemiesDefeated:this.enemiesDefeated,areasExplored:this.areasExplored.length,totalAreas:Object.keys(this.contract.locations).length-1,objectiveProgress:Math.round(this.objectiveProgress),peakGoldRate:this.peakGoldRate,totalGold:this.gold,materials:clone(this.materials),heroAlive:this.hero.alive,health:this.hero.health,fatigue:this.hero.fatigue,hunger:this.hero.hunger,morale:this.hero.morale,injuries:clone(this.hero.injuries),moodlets:clone(this.hero.moodlets),injuriesSuffered:this.injuriesSuffered,seed:this.seed};
    }
    snapshot(){
      return {version:1,seed:this.seed,rngState:this.rng.state,hero:clone(this.hero),state:this.state,locationId:this.locationId,elapsed:this.elapsed,goldRate:this.goldRate,peakGoldRate:this.peakGoldRate,gold:this.gold,enemiesDefeated:this.enemiesDefeated,areasExplored:clone(this.areasExplored),objectiveProgress:this.objectiveProgress,materials:clone(this.materials),log:clone(this.log),decisionDebug:clone(this.decisionDebug),currentCombat:clone(this.currentCombat),retreatReason:this.retreatReason,lastDecision:clone(this.lastDecision),entered:this._entered,resolution:clone(this._resolution),injuriesSuffered:this.injuriesSuffered};
    }
    static fromSnapshot(data,{contract=CONTRACT,debug=false}={}){
      if(!data||!data.hero)throw new Error('invalid expedition snapshot');
      const e=new Expedition({hero:data.hero,seed:data.seed||1,contract,debug});
      e.rng.state=(data.rngState>>>0)||e.rng.state;
      e.state=data.state||'deployed'; e.locationId=data.locationId||contract.start; e.elapsed=Number(data.elapsed)||0;
      e.goldRate=Number(data.goldRate)||0; e.peakGoldRate=Number(data.peakGoldRate)||0; e.gold=Number(data.gold)||0;
      e.enemiesDefeated=Number(data.enemiesDefeated)||0; e.areasExplored=clone(data.areasExplored||[]); e.objectiveProgress=Number(data.objectiveProgress)||0;
      e.materials=clone(data.materials||{}); e.log=clone(data.log||[]); e.decisionDebug=clone(data.decisionDebug||[]); e.currentCombat=clone(data.currentCombat||null);
      e.retreatReason=data.retreatReason||null; e.lastDecision=clone(data.lastDecision||null); e._entered=!!data.entered; e._resolution=clone(data.resolution||null); e.injuriesSuffered=Number(data.injuriesSuffered)||0;
      return e;
    }
    runToEnd(maxTicks=5000,dt=1){ let n=0;while(this.state==='deployed'&&n++<maxTicks)this.tick(dt);return this.summary(); }
  }

  function makePreset(name){
    if(name==='prepared')return heroTemplate({id:'edrin',name:'Edrin Vale',health:100,hunger:10,fatigue:8,morale:78,traits:['Cautious','Resourceful'],equipment:{weapon:'rusty_sword',armor:'padded_armor'},supplies:{healing_potion:1}});
    if(name==='ranged')return heroTemplate({id:'mara',name:'Mara Fen',stats:{might:4,finesse:8,endurance:5,wits:7,resolve:6},health:100,hunger:14,fatigue:10,morale:75,traits:['Cautious','Resourceful'],equipment:{weapon:'hunting_bow',armor:'leather_armor'},supplies:{healing_potion:1}});
    if(name==='reckless')return heroTemplate({id:'borin',name:'Borin Hale',stats:{might:7,finesse:4,endurance:6,wits:3,resolve:8},health:100,hunger:25,fatigue:20,morale:82,traits:['Brave','Greedy'],equipment:{weapon:'rusty_sword',armor:null},supplies:{healing_potion:0}});
    if(name==='unprepared')return heroTemplate({id:'tomas',name:'Tomas Reed',stats:{might:4,finesse:4,endurance:4,wits:4,resolve:4},health:78,hunger:82,fatigue:80,morale:32,traits:['Cautious'],equipment:{weapon:'wood_axe',armor:null},supplies:{healing_potion:0}});
    return heroTemplate();
  }
  function starterRoster(){ return [makePreset('prepared'),makePreset('ranged'),makePreset('reckless')]; }

  const PATRON_TYPES = {
    laborer:{id:'laborer',name:'Laborer',foodChance:0.9,drinkChance:0.72,foodSpend:1.35,drinkSpend:0.8,stay:7},
    traveler:{id:'traveler',name:'Traveler',foodChance:0.82,drinkChance:0.62,foodSpend:1.7,drinkSpend:1.05,stay:8},
    adventurer:{id:'adventurer',name:'Adventurer',foodChance:0.78,drinkChance:0.9,foodSpend:1.65,drinkSpend:1.35,stay:9},
    merchant:{id:'merchant',name:'Merchant',foodChance:0.68,drinkChance:0.66,foodSpend:2.15,drinkSpend:1.55,stay:10}
  };
  const PATRON_ROTATION=['laborer','laborer','traveler','laborer','adventurer','traveler','merchant','adventurer'];

  const MERCHANT_GOODS = {
    scrap_iron:{id:'scrap_iron',name:'Scrap Iron',type:'material',minQuality:1,price:4,maxQty:4},
    rat_tail:{id:'rat_tail',name:'Rat Tail',type:'material',minQuality:1,price:3,maxQty:4},
    medicinal_herb:{id:'medicinal_herb',name:'Medicinal Herb',type:'material',minQuality:1,price:5,maxQty:3},
    strange_gland:{id:'strange_gland',name:'Strange Gland',type:'material',minQuality:2,price:11,maxQty:2},
    wood_axe:{id:'wood_axe',name:'Wood Axe',type:'item',minQuality:1,price:8,maxQty:1},
    rusty_sword:{id:'rusty_sword',name:'Rusty Sword',type:'item',minQuality:1,price:14,maxQty:1},
    padded_armor:{id:'padded_armor',name:'Padded Armor',type:'item',minQuality:1,price:17,maxQty:1},
    hunting_bow:{id:'hunting_bow',name:'Hunting Bow',type:'item',minQuality:2,price:23,maxQty:1},
    leather_armor:{id:'leather_armor',name:'Leather Armor',type:'item',minQuality:2,price:29,maxQty:1},
    healing_potion:{id:'healing_potion',name:'Healing Potion',type:'item',minQuality:2,price:13,maxQty:2},
    steel_sword:{id:'steel_sword',name:'Steel Sword',type:'item',minQuality:3,price:44,maxQty:1},
    chain_mail:{id:'chain_mail',name:'Chain Mail',type:'item',minQuality:3,price:52,maxQty:1}
  };
  const MERCHANT_NAMES=['Mira the Peddler','Orren of the Road','Kestra Provisioner','Dain Copperhand'];

  function merchantQuality(tavern){
    const score=tavern.serviceLevel+tavern.kitchenLevel+tavern.barLevel+Math.floor(tavern.seats/2);
    if(score>=11)return 3;
    if(score>=7)return 2;
    return 1;
  }

  class MerchantSystem {
    constructor(data={}){
      this.seed=Number(data.seed)||99173;
      this.rng=new RNG(this.seed);
      if(data.rngState)this.rng.state=data.rngState>>>0;
      this.elapsed=Number(data.elapsed)||0;
      this.visitIndex=Math.max(0,Number(data.visitIndex)||0);
      this.nextArrival=data.nextArrival==null?10:Math.max(0,Number(data.nextArrival)||0);
      this.active=clone(data.active||null);
      this.log=clone(data.log||[]);
    }
    logEvent(text,type='merchant'){
      this.log.push({time:this.elapsed,text,type});
      if(this.log.length>40)this.log.shift();
    }
    qualityFor(tavern){ return merchantQuality(tavern); }
    generateOffers(quality){
      const eligible=Object.values(MERCHANT_GOODS).filter(g=>g.minQuality<=quality);
      const materials=eligible.filter(g=>g.type==='material');
      const equipment=eligible.filter(g=>g.type==='item'&&EQUIPMENT[g.id]?.slot!=='consumable');
      const consumables=eligible.filter(g=>g.type==='item'&&EQUIPMENT[g.id]?.slot==='consumable');
      const chosen=[];
      const addUnique=(g)=>{
        if(!g||chosen.some(x=>x.id===g.id))return;
        const quantity=g.type==='material'?this.rng.int(Math.max(1,g.maxQty-1),g.maxQty):this.rng.int(1,g.maxQty);
        chosen.push({key:'offer_'+this.visitIndex+'_'+chosen.length,id:g.id,name:g.name,type:g.type,unitPrice:g.price,quantity,minQuality:g.minQuality});
      };
      addUnique(this.rng.pick(materials));
      addUnique(this.rng.pick(equipment));
      if(consumables.length)addUnique(this.rng.pick(consumables));
      const pool=eligible.filter(g=>!chosen.some(x=>x.id===g.id));
      const target=Math.min(quality===1?4:quality===2?6:7,eligible.length);
      while(chosen.length<target&&pool.length){
        const idx=this.rng.int(0,pool.length-1);
        addUnique(pool.splice(idx,1)[0]);
      }
      return chosen;
    }
    arrive(tavern){
      this.visitIndex++;
      const quality=this.qualityFor(tavern);
      const name=MERCHANT_NAMES[(this.visitIndex-1)%MERCHANT_NAMES.length];
      this.active={name,quality,remaining:60,offers:this.generateOffers(quality)};
      this.nextArrival=0;
      this.logEvent(name+' arrived with quality '+quality+' stock.','arrival');
      return this.active;
    }
    depart(){
      if(this.active)this.logEvent(this.active.name+' departed.','departure');
      this.active=null;
      this.nextArrival=55;
    }
    tick(dt,tavern){
      dt=clamp(dt,0.01,5);
      this.elapsed+=dt;
      if(this.active){
        this.active.remaining-=dt;
        if(this.active.remaining<=0)this.depart();
      }else{
        this.nextArrival=Math.max(0,this.nextArrival-dt);
        if(this.nextArrival<=0)this.arrive(tavern);
      }
    }
    snapshot(){
      return {version:1,seed:this.seed,rngState:this.rng.state,elapsed:this.elapsed,visitIndex:this.visitIndex,nextArrival:this.nextArrival,active:clone(this.active),log:clone(this.log)};
    }
    static fromSnapshot(data){ return new MerchantSystem(data||{}); }
  }

  class TavernEconomy {
    constructor(data={}){
      this.seed=Number(data.seed)||73129;
      this.rng=new RNG(this.seed);
      if(data.rngState)this.rng.state=data.rngState>>>0;
      this.seats=Math.max(2,Number(data.seats)||2);
      this.serviceLevel=Math.max(1,Number(data.serviceLevel)||1);
      this.kitchenLevel=Math.max(1,Number(data.kitchenLevel)||1);
      this.barLevel=Math.max(1,Number(data.barLevel)||1);
      this.elapsed=Number(data.elapsed)||0;
      this.arrivalClock=Number(data.arrivalClock)||0;
      this.nextPatronId=Math.max(1,Number(data.nextPatronId)||1);
      this.patronIndex=Math.max(0,Number(data.patronIndex)||0);
      this.queue=clone(data.queue||[]);
      this.active=clone(data.active||[]);
      this.served=Math.max(0,Number(data.served)||0);
      this.lost=Math.max(0,Number(data.lost)||0);
      this.totalRevenue=Math.max(0,Number(data.totalRevenue)||0);
      this.foodServed=Math.max(0,Number(data.foodServed)||0);
      this.drinksServed=Math.max(0,Number(data.drinksServed)||0);
      this.revenueEvents=clone(data.revenueEvents||[]);
      this.log=clone(data.log||[]);
    }
    arrivalInterval(){ return 5.2; }
    maxQueue(){ return 5; }
    serviceSlots(){ return 1+Math.floor((this.serviceLevel-1)/2); }
    serviceTime(patron){
      const items=(patron.food?1:0)+(patron.drink?1:0);
      return Math.max(2.8,(5.8+items*1.4)*(1-0.12*(this.serviceLevel-1)));
    }
    orderValue(patron){
      const type=PATRON_TYPES[patron.type]||PATRON_TYPES.laborer;
      let value=0;
      if(patron.food)value+=type.foodSpend*(1+0.18*(this.kitchenLevel-1));
      if(patron.drink)value+=type.drinkSpend*(1+0.18*(this.barLevel-1));
      return Math.max(0.5,value);
    }
    averageSpend(){
      let total=0;
      for(const id of PATRON_ROTATION){
        const t=PATRON_TYPES[id];
        total+=t.foodChance*t.foodSpend*(1+0.18*(this.kitchenLevel-1));
        total+=t.drinkChance*t.drinkSpend*(1+0.18*(this.barLevel-1));
      }
      return total/PATRON_ROTATION.length;
    }
    averageCycleTime(){
      let stay=0;
      for(const id of PATRON_ROTATION)stay+=PATRON_TYPES[id].stay;
      stay/=PATRON_ROTATION.length;
      const meanItems=1.55;
      const service=Math.max(2.8,(5.8+meanItems*1.4)*(1-0.12*(this.serviceLevel-1)));
      return {service,stay,total:service+stay};
    }
    projectedGoldRate(){
      const cycle=this.averageCycleTime();
      const arrivalCap=1/this.arrivalInterval();
      const serviceCap=this.serviceSlots()/cycle.service;
      const seatingCap=this.seats/cycle.total;
      return Math.min(arrivalCap,serviceCap,seatingCap)*this.averageSpend();
    }
    rollingGoldRate(windowSeconds=30){
      const start=this.elapsed-windowSeconds;
      this.revenueEvents=this.revenueEvents.filter(e=>e.time>=start);
      const revenue=this.revenueEvents.reduce((n,e)=>n+e.gold,0);
      const span=Math.min(windowSeconds,Math.max(1,this.elapsed));
      return revenue/span;
    }
    createPatron(){
      const typeId=PATRON_ROTATION[this.patronIndex++%PATRON_ROTATION.length];
      const type=PATRON_TYPES[typeId];
      let food=this.rng.chance(type.foodChance),drink=this.rng.chance(type.drinkChance);
      if(!food&&!drink)(this.rng.chance(0.5)?food=true:drink=true);
      return {id:this.nextPatronId++,type:typeId,food,drink,served:false,remainingService:0,remainingStay:0};
    }
    logEvent(text,type='service'){
      this.log.push({time:this.elapsed,text,type});
      if(this.log.length>40)this.log.shift();
    }
    arrive(){
      const p=this.createPatron();
      if(this.active.length<this.seats){
        this.seat(p);
      }else if(this.queue.length<this.maxQueue()){
        this.queue.push(p);
        this.logEvent(PATRON_TYPES[p.type].name+' waits for a seat.','arrival');
      }else{
        this.lost++;
        this.logEvent(PATRON_TYPES[p.type].name+' left; the tavern was full.','lost');
      }
    }
    seat(p){
      p.remainingService=this.serviceTime(p);
      p.remainingStay=0;
      this.active.push(p);
      this.logEvent(PATRON_TYPES[p.type].name+' took a seat.','arrival');
    }
    fillSeats(){
      while(this.active.length<this.seats&&this.queue.length)this.seat(this.queue.shift());
    }
    tick(dt=1){
      dt=clamp(dt,0.01,5);
      this.elapsed+=dt;
      this.arrivalClock+=dt;
      while(this.arrivalClock>=this.arrivalInterval()){
        this.arrivalClock-=this.arrivalInterval();
        this.arrive();
      }
      this.fillSeats();

      const serving=this.active.filter(p=>!p.served).slice(0,this.serviceSlots());
      let earned=0;
      for(const p of serving){
        p.remainingService-=dt;
        if(p.remainingService<=0&&!p.served){
          p.served=true;
          const type=PATRON_TYPES[p.type]||PATRON_TYPES.laborer;
          p.remainingStay=type.stay;
          const gold=this.orderValue(p);
          earned+=gold; this.totalRevenue+=gold; this.served++;
          if(p.food)this.foodServed++;
          if(p.drink)this.drinksServed++;
          this.revenueEvents.push({time:this.elapsed,gold});
          const items=[p.food?'food':null,p.drink?'drink':null].filter(Boolean).join(' + ');
          this.logEvent(type.name+' paid '+gold.toFixed(1)+'g for '+items+'.','sale');
        }
      }
      for(const p of this.active){ if(p.served)p.remainingStay-=dt; }
      this.active=this.active.filter(p=>!p.served||p.remainingStay>0);
      this.fillSeats();
      this.rollingGoldRate();
      return earned;
    }
    upgradeCost(id){
      if(id==='seats')return 18+this.seats*5;
      if(id==='service')return 28*this.serviceLevel;
      if(id==='kitchen')return 24*this.kitchenLevel;
      if(id==='bar')return 20*this.barLevel;
      return Infinity;
    }
    canUpgrade(id){
      if(id==='seats')return this.seats<12;
      if(id==='service')return this.serviceLevel<6;
      if(id==='kitchen')return this.kitchenLevel<6;
      if(id==='bar')return this.barLevel<6;
      return false;
    }
    upgrade(id){
      if(!this.canUpgrade(id))return false;
      if(id==='seats')this.seats+=2;
      else if(id==='service')this.serviceLevel++;
      else if(id==='kitchen')this.kitchenLevel++;
      else if(id==='bar')this.barLevel++;
      else return false;
      this.logEvent('Tavern upgraded: '+id+'.','upgrade');
      return true;
    }
    snapshot(){
      return {version:1,seed:this.seed,rngState:this.rng.state,seats:this.seats,serviceLevel:this.serviceLevel,kitchenLevel:this.kitchenLevel,barLevel:this.barLevel,elapsed:this.elapsed,arrivalClock:this.arrivalClock,nextPatronId:this.nextPatronId,patronIndex:this.patronIndex,queue:clone(this.queue),active:clone(this.active),served:this.served,lost:this.lost,totalRevenue:this.totalRevenue,foodServed:this.foodServed,drinksServed:this.drinksServed,revenueEvents:clone(this.revenueEvents),log:clone(this.log)};
    }
    static fromSnapshot(data){ return new TavernEconomy(data||{}); }
  }

  class TavernRoster {
    constructor({heroes=starterRoster(),fallen=[],funds=30,materials={},inventory={},craftHistory=[],purchaseHistory=[],prepMinutes=0,selectedHeroId=null,history=[],settledKeys=[],tavern=null,merchants=null}={}){
      this.heroes=heroes.map(h=>heroTemplate(h)).filter(h=>h.alive);
      this.fallen=clone(fallen||[]);
      this.funds=Number(funds)||0; this.materials=clone(materials||{}); this.inventory=clone(inventory||{}); this.craftHistory=clone(craftHistory||[]); this.purchaseHistory=clone(purchaseHistory||[]); this.prepMinutes=Number(prepMinutes)||0;
      this.history=clone(history||[]); this.settledExpeditions=new Set(settledKeys||[]);
      this.selectedHeroId=selectedHeroId&&this.heroes.some(h=>h.id===selectedHeroId)?selectedHeroId:(this.heroes[0]?.id||null);
      this.tavern=TavernEconomy.fromSnapshot(tavern);
      this.merchants=MerchantSystem.fromSnapshot(merchants);
    }
    aliveHeroes(){ return this.heroes.filter(h=>h.alive); }
    tickTavern(seconds=1){
      const earned=this.tavern.tick(seconds);
      this.merchants.tick(seconds,this.tavern);
      this.funds+=earned;
      return earned;
    }
    upgradeTavern(id){
      if(!this.tavern.canUpgrade(id))return{ok:false,reason:'maxed'};
      const cost=this.tavern.upgradeCost(id);
      if(this.funds<cost)return{ok:false,reason:'insufficient funds',cost};
      this.funds-=cost;
      this.tavern.upgrade(id);
      return{ok:true,cost,projectedGoldRate:this.tavern.projectedGoldRate()};
    }
    purchaseMerchantOffer(offerKey,count=1){
      const visit=this.merchants.active;
      if(!visit)return{ok:false,reason:'no merchant present'};
      const offer=visit.offers.find(o=>o.key===offerKey);
      count=Math.max(1,Math.floor(count));
      if(!offer||offer.quantity<count)return{ok:false,reason:'stock unavailable'};
      const cost=offer.unitPrice*count;
      if(this.funds<cost)return{ok:false,reason:'insufficient funds',cost};
      this.funds-=cost;
      offer.quantity-=count;
      if(offer.type==='material')this.materials[offer.id]=this.materialCount(offer.id)+count;
      else this.inventory[offer.id]=this.itemCount(offer.id)+count;
      const event={merchant:visit.name,quality:visit.quality,offerKey,id:offer.id,name:offer.name,type:offer.type,count,cost,time:this.merchants.elapsed};
      this.purchaseHistory.push(event); if(this.purchaseHistory.length>50)this.purchaseHistory=this.purchaseHistory.slice(-50);
      this.merchants.logEvent('Purchased '+count+' '+offer.name+' for '+cost.toFixed(1)+'g.','purchase');
      return{ok:true,event};
    }
    itemCount(itemId){ return Math.max(0,Number(this.inventory[itemId])||0); }
    materialCount(materialId){ return Math.max(0,Number(this.materials[materialId])||0); }
    canCraft(recipeId,count=1){
      const recipe=CRAFT_RECIPES[recipeId]; count=Math.max(1,Math.floor(count));
      if(!recipe)return false;
      return Object.entries(recipe.materials).every(([id,n])=>this.materialCount(id)>=n*count);
    }
    craft(recipeId,count=1){
      const recipe=CRAFT_RECIPES[recipeId]; count=Math.max(1,Math.floor(count));
      if(!recipe)return{ok:false,reason:'unknown recipe'};
      if(!this.canCraft(recipeId,count))return{ok:false,reason:'insufficient materials'};
      for(const [id,n] of Object.entries(recipe.materials))this.materials[id]=this.materialCount(id)-n*count;
      const made=recipe.outputCount*count;
      this.inventory[recipe.output]=this.itemCount(recipe.output)+made;
      this.prepMinutes+=recipe.minutes*count;
      const event={recipeId,name:recipe.name,count,made,output:recipe.output,minutes:recipe.minutes*count,materials:clone(recipe.materials)};
      this.craftHistory.push(event); if(this.craftHistory.length>50)this.craftHistory=this.craftHistory.slice(-50);
      return{ok:true,event};
    }
    equipInventoryItem(heroId,itemId){
      const h=this.getHero(heroId),item=EQUIPMENT[itemId];
      if(!h||!h.alive)return{ok:false,reason:'hero unavailable'};
      if(!item||!['weapon','armor'].includes(item.slot))return{ok:false,reason:'not equippable'};
      if(this.itemCount(itemId)<1)return{ok:false,reason:'item not in tavern stock'};
      const previous=h.equipment[item.slot]||null;
      this.inventory[itemId]=this.itemCount(itemId)-1;
      if(previous)this.inventory[previous]=this.itemCount(previous)+1;
      h.equipment[item.slot]=itemId;
      deriveMoodlets(h);
      return{ok:true,itemId,previous,slot:item.slot};
    }
    giveConsumable(heroId,itemId,count=1){
      const h=this.getHero(heroId),item=EQUIPMENT[itemId]; count=Math.max(1,Math.floor(count));
      if(!h||!h.alive)return{ok:false,reason:'hero unavailable'};
      if(!item||item.slot!=='consumable')return{ok:false,reason:'not a consumable'};
      if(this.itemCount(itemId)<count)return{ok:false,reason:'insufficient stock'};
      const cap=itemId==='healing_potion'?3:4;
      const current=Math.max(0,Number(h.supplies[itemId])||0);
      const moved=Math.min(count,cap-current);
      if(moved<=0)return{ok:false,reason:'hero supply full'};
      this.inventory[itemId]=this.itemCount(itemId)-moved;
      h.supplies[itemId]=current+moved;
      return{ok:true,moved,itemId};
    }
    getHero(id=this.selectedHeroId){ return this.heroes.find(h=>h.id===id)||null; }
    selectHero(id){ if(this.heroes.some(h=>h.id===id)){this.selectedHeroId=id;return true;}return false; }
    syncPreparation(heroId,prep){
      const idx=this.heroes.findIndex(h=>h.id===heroId); if(idx<0)return;
      this.heroes[idx]=heroTemplate(prep.hero); this.funds=prep.funds; this.materials=clone(prep.materials); this.prepMinutes=prep.prepMinutes;
    }
    canPrepare(heroId,actionId){
      const h=this.getHero(heroId); if(!h)return false;
      return new PreparationState({hero:h,funds:this.funds,materials:this.materials,prepMinutes:this.prepMinutes}).can(actionId);
    }
    prepare(heroId,actionId){
      const h=this.getHero(heroId); if(!h)return{ok:false,reason:'hero unavailable'};
      const prep=new PreparationState({hero:h,funds:this.funds,materials:this.materials,prepMinutes:this.prepMinutes});
      const result=prep.apply(actionId); if(result.ok)this.syncPreparation(heroId,prep); return result;
    }
    setLoadout(heroId,weaponId,armorId){
      const h=this.getHero(heroId); if(!h)return false;
      const prep=new PreparationState({hero:h,funds:this.funds,materials:this.materials,prepMinutes:this.prepMinutes}); prep.setLoadout(weaponId,armorId); this.syncPreparation(heroId,prep); return true;
    }
    startExpedition(heroId=this.selectedHeroId,seed=1){
      const h=this.getHero(heroId); if(!h||!h.alive)return null;
      return new Expedition({hero:h,seed});
    }
    settle(heroId,expedition){
      const hero=this.getHero(heroId);
      if(!hero)return{ok:false,reason:'hero unavailable',banked:0};
      if(expedition.state==='deployed')return{ok:false,reason:'expedition still active',banked:0};
      if(expedition.hero.id!==heroId)return{ok:false,reason:'hero mismatch',banked:0};
      const key=`${heroId}:${expedition.seed}:${expedition.elapsed}:${expedition.state}`;
      if(this.settledExpeditions.has(key))return{ok:false,reason:'already settled',banked:0};
      this.settledExpeditions.add(key);
      this.funds+=expedition.gold;
      for(const [id,count] of Object.entries(expedition.materials))this.materials[id]=(this.materials[id]||0)+count;
      const updated=heroTemplate(expedition.hero); updated.prepEffects=[];
      const record=applyCareerProgress(updated,expedition);
      this.history.push({heroId:updated.id,heroName:updated.name,...clone(record)}); if(this.history.length>100)this.history=this.history.slice(-100);
      const idx=this.heroes.findIndex(h=>h.id===heroId);
      if(updated.alive)this.heroes[idx]=updated;
      else{
        this.heroes.splice(idx,1);
        this.fallen.push({hero:clone(updated),deathRecord:clone(record)}); if(this.fallen.length>50)this.fallen=this.fallen.slice(-50);
        if(this.selectedHeroId===heroId)this.selectedHeroId=this.heroes[0]?.id||null;
      }
      return{ok:true,banked:expedition.gold,heroAlive:updated.alive,record};
    }
    snapshot(){
      return{version:6,heroes:clone(this.heroes),fallen:clone(this.fallen),funds:this.funds,materials:clone(this.materials),inventory:clone(this.inventory),craftHistory:clone(this.craftHistory),purchaseHistory:clone(this.purchaseHistory),prepMinutes:this.prepMinutes,selectedHeroId:this.selectedHeroId,history:clone(this.history),settledKeys:Array.from(this.settledExpeditions),tavern:this.tavern.snapshot(),merchants:this.merchants.snapshot()};
    }
    serialize(){ return JSON.stringify(this.snapshot()); }
    static fromSnapshot(data){
      if(!data||!Array.isArray(data.heroes))throw new Error('invalid tavern roster snapshot');
      return new TavernRoster(data);
    }
    static deserialize(text){ return TavernRoster.fromSnapshot(JSON.parse(text)); }
  }

  return {RNG,EQUIPMENT,CRAFT_RECIPES,INJURY_TYPES,PREP_EFFECTS,PREPARATION_ACTIONS,CONTRACT,ENEMIES,MATERIAL_NAMES,PATRON_TYPES,MERCHANT_GOODS,merchantQuality,MerchantSystem,heroTemplate,normalizeCareer,rankFromXp,applyCareerProgress,starterRoster,deriveMoodlets,totalInjurySeverity,addInjury,reduceWorstInjury,removeWorstInjury,readinessScore,threatAssessment,PreparationState,TavernEconomy,TavernRoster,Expedition,makePreset};
});
